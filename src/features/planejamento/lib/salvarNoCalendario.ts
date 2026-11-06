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

function hora(value: string | null | undefined): string | null {
  const match = value ? /(\d{2}):(\d{2})/.exec(value) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

/**
 * Contas previstas que perderiam o horário próprio se todas recebessem `time`.
 * Horário vazio não descarta: cada conta fica com o que já tinha.
 */
export function textoHorariosDescartados(
  content: Content,
  time: string | null | undefined,
  rotulo: (platformId: string) => string = id => id,
): string | null {
  const horaNova = hora(time);
  if (!horaNova || content.deletedAt || roteiroPublicado(content)) return null;
  const perdidos = content.plataformas.flatMap(plataforma => {
    if (!contaAindaPrevista(plataforma.status)) return [];
    const atual = hora(plataforma.publishTime);
    if (!atual || atual === horaNova) return [];
    return `${rotulo(plataforma.platformId)} ${atual}`;
  });
  if (perdidos.length === 0) return null;
  return `O salvamento substitui ${perdidos.join(', ')} por ${horaNova}.`;
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
    const horaNova = hora(input.time);
    const horarioDe = (plataforma: ContentPlataforma | null) =>
      horaNova ?? hora(plataforma?.publishTime) ?? hora(content.publishTime);
    if (content.plataformas.length === 0) {
      const time = horarioDe(null);
      if (dia(content.publishDate) === day && hora(content.publishTime) === time) return null;
      return applyScheduleToContent(content, null, day, time);
    }
    const previstas = content.plataformas.filter(plataforma => contaAindaPrevista(plataforma.status));
    if (previstas.length === 0) return null;
    const jaNoDia = previstas.every(plataforma => dia(plataforma.publishDate) === day)
      && dia(content.publishDate) === day
      && previstas.every(plataforma => hora(plataforma.publishTime ?? content.publishTime) === horarioDe(plataforma));
    if (jaNoDia) return null;
    return previstas.reduce(
      (atual, plataforma) => applyScheduleToContent(atual, plataforma.platformId, day, horarioDe(plataforma)),
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
  /** Horários de conta que o horário único substituiu. */
  avisos: string[];
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
  const avisos: string[] = [];

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
    const aviso = porConta && porConta.length > 0
      ? null
      : textoHorariosDescartados(content, input.time);
    const movido = porConta && porConta.length > 0
      ? salvarRoteiroNoCalendario(content, {modo: 'por-conta', contas: porConta})
      : salvarRoteiroNoCalendario(content, {
        modo: 'mesmo',
        date: postIt.date,
        time: input.time,
      });
    if (movido) {
      if (aviso) avisos.push(aviso);
      changedContents.set(movido.id, movido);
      contentsById.set(movido.id, movido);
    }
  }

  return {
    contents: [...changedContents.values()],
    postIts: [...changedPostIts.values()],
    openScriptId: roteirosNovos.length === 1 ? roteirosNovos[0] : null,
    avisos,
  };
}
