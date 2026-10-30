import type { Anotacao } from '../../../lib/database.ts';
import { dia } from '../../../lib/dates.ts';
import { criteriosAvaliados, type AvaliacaoCriterios } from './avaliacaoCriterios.ts';

export interface AnnotationsExportInput {
  titulo: string;
  /** Autor, diretor, mangaká… e o rótulo que vai na frente ("Autor"). */
  criador: string;
  rotuloCriador: string;
  /** "Livro", "Filme"… */
  rotuloTipo: string;
  criterios?: AvaliacaoCriterios;
  anotacoes: readonly Anotacao[];
}

export interface AnnotationExportEntry {
  id: string;
  /** "Trecho", "Trecho · Destaque · Cap. 3"… */
  rotulo: string;
  texto: string;
  data: string;
}

function formatarData(iso: string): string {
  if (Number.isNaN(new Date(iso).getTime())) return '';
  return dia(iso);
}

/** Todas as anotações, da mais antiga para a mais nova, como foram escritas ao longo da leitura. */
export function buildAnnotationExportEntries(anotacoes: readonly Anotacao[]): AnnotationExportEntry[] {
  return anotacoes
    .filter(anotacao => !anotacao.deletedAt && anotacao.texto.trim())
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(anotacao => ({
      id: anotacao.id,
      rotulo: [
        anotacao.tipo,
        anotacao.contentPotential ? 'Destaque' : '',
        anotacao.capituloRef?.trim() ?? '',
      ].filter(Boolean).join(' · '),
      texto: anotacao.texto.trim().replace(/\r\n?/g, '\n'),
      data: formatarData(anotacao.createdAt),
    }));
}

/** Linhas da avaliação no formato "Escrita: 4/5", só dos critérios com nota. */
export function buildRatingExportLines(criterios: AvaliacaoCriterios | undefined): string[] {
  return criteriosAvaliados(criterios).map(({ rotulo, nota }) => `${rotulo}: ${nota}/5`);
}

export function annotationsExportFilename(titulo: string): string {
  const slug = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `anotacoes-${slug || 'item'}.docx`;
}

export async function createAnnotationsDocxBlob(input: AnnotationsExportInput): Promise<Blob> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');
  const entries = buildAnnotationExportEntries(input.anotacoes);
  const ratingLines = buildRatingExportLines(input.criterios);
  const titulo = input.titulo.trim() || 'Sem título';

  const linhaDaFicha = (rotulo: string, valor: string) => new Paragraph({
    children: [
      new TextRun({ text: `${rotulo}: `, bold: true }),
      new TextRun({ text: valor }),
    ],
    spacing: { after: 60 },
  });

  const children = [
    new Paragraph({
      children: [new TextRun({ text: titulo, bold: true, color: '111827', size: 44 })],
      spacing: { after: 160 },
    }),
    ...(input.criador.trim() ? [linhaDaFicha(input.rotuloCriador, input.criador.trim())] : []),
    linhaDaFicha('Tipo', input.rotuloTipo),
  ];

  if (ratingLines.length > 0) {
    children.push(
      new Paragraph({ text: 'Avaliação', heading: HeadingLevel.HEADING_2, keepNext: true }),
      ...ratingLines.map(linha => new Paragraph({ text: linha, spacing: { after: 60 } })),
    );
  }

  children.push(new Paragraph({ text: 'Anotações', heading: HeadingLevel.HEADING_2, keepNext: true }));

  if (entries.length === 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Nenhuma anotação ainda.', color: '6B7280', italics: true })],
    }));
  }

  // Tudo em sequência, sem quebra de página: tipo, texto e data, uma anotação abaixo da outra.
  entries.forEach(entry => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: entry.rotulo, bold: true, color: '374151' })],
        keepNext: true,
        spacing: { before: 240, after: 60 },
      }),
      new Paragraph({
        children: entry.texto.split('\n').flatMap((linha, index) => [
          ...(index > 0 ? [new TextRun({ break: 1 })] : []),
          new TextRun({ text: linha }),
        ]),
        keepNext: Boolean(entry.data),
        spacing: { after: 60, line: 300 },
      }),
      ...(entry.data
        ? [new Paragraph({
          children: [new TextRun({ text: entry.data, color: '6B7280', size: 18 })],
          spacing: { after: 120 },
        })]
        : []),
    );
  });

  const document = new Document({
    creator: 'Content OS',
    title: `Anotações: ${titulo}`,
    styles: {
      default: {
        document: {
          run: { color: '1F2937', font: 'Arial', size: 22 },
          paragraph: { spacing: { after: 120, line: 276 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { bold: true, color: '111827', font: 'Arial', size: 28 },
          paragraph: { keepNext: true, outlineLevel: 1, spacing: { before: 360, after: 120 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}

export async function downloadAnnotationsDocx(input: AnnotationsExportInput): Promise<void> {
  const blob = await createAnnotationsDocxBlob(input);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = annotationsExportFilename(input.titulo);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
