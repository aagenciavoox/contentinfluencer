import {addDays, format, getISODay, parseISO} from 'date-fns';
import type {Content, Platform} from '../../../lib/database.ts';
import {redeDaConta} from '../../contas/lib/contas.ts';
import {semanaDe} from '../../editorial/lib/periodoEditorial.ts';
import {formatoDaPublicacao, grupoDoFormato} from '../../editorial/lib/publicacoes.ts';
import type {PausaEditorial} from '../../editorial/lib/pausas.ts';
import {
  nomeDaEtapaNaTela,
  pendenciasDoRoteiro,
  PENDENCIA_LABEL,
  rotuloDasPendencias,
} from '../../contents/lib/esteiraDisplay.ts';
import {buildPublishCalendarItems} from '../../editorial-calendar/lib/publishCalendarItems.ts';
import {diasDePausa} from '../../editorial/lib/pausas.ts';
import type {GradeSerie} from '../../editorial/lib/gradeEntries.ts';

export type ItemPendenciaDoDia = {
  contentId: string;
  titulo: string;
  date: string;
  etapa: string;
  pendencias: string[];
  texto: string;
};

function diaIso(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return format(value, 'yyyy-MM-dd');
}

/** Próximo dia de gravação depois de hoje (não inclui hoje). */
function proximaGravacao(
  hoje: string,
  diasGravacao: readonly number[],
): string | null {
  if (diasGravacao.length === 0) return null;
  const base = parseISO(hoje);
  for (let offset = 1; offset <= 14; offset += 1) {
    const candidato = addDays(base, offset);
    if (diasGravacao.includes(getISODay(candidato))) return diaIso(candidato);
  }
  return null;
}

function noIntervalo(data: string, inicio: string, fim: string): boolean {
  return data >= inicio && data <= fim;
}

/**
 * Postagem dentro da antecedência: de hoje até hoje + N dias, inclusive.
 * Sexta com 3 dias inclui o que posta de hoje até segunda. Não é a semana do calendário.
 */
export function postagemNaAntecedencia(data: string, hoje: string, antecedencia: number): boolean {
  if (!Number.isInteger(antecedencia) || antecedencia < 0) return false;
  const inicioJanela = diaIso(addDays(parseISO(data), -antecedencia));
  return hoje >= inicioJanela && hoje <= data;
}

/**
 * Itens do Calendário que ainda têm pendência e disparam aviso hoje:
 * dia de gravar (até a véspera da próxima) ou antecedência da postagem.
 */
export function itensPendenciaDoDia(input: {
  contents: readonly Content[];
  platforms: readonly Platform[];
  series: readonly GradeSerie[];
  redeReferenciaId: string | null;
  diasGravacao?: readonly number[];
  antecedenciaPostagemDias?: number | null;
  pausas?: readonly PausaEditorial[];
  hoje?: Date | string;
}): ItemPendenciaDoDia[] {
  const hoje = diaIso(input.hoje ?? new Date());
  const diasGravacao = input.diasGravacao ?? [];
  const antecedencia = input.antecedenciaPostagemDias ?? null;
  if (diasGravacao.length === 0 && (antecedencia == null || antecedencia < 0)) return [];

  const hojeDate = parseISO(hoje);
  const ehDiaGravar = diasGravacao.includes(getISODay(hojeDate));
  const janelaPausa = {
    inicio: hoje,
    fim: addDays(hojeDate, 14).toISOString().slice(0, 10),
  };
  const pausados = new Set([
    ...diasDePausa(input.pausas ?? [], {tipo: 'gravacao'}, janelaPausa),
    ...diasDePausa(input.pausas ?? [], {tipo: 'producao'}, janelaPausa),
  ]);
  const loteGravarAtivo = ehDiaGravar && !pausados.has(hoje);
  const ate = loteGravarAtivo ? proximaGravacao(hoje, diasGravacao) : null;
  const fimLote = ate ? diaIso(addDays(parseISO(ate), -1)) : hoje;

  const itens = buildPublishCalendarItems({
    contents: input.contents as Content[],
    platforms: input.platforms,
    series: input.series,
    redeReferenciaId: input.redeReferenciaId,
  });

  const vistos = new Set<string>();
  const resultado: ItemPendenciaDoDia[] = [];

  for (const item of itens) {
    if (!item.date || item.posted || item.cancelled) continue;
    const content = input.contents.find(candidato => candidato.id === item.contentId);
    if (!content || content.deletedAt || content.archivedAt) continue;

    const pendencias = pendenciasDoRoteiro(content, input.platforms);
    if (pendencias.length === 0) continue;

    const data = item.date.slice(0, 10);
    let entra = false;
    if (loteGravarAtivo && (data < hoje || noIntervalo(data, hoje, fimLote))) entra = true;
    if (antecedencia != null && postagemNaAntecedencia(data, hoje, antecedencia)) entra = true;
    if (!entra) continue;

    const chave = `${content.id}:${data}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const labels = pendencias.map(itemPendencia => PENDENCIA_LABEL[itemPendencia]);
    const etapa = nomeDaEtapaNaTela(content, input.platforms);
    resultado.push({
      contentId: content.id,
      titulo: content.title?.trim() || 'Sem título',
      date: data,
      etapa,
      pendencias: labels,
      texto: `${content.title?.trim() || 'Sem título'} · ${etapa}: ${rotuloDasPendencias(pendencias)}.`,
    });
  }

  return resultado.sort((a, b) => a.date.localeCompare(b.date) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

const DIA_CURTO = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

export type AvisoDeGravacaoAntecedencia = {
  texto: string;
  contentIds: string[];
  inicio: string;
  fim: string;
  aGravar: number;
  aMais: number;
};

function diaGravado(content: Pick<Content, 'recordedAt'>): string | null {
  const dia = content.recordedAt?.slice(0, 10);
  return dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : null;
}

function datasDePostagem(content: Content): string[] {
  const dasContas = (content.plataformas ?? [])
    .map(publicacao => publicacao.publishDate?.slice(0, 10))
    .filter((data): data is string => Boolean(data));
  if (dasContas.length > 0) return [...new Set(dasContas)];
  const data = content.publishDate?.slice(0, 10);
  return data ? [data] : [];
}

/** Só peça de câmera: reels, short, vídeo longo e o vídeo do TikTok (reels). Stories, carrossel e imagem ficam de fora. Um roteiro conta uma vez. */
function ehRoteiroDeCamera(content: Content, platforms: readonly Platform[]): boolean {
  const publicacoes = content.plataformas ?? [];
  const formatos = publicacoes.length === 0
    ? [formatoDaPublicacao(content, null)]
    : publicacoes.map(publicacao => formatoDaPublicacao(
      content,
      redeDaConta(platforms.find(conta => conta.id === publicacao.platformId) ?? null),
      publicacao,
    ));
  return formatos.some(formato => grupoDoFormato(formato) === 'gravacao');
}

function textoDaGravacao(aGravar: number, aMais: number, ate: string): string {
  const videos = aGravar === 1 ? '1 vídeo' : `${aGravar} vídeos`;
  const mais = aMais === 1 ? '1 a mais' : `${aMais} a mais`;
  const dia = DIA_CURTO[getISODay(parseISO(ate))] ?? 'o prazo';
  return `Você vai precisar gravar ${videos} até ${dia}, e isso é ${mais} do que cabe na sua meta desta semana.`;
}

/**
 * Roteiros de câmera ainda sem recorded_at na janela da antecedência.
 * Com meta de gravação da semana, compara com ela. Sem essa meta, compara com o teto de postagem.
 * a mais = aGravar − (meta da semana − já gravados nesta semana). Sem antecedência, não avisa.
 */
export function avisoDeGravacaoAntecedencia(input: {
  contents: readonly Content[];
  platforms?: readonly Platform[];
  antecedenciaPostagemDias?: number | null;
  limiteSemanal?: number | null;
  /** Meta de gravação da semana. Vazia: usa `limiteSemanal`. */
  gravacaoMetaSemanal?: number | null;
  hoje?: Date | string;
}): AvisoDeGravacaoAntecedencia | null {
  const antecedencia = input.antecedenciaPostagemDias;
  if (antecedencia == null || !Number.isInteger(antecedencia) || antecedencia < 0) return null;
  const gravacao = input.gravacaoMetaSemanal;
  const metaDaSemana = gravacao != null && Number.isFinite(gravacao) && gravacao > 0 ? gravacao : input.limiteSemanal;
  if (metaDaSemana == null || !Number.isFinite(metaDaSemana) || metaDaSemana < 0) return null;

  const hoje = diaIso(input.hoje ?? new Date());
  const fim = diaIso(addDays(parseISO(hoje), antecedencia));
  const semana = semanaDe(hoje);
  const platforms = input.platforms ?? [];
  const aGravarIds: string[] = [];
  const vistos = new Set<string>();
  let jaGravadosNestaSemana = 0;

  for (const content of input.contents) {
    if (vistos.has(content.id) || content.deletedAt || content.archivedAt) continue;
    vistos.add(content.id);
    if (!ehRoteiroDeCamera(content, platforms)) continue;
    const gravado = diaGravado(content);
    if (gravado && noIntervalo(gravado, semana.inicio, semana.fim)) jaGravadosNestaSemana += 1;
    if (gravado) continue;
    const entra = datasDePostagem(content).some(data => postagemNaAntecedencia(data, hoje, antecedencia));
    if (!entra) continue;
    aGravarIds.push(content.id);
  }

  const aGravar = aGravarIds.length;
  const aMais = aGravar - (metaDaSemana - jaGravadosNestaSemana);
  if (aGravar === 0 || aMais <= 0) return null;
  return {
    texto: textoDaGravacao(aGravar, aMais, fim),
    contentIds: aGravarIds,
    inicio: hoje,
    fim,
    aGravar,
    aMais,
  };
}
