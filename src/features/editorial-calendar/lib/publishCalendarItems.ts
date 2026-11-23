import { format } from 'date-fns';
import type { Content, ContentPlataforma } from '../../../lib/database.ts';
import { platformKey } from '../../../components/ui/platformName.ts';
import { contaDaRef, rotuloDaRef, type ContaRef } from '../../contas/lib/contas.ts';
import { CONTENT_STATUS, DISPLAY_STATUS, getDisplayStatus, isReadyToPublish, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { legendaEfetiva } from '../../editorial/lib/captions.ts';
import { cicloDaPublicacao } from '../../editorial/lib/cicloPublicacao.ts';
import { buildGradeEntries, quandoDoItem, type GradeSerie, type Quando } from '../../editorial/lib/gradeEntries.ts';
import { dataRealizada, rotuloStatusPublicacao } from '../../editorial/lib/markPublished.ts';
import { normalizePublicacaoStatus } from '../../editorial/lib/publicacaoSituacao.ts';
const TODAS_AS_REDES = 'todas';

/** Uma conta dentro do card: horário, legenda e o status daquela publicação. */
export type PublishCalendarConta = {
  plataformaId: string;
  platformName: string;
  time: string | null;
  legenda: string;
  /** Rótulo do selo desta publicação. */
  status: string;
  posted: boolean;
  cancelled: boolean;
  programada: boolean;
};

export type PublishCalendarItem = {
  id: string;
  contentId: string;
  date: string | null;
  time: string | null;
  plataformaId?: string;
  /** Rótulo das contas: plataforma e @. Também serve ao `PlatformIcon`. */
  platformNames: string[];
  /** A publicação deste item já foi ao ar. */
  posted: boolean;
  /** Marcada como não foi ao ar ou removida. */
  cancelled: boolean;
  /** Conta marcada como programada (não basta data futura). */
  programada?: boolean;
  /** Contas deste card, na ordem das publicações. O drawer lê horário e legenda daqui. */
  contas: PublishCalendarConta[];
};

type PlatformRef = ContaRef;

function canonicalPlatformId(ref: string, platforms: readonly PlatformRef[]): string {
  return contaDaRef(ref, platforms)?.id ?? ref;
}

function platformName(ref: string, platforms: readonly PlatformRef[]): string {
  return rotuloDaRef(ref, platforms);
}

/** Filtro de conta: o id da conta, o rótulo (plataforma e @) ou, em dado antigo, o nome. */
function passaNoFiltro(ref: string, filtro: string, platforms: readonly PlatformRef[]): boolean {
  if (ref === filtro) return true;
  const conta = contaDaRef(ref, platforms);
  if (conta && conta.id === filtro) return true;
  const chave = platformKey(filtro);
  return platformKey(platformName(ref, platforms)) === chave
    || (conta ? platformKey(conta.nome) === chave : platformKey(ref) === chave);
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const key = platformKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/**
 * Publicada conta como postada; não foi ao ar e removida, não.
 * Sem marca na rede, o original segue o roteiro marcado como Postado. O repost, não.
 */
function cancelada(publicacao: ContentPlataforma | undefined): boolean {
  return publicacao?.status === 'nao_publicada' || publicacao?.status === 'removida';
}

function publicacaoPostada(content: Content, publicacao: ContentPlataforma | undefined): boolean {
  if (publicacao?.status === 'publicada') return true;
  if (cancelada(publicacao)) return false;
  if (publicacao?.publicationKind === 'repost') return false;
  return getDisplayStatus(content) === CONTENT_STATUS.POSTADO;
}

function hora(value: string | null | undefined): string | null {
  const match = value ? /(\d{2}):(\d{2})/.exec(value) : null;
  return match ? `${match[1]}:${match[2]}` : null;
}

function planejado(date: string | null | undefined, time: string | null | undefined): Quando {
  return { date: date || null, time: date ? hora(time) : null };
}

/** Sem data na publicação, o dia do roteiro ainda reúne as contas que não escolheram o próprio dia. */
function planoDaPublicacao(content: Content, publicacao: ContentPlataforma): Quando {
  if (publicacao.publishDate) return planejado(publicacao.publishDate, publicacao.publishTime);
  return planejado(content.publishDate, publicacao.publishTime || content.publishTime);
}

function statusDaConta(
  content: Content,
  publicacao: ContentPlataforma,
  posted: boolean,
  programada: boolean,
): string {
  if (posted) return CONTENT_STATUS.POSTADO;
  if (programada && isReadyToPublish(content)) return DISPLAY_STATUS.PROGRAMADO;
  return rotuloStatusPublicacao(publicacao.status);
}

type ContaMontada = {
  ciclo: number;
  date: string | null;
  time: string | null;
  view: PublishCalendarConta;
};

function montarConta(
  content: Content,
  publicacao: ContentPlataforma,
  platforms: readonly PlatformRef[],
): ContaMontada {
  const posted = publicacaoPostada(content, publicacao);
  const programada = normalizePublicacaoStatus(publicacao.status) === 'programada';
  const quando = quandoDoItem(
    content,
    planoDaPublicacao(content, publicacao),
    posted,
    dataRealizada(publicacao),
  );
  return {
    ciclo: cicloDaPublicacao(publicacao),
    date: quando.date ? quando.date.slice(0, 10) : null,
    time: quando.time,
    view: {
      plataformaId: publicacao.id,
      platformName: platformName(publicacao.platformId, platforms),
      time: hora(publicacao.publishTime) ?? quando.time,
      legenda: legendaEfetiva(content.legendaBase, publicacao),
      status: statusDaConta(content, publicacao, posted, programada),
      posted,
      cancelled: cancelada(publicacao),
      programada,
    },
  };
}

function primeiraHora(contas: readonly PublishCalendarConta[]): string | null {
  const horas = contas.map(conta => conta.time).filter((valor): valor is string => Boolean(valor));
  horas.sort();
  return horas[0] ?? null;
}

type Grupo = {
  ciclo: number;
  date: string | null;
  contas: PublishCalendarConta[];
  time: string | null;
};

function itemDoGrupo(contentId: string, grupo: Grupo, gruposNoCiclo: number): PublishCalendarItem {
  const posted = grupo.contas.some(conta => conta.posted);
  const date = grupo.date ?? 'sem-data';
  const unicaPostada = grupo.contas.length === 1 && grupo.contas[0]?.posted;
  let id: string;
  if (grupo.ciclo >= 2) {
    id = gruposNoCiclo === 1
      ? `${contentId}:ciclo:${grupo.ciclo}`
      : `${contentId}:ciclo:${grupo.ciclo}:${date}`;
  } else if (unicaPostada) {
    id = `${contentId}:pub:${grupo.contas[0]?.plataformaId}`;
  } else if (gruposNoCiclo === 1) {
    id = `${contentId}:original`;
  } else {
    id = `${contentId}:${date}:original`;
  }
  return {
    id,
    contentId,
    date: grupo.date,
    time: grupo.time ?? primeiraHora(grupo.contas),
    plataformaId: grupo.contas[0]?.plataformaId,
    platformNames: uniqueNames(grupo.contas.map(conta => conta.platformName)),
    posted,
    cancelled: !posted && grupo.contas.length > 0 && grupo.contas.every(conta => conta.cancelled),
    programada: grupo.contas.some(conta => conta.programada),
    contas: grupo.contas,
  };
}

function itemDoRoteiro(content: Content): PublishCalendarItem {
  const posted = getDisplayStatus(content) === CONTENT_STATUS.POSTADO;
  const quando = quandoDoItem(content, planejado(content.publishDate, content.publishTime), posted, null);
  return {
    id: `${content.id}:original`,
    contentId: content.id,
    date: quando.date ? quando.date.slice(0, 10) : null,
    time: quando.time,
    platformNames: [],
    posted,
    cancelled: false,
    programada: false,
    contas: [],
  };
}

/**
 * Mesmo roteiro e mesmo dia: um card. Dia diferente: outro card, só com as contas daquele dia.
 * Repost (ciclo 2+) não entra no card do original. Repost cancelado não aparece.
 */
function agruparPublicacoes(
  content: Content,
  publicacoes: readonly ContentPlataforma[],
  platforms: readonly PlatformRef[],
  semPublicacaoViraRoteiro = false,
): PublishCalendarItem[] {
  if (publicacoes.length === 0) {
    return semPublicacaoViraRoteiro ? [itemDoRoteiro(content)] : [];
  }
  const grupos: Grupo[] = [];
  const indice = new Map<string, Grupo>();
  for (const publicacao of publicacoes) {
    const ciclo = cicloDaPublicacao(publicacao);
    if (ciclo >= 2 && cancelada(publicacao)) continue;
    const montada = montarConta(content, publicacao, platforms);
    const chave = `${montada.ciclo}:${montada.date ?? ''}`;
    let grupo = indice.get(chave);
    if (!grupo) {
      grupo = { ciclo: montada.ciclo, date: montada.date, contas: [], time: montada.time };
      indice.set(chave, grupo);
      grupos.push(grupo);
    } else if (!grupo.time && montada.time) {
      grupo.time = montada.time;
    } else if (grupo.time && montada.time && montada.time < grupo.time) {
      grupo.time = montada.time;
    }
    grupo.contas.push(montada.view);
  }
  if (grupos.length === 0) {
    return semPublicacaoViraRoteiro ? [itemDoRoteiro(content)] : [];
  }
  const porCiclo = new Map<number, number>();
  for (const grupo of grupos) porCiclo.set(grupo.ciclo, (porCiclo.get(grupo.ciclo) ?? 0) + 1);
  return grupos.map(grupo => itemDoGrupo(content.id, grupo, porCiclo.get(grupo.ciclo) ?? 1));
}

function itensDoConteudo(content: Content, platforms: readonly PlatformRef[]): PublishCalendarItem[] {
  if (content.deletedAt || content.archivedAt) return [];
  return agruparPublicacoes(content, content.plataformas ?? [], platforms, true);
}

/** Fora da rede de referência, só o que já foi ao ar no ciclo original — agora agrupado por dia. */
function itensPublicadosForaDaGrade(content: Content, platforms: readonly PlatformRef[]): PublishCalendarItem[] {
  if (content.deletedAt || content.archivedAt) return [];
  const postadas = (content.plataformas ?? []).filter(publicacao =>
    cicloDaPublicacao(publicacao) === 1 && publicacaoPostada(content, publicacao),
  );
  return agruparPublicacoes(content, postadas, platforms);
}

export function todayKey(now = new Date()): string {
  return format(now, 'yyyy-MM-dd');
}

/**
 * Programado no calendário: conta programada + material pronto.
 * Data futura sozinha não basta (continua prevista).
 */
export function isScheduledItem(
  item: Pick<PublishCalendarItem, 'posted' | 'cancelled' | 'programada'>,
  content?: Pick<Content, 'status' | 'edicaoConcluidaEm' | 'postedAt'>,
): boolean {
  if (item.posted || item.cancelled || !item.programada) return false;
  if (!content) return true;
  return isReadyToPublish(content);
}

/**
 * Cada publicação mostra o próprio status. Programado só com conta programada
 * e material em Edição · Pronto; senão usa a situação da conta ou a etapa.
 */
export function publishItemStatus(content: Content, item: PublishCalendarItem, _hoje = todayKey()): string {
  if (item.posted) return CONTENT_STATUS.POSTADO;
  if (isScheduledItem(item, content)) return DISPLAY_STATUS.PROGRAMADO;
  const publicacao = (content.plataformas ?? []).find(candidate => candidate.id === item.plataformaId);
  if (publicacao) return rotuloStatusPublicacao(publicacao.status);
  const status = normalizeContentStatus(content.status);
  if (status !== CONTENT_STATUS.POSTADO && !content.postedAt) return status;
  return rotuloStatusPublicacao(null);
}

function itensDeUmaRede(
  contents: readonly Content[],
  platforms: readonly PlatformRef[],
  platformFilter: string,
): PublishCalendarItem[] {
  const itens: PublishCalendarItem[] = [];
  for (const content of contents) {
    if (content.deletedAt || content.archivedAt) continue;
    for (const publicacao of content.plataformas ?? []) {
      const nome = platformName(publicacao.platformId, platforms);
      if (!passaNoFiltro(publicacao.platformId, platformFilter, platforms)) continue;
      const montada = montarConta(content, publicacao, platforms);
      itens.push({
        id: `${content.id}:pub:${publicacao.id}`,
        contentId: content.id,
        date: montada.date,
        time: montada.time,
        plataformaId: publicacao.id,
        platformNames: [nome],
        posted: montada.view.posted,
        cancelled: montada.view.cancelled,
        programada: montada.view.programada,
        contas: [montada.view],
      });
    }
  }
  return itens;
}

/**
 * "Todas" agrupa por roteiro, ciclo e dia. A rede de referência não escolhe o dia:
 * contas do mesmo roteiro no mesmo dia ficam num card; outro dia vira outro card.
 * Ela só continua decidindo se um roteiro que só existe em outras redes entra nesta vista.
 * O que já foi ao ar fora dela continua no calendário, também agrupado por dia.
 * Uma rede mostra um card por publicação dela.
 */
export function buildPublishCalendarItems(input: {
  contents: readonly Content[];
  platforms: readonly PlatformRef[];
  series: readonly GradeSerie[];
  redeReferenciaId: string | null;
  platformFilter?: string;
}): PublishCalendarItem[] {
  const platformFilter = input.platformFilter || TODAS_AS_REDES;
  if (platformFilter !== TODAS_AS_REDES) {
    return itensDeUmaRede(input.contents, input.platforms, platformFilter);
  }

  const referenciaId = input.redeReferenciaId
    ? canonicalPlatformId(input.redeReferenciaId, input.platforms)
    : null;
  if (!referenciaId) {
    return input.contents.flatMap(content => itensDoConteudo(content, input.platforms));
  }

  const naGrade = new Set(buildGradeEntries({
    contents: input.contents,
    series: input.series,
    settings: { redeReferenciaId: referenciaId },
    platforms: input.platforms,
  }).map(entry => entry.contentId));

  return input.contents.flatMap(content => {
    if (content.deletedAt || content.archivedAt) return [];
    if (naGrade.has(content.id)) return itensDoConteudo(content, input.platforms);
    return itensPublicadosForaDaGrade(content, input.platforms);
  });
}
