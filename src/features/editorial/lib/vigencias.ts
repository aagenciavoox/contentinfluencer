import { format } from 'date-fns';
import type { FuncaoEditorial } from '../../../lib/database.ts';
import type { EditorialSettings, VigenciaEditorial } from './editorialSettings.ts';
import { FUNCOES } from './funcoes.ts';
import { semanaDe } from './periodoEditorial.ts';
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
