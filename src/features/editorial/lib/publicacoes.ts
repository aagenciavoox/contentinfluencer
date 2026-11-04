import type { Content, ContentPlataforma, FuncaoEditorial, RedeSocial } from '../../../lib/database.ts';
import { redeDaConta, type ContaRef } from '../../contas/lib/contas.ts';
import { cicloDaPublicacao } from './cicloPublicacao.ts';
import { contaNaGradeEfetiva } from './contaNaGradeOrigem.ts';
import { etapaDoStatus, type Etapa } from './etapas.ts';
import { normalizarFormato } from './funcoes.ts';
import { FUSO_PADRAO, noFuso, hojeNoFuso } from './fuso.ts';
import { objetivoDoConteudo, type SerieClassificacao } from './herancaSerie.ts';
import { dataRealizada } from './markPublished.ts';
import { normalizePublicacaoStatus } from './publicacaoSituacao.ts';

/**
 * Publicações por conta: cada ocorrência de um conteúdo numa conta, num ciclo, com data própria.
 * Um roteiro em três contas é um conteúdo e três publicações; isso não vira três produções.
 * Só lê e calcula: nada é gravado e nenhuma situação é inventada.
 */

/**
 * Formato da publicação. `sem-classificacao` quando os dados não dizem: um conteúdo no YouTube
 * sem formato não é tratado como vídeo longo nem como Short.
 */
export type FormatoPublicacao =
  | 'reels'
  | 'short'
  | 'video-longo'
  | 'carrossel'
  | 'post-estatico'
  | 'stories'
  | 'live'
  | 'sem-classificacao'
  | `outro:${string}`;

/** Formatos que dividem a meta de uma conta, por rede. Stories ficam fora: não contam nas metas. */
export const FORMATOS_DA_REDE: Partial<Record<RedeSocial, readonly FormatoPublicacao[]>> = {
  youtube: ['short', 'video-longo'],
  instagram: ['reels', 'carrossel', 'post-estatico'],
  tiktok: ['reels', 'carrossel'],
};

const ROTULO_FORMATO: Record<string, string> = {
  reels: 'Reels',
  short: 'Shorts',
  'video-longo': 'Vídeo longo',
  carrossel: 'Carrossel',
  'post-estatico': 'Post estático',
  stories: 'Stories',
  live: 'Live',
  'sem-classificacao': 'Sem formato',
};

/** Nome do formato na rede: no TikTok o vídeo curto não se chama Reels. */
export function rotuloDoFormato(formato: string, rede?: RedeSocial | null): string {
  if (formato === 'reels' && rede === 'tiktok') return 'Vídeo';
  if (formato.startsWith('outro:')) return formato.slice('outro:'.length);
  return ROTULO_FORMATO[formato] ?? formato;
}

/**
 * - realizada: publicada na conta (data real quando registrada).
 * - prevista: data futura (ou hoje, ainda sem passar do horário).
 * - vencida: a data prevista passou e a conta não registrou publicação. Não comprova nada.
 * - sem-data: conta prevista, sem data.
 */
export type SituacaoNaAgenda = 'realizada' | 'prevista' | 'vencida' | 'sem-data';

export type PublicacaoNaAgenda = {
  /** Id da linha de content_plataformas. */
  id: string;
  contentId: string;
  /** Série ou quadro do conteúdo. */
  serieId: string | null;
  platformId: string;
  rede: RedeSocial | null;
  ciclo: number;
  formato: FormatoPublicacao;
  /** yyyy-MM-dd no fuso do perfil. Null em sem-data. */
  data: string | null;
  /** HH:mm, quando houver. */
  hora: string | null;
  situacao: SituacaoNaAgenda;
  /** Marcador da agenda interna. Não confirma agendamento na rede: o app não integra com ela. */
  programado: boolean;
  /** Fica fora das metas quando o conteúdo ou o ciclo não conta (Stories, desligado à mão). */
  contaNaMeta: boolean;
  /** Etapa do conteúdo; publicada nesta conta vira postado só aqui. */
  etapa: Etapa;
  /** Objetivo do conteúdo, com a mesma regra da ficha e da Saúde. */
  objetivo: FuncaoEditorial | null;
};

const FORMATOS_CONHECIDOS: Record<string, FormatoPublicacao> = {
  reels: 'reels',
  reel: 'reels',
  short: 'short',
  shorts: 'short',
  'video longo': 'video-longo',
  'video-longo': 'video-longo',
  longo: 'video-longo',
  carrossel: 'carrossel',
  'post estatico': 'post-estatico',
  'post-estatico': 'post-estatico',
  estatico: 'post-estatico',
  stories: 'stories',
  story: 'stories',
  live: 'live',
};

export type OrigemDoFormatoNoYoutube = 'escolhido' | 'conteudo' | 'deduzido';

/**
 * No YouTube toda publicação é Shorts ou vídeo longo (decisão de 03/11): vale a escolha feita na
 * publicação; sem ela, o formato escrito no conteúdo; sem nada escrito, o roteiro no modo YouTube é
 * vídeo longo e o resto é Shorts. A ficha mostra de onde veio, e dá para trocar.
 */
export function formatoNoYoutube(
  content: Pick<Content, 'formatoVisual'> & Partial<Pick<Content, 'writingMode'>>,
  publicacao?: Pick<ContentPlataforma, 'formatoPublicacao'> | null,
): { formato: 'short' | 'video-longo'; origem: OrigemDoFormatoNoYoutube } {
  if (publicacao?.formatoPublicacao) return { formato: publicacao.formatoPublicacao, origem: 'escolhido' };
  const escrito = normalizarFormato(content.formatoVisual);
  const conhecido = escrito ? FORMATOS_CONHECIDOS[escrito] : undefined;
  if (conhecido === 'video-longo') return { formato: 'video-longo', origem: 'conteudo' };
  if (conhecido === 'reels' || conhecido === 'short') return { formato: 'short', origem: 'conteudo' };
  return { formato: !escrito && content.writingMode === 'youtube' ? 'video-longo' : 'short', origem: 'deduzido' };
}

/**
 * Formato pela ficha do conteúdo e pela rede da conta:
 * o formato escrito vale; sem ele, o modo de escrita YouTube é vídeo longo e o modo carrossel é carrossel.
 * No YouTube é sempre Shorts ou vídeo longo (`formatoNoYoutube`); live continua live.
 * Nas outras redes, sem nenhum desses dados, sem classificação.
 */
export function formatoDaPublicacao(
  content: Pick<Content, 'formatoVisual'> & Partial<Pick<Content, 'writingMode'>>,
  rede: RedeSocial | null,
  publicacao?: Pick<ContentPlataforma, 'formatoPublicacao'> | null,
): FormatoPublicacao {
  const escrito = normalizarFormato(content.formatoVisual);
  if (rede === 'youtube' && FORMATOS_CONHECIDOS[escrito] !== 'live') return formatoNoYoutube(content, publicacao).formato;
  if (publicacao?.formatoPublicacao) return publicacao.formatoPublicacao;
  let formato: FormatoPublicacao | null = escrito ? FORMATOS_CONHECIDOS[escrito] ?? `outro:${escrito}` : null;
  if (!formato && content.writingMode === 'youtube') formato = 'video-longo';
  if (!formato && content.writingMode === 'carrossel') formato = 'carrossel';
  if (formato === 'reels' && rede === 'youtube') return 'short';
  return formato ?? 'sem-classificacao';
}

type ConteudoDaAgenda = Pick<
  Content,
  'id' | 'status' | 'formatoVisual' | 'deletedAt' | 'contaNaGrade' | 'seriesId' | 'funcao'
> & Partial<Pick<Content, 'writingMode' | 'archivedAt' | 'contaNaGradeOrigem' | 'funcaoOrigem' | 'classificacaoCongeladaEm' | 'postedAt'>> & {
  plataformas?: ContentPlataforma[] | null;
};

function dia(value: string | null | undefined): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value?.trim() ?? '');
  return match?.[1] ?? null;
}

function horaDe(value: string | null | undefined): string | null {
  const match = /(\d{2}):(\d{2})/.exec(value?.trim() ?? '');
  return match ? `${match[1]}:${match[2]}` : null;
}

/**
 * Programado: publicação não feita, data futura e conteúdo em Produção ou Edição.
 * Com horário, compara o instante; só com data, futura é depois de hoje.
 * Em Ideia ou Roteiro não marca: a agenda mostra a etapa e a data prevista.
 */
export function publicacaoProgramada(input: {
  situacao: SituacaoNaAgenda;
  etapa: Etapa;
  data: string | null;
  hora: string | null;
  agora: { data: string; hora: string };
}): boolean {
  if (input.situacao === 'realizada' || !input.data) return false;
  if (input.etapa !== 'producao' && input.etapa !== 'edicao') return false;
  if (input.hora) return `${input.data}T${input.hora}` > `${input.agora.data}T${input.agora.hora}`;
  return input.data > input.agora.data;
}

/**
 * Todas as publicações dos conteúdos, uma por conta e ciclo.
 * Não publicada e removida ficam fora. Lixeira e arquivados também.
 */
export function publicacoesDaAgenda(input: {
  contents: readonly ConteudoDaAgenda[];
  contas: readonly ContaRef[];
  series?: readonly SerieClassificacao[];
  agora?: Date;
  fuso?: string;
}): PublicacaoNaAgenda[] {
  const fuso = input.fuso ?? FUSO_PADRAO;
  const agora = noFuso(input.agora ?? new Date(), fuso) ?? { data: hojeNoFuso(input.agora, fuso), hora: '00:00' };
  const contaPorId = new Map(input.contas.map(conta => [conta.id, conta]));
  const series = input.series ?? [];
  const lista: PublicacaoNaAgenda[] = [];

  for (const content of input.contents) {
    if (content.deletedAt || content.archivedAt) continue;
    const objetivo = objetivoDoConteudo(content, series);
    const contaNoConteudo = contaNaGradeEfetiva({
      contaNaGrade: content.contaNaGrade !== false,
      contaNaGradeOrigem: content.contaNaGradeOrigem,
      formato: content.formatoVisual,
      funcao: objetivo,
    });
    const etapaDoConteudo = etapaDoStatus(content.status);

    for (const publicacao of content.plataformas ?? []) {
      const status = normalizePublicacaoStatus(publicacao.status);
      if (status === 'nao_publicada' || status === 'removida') continue;
      const conta = contaPorId.get(publicacao.platformId) ?? null;
      const rede = redeDaConta(conta);
      const realizada = status === 'publicada';

      // Feita: a data real da conta; sem ela, a data prevista. Prevista: a data desta conta.
      const real = realizada ? dataRealizada(publicacao) : null;
      const realNoFuso = real ? noFuso(real, fuso) : null;
      const data = realNoFuso?.data ?? dia(publicacao.publishDate);
      const hora = realNoFuso?.hora ?? horaDe(publicacao.publishTime);

      let situacao: SituacaoNaAgenda;
      if (realizada) situacao = 'realizada';
      else if (!data) situacao = 'sem-data';
      else if (data < agora.data || (data === agora.data && hora != null && hora < agora.hora)) situacao = 'vencida';
      else situacao = 'prevista';

      const etapa: Etapa = realizada ? 'postado' : etapaDoConteudo;
      lista.push({
        id: publicacao.id,
        contentId: content.id,
        serieId: content.seriesId ?? null,
        platformId: publicacao.platformId,
        rede,
        ciclo: cicloDaPublicacao(publicacao),
        formato: formatoDaPublicacao(content, rede, publicacao),
        data,
        hora,
        situacao,
        programado: publicacaoProgramada({ situacao, etapa, data, hora, agora }),
        contaNaMeta: contaNoConteudo && publicacao.contaNaGrade !== false,
        etapa,
        objetivo,
      });
    }
  }
  return lista;
}

export type ContagemDePublicacoes = {
  total: number;
  realizadas: number;
  previstas: number;
  vencidas: number;
  programadas: number;
};

export type ResumoDePublicacoes = ContagemDePublicacoes & {
  porConta: Record<string, ContagemDePublicacoes>;
  porFormato: Partial<Record<FormatoPublicacao, ContagemDePublicacoes>>;
  /** Publicações por objetivo; `semObjetivo` à parte, dentro do total. */
  porObjetivo: Partial<Record<FuncaoEditorial, number>>;
  semObjetivo: number;
  /** Conteúdos diferentes entre essas publicações: a medida de produção fica separada. */
  conteudosUnicos: number;
};

function vazia(): ContagemDePublicacoes {
  return { total: 0, realizadas: 0, previstas: 0, vencidas: 0, programadas: 0 };
}

function somar(contagem: ContagemDePublicacoes, publicacao: PublicacaoNaAgenda): void {
  contagem.total += 1;
  if (publicacao.situacao === 'realizada') contagem.realizadas += 1;
  else if (publicacao.situacao === 'vencida') contagem.vencidas += 1;
  else contagem.previstas += 1;
  if (publicacao.programado) contagem.programadas += 1;
}

/**
 * Publicações com data no período e que contam para a meta, no escopo pedido.
 * Escopo vazio = todas as contas e formatos. A conta de referência não exclui ninguém aqui.
 */
export function resumoDePublicacoes(
  publicacoes: readonly PublicacaoNaAgenda[],
  periodo: { inicio: string; fim: string },
  escopo: { platformIds?: readonly string[]; formatos?: readonly FormatoPublicacao[] } = {},
): ResumoDePublicacoes {
  const contas = escopo.platformIds && escopo.platformIds.length > 0 ? new Set(escopo.platformIds) : null;
  const formatos = escopo.formatos && escopo.formatos.length > 0 ? new Set(escopo.formatos) : null;
  const resumo: ResumoDePublicacoes = { ...vazia(), porConta: {}, porFormato: {}, porObjetivo: {}, semObjetivo: 0, conteudosUnicos: 0 };
  const conteudos = new Set<string>();
  for (const publicacao of publicacoes) {
    if (!publicacao.contaNaMeta || !publicacao.data) continue;
    if (publicacao.data < periodo.inicio || publicacao.data > periodo.fim) continue;
    if (contas && !contas.has(publicacao.platformId)) continue;
    if (formatos && !formatos.has(publicacao.formato)) continue;
    somar(resumo, publicacao);
    somar(resumo.porConta[publicacao.platformId] ??= vazia(), publicacao);
    somar(resumo.porFormato[publicacao.formato] ??= vazia(), publicacao);
    if (publicacao.objetivo) resumo.porObjetivo[publicacao.objetivo] = (resumo.porObjetivo[publicacao.objetivo] ?? 0) + 1;
    else resumo.semObjetivo += 1;
    conteudos.add(publicacao.contentId);
  }
  resumo.conteudosUnicos = conteudos.size;
  return resumo;
}
