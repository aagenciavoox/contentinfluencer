/**
 * Indicadores opcionais da Rotina de criação: uma faixa com meta (obrigatória quando há faixa),
 * mínimo e máximo opcionais. O teto de gravações por dia continua à parte (limiteGravacoesDia).
 *
 * Na Saúde, mínimo e máximo são referências de alerta. Entre eles, o número é progresso.
 * Lado sem número usa a regra de antes, pela meta, com o controle de aviso daquele lado.
 */

export type IndicadorDeProducao = 'roteirosRevisadosSemana' | 'videosPorDiaGravacao';

export type FaixaDoIndicador = {
  minimo: number | null;
  meta: number;
  maximo: number | null;
};

export type IndicadoresProducao = Partial<Record<IndicadorDeProducao, FaixaDoIndicador>>;

export const INDICADORES_DE_PRODUCAO: ReadonlyArray<{ id: IndicadorDeProducao; titulo: string; unidade: string; ajuda: string }> = [
  {
    id: 'roteirosRevisadosSemana',
    titulo: 'Roteiros revisados por semana',
    unidade: 'por semana',
    ajuda: 'Quantos roteiros você quer revisar numa semana? A Saúde ainda não confere este número.',
  },
  {
    id: 'videosPorDiaGravacao',
    titulo: 'Vídeos por dia de gravação',
    unidade: 'por dia',
    ajuda: 'Num dia de gravação, quantos vídeos você quer conseguir?',
  },
];

function inteiro(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** Faixa coerente ou nada: sem meta não há faixa; mínimo acima da meta ou máximo abaixo dela são ignorados. */
function lerFaixa(value: unknown): FaixaDoIndicador | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const meta = inteiro(raw.meta);
  if (meta == null || meta <= 0) return null;
  const minimo = inteiro(raw.minimo);
  const maximo = inteiro(raw.maximo);
  return {
    meta,
    minimo: minimo != null && minimo <= meta ? minimo : null,
    maximo: maximo != null && maximo >= meta ? maximo : null,
  };
}

/** Lê o jsonb gravado. Chave desconhecida ou faixa quebrada fica de fora. */
export function lerIndicadoresProducao(value: unknown): IndicadoresProducao {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const lidos: IndicadoresProducao = {};
  for (const { id } of INDICADORES_DE_PRODUCAO) {
    const faixa = lerFaixa(raw[id]);
    if (faixa) lidos[id] = faixa;
  }
  return lidos;
}

export function indicadoresVazios(indicadores: IndicadoresProducao | null | undefined): boolean {
  return !indicadores || INDICADORES_DE_PRODUCAO.every(({ id }) => !indicadores[id]);
}

export type RascunhoDaFaixa = { minimo: string; meta: string; maximo: string };

export function rascunhoDaFaixa(faixa: FaixaDoIndicador | null | undefined): RascunhoDaFaixa {
  return {
    minimo: faixa?.minimo != null ? String(faixa.minimo) : '',
    meta: faixa ? String(faixa.meta) : '',
    maximo: faixa?.maximo != null ? String(faixa.maximo) : '',
  };
}

export type ErroDaFaixa = { campo: 'minimo' | 'meta' | 'maximo'; mensagem: string };

function numeroDoCampo(texto: string): number | null | 'invalido' {
  const limpo = texto.trim();
  if (!limpo) return null;
  if (!/^\d+$/.test(limpo)) return 'invalido';
  return Number(limpo);
}

/**
 * Valida o que foi digitado. Tudo vazio = sem indicador (válido).
 * Preenchendo qualquer parte, só a meta é obrigatória.
 */
export function validarFaixa(rascunho: RascunhoDaFaixa): { faixa: FaixaDoIndicador | null; erros: ErroDaFaixa[] } {
  const minimo = numeroDoCampo(rascunho.minimo);
  const meta = numeroDoCampo(rascunho.meta);
  const maximo = numeroDoCampo(rascunho.maximo);
  const erros: ErroDaFaixa[] = [];
  if (minimo === null && meta === null && maximo === null) return { faixa: null, erros };
  if (minimo === 'invalido') erros.push({ campo: 'minimo', mensagem: 'Use um número inteiro.' });
  if (maximo === 'invalido') erros.push({ campo: 'maximo', mensagem: 'Use um número inteiro.' });
  if (meta === 'invalido') erros.push({ campo: 'meta', mensagem: 'Use um número inteiro.' });
  else if (meta === null || meta <= 0) erros.push({ campo: 'meta', mensagem: 'Preencha a meta para usar a faixa.' });
  if (erros.length > 0) return { faixa: null, erros };
  const valorMeta = meta as number;
  if (typeof minimo === 'number' && minimo > valorMeta) erros.push({ campo: 'minimo', mensagem: 'O mínimo precisa ser menor ou igual à meta.' });
  if (typeof maximo === 'number' && maximo < valorMeta) erros.push({ campo: 'maximo', mensagem: 'A meta precisa ser menor ou igual ao máximo.' });
  if (erros.length > 0) return { faixa: null, erros };
  return {
    faixa: { meta: valorMeta, minimo: typeof minimo === 'number' ? minimo : null, maximo: typeof maximo === 'number' ? maximo : null },
    erros,
  };
}

export type EstadoNaFaixa = 'abaixo' | 'acima' | 'na-meta' | 'progresso';

export type LeituraDaFaixa = {
  estado: EstadoNaFaixa;
  /** Que referência decidiu: o mínimo/máximo da faixa ou a meta (lado sem número). */
  referencia: 'minimo' | 'maximo' | 'meta';
  /** Aviso a mostrar, já respeitando os avisos ligados. */
  aviso: 'abaixo' | 'acima' | null;
};

/**
 * Mínimo e máximo são referências de alerta; entre eles é progresso.
 * Lado vazio: abaixo ou acima da meta já avisa (regra de antes), se o aviso daquele lado estiver ligado.
 */
export function avaliarFaixa(
  valor: number,
  faixa: FaixaDoIndicador,
  avisosLigados: { abaixo: boolean; acima: boolean } = { abaixo: true, acima: true },
): LeituraDaFaixa {
  const pisoAlerta = faixa.minimo ?? faixa.meta;
  const tetoAlerta = faixa.maximo ?? faixa.meta;
  if (valor < pisoAlerta) {
    return { estado: 'abaixo', referencia: faixa.minimo != null ? 'minimo' : 'meta', aviso: avisosLigados.abaixo ? 'abaixo' : null };
  }
  if (valor > tetoAlerta) {
    return { estado: 'acima', referencia: faixa.maximo != null ? 'maximo' : 'meta', aviso: avisosLigados.acima ? 'acima' : null };
  }
  return { estado: valor === faixa.meta ? 'na-meta' : 'progresso', referencia: 'meta', aviso: null };
}

/** "Meta 4 · faixa 3 a 6", "Meta 4 · mínimo 3", "Meta 4". */
export function textoDaFaixa(faixa: FaixaDoIndicador): string {
  if (faixa.minimo != null && faixa.maximo != null) return `Meta ${faixa.meta} · faixa ${faixa.minimo} a ${faixa.maximo}`;
  if (faixa.minimo != null) return `Meta ${faixa.meta} · mínimo ${faixa.minimo}`;
  if (faixa.maximo != null) return `Meta ${faixa.meta} · máximo ${faixa.maximo}`;
  return `Meta ${faixa.meta}`;
}
