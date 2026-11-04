import type {Content, ContentPlataforma} from '../../../lib/database.ts';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline.ts';
import {applyScheduleToContent} from '../../editorial-calendar/lib/scheduleContent.ts';
import {normalizePublicacaoStatus} from '../../editorial/lib/publicacaoSituacao.ts';
import type {PlanejamentoPostIt, PostItTarget} from './postIt.ts';
import {postItTransformOptions, transformPostIt} from './postIt.ts';
import {roteiroPublicado} from './postItsNaData.ts';

function dia(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

function contaAindaPrevista(status: ContentPlataforma['status']): boolean {
  const situacao = normalizePublicacaoStatus(status);
  return situacao === 'prevista' || situacao === 'programada';
}

export type ContaNoCalendario = {
  platformId: string;
  date: string;
  time: string | null;
};

/**
 * Grava o dia no id do roteiro: data principal e contas ainda previstas ou programadas.
 * Conta publicada não muda. Publicado não muda.
 */
export function salvarRoteiroNoCalendario(
  content: Content,
  input:
    | {modo: 'mesmo'; date: string; time?: string | null}
    | {modo: 'por-conta'; contas: readonly ContaNoCalendario[]},
): Content | null {
  if (content.deletedAt || roteiroPublicado(content)) return null;

  if (input.modo === 'mesmo') {
    const day = input.date.slice(0, 10);
    const time = input.time ?? content.publishTime ?? null;
    if (content.plataformas.length === 0) {
      if (dia(content.publishDate) === day && (content.publishTime ?? null) === time) return null;
      return applyScheduleToContent(content, null, day, time);
    }
    const previstas = content.plataformas.filter(plataforma => contaAindaPrevista(plataforma.status));
    if (previstas.length === 0) return null;
    const jaNoDia = previstas.every(plataforma => dia(plataforma.publishDate) === day)
      && dia(content.publishDate) === day
      && previstas.every(plataforma => (plataforma.publishTime ?? content.publishTime ?? null) === time);
    if (jaNoDia) return null;
    return previstas.reduce(
      (atual, plataforma) => applyScheduleToContent(atual, plataforma.platformId, day, time),
      content,
    );
  }

  if (input.contas.length === 0) return null;
  let next = content;
  let mudou = false;
  for (const conta of input.contas) {
    const day = conta.date.slice(0, 10);
    const plataforma = next.plataformas.find(item => item.platformId === conta.platformId);
    if (plataforma && !contaAindaPrevista(plataforma.status)) continue;
    if (!plataforma && next.plataformas.length > 0) continue;
    const atualizado = applyScheduleToContent(
      next,
      next.plataformas.length > 0 ? conta.platformId : null,
      day,
      conta.time,
    );
    if (atualizado !== next) {
      next = atualizado;
      mudou = true;
    }
  }
  return mudou ? next : null;
}

/**
 * Tira a previsão do Calendário: limpa data das contas previstas e programadas
 * e devolve programada para prevista. Publicada e a etapa do roteiro ficam.
 */
export function tirarRoteiroDoCalendario(content: Content): Content | null {
  if (content.deletedAt || roteiroPublicado(content)) return null;
  const temData = Boolean(content.publishDate)
    || content.plataformas.some(plataforma => plataforma.publishDate);
  const temProgramada = content.plataformas.some(
    plataforma => normalizePublicacaoStatus(plataforma.status) === 'programada',
  );
  if (!temData && !temProgramada) return null;

  const plataformas = content.plataformas.map(plataforma => {
    if (!contaAindaPrevista(plataforma.status)) return plataforma;
    return {
      ...plataforma,
      publishDate: null,
      publishTime: null,
      publishDateEnabled: false,
      status: 'prevista' as const,
    };
  });
  const aindaTemData = plataformas.some(plataforma => plataforma.publishDate);
  return {
    ...content,
    publishDate: aindaTemData
      ? plataformas
        .map(plataforma => plataforma.publishDate)
        .filter((value): value is string => Boolean(value))
        .sort()[0] ?? null
      : null,
    publishDateEnabled: aindaTemData,
    publishTime: aindaTemData ? content.publishTime : null,
    plataformas,
    updatedAt: new Date().toISOString(),
  };
}

export type DestinoSalvar = PostItTarget | 'manter';

export type LinhaSalvarCalendario = {
  postItId: string;
  texto: string;
  date: string;
  destino: DestinoSalvar;
  /** Pode escolher ideia, roteiro, ou só manter (já tem conteúdo além de ideia). */
  opcoes: {ideia: boolean; roteiro: boolean; manter: boolean};
};

/** Post-its com dia, prontos para o fluxo de salvar. Sem dia ficam de fora. */
export function linhasParaSalvarNoCalendario(
  postIts: readonly PlanejamentoPostIt[],
  contents: readonly Content[],
  ids?: readonly string[],
): LinhaSalvarCalendario[] {
  const escolhidos = ids ? new Set(ids) : null;
  const porId = new Map(contents.map(content => [content.id, content]));
  return postIts.flatMap(postIt => {
    if (escolhidos && !escolhidos.has(postIt.id)) return [];
    if (!postIt.date) return [];
    const content = postIt.contentId ? porId.get(postIt.contentId) ?? null : null;
    if (content && (content.deletedAt || roteiroPublicado(content))) return [];
    const transform = postItTransformOptions(postIt, content);
    const status = content ? normalizeContentStatus(content.status) : null;
    const manter = Boolean(content) && status !== CONTENT_STATUS.IDEIA;
    const destino: DestinoSalvar = !content
      ? 'roteiro'
      : status === CONTENT_STATUS.IDEIA
        ? 'roteiro'
        : 'manter';
    return [{
      postItId: postIt.id,
      texto: (content?.title || postIt.texto).trim() || 'Sem título',
      date: postIt.date,
      destino,
      opcoes: {
        ideia: transform.ideia,
        roteiro: transform.roteiro,
        manter,
      },
    }];
  });
}

export type ResultadoSalvarCalendario = {
  contents: Content[];
  postIts: PlanejamentoPostIt[];
  /** Um único roteiro novo abre o editor. Vários não. */
  openScriptId: string | null;
};

/**
 * Transforma o que ainda é nota ou ideia e grava o dia no Calendário.
 * `horarioPorConta` ausente = o mesmo dia e horário em todas as contas do post-it.
 */
export function executarSalvarNoCalendario(input: {
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  linhas: readonly LinhaSalvarCalendario[];
  time?: string | null;
  horarioPorConta?: ReadonlyMap<string, readonly ContaNoCalendario[]>;
  contas?: Parameters<typeof transformPostIt>[0]['contas'];
  now?: string;
}): ResultadoSalvarCalendario {
  const contentsById = new Map(input.contents.map(content => [content.id, content]));
  const postItsById = new Map(input.postIts.map(postIt => [postIt.id, postIt]));
  const changedContents = new Map<string, Content>();
  const changedPostIts = new Map<string, PlanejamentoPostIt>();
  const roteirosNovos: string[] = [];

  for (const linha of input.linhas) {
    let postIt = changedPostIts.get(linha.postItId) ?? postItsById.get(linha.postItId);
    if (!postIt || !postIt.date) continue;

    let content = postIt.contentId
      ? changedContents.get(postIt.contentId) ?? contentsById.get(postIt.contentId) ?? null
      : null;

    if (linha.destino === 'ideia' || linha.destino === 'roteiro') {
      const result = transformPostIt({
        postIt,
        contents: content ? [content] : [],
        target: linha.destino,
        contas: input.contas,
        now: input.now,
      });
      if (!result.ok) continue;
      content = result.content;
      postIt = result.postIt;
      changedContents.set(content.id, content);
      changedPostIts.set(postIt.id, postIt);
      if (result.mode === 'create' && result.openScript) roteirosNovos.push(content.id);
      contentsById.set(content.id, content);
    }

    if (!content) continue;

    const porConta = input.horarioPorConta?.get(postIt.id);
    const movido = porConta && porConta.length > 0
      ? salvarRoteiroNoCalendario(content, {modo: 'por-conta', contas: porConta})
      : salvarRoteiroNoCalendario(content, {
        modo: 'mesmo',
        date: postIt.date,
        time: input.time ?? content.publishTime ?? null,
      });
    if (movido) {
      changedContents.set(movido.id, movido);
      contentsById.set(movido.id, movido);
    }
  }

  return {
    contents: [...changedContents.values()],
    postIts: [...changedPostIts.values()],
    openScriptId: roteirosNovos.length === 1 ? roteirosNovos[0] : null,
  };
}
