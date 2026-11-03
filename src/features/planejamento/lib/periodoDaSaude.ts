import { format, parseISO } from 'date-fns';
import { decisaoDoPeriodo } from '../../editorial/lib/periodoEditorial.ts';
import type { DecisaoPeriodo } from '../../editorial/lib/editorialSettings.ts';
import { metaComAjuste } from '../../editorial/lib/vigencias.ts';

/**
 * Saúde e distribuição por pilar do Planejamento seguem o período salvo no Editorial
 * (editorial_visao), não o mês visível do calendário. Só calcula.
 */

type Intervalo = { inicio: string; fim: string };

/** "Período: 16/10 – 30/12"; com anos diferentes (ou fora do ano de hoje), mostra o ano. */
export function rotuloDoPeriodo(periodo: Intervalo, hoje: Date = new Date()): string {
  const ini = parseISO(periodo.inicio);
  const fim = parseISO(periodo.fim);
  const anoHoje = hoje.getFullYear();
  const comAno = ini.getFullYear() !== fim.getFullYear() || fim.getFullYear() !== anoHoje;
  const fmt = comAno ? 'dd/MM/yyyy' : 'dd/MM';
  return `Período: ${format(ini, fmt)} – ${format(fim, fmt)}`;
}

/** Quanto do que o calendário mostra está dentro do período da saúde. */
export function relacaoComCalendario(periodo: Intervalo, visivel: Intervalo): 'dentro' | 'parcial' | 'fora' {
  if (visivel.fim < periodo.inicio || visivel.inicio > periodo.fim) return 'fora';
  return visivel.inicio >= periodo.inicio && visivel.fim <= periodo.fim ? 'dentro' : 'parcial';
}

/** Aviso curto quando o calendário mostra datas fora do período da saúde. */
export function avisoDoCalendario(periodo: Intervalo, visivel: Intervalo): string | null {
  const relacao = relacaoComCalendario(periodo, visivel);
  if (relacao === 'dentro') return null;
  return relacao === 'fora'
    ? 'O calendário mostra datas fora deste período; a saúde não conta essas datas.'
    : 'Parte das datas do calendário fica fora deste período e não entra na saúde.';
}

/** Meta de publicação escrita em "Ajustar metas" do mesmo período vale no lugar do ritmo. */
export function comMetaDoPeriodo<T extends { limite: number | null; totalMeta?: number | null }>(
  counts: T,
  periodos: readonly DecisaoPeriodo[],
  periodo: Intervalo,
): T {
  const ajustada = decisaoDoPeriodo(periodos, periodo.inicio, periodo.fim)?.metasPublicacao;
  if (ajustada == null) return counts;
  const limite = metaComAjuste(ajustada, counts.limite);
  return { ...counts, limite, totalMeta: limite };
}

export type LinhaDistribuicao = { id: string; pautas: number; atualPct: number };

/**
 * "Atual" da distribuição: a fatia de cada pilar entre os itens do período que têm pilar
 * (cada roteiro uma vez; o pilar já vem herdado post-it → conteúdo → série). As fatias somam 100%.
 * Itens sem pilar não entram na conta: aparecem à parte, em "Sem pilar".
 */
export function distribuicaoPorPilar(
  pilaresIds: readonly string[],
  linhas: readonly { id: string; planejado: number }[],
  totalDoPeriodo: number,
): { linhas: LinhaDistribuicao[]; semPilar: number; comPilar: number } {
  const contagem = pilaresIds.map(id => ({ id, pautas: linhas.find(linha => linha.id === id)?.planejado ?? 0 }));
  const comPilar = contagem.reduce((soma, item) => soma + item.pautas, 0);
  const todosComPilar = linhas.reduce((soma, linha) => soma + linha.planejado, 0);
  const semPilar = Math.max(0, totalDoPeriodo - todosComPilar);
  if (comPilar === 0) return { linhas: contagem.map(item => ({ ...item, atualPct: 0 })), semPilar, comPilar };
  // Maiores restos: arredonda sem perder nem sobrar ponto percentual.
  const brutos = contagem.map(item => (item.pautas / comPilar) * 100);
  const pisos = brutos.map(Math.floor);
  let faltam = 100 - pisos.reduce((soma, v) => soma + v, 0);
  const ordem = brutos.map((v, i) => [v - pisos[i], i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of ordem) { if (faltam <= 0) break; pisos[i] += 1; faltam -= 1; }
  return { linhas: contagem.map((item, i) => ({ ...item, atualPct: pisos[i] })), semPilar, comPilar };
}
