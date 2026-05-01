import {Content, RecordingBlock, RecordingBlockContent} from '../../../lib/database';
import {RECORDED_STATUS} from '../../contents/lib/contentWorkflow';

type MarkContentRecordedParams = {
  block: RecordingBlock;
  contentId: string;
  contents: Content[];
};

type RecordingBlockLabelsParams = {
  block?: RecordingBlock | null;
  content?: Content | null;
  looks?: Array<{id: string; numero: number; descricao: string | null}>;
  cenarios?: Array<{id: string; nome: string}>;
};

export function buildMarkContentRecordedTransition({
  block,
  contentId,
  contents,
}: MarkContentRecordedParams) {
  const content = contents.find(item => item.id === contentId);
  if (!content) return null;

  return {
    updatedContent: {
      ...content,
      status: RECORDED_STATUS,
      updatedAt: new Date().toISOString(),
    },
    updatedBlockContents: block.contents.map(item =>
      item.contentId === contentId ? {...item, gravado: true} : item
    ),
  };
}

export function buildSaveRecordingSessionTransition(
  block: RecordingBlock,
  contents: Content[],
  completedIds: Set<string>
) {
  const updatedContents = contents
    .filter(content => completedIds.has(content.id))
    .map(content => ({
      ...content,
      status: RECORDED_STATUS,
      updatedAt: new Date().toISOString(),
    }));

  const updatedBlockContents: RecordingBlockContent[] = block.contents.map(item => ({
    ...item,
    gravado: completedIds.has(item.contentId) || item.gravado,
  }));

  return {updatedContents, updatedBlockContents};
}

export function resolveRecordingBlockLookLabel({
  block,
  content,
  looks = [],
}: RecordingBlockLabelsParams) {
  if (block?.lookLabel?.trim()) return block.lookLabel.trim();
  if (!content?.lookId) return 'Não definido';

  const look = looks.find(item => item.id === content.lookId);
  if (!look) return content.lookId;

  return `Look ${look.numero}${look.descricao ? ` — ${look.descricao}` : ''}`;
}

export function resolveRecordingBlockScenarioLabel({
  block,
  content,
  cenarios = [],
}: RecordingBlockLabelsParams) {
  if (block?.cenarioLabel?.trim()) return block.cenarioLabel.trim();
  if (!content?.cenarioId) return 'Não definido';

  const cenario = cenarios.find(item => item.id === content.cenarioId);
  if (!cenario) return content.cenarioId;

  return cenario.nome;
}

export function isRecordingBlockTeleprompterEnabled(block?: RecordingBlock | null) {
  const metadata = block?.metadata;
  if (!metadata || typeof metadata !== 'object') return true;

  const value = metadata.teleprompterEnabled;
  return typeof value === 'boolean' ? value : true;
}
