import type { IntervaloAvaliado, LinhaContinuidade, Continuidade } from './saudeIndicadores.ts';
import { idsComAncestrais } from '../../editorial/lib/acompanhamento.ts';
import { diasDePausa, type PausaEditorial } from '../../editorial/lib/pausas.ts';
import { semanasNoIntervalo } from '../../editorial/lib/periodoEditorial.ts';

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

/**
 * O card desta série, neste dia, está em pausa de série.
 * Pausa na família vale para a série filha, como na continuidade. Pausa de publicação não marca o card: o dia inteiro já é hachurado.
 */
export function seriePausadaNoDia(
  serieId: string | null | undefined,
  dia: string | null | undefined,
  pausas: readonly PausaEditorial[],
  series: readonly { id: string; parentId?: string | null }[],
): boolean {
  const data = dia?.slice(0, 10);
  if (!serieId || !data) return false;
  const ids = idsComAncestrais(serieId, series);
  return pausas.some(pausa =>
    pausa.escopo === 'serie'
    && pausa.serieId != null
    && ids.has(pausa.serieId)
    && pausa.inicio <= data
    && pausa.fim >= data,
  );
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
  return `/editorial?editar=${encodeURIComponent(`t:${temporadaId}`)}`;
}

/** Link canônico para editar série/quadro no Editorial. */
export function hrefEditorialDaSerie(serieId: string): string {
  return `/editorial?editar=${encodeURIComponent(`s:${serieId}`)}`;
}

export type ColunaDaRegua = { inicio: string; fim: string };

/** Semanas segunda–domingo cobertas pelas marcas visíveis, na ordem do período. */
export function colunasDaRegua(linhas: readonly Pick<LinhaDaRegua, 'marcas'>[]): ColunaDaRegua[] {
  let inicio: string | null = null;
  let fim: string | null = null;
  for (const linha of linhas) {
    for (const marca of linha.marcas) {
      if (inicio === null || marca.inicio < inicio) inicio = marca.inicio;
      if (fim === null || marca.fim > fim) fim = marca.fim;
    }
  }
  if (inicio === null || fim === null) return [];
  return semanasNoIntervalo(inicio, fim).map(semana => ({
    inicio: semana.inicio,
    fim: semana.fim,
  }));
}

export type CelulaDaRegua =
  | { tipo: 'vazia'; coluna: number }
  | { tipo: 'marca'; coluna: number; span: number; marca: MarcaRegua; ciclo: number | null };

function diasInclusivos(inicio: string, fim: string): number {
  const a = Date.parse(`${inicio}T00:00:00Z`);
  const b = Date.parse(`${fim}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

/**
 * Encaixa cada marca na semana que ela atravessa.
 * Meta de 14 dias vira "Ciclo N" e ocupa as colunas que o ciclo cobre.
 */
export function celulasDaLinha(
  marcas: readonly MarcaRegua[],
  colunas: readonly ColunaDaRegua[],
): CelulaDaRegua[] {
  const blocos: Array<Extract<CelulaDaRegua, { tipo: 'marca' }>> = [];
  let ciclo = 0;
  for (const marca of marcas) {
    const indices = colunas
      .map((coluna, indice) => (marca.inicio <= coluna.fim && marca.fim >= coluna.inicio ? indice : -1))
      .filter(indice => indice >= 0);
    if (indices.length === 0) continue;
    const coluna = indices[0];
    const span = indices[indices.length - 1] - coluna + 1;
    const dias = diasInclusivos(marca.inicio, marca.fim);
    const eCiclo = dias >= 12 && dias <= 16;
    if (eCiclo) ciclo += 1;
    blocos.push({ tipo: 'marca', coluna, span, marca, ciclo: eCiclo ? ciclo : null });
  }

  const celulas: CelulaDaRegua[] = [];
  let indice = 0;
  while (indice < colunas.length) {
    const bloco = blocos.find(item => item.coluna === indice);
    if (bloco) {
      celulas.push(bloco);
      indice += bloco.span;
      continue;
    }
    const coberta = blocos.some(item => indice > item.coluna && indice < item.coluna + item.span);
    if (!coberta) celulas.push({ tipo: 'vazia', coluna: indice });
    indice += 1;
  }
  return celulas;
}

export type LinhaNaRegua = { linha: LinhaDaRegua; filha: boolean };

/** Quadro e wave ficam logo abaixo da série pai, recuados. O resto mantém a ordem. */
export function ordemDaRegua(linhas: readonly LinhaDaRegua[]): LinhaNaRegua[] {
  const serieIds = new Set(linhas.filter(linha => linha.tipo === 'serie').map(linha => linha.serieId));
  const nomeParaId = new Map(
    linhas.filter(linha => linha.tipo === 'serie').map(linha => [linha.nome, linha.serieId]),
  );
  const filhos = new Map<string, LinhaDaRegua[]>();
  const soltas: LinhaDaRegua[] = [];

  for (const linha of linhas) {
    if (linha.tipo === 'serie') continue;
    const paiId = linha.tipo === 'temporada'
      ? (serieIds.has(linha.serieId) ? linha.serieId : null)
      : (nomeParaId.get(linha.paiNome ?? '') ?? null);
    if (!paiId) {
      soltas.push(linha);
      continue;
    }
    const lista = filhos.get(paiId) ?? [];
    lista.push(linha);
    filhos.set(paiId, lista);
  }

  const saida: LinhaNaRegua[] = [];
  for (const linha of linhas) {
    if (linha.tipo !== 'serie') continue;
    saida.push({ linha, filha: false });
    for (const filha of filhos.get(linha.serieId) ?? []) saida.push({ linha: filha, filha: true });
  }
  for (const linha of soltas) saida.push({ linha, filha: false });
  return saida;
}
