import type {Content, Platform} from '../../../lib/database.ts';
import {htmlToReadableText} from '../../../lib/utils.ts';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline.ts';

export type CreationExportKind = 'idea' | 'script';

export interface CreationExportCaption {
  platform: string;
  text: string;
  hashtags: string;
}

export interface CreationExportSection {
  id: string;
  kind: CreationExportKind;
  title: string;
  body: string;
  captions: CreationExportCaption[];
}

export interface CreationExportCopy {
  title: string;
  singular: string;
  plural: string;
  filenamePrefix: string;
}

function getCreationExportKind(
  content: Pick<Content, 'status'>,
): CreationExportKind {
  return normalizeContentStatus(content.status) === CONTENT_STATUS.IDEIA
    ? 'idea'
    : 'script';
}

export function canExportCreation(
  content: Pick<Content, 'deletedAt'>,
): boolean {
  return content.deletedAt == null;
}

export function getCreationExportCopy(
  contents: readonly Pick<Content, 'status'>[],
): CreationExportCopy {
  const kinds = new Set(contents.map(getCreationExportKind));
  if (kinds.size === 1 && kinds.has('idea')) {
    return {
      title: 'Ideias',
      singular: 'ideia',
      plural: 'ideias',
      filenamePrefix: 'ideias',
    };
  }
  if (kinds.size === 1 && kinds.has('script')) {
    return {
      title: 'Roteiros',
      singular: 'roteiro',
      plural: 'roteiros',
      filenamePrefix: 'roteiros',
    };
  }
  return {
    title: 'Ideias e roteiros',
    singular: 'item',
    plural: 'itens',
    filenamePrefix: 'ideias-e-roteiros',
  };
}

export function buildCreationExportSections(
  contents: readonly Content[],
  platforms: readonly Platform[] = [],
): CreationExportSection[] {
  const platformNames = new Map(platforms.map(platform => [platform.id, platform.nome]));

  return contents
    .filter(canExportCreation)
    .map(content => {
      const kind = getCreationExportKind(content);
      const ideaBody = htmlToReadableText(content.notes).trim()
        || htmlToReadableText(content.script).trim();
      return {
        id: content.id,
        kind,
        title: content.title.trim()
          || (kind === 'idea' ? 'Ideia sem título' : 'Roteiro sem título'),
        body: kind === 'idea'
          ? ideaBody
          : htmlToReadableText(content.script).trim(),
        captions: content.plataformas
          .filter(platform => platform.legenda.trim())
          .map(platform => ({
            platform: platformNames.get(platform.platformId) ?? platform.platformId,
            text: htmlToReadableText(platform.legenda).trim(),
            hashtags: platform.hashtags.trim(),
          })),
      };
    });
}

function paragraphsFromText(
  text: string,
  Paragraph: typeof import('docx').Paragraph,
  TextRun: typeof import('docx').TextRun,
) {
  return text
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const lines = block.split('\n');
      const children = lines.flatMap((line, index) => [
        ...(index > 0 ? [new TextRun({break: 1})] : []),
        new TextRun({text: line}),
      ]);
      return new Paragraph({
        children,
        spacing: {after: 180, line: 300},
        widowControl: true,
      });
    });
}

export async function createCreationsDocxBlob(
  contents: readonly Content[],
  platforms: readonly Platform[] = [],
): Promise<Blob> {
  const sections = buildCreationExportSections(contents, platforms);
  if (sections.length === 0) {
    throw new Error('Nenhum item disponível para exportação.');
  }
  const exportCopy = getCreationExportCopy(contents);

  const {
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun,
  } = await import('docx');

  const documentChildren = [
    new Paragraph({
      children: [
        new TextRun({
          text: exportCopy.title,
          bold: true,
          color: '111827',
          font: 'Arial',
          size: 52,
        }),
      ],
      spacing: {after: 120},
      widowControl: true,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${sections.length} ${sections.length === 1 ? exportCopy.singular : exportCopy.plural}`,
          color: '6B7280',
          font: 'Arial',
          size: 20,
        }),
      ],
      spacing: {after: 360},
      widowControl: true,
    }),
  ];

  sections.forEach((section, index) => {
    documentChildren.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: index > 0,
        keepNext: true,
        widowControl: true,
      }),
      new Paragraph({
        text: section.kind === 'idea' ? 'Ideia' : 'Roteiro',
        heading: HeadingLevel.HEADING_2,
        keepNext: true,
        widowControl: true,
      }),
    );

    if (section.body) {
      documentChildren.push(...paragraphsFromText(section.body, Paragraph, TextRun));
    } else {
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.kind === 'idea'
                ? 'Sem descrição preenchida.'
                : 'Sem roteiro preenchido.',
              color: '6B7280',
              italics: true,
            }),
          ],
          spacing: {after: 240},
          widowControl: true,
        }),
      );
    }

    if (section.captions.length > 0) {
      documentChildren.push(
        new Paragraph({
          text: 'Legendas',
          heading: HeadingLevel.HEADING_2,
          keepNext: true,
          widowControl: true,
        }),
      );

      section.captions.forEach(caption => {
        documentChildren.push(
          new Paragraph({
            text: caption.platform,
            heading: HeadingLevel.HEADING_3,
            keepNext: true,
            widowControl: true,
          }),
          ...paragraphsFromText(caption.text, Paragraph, TextRun),
        );
        if (caption.hashtags) {
          documentChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: caption.hashtags,
                  color: '4B5563',
                  italics: true,
                }),
              ],
              spacing: {after: 180, line: 276},
              widowControl: true,
            }),
          );
        }
      });
    }
  });

  const document = new Document({
    creator: 'Content OS',
    title: exportCopy.title,
    subject: `Exportação do Content OS: ${exportCopy.title}`,
    description: 'Ideias, roteiros e respectivas legendas.',
    styles: {
      default: {
        document: {
          run: {
            color: '1F2937',
            font: 'Arial',
            size: 22,
          },
          paragraph: {
            spacing: {after: 180, line: 300},
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            bold: true,
            color: '111827',
            font: 'Arial',
            size: 34,
          },
          paragraph: {
            keepNext: true,
            outlineLevel: 0,
            spacing: {before: 240, after: 180},
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            bold: true,
            color: '374151',
            font: 'Arial',
            size: 26,
          },
          paragraph: {
            keepNext: true,
            outlineLevel: 1,
            spacing: {before: 240, after: 120},
          },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: {
            bold: true,
            color: '4B5563',
            font: 'Arial',
            size: 22,
          },
          paragraph: {
            keepNext: true,
            outlineLevel: 2,
            spacing: {before: 180, after: 80},
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: documentChildren,
      },
    ],
  });

  return Packer.toBlob(document);
}

export async function downloadCreationsDocx(
  contents: readonly Content[],
  platforms: readonly Platform[] = [],
  now = new Date(),
): Promise<void> {
  const blob = await createCreationsDocxBlob(contents, platforms);
  const exportCopy = getCreationExportCopy(contents);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = now.toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `${exportCopy.filenamePrefix}-${date}.docx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
