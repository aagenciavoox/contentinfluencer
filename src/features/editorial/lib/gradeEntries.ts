import type { Content, ContentPlataforma, FuncaoEditorial, Serie } from '../../../lib/database.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { cicloDaPublicacao } from './cicloPublicacao.ts';
import { contaNaGradeEfetiva, type ContaNaGradeOrigem } from './contaNaGradeOrigem.ts';
import { type DestinoPlataforma, mesmoDestino, resolverRedeReferencia } from './destinations.ts';
import { resolveFuncao } from './funcoes.ts';
import { etapaDoStatus, type Etapa } from './etapas.ts';
import { dataRealizada } from './markPublished.ts';
import { roteiroTemPauta } from './pautaConteudo.ts';
import { pilarPrincipalDaSerie } from './pilarDaSerie.ts';
import { referenciaPublicacao } from './referenciaPublicacao.ts';

export type GradeEntry = {
  id: string;
  contentId: string;
  tipo: 'original' | 'repost';
  data: string | null;
  hora: string | null;
  contaNaGrade: boolean;
  pilarId: string | null;
  serieId: string | null;
  funcao: FuncaoEditorial | null;
  realizada: boolean;
  realizadaEm: string | null;
  /** Pauta do roteiro. O post-it ligado entra na contagem, não aqui. */
  temPauta?: boolean;
  /** Etapa do conteúdo. Postado na referência vira `postado`, qualquer que seja o status. */
  etapa?: Etapa;
  /** Só no item que nasce de um post-it na contagem do período. */
  postItId?: string | null;
};

/** A rede de referência vem das preferências. O espelho do topo continua valendo. */
export type GradeEntrySettings = {
  redeReferenciaId: string | null;
};

export type GradeContent = Pick<
  Content,
  | 'id'
  | 'status'
  | 'seriesId'
  | 'pilarId'
  | 'funcao'
  | 'funcaoOrigem'
  | 'classificacaoCongeladaEm'
  | 'contaNaGrade'
  | 'publishDate'
  | 'plataformas'
  | 'deletedAt'
> & Partial<Pick<Content, 'publishTime' | 'postedAt' | 'archivedAt' | 'formatoVisual' | 'script' | 'title' | 'pautaDefinida'>> & {
  redeReferenciaCongeladaId?: string | null;
  scriptOrigem?: 'autor' | 'modelo' | string | null;
  contaNaGradeOrigem?: ContaNaGradeOrigem | null;
  pilarOrigem?: string | null;
};

export type GradeSerie = Pick<Serie, 'id' | 'funcaoPadrao'> & Partial<Pick<Serie, 'pilarPrincipalId' | 'pilarIds'>>;

function dia(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

function horaDe(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /(\d{2}):(\d{2})/.exec(value.trim());
  return match ? `${match[1]}:${match[2]}` : null;
}

export type Quando = { date: string | null; time: string | null };

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** O instante salvo em UTC (API, postedAt) vira dia e hora locais. */
function quandoLocal(instante: string | null | undefined): Quando | null {
  if (!instante) return null;
  const date = new Date(instante);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
  };
}

/**
 * Postado fica no dia em que foi ao ar, quando essa data foi informada.
 * Sem ela, fica na data planejada e, por último, no dia em que virou Postado.
 * Ainda não postado: a data planejada, sem mudança.
 */
export function quandoDoItem(
  content: Pick<GradeContent, 'postedAt'>,
  plano: Quando,
  postado: boolean,
  realizadaEm: string | null,
): Quando {
  if (!postado) return plano;
  return quandoLocal(realizadaEm)
    ?? (plano.date ? plano : null)
    ?? quandoLocal(content.postedAt)
    ?? plano;
}

function naRede(platformId: string, redeId: string | null, platforms: readonly DestinoPlataforma[]): boolean {
  if (!redeId) return false;
  const rede = resolverRedeReferencia(redeId, platforms);
  return rede != null && mesmoDestino(platformId, rede);
}

/**
 * Entradas da grade, calculadas. Não há tabela de entradas.
 * Cada roteiro conta uma vez no ciclo 1, na data da publicação de referência —
 * mesmo quando essa publicação está fora da rede de base.
 * Ciclos 2+ (repost) saem com tipo próprio: um item por ciclo, várias redes contam uma vez.
 * Sem publicação, a data do roteiro.
 */
export function buildGradeEntries({
  contents,
  series,
  settings,
  platforms = [],
}: {
  contents: readonly GradeContent[];
  series: readonly GradeSerie[];
  settings: GradeEntrySettings;
  /** Resolve a rede de referência por id ou nome. Sem ela, só casa publicações já gravadas com o mesmo id. */
  platforms?: readonly DestinoPlataforma[];
}): GradeEntry[] {
  const seriePorId = new Map(series.map(serie => [serie.id, serie]));
  const entradas: GradeEntry[] = [];

  for (const content of contents) {
    if (content.deletedAt || content.archivedAt) continue;

    const serie = content.seriesId ? seriePorId.get(content.seriesId) : undefined;
    const resolvida = resolveFuncao(content, serie);
    const contaNaGrade = contaNaGradeEfetiva({
      contaNaGrade: content.contaNaGrade !== false,
      contaNaGradeOrigem: content.contaNaGradeOrigem,
      formato: content.formatoVisual,
      funcao: resolvida.funcao,
    });
    const classificacao = {
      pilarId: content.pilarId || pilarPrincipalDaSerie(serie),
      serieId: content.seriesId ?? null,
      funcao: resolvida.funcao,
      contaNaGrade,
      temPauta: roteiroTemPauta(content.scriptOrigem, content.script, content.pautaDefinida),
    };

    const ref = referenciaPublicacao(content, settings, platforms);
    // Só em outras redes: não preenche a grade (nem ciclo 1 nem reaproveitamento).
    if (ref.soEmOutrasRedes) continue;

    const realizada = ref.publicada
      || normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO;
    const etapa: Etapa = realizada ? 'postado' : etapaDoStatus(content.status);
    const realizadaEmOriginal = realizada
      ? (ref.publicacao ? dataRealizada(ref.publicacao) : content.postedAt ?? null)
      : null;
    const planoOriginal: Quando = { date: ref.data, time: ref.hora };
    const quandoOriginal = quandoDoItem(
      content,
      planoOriginal,
      realizada,
      ref.publicacao ? dataRealizada(ref.publicacao) : null,
    );

    entradas.push({
      id: `${content.id}:original`,
      contentId: content.id,
      tipo: 'original',
      data: quandoOriginal.date,
      hora: quandoOriginal.time,
      ...classificacao,
      realizada,
      realizadaEm: realizadaEmOriginal,
      etapa,
    });

    const publicacoes = content.plataformas ?? [];
    const porCiclo = new Map<number, ContentPlataforma[]>();
    for (const publicacao of publicacoes) {
      const ciclo = cicloDaPublicacao(publicacao);
      if (ciclo < 2) continue;
      if (publicacao.status === 'nao_publicada' || publicacao.status === 'removida') continue;
      const lista = porCiclo.get(ciclo) ?? [];
      lista.push(publicacao);
      porCiclo.set(ciclo, lista);
    }

    for (const [ciclo, lista] of [...porCiclo.entries()].sort((a, b) => a[0] - b[0])) {
      const naRef = lista.find(item => naRede(item.platformId, ref.redeBaseId, platforms));
      // Com rede de base, o ciclo só entra se tiver publicação nela (como o repost antigo).
      if (ref.redeBaseId && !naRef) continue;
      const representante = naRef
        ?? [...lista].sort((a, b) => (a.publishDate ?? '').localeCompare(b.publishDate ?? ''))[0]
        ?? lista[0];
      if (!representante) continue;
      const publicada = lista.some(item => item.status === 'publicada');
      const realizadaEmRepost = publicada
        ? (naRef && naRef.status === 'publicada' ? dataRealizada(naRef) : dataRealizada(representante))
        : null;
      const planoRepost: Quando = {
        date: dia(representante.publishDate),
        time: horaDe(representante.publishTime),
      };
      const quandoRepost = quandoDoItem(content, planoRepost, publicada, realizadaEmRepost);
      const contaCiclo = lista.every(item => item.contaNaGrade !== false);
      entradas.push({
        id: `${content.id}:ciclo:${ciclo}`,
        contentId: content.id,
        tipo: 'repost',
        data: quandoRepost.date,
        hora: quandoRepost.time,
        ...classificacao,
        contaNaGrade: classificacao.contaNaGrade && contaCiclo,
        realizada: publicada,
        realizadaEm: realizadaEmRepost,
        etapa: publicada ? 'postado' : etapa,
      });
    }
  }

  return entradas;
}
