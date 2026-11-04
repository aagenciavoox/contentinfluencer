import {eachDayOfInterval, format, isValid, parseISO} from 'date-fns';
import {ROTULO_REDE_DO_FILTRO} from '../../contas/lib/contas.ts';
import type {FiltroCalendario} from './filtroCalendario.ts';
import type {Content, RecordingBlock, RedeSocial} from '../../../lib/database.ts';
import type {GradeEntry} from '../../editorial/lib/gradeEntries.ts';
import {getRecordingQueueContents} from '../../contents/lib/contentWorkflow.ts';
import type {IntervaloAvaliado} from './saudeIndicadores.ts';
import {periodoDaSemana, type VistaPlanejamento} from './periodoPlanejamento.ts';

export type IntervaloSaude = {inicio: string; fim: string};
export type ContextoPlanejamento = {
  data: string;
  vista: VistaPlanejamento;
  trecho: 'calendario' | 'intervalo';
  intervalo: IntervaloSaude;
  foco: IntervaloSaude | null;
  serieId: string | null;
  destaques: string[];
  filtro: FiltroCalendario;
  assuntoId: string | null;
  origem: {periodo: IntervaloSaude; data: string; vista: VistaPlanejamento} | null;
};

export function dataValida(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value)));
}

export function lerContextoPlanejamento(params: URLSearchParams, hoje = format(new Date(), 'yyyy-MM-dd')): ContextoPlanejamento {
  const inicio = params.get('focoInicio');
  const fim = params.get('focoFim');
  return {
    data: dataValida(params.get('data')) ? params.get('data')! : hoje,
    vista: params.get('vista') === 'semana' ? 'semana' : 'mes',
    trecho: params.get('trecho') === 'intervalo' ? 'intervalo' : 'calendario',
    intervalo: {inicio: dataValida(params.get('inicio')) ? params.get('inicio')! : '', fim: dataValida(params.get('fim')) ? params.get('fim')! : ''},
    foco: dataValida(inicio) && dataValida(fim) && inicio <= fim ? {inicio, fim} : null,
    serieId: params.get('serie') || null,
    destaques: (params.get('destaques') ?? '').split(',').filter(Boolean),
    filtro: {redes: (params.get('redes') ?? '').split(',').filter((rede): rede is RedeSocial => Object.hasOwn(ROTULO_REDE_DO_FILTRO, rede)), formato: params.get('formato') || null},
    assuntoId: params.get('assunto') || null,
    origem: dataValida(params.get('saudeInicio')) && dataValida(params.get('saudeFim')) && dataValida(params.get('origemData')) ? {periodo: {inicio: params.get('saudeInicio')!, fim: params.get('saudeFim')!}, data: params.get('origemData')!, vista: params.get('origemVista') === 'semana' ? 'semana' : 'mes'} : null,
  };
}

export function gravarContextoPlanejamento(params: URLSearchParams, contexto: ContextoPlanejamento, saude: boolean): URLSearchParams {
  const next = new URLSearchParams(params);
  const values: Record<string, string | null> = {
    data: contexto.data, vista: contexto.vista, trecho: contexto.trecho === 'intervalo' ? 'intervalo' : null,
    inicio: contexto.intervalo.inicio || null, fim: contexto.intervalo.fim || null,
    focoInicio: contexto.foco?.inicio ?? null, focoFim: contexto.foco?.fim ?? null,
    serie: contexto.serieId, destaques: contexto.destaques.join(',') || null, saude: saude ? '1' : null,
    redes: contexto.filtro.redes.join(',') || null, formato: contexto.filtro.formato, assunto: contexto.assuntoId,
    saudeInicio: contexto.origem?.periodo.inicio ?? null, saudeFim: contexto.origem?.periodo.fim ?? null,
    origemData: contexto.origem?.data ?? null, origemVista: contexto.origem?.vista ?? null,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

/** Mesma semana domingo–sábado usada pela apuração; ciclos maiores permanecem inteiros. */
export function diasDoCalendario(anchor: Date, foco?: IntervaloSaude | null): Date[] {
  const intervalo = foco ?? periodoDaSemana(anchor);
  return eachDayOfInterval({start: parseISO(intervalo.inicio), end: parseISO(intervalo.fim)});
}

/** Só roteiros elegíveis para a fila, deduplicados e dentro do período da Saúde. */
export function roteirosDaSaude(itens: readonly GradeEntry[], contents: readonly Content[], blocks: readonly RecordingBlock[]): string[] {
  const elegiveis = new Set(getRecordingQueueContents([...contents], [...blocks]).map(c => c.id));
  return [...new Set(itens.filter(i => i.etapa === 'producao' && elegiveis.has(i.contentId)).map(i => i.contentId))];
}

export function secoesSalvas(value: unknown, padrao: readonly string[]): Set<string> {
  return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && padrao.includes(id)) : padrao);
}

/** Orientação factual da ação, atualizada enquanto o intervalo é preenchido. */
export function orientacaoDoPlanejamento(intervalo?: Pick<IntervaloAvaliado, 'meta' | 'quantidade'>): string {
  if (!intervalo) return 'Distribua os episódios desta série nos dias do intervalo.';
  const faltam = Math.max(0, intervalo.meta - intervalo.quantidade);
  if (faltam === 0) return 'A frequência deste intervalo foi atingida. Revise a distribuição ou conclua o planejamento.';
  return faltam === 1
    ? 'Planeje mais 1 episódio para completar a frequência deste intervalo.'
    : 'Planeje mais ' + faltam + ' episódios para completar a frequência deste intervalo.';
}
