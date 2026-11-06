import type { IntervaloAvaliado, LinhaContinuidade, Continuidade } from './saudeIndicadores.ts';
import { diasDePausa, type PausaEditorial } from '../../editorial/lib/pausas.ts';

/** Estado visual de uma janela na régua (mesma regra da Saúde). */
export type MarcaDaJanela = 'atendida' | 'reservada' | 'buraco' | 'pausada';

export type MarcaRegua = {
  inicio: string;
  fim: string;
  marca: MarcaDaJanela;
  /** Meta da janela (episódios pedidos). */
  meta: number;
  /** Episódios + reservas posicionados. */
  quantidade: number;
};

export type LinhaDaRegua = {
  chave: string;
  serieId: string;
  temporadaId: string | null;
  nome: string;
  tipo: 'serie' | 'quadro' | 'temporada';
  paiNome: string | null;
  /** Texto curto da frequência (já formatado pela continuidade). */
  frequencia: string;
  marcas: MarcaRegua[];
  /** Alguma janela inteira em pausa de publicação ou da série. */
  seriePausada: boolean;
  /** Só wave: progresso "Wave 3/12", quando existir. */
  progressoTexto: string | null;
};

/** Classe CSS aplicada no dia com pausa de publicação. */
export const CLASSE_DIA_PAUSA_PUBLICACAO = 'planejamento-dia-pausado';

/**
 * Marca de uma janela: pausada > atendida > reservada > buraco.
 * Espelha IntervaloAvaliado / EstadoDaJanela da apuração.
 */
export function marcaDaJanela(intervalo: Pick<IntervaloAvaliado, 'estado' | 'pausada'>): MarcaDaJanela {
  if (intervalo.pausada) return 'pausada';
  if (intervalo.estado === 'atendida') return 'atendida';
  if (intervalo.estado === 'reservada') return 'reservada';
  return 'buraco';
}

/** Uma marca por janela do período visível. */
export function marcasDaLinha(linha: Pick<LinhaContinuidade<unknown>, 'intervalos'>): MarcaRegua[] {
  return linha.intervalos.map(intervalo => ({
    inicio: intervalo.inicio,
    fim: intervalo.fim,
    marca: marcaDaJanela(intervalo),
    meta: intervalo.meta,
    quantidade: intervalo.quantidade,
  }));
}

function progressoTextoDaLinha(linha: LinhaContinuidade<unknown>): string | null {
  const progresso = linha.progresso;
  if (!progresso) return null;
  return `Wave ${progresso.publicados}/${progresso.total}`;
}

/** Linhas ativas da continuidade → formato da régua. */
export function linhasDaRegua(continuidade: Continuidade<unknown> | null | undefined): LinhaDaRegua[] {
  if (!continuidade || continuidade.nenhumaAcompanhada) return [];
  return continuidade.linhas.map(linha => ({
    chave: linha.chave,
    serieId: linha.serieId,
    temporadaId: linha.temporadaId ?? null,
    nome: linha.nome,
    tipo: linha.tipo,
    paiNome: linha.paiNome,
    frequencia: linha.frequencia,
    marcas: marcasDaLinha(linha),
    seriePausada: (linha.pausadas?.length ?? 0) > 0 || linha.intervalos.some(item => item.pausada),
    progressoTexto: linha.tipo === 'temporada' ? progressoTextoDaLinha(linha) : null,
  }));
}

/**
 * Selo "Só no plano" = post-it sem roteiro (sem contentId).
 * Se a vista só tem reservas, não carimba ninguém — o selo perde o sentido.
 */
export function textoSeloSoNoPlano(input: {
  semRoteiro: boolean;
  /** Há pelo menos um item com roteiro na vista da grade. */
  vistaTemRoteiro: boolean;
}): string | null {
  if (!input.semRoteiro) return null;
  if (!input.vistaTemRoteiro) return null;
  return 'Só no plano';
}

/** True se algum post-it da vista já tem roteiro ligado. */
export function vistaTemRoteiroNosPostIts(
  postIts: readonly { contentId?: string | null }[],
): boolean {
  return postIts.some(item => Boolean(item.contentId));
}

/**
 * Dias com pausa de publicação (escopo global), para hachurar a grade.
 * Não inclui gravação, produção, conta nem série.
 */
export function diasDePausaPublicacao(
  pausas: readonly PausaEditorial[],
  intervalo: { inicio: string; fim: string },
): string[] {
  return diasDePausa(pausas, { tipo: 'publicacao' }, intervalo);
}

export function setDiasPausaPublicacao(
  pausas: readonly PausaEditorial[],
  intervalo: { inicio: string; fim: string },
): ReadonlySet<string> {
  return new Set(diasDePausaPublicacao(pausas, intervalo));
}

/** Classe extra do dia, ou undefined se não estiver pausado. */
export function classeDiaPausaPublicacao(
  dateKey: string,
  diasPausados: ReadonlySet<string> | readonly string[] | null | undefined,
): string | undefined {
  if (!diasPausados) return undefined;
  const tem = diasPausados instanceof Set
    ? diasPausados.has(dateKey)
    : (diasPausados as readonly string[]).includes(dateKey);
  return tem ? CLASSE_DIA_PAUSA_PUBLICACAO : undefined;
}

/** Junta a classe de pausa a outras classes do dia (getDayClassName / célula). */
export function comClasseDiaPausaPublicacao(
  outras: string | undefined,
  dateKey: string,
  diasPausados: ReadonlySet<string> | readonly string[] | null | undefined,
): string | undefined {
  const pausa = classeDiaPausaPublicacao(dateKey, diasPausados);
  if (!pausa && !outras) return undefined;
  if (!pausa) return outras;
  if (!outras) return pausa;
  return `${outras} ${pausa}`;
}

/** Rótulo acessível de uma marca (voz gentil, sem cobrança). */
export function rotuloDaMarca(marca: MarcaDaJanela): string {
  switch (marca) {
    case 'atendida':
      return 'janela atendida';
    case 'reservada':
      return 'só com reserva';
    case 'pausada':
      return 'em pausa';
    case 'buraco':
      return 'ainda em aberto';
  }
}

/**
 * Resumo curto da régua fechada (celular, faixa "Ritmo").
 * Conta as marcas de todas as linhas; voz gentil, sem cobrança.
 */
export function resumoDaRegua(linhas: readonly Pick<LinhaDaRegua, 'marcas'>[]): string {
  const conta: Record<MarcaDaJanela, number> = { atendida: 0, reservada: 0, buraco: 0, pausada: 0 };
  for (const linha of linhas) for (const marca of linha.marcas) conta[marca.marca] += 1;
  const total = conta.atendida + conta.reservada + conta.buraco + conta.pausada;
  if (total === 0) return 'Sem janela neste período';
  const partes: string[] = [];
  if (conta.buraco > 0) partes.push(conta.buraco === 1 ? '1 janela em aberto' : `${conta.buraco} janelas em aberto`);
  if (conta.reservada > 0) partes.push(`${conta.reservada} só com reserva`);
  if (partes.length > 0) return partes.join(' · ');
  if (conta.atendida === 0) return 'Em pausa';
  return 'Tudo atendido';
}

/** Link canônico para editar a wave no Editorial (Continuidade). */
export function hrefEditorialDaWave(temporadaId: string): string {
  return `/editorial?aba=continuidade&editar=${encodeURIComponent(`t:${temporadaId}`)}`;
}

/** Link canônico para editar série/quadro no Editorial. */
export function hrefEditorialDaSerie(serieId: string): string {
  return `/editorial?aba=continuidade&editar=${encodeURIComponent(`s:${serieId}`)}`;
}
