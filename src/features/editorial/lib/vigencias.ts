import { addDays, format, parseISO } from 'date-fns';
import type { FuncaoEditorial } from '../../../lib/database.ts';
import { atualizarPreferencias, atualizarProporcao, type EditorialSettings, type VigenciaEditorial } from './editorialSettings.ts';
import { FUNCOES } from './funcoes.ts';
import { semanaDe, semanasNoIntervalo } from './periodoEditorial.ts';
import type { ProporcaoFuncoes } from './proporcaoObjetivos.ts';

/** Valores que a vigência guarda. */
export type DiretrizDaSemana = Pick<VigenciaEditorial, 'limiteSemanal' | 'proporcaoFuncoes'>;

function ordenadas(vigencias: readonly VigenciaEditorial[]): VigenciaEditorial[] {
  return [...vigencias].sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde));
}

/**
 * A linha que vale na semana que começa em `inicioSemana`.
 * Antes da primeira linha vale a primeira: é o valor mais antigo conhecido. Sem linhas, null.
 */
export function vigenciaNaSemana(
  vigencias: readonly VigenciaEditorial[] | null | undefined,
  inicioSemana: string,
): VigenciaEditorial | null {
  if (!vigencias || vigencias.length === 0) return null;
  const lista = ordenadas(vigencias);
  let vale = lista[0];
  for (const vigencia of lista) {
    if (vigencia.vigenteDesde > inicioSemana) break;
    vale = vigencia;
  }
  return vale;
}

function mesmaProporcao(a: ProporcaoFuncoes | null, b: ProporcaoFuncoes | null): boolean {
  if (!a || !b) return a === b;
  return FUNCOES.every(funcao => (a[funcao] ?? null) === (b[funcao] ?? null));
}

/**
 * Guarda o limite e a proporção a partir do domingo desta semana, se mudaram.
 * A semana atual e as seguintes passam a usar o valor novo; as anteriores mantêm o antigo.
 */
export function registrarVigencia(
  settings: EditorialSettings,
  hoje: Date = new Date(),
): EditorialSettings {
  const desde = semanaDe(format(hoje, 'yyyy-MM-dd')).inicio;
  const atual: DiretrizDaSemana = {
    limiteSemanal: settings.preferencias.limiteSemanal,
    proporcaoFuncoes: settings.proporcaoFuncoes,
  };
  const vigencias = settings.vigencias ?? [];
  const vale = vigenciaNaSemana(vigencias, desde);
  if (vale && vale.limiteSemanal === atual.limiteSemanal && mesmaProporcao(vale.proporcaoFuncoes, atual.proporcaoFuncoes)) {
    return settings;
  }
  const linha: VigenciaEditorial = { vigenteDesde: desde, ...atual };
  return {
    ...settings,
    vigencias: ordenadas([...vigencias.filter(item => item.vigenteDesde !== desde), linha]),
  };
}

/**
 * O período que inclui hoje (ou ainda vai começar) manda: usa o ritmo atual no período inteiro,
 * então mudar a meta semanal ou o período ajusta o plano na hora. Período que já terminou fica
 * com o ritmo que valia no começo dele.
 */
export function periodoVigente(periodo: { fim: string }, hoje: string = format(new Date(), 'yyyy-MM-dd')): boolean {
  return periodo.fim >= hoje;
}

/** Ritmo semanal usado nas metas do período (regra acima). */
export function limiteSemanalDoPeriodo(
  settings: { limiteSemanal: number | null; vigencias?: readonly VigenciaEditorial[] | null },
  periodo: { inicio: string; fim: string },
  hoje?: string,
): number | null {
  return periodoVigente(periodo, hoje)
    ? settings.limiteSemanal
    : limiteSemanalNaSemana(settings, semanaDe(periodo.inicio).inicio);
}

/** Número escrito em "Ajustar metas" vale no lugar do calculado. */
export function metaComAjuste(ajustada: number | null | undefined, calculada: number | null): number | null {
  return ajustada ?? calculada;
}

/** Limite semanal daquela semana. Sem histórico, o de hoje. */
export function limiteSemanalNaSemana(
  settings: { limiteSemanal: number | null; vigencias?: readonly VigenciaEditorial[] | null },
  inicioSemana: string,
): number | null {
  const vale = vigenciaNaSemana(settings.vigencias, inicioSemana);
  return vale ? vale.limiteSemanal : settings.limiteSemanal;
}

/**
 * Proporção do intervalo. Com uma só proporção em todas as semanas, é ela.
 * Com proporções diferentes, cada semana pesa pelo seu limite.
 */
export function proporcaoDoIntervalo(input: {
  semanas: readonly { inicio: string; limite: number | null }[];
  proporcaoAtual: ProporcaoFuncoes | null;
  vigencias?: readonly VigenciaEditorial[] | null;
}): ProporcaoFuncoes | null {
  const { semanas, proporcaoAtual, vigencias } = input;
  if (!vigencias || vigencias.length === 0 || semanas.length === 0) return proporcaoAtual;
  const daSemana = semanas.map(semana => ({
    limite: semana.limite ?? 0,
    proporcao: vigenciaNaSemana(vigencias, semana.inicio)?.proporcaoFuncoes ?? null,
  }));
  const primeira = daSemana[0].proporcao;
  if (daSemana.every(semana => mesmaProporcao(semana.proporcao, primeira))) return primeira;

  const pesoTotal = daSemana.reduce((soma, semana) => soma + (semana.proporcao ? semana.limite : 0), 0);
  if (pesoTotal <= 0) return primeira;
  const resultado: ProporcaoFuncoes = {};
  for (const funcao of FUNCOES as FuncaoEditorial[]) {
    let soma = 0;
    let presente = false;
    for (const semana of daSemana) {
      const valor = semana.proporcao?.[funcao];
      if (valor == null) continue;
      presente = true;
      soma += valor * semana.limite;
    }
    if (presente) resultado[funcao] = soma / pesoTotal;
  }
  return resultado;
}

// ---------------------------------------------------------------- Mudança com data

/** Domingo desta semana e o próximo, para escolher de quando uma mudança vale. */
export function domingosParaVigencia(hoje: string = format(new Date(), 'yyyy-MM-dd')): { estaSemana: string; proxima: string } {
  const estaSemana = semanaDe(hoje).inicio;
  return { estaSemana, proxima: semanaDe(format(addDays(parseISO(estaSemana), 7), 'yyyy-MM-dd')).inicio };
}

/** Mudança já agendada para depois desta semana que vale naquela semana (ou null). */
function agendadaNaSemana(
  vigencias: readonly VigenciaEditorial[] | null | undefined,
  inicioSemana: string,
  hoje: string,
): VigenciaEditorial | null {
  const estaSemana = semanaDe(hoje).inicio;
  if (inicioSemana <= estaSemana) return null;
  const vale = vigenciaNaSemana(vigencias, inicioSemana);
  return vale && vale.vigenteDesde > estaSemana ? vale : null;
}

/**
 * Limite de uma semana dentro de um período.
 * Período encerrado: o que valia naquela semana. Período vigente: o ritmo de hoje, exceto nas
 * semanas futuras que já têm uma mudança agendada (escolhida com data no Editorial).
 */
export function limiteDaSemanaNoPeriodo(
  settings: { limiteSemanal: number | null; vigencias?: readonly VigenciaEditorial[] | null },
  periodo: { fim: string },
  inicioSemana: string,
  hoje: string = format(new Date(), 'yyyy-MM-dd'),
): number | null {
  if (!periodoVigente(periodo, hoje)) return limiteSemanalNaSemana(settings, inicioSemana);
  const agendada = agendadaNaSemana(settings.vigencias, inicioSemana, hoje);
  return agendada ? agendada.limiteSemanal : settings.limiteSemanal;
}

/** Proporção do período com a mesma regra do limite: histórico no encerrado, agendamento no vigente. */
export function proporcaoDoPeriodo(input: {
  periodo: { inicio: string; fim: string };
  limiteSemanal: number | null;
  proporcaoAtual: ProporcaoFuncoes | null;
  vigencias?: readonly VigenciaEditorial[] | null;
  hoje?: string;
}): ProporcaoFuncoes | null {
  const { periodo, vigencias } = input;
  const hoje = input.hoje ?? format(new Date(), 'yyyy-MM-dd');
  if (!vigencias || vigencias.length === 0) return input.proporcaoAtual;
  const semanas = semanasNoIntervalo(periodo.inicio, periodo.fim);
  if (!periodoVigente(periodo, hoje)) {
    return proporcaoDoIntervalo({
      semanas: semanas.map(semana => ({ inicio: semana.inicio, limite: limiteSemanalNaSemana({ limiteSemanal: input.limiteSemanal, vigencias }, semana.inicio) })),
      proporcaoAtual: input.proporcaoAtual,
      vigencias,
    });
  }
  const daSemana = semanas.map(semana => {
    const agendada = agendadaNaSemana(vigencias, semana.inicio, hoje);
    return {
      limite: (agendada ? agendada.limiteSemanal : input.limiteSemanal) ?? 0,
      proporcao: agendada ? agendada.proporcaoFuncoes : input.proporcaoAtual,
    };
  });
  if (daSemana.every(semana => mesmaProporcao(semana.proporcao, input.proporcaoAtual))) return input.proporcaoAtual;
  const pesoTotal = daSemana.reduce((soma, semana) => soma + (semana.proporcao ? semana.limite : 0), 0);
  if (pesoTotal <= 0) return input.proporcaoAtual;
  const resultado: ProporcaoFuncoes = {};
  for (const funcao of FUNCOES as FuncaoEditorial[]) {
    let soma = 0;
    let presente = false;
    for (const semana of daSemana) {
      const valor = semana.proporcao?.[funcao];
      if (valor == null) continue;
      presente = true;
      soma += valor * semana.limite;
    }
    if (presente) resultado[funcao] = soma / pesoTotal;
  }
  return resultado;
}

/**
 * Grava o ritmo e a proporção a partir de um domingo escolhido. Desta semana: vale já, como antes.
 * De um domingo futuro: fica agendado e o ritmo de hoje continua até lá. Nunca volta para um domingo passado.
 */
export function agendarVigencia(
  settings: EditorialSettings,
  desde: string,
  valores: DiretrizDaSemana,
  hoje: string = format(new Date(), 'yyyy-MM-dd'),
): EditorialSettings {
  const estaSemana = semanaDe(hoje).inicio;
  const domingo = semanaDe(desde < estaSemana ? estaSemana : desde).inicio;
  const linha: VigenciaEditorial = { vigenteDesde: domingo, ...valores };
  const vigencias = ordenadas([...(settings.vigencias ?? []).filter(item => item.vigenteDesde !== domingo), linha]);
  if (domingo > estaSemana) return { ...settings, vigencias };
  const comValores = atualizarProporcao(atualizarPreferencias(settings, { limiteSemanal: valores.limiteSemanal }), valores.proporcaoFuncoes);
  return { ...comValores, vigencias };
}

/** A próxima mudança já agendada depois desta semana, para mostrar "muda para X em dd/mm". */
export function proximaMudanca(
  vigencias: readonly VigenciaEditorial[] | null | undefined,
  hoje: string = format(new Date(), 'yyyy-MM-dd'),
): VigenciaEditorial | null {
  const estaSemana = semanaDe(hoje).inicio;
  return ordenadas(vigencias ?? []).find(item => item.vigenteDesde > estaSemana) ?? null;
}

/**
 * Ao carregar: se uma mudança agendada passou a valer depois da última gravação, o ritmo e a
 * proporção de hoje passam a ser os dela. Mudança gravada para esta semana já estava em dia.
 */
export function alinharComVigenciaAgendada(
  settings: EditorialSettings,
  ultimaGravacao: string | null,
  hoje: string = format(new Date(), 'yyyy-MM-dd'),
): EditorialSettings {
  const vale = vigenciaNaSemana(settings.vigencias, semanaDe(hoje).inicio);
  if (!vale || !ultimaGravacao || vale.vigenteDesde <= ultimaGravacao.slice(0, 10)) return settings;
  if (vale.vigenteDesde > hoje) return settings;
  return {
    ...settings,
    proporcaoFuncoes: vale.proporcaoFuncoes,
    preferencias: { ...settings.preferencias, limiteSemanal: vale.limiteSemanal },
  };
}

/** O que vale num domingo escolhido: a mudança já agendada até ele, senão o ritmo de hoje. */
export function diretrizNoDomingo(
  settings: EditorialSettings,
  domingo: string,
  hoje: string = format(new Date(), 'yyyy-MM-dd'),
): DiretrizDaSemana {
  const agendada = agendadaNaSemana(settings.vigencias, semanaDe(domingo).inicio, hoje);
  return agendada
    ? { limiteSemanal: agendada.limiteSemanal, proporcaoFuncoes: agendada.proporcaoFuncoes }
    : { limiteSemanal: settings.preferencias.limiteSemanal, proporcaoFuncoes: settings.proporcaoFuncoes };
}

/**
 * Desfaz uma parte de uma mudança agendada (o limite ou a proporção): volta ao que valia na semana
 * anterior a ela. Se nada mais muda naquele domingo, a linha sai. Mudança que já vale não é desfeita aqui.
 */
export function desfazerMudanca(
  settings: EditorialSettings,
  vigenteDesde: string,
  campo: 'limite' | 'proporcao',
  hoje: string = format(new Date(), 'yyyy-MM-dd'),
): EditorialSettings {
  const linha = settings.vigencias?.find(item => item.vigenteDesde === vigenteDesde);
  if (!linha || vigenteDesde <= semanaDe(hoje).inicio) return settings;
  const antes = diretrizNoDomingo(settings, format(addDays(parseISO(vigenteDesde), -7), 'yyyy-MM-dd'), hoje);
  const nova: VigenciaEditorial = campo === 'limite'
    ? { ...linha, limiteSemanal: antes.limiteSemanal }
    : { ...linha, proporcaoFuncoes: antes.proporcaoFuncoes };
  const igualAntes = nova.limiteSemanal === antes.limiteSemanal && mesmaProporcao(nova.proporcaoFuncoes, antes.proporcaoFuncoes);
  const outras = (settings.vigencias ?? []).filter(item => item.vigenteDesde !== vigenteDesde);
  return { ...settings, vigencias: igualAntes ? outras : ordenadas([...outras, nova]) };
}

export type MudancaAgendada = {
  vigenteDesde: string;
  /** Null quando o limite não muda naquele domingo. */
  limite: { de: number | null; para: number | null } | null;
  /** Null quando a proporção não muda naquele domingo. */
  proporcao: { de: ProporcaoFuncoes | null; para: ProporcaoFuncoes | null } | null;
};

/** Mudanças já agendadas depois desta semana, cada uma comparada com a semana anterior a ela. */
export function mudancasAgendadas(
  settings: EditorialSettings,
  hoje: string = format(new Date(), 'yyyy-MM-dd'),
): MudancaAgendada[] {
  const estaSemana = semanaDe(hoje).inicio;
  return ordenadas(settings.vigencias ?? []).filter(linha => linha.vigenteDesde > estaSemana).flatMap(linha => {
    const antes = diretrizNoDomingo(settings, format(addDays(parseISO(linha.vigenteDesde), -7), 'yyyy-MM-dd'), hoje);
    const limite = linha.limiteSemanal !== antes.limiteSemanal ? { de: antes.limiteSemanal, para: linha.limiteSemanal } : null;
    const proporcao = mesmaProporcao(linha.proporcaoFuncoes, antes.proporcaoFuncoes)
      ? null
      : { de: antes.proporcaoFuncoes, para: linha.proporcaoFuncoes };
    return limite || proporcao ? [{ vigenteDesde: linha.vigenteDesde, limite, proporcao }] : [];
  });
}
