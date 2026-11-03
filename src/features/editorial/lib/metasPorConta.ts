import type { FuncaoEditorial } from '../../../lib/database.ts';
import { distribuirEspacos } from './distribuirEspacos.ts';
import type { DecisaoPeriodo } from './editorialSettings.ts';
import { FUNCOES } from './funcoes.ts';
import { metaDoPeriodo, type MetaDoPeriodo } from './metaDoPeriodo.ts';
import { diasDePausa, type PausaEditorial } from './pausas.ts';
import { semanaDe } from './periodoEditorial.ts';
import { metasDaProporcao, readProporcao, type ProporcaoFuncoes } from './proporcaoObjetivos.ts';
import { periodoVigente } from './vigencias.ts';

/**
 * Metas de publicação por conta (entrega 2).
 * - A meta geral de conteúdos únicos continua à parte (`metaDoPeriodo` da contagem por roteiro).
 * - Cada conta tem o próprio ritmo, com vigência, e pode receber um número só para um período.
 * - O total de publicações é a soma das contas. Conta sem meta deixa a soma incompleta: nunca vira zero.
 * - Formato é parcela da meta da conta, não um total novo.
 */

type Intervalo = { inicio: string; fim: string };

/** Uma linha de editorial_conta_meta: vale a partir de um domingo, até a próxima linha da conta. */
export type MetaDaContaVigencia = {
  platformId: string;
  vigenteDesde: string;
  /** Null = a conta não tem meta a partir daqui. */
  limiteSemanal: number | null;
  /** Null = usa a proporção geral do Editorial. */
  proporcaoFuncoes: ProporcaoFuncoes | null;
  /** Formato → quantas por semana, dentro do limite da conta. */
  parcelasFormato: Record<string, number> | null;
};

export type ParcelaDeFormato = {
  formato: string;
  porSemana: number;
  noPeriodo: number;
};

export type MetaDaConta = MetaDoPeriodo & {
  platformId: string;
  /** Sem ritmo nem número do período. Entra como "sem meta", não como zero. */
  semMeta: boolean;
  proporcao: ProporcaoFuncoes | null;
  /** A proporção veio do Editorial geral, não da conta. */
  proporcaoHerdada: boolean;
  /** Quantas publicações por objetivo, pelo maior resto sobre a meta da conta. */
  porObjetivo: Partial<Record<FuncaoEditorial, number>>;
  /** Parcelas por formato no período; a sobra fica "sem formato definido". */
  parcelas: ParcelaDeFormato[];
  semFormatoDefinido: number;
  /** As parcelas por semana passam do limite semanal da conta. */
  conflitoDeFormato: boolean;
};

function linhasDaConta(linhas: readonly MetaDaContaVigencia[], platformId: string): MetaDaContaVigencia[] {
  return linhas
    .filter(linha => linha.platformId === platformId)
    .sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde));
}

/**
 * A linha que vale num dia. Diferente da vigência geral: antes da primeira linha a conta
 * não tinha meta, então não vale a primeira para trás.
 */
export function linhaDaContaEm(linhas: readonly MetaDaContaVigencia[], dia: string): MetaDaContaVigencia | null {
  let vale: MetaDaContaVigencia | null = null;
  for (const linha of linhas) {
    if (linha.vigenteDesde > dia) break;
    vale = linha;
  }
  return vale;
}

function parcelasLimpas(parcelas: Record<string, number> | null | undefined): Array<{ formato: string; porSemana: number }> {
  if (!parcelas) return [];
  return Object.entries(parcelas)
    .filter(([formato, valor]) => formato.trim() && typeof valor === 'number' && Number.isInteger(valor) && valor > 0)
    .map(([formato, porSemana]) => ({ formato, porSemana }));
}

/**
 * Meta de uma conta no período. Período vigente usa o ritmo de hoje da conta em todas as semanas,
 * como a meta geral; período encerrado usa o ritmo de cada semana. Número do período vale acima de tudo.
 */
export function metaDaConta(input: {
  platformId: string;
  linhas: readonly MetaDaContaVigencia[];
  periodo: Intervalo;
  /** Decisão do período: o número da conta e a pausa. */
  decisao?: Pick<DecisaoPeriodo, 'metasPorConta' | 'pausaEditorial'> | null;
  /** Proporção geral do período (a do Editorial), para a conta sem proporção própria. */
  proporcaoGeral: ProporcaoFuncoes | null;
  /** Pausas com data: valem as de publicação e as desta conta. */
  pausas?: readonly PausaEditorial[];
  hoje?: string;
}): MetaDaConta {
  const linhas = linhasDaConta(input.linhas, input.platformId);
  const hoje = input.hoje ?? new Date().toISOString().slice(0, 10);
  const vigente = periodoVigente(input.periodo, hoje);
  const atual = linhaDaContaEm(linhas, semanaDe(hoje).inicio);
  // A linha que manda na proporção e nas parcelas: a de hoje no período vigente, a do início no encerrado.
  const referencia = vigente ? atual : linhaDaContaEm(linhas, semanaDe(input.periodo.inicio).inicio);

  const absoluta = input.decisao?.metasPorConta?.[input.platformId]?.publicacao;
  const meta = metaDoPeriodo({
    periodo: input.periodo,
    limiteSemanal: atual?.limiteSemanal ?? null,
    decisao: { metasPublicacao: absoluta, pausaEditorial: input.decisao?.pausaEditorial },
    hoje,
    diasPausados: diasDePausa(input.pausas ?? [], { tipo: 'conta', platformId: input.platformId }, input.periodo),
    limiteDaSemana: vigente
      ? () => atual?.limiteSemanal ?? null
      : inicioSemana => linhaDaContaEm(linhas, inicioSemana)?.limiteSemanal ?? null,
  });

  const propria = readProporcao(referencia?.proporcaoFuncoes ?? null);
  const proporcao = propria ?? input.proporcaoGeral;
  const porObjetivo = metasDaProporcao(meta.valor, proporcao);

  const parcelasSemana = parcelasLimpas(referencia?.parcelasFormato);
  const limiteSemana = referencia?.limiteSemanal ?? null;
  const somaParcelas = parcelasSemana.reduce((soma, parcela) => soma + parcela.porSemana, 0);
  const conflitoDeFormato = limiteSemana != null && somaParcelas > limiteSemana;
  let parcelas: ParcelaDeFormato[] = parcelasSemana.map(parcela => ({ ...parcela, noPeriodo: 0 }));
  let semFormatoDefinido = meta.valor ?? 0;
  if (meta.valor != null && parcelasSemana.length > 0) {
    // Reparte a meta do período na mesma proporção das parcelas; o que o limite deixa livre fica sem formato.
    const livre = limiteSemana != null && !conflitoDeFormato ? limiteSemana - somaParcelas : 0;
    const partes = distribuirEspacos(meta.valor, [...parcelasSemana.map(parcela => parcela.porSemana), livre]);
    parcelas = parcelasSemana.map((parcela, index) => ({ ...parcela, noPeriodo: partes[index] }));
    semFormatoDefinido = partes[parcelasSemana.length] ?? 0;
  }

  return {
    ...meta,
    platformId: input.platformId,
    semMeta: meta.valor == null,
    proporcao,
    proporcaoHerdada: propria == null,
    porObjetivo,
    parcelas,
    semFormatoDefinido,
    conflitoDeFormato,
  };
}

export type MetasConsolidadas = {
  contas: MetaDaConta[];
  /** Soma das contas com meta. Null quando nenhuma conta tem meta. */
  total: number | null;
  /** Alguma conta ativa está sem meta: o total não representa todas as contas. */
  incompleta: boolean;
  contasSemMeta: string[];
  /** Soma das metas por objetivo de cada conta. */
  porObjetivo: Partial<Record<FuncaoEditorial, number>>;
  /**
   * Proporção consolidada: a soma das quantidades de cada objetivo sobre o total,
   * ou seja, ponderada pelas metas das contas. Em %, pelo maior resto (soma 100).
   */
  proporcaoConsolidada: Partial<Record<FuncaoEditorial, number>> | null;
};

/** Consolida as contas ativas. Não usa média simples nem o que já foi publicado como peso. */
export function consolidarMetas(contas: readonly MetaDaConta[]): MetasConsolidadas {
  const comMeta = contas.filter(conta => !conta.semMeta);
  const total = comMeta.length > 0 ? comMeta.reduce((soma, conta) => soma + (conta.valor ?? 0), 0) : null;
  const porObjetivo: Partial<Record<FuncaoEditorial, number>> = {};
  for (const conta of comMeta) {
    for (const funcao of FUNCOES) {
      const quantidade = conta.porObjetivo[funcao];
      if (quantidade == null) continue;
      porObjetivo[funcao] = (porObjetivo[funcao] ?? 0) + quantidade;
    }
  }
  const funcoesComMeta = FUNCOES.filter(funcao => porObjetivo[funcao] != null);
  const somaObjetivos = funcoesComMeta.reduce((soma, funcao) => soma + (porObjetivo[funcao] ?? 0), 0);
  let proporcaoConsolidada: MetasConsolidadas['proporcaoConsolidada'] = null;
  if (somaObjetivos > 0) {
    const pcts = distribuirEspacos(100, funcoesComMeta.map(funcao => porObjetivo[funcao] ?? 0));
    proporcaoConsolidada = Object.fromEntries(funcoesComMeta.map((funcao, index) => [funcao, pcts[index]]));
  }
  return {
    contas: [...contas],
    total,
    incompleta: contas.some(conta => conta.semMeta),
    contasSemMeta: contas.filter(conta => conta.semMeta).map(conta => conta.platformId),
    porObjetivo,
    proporcaoConsolidada,
  };
}

/** Metas de todas as contas ativas no período, já consolidadas. */
export function metasDasContas(input: {
  platformIds: readonly string[];
  linhas: readonly MetaDaContaVigencia[];
  periodo: Intervalo;
  decisao?: Pick<DecisaoPeriodo, 'metasPorConta' | 'pausaEditorial'> | null;
  proporcaoGeral: ProporcaoFuncoes | null;
  pausas?: readonly PausaEditorial[];
  hoje?: string;
}): MetasConsolidadas {
  return consolidarMetas(input.platformIds.map(platformId => metaDaConta({ ...input, platformId })));
}
