import type { FuncaoEditorial, FuncaoPadraoSerie } from '../../../lib/database.ts';
import { percentuaisNaOrdem } from './distribuirEspacos.ts';
import { distribuicaoFecha } from './gradeCounts.ts';

export type ConfigNota = {
  chave: string;
  mensagem: string;
};

export type SerieConfig = {
  id: string;
  name: string;
  ativa?: boolean;
  funcaoPadrao?: FuncaoPadraoSerie | null;
  frequenciaRecomendada?: string | null;
  /** Quando existir, a série ocupa espaço neste pilar. */
  pilarPrincipalId?: string | null;
  pilarIds?: string[];
};

export type PilarConfig = {
  id: string;
  nome: string;
  ativo?: boolean;
  frequenciaSemanal?: number | null;
};

export type EditorialConfigInput = {
  pilares: readonly PilarConfig[];
  series: readonly SerieConfig[];
  settings: {
    redeReferenciaId: string | null;
    distribuicaoFuncoes: Partial<Record<FuncaoEditorial, number>> | null;
  };
  plataformas?: ReadonlyArray<{ id: string; ativo?: boolean }>;
};

/** Semanal 1, quinzenal 0,5, mensal 0,25. O resto não ocupa espaço fixo. */
export function pesoSemanalSerie(frequencia: string | null | undefined): number {
  const normalized = (frequencia ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  if (normalized === 'semanal') return 1;
  if (normalized === 'quinzenal') return 0.5;
  if (normalized === 'mensal') return 0.25;
  return 0;
}

export function formatarPeso(valor: number): string {
  const arredondado = Math.round(valor * 100) / 100;
  const [inteiro, frac = ''] = arredondado.toFixed(2).split('.');
  const fracao = frac.replace(/0+$/, '');
  return fracao ? `${inteiro},${fracao}` : inteiro;
}

export type ExcedentePilar = {
  id: string;
  nome: string;
  ocupado: number;
  previsto: number;
};

/** Pilares ativos em que o peso semanal das séries passa da frequência prevista. */
export function excedentesDosPilares(
  pilares: readonly PilarConfig[],
  series: readonly SerieConfig[],
): ExcedentePilar[] {
  const ativos = pilares.filter(pilar => pilar.ativo !== false);
  const ativosIds = new Set(ativos.map(pilar => pilar.id));
  const pesoPorPilar = new Map<string, number>();
  for (const serie of series) {
    if (serie.ativa === false) continue;
    const peso = pesoSemanalSerie(serie.frequenciaRecomendada);
    if (peso <= 0) continue;
    const pilarId = pilarDaSerie(serie, ativosIds);
    if (!pilarId) continue;
    pesoPorPilar.set(pilarId, (pesoPorPilar.get(pilarId) ?? 0) + peso);
  }

  return ativos.flatMap(pilar => {
    const ocupado = pesoPorPilar.get(pilar.id) ?? 0;
    if (ocupado <= 0) return [];
    const previsto = typeof pilar.frequenciaSemanal === 'number' && pilar.frequenciaSemanal > 0
      ? Math.floor(pilar.frequenciaSemanal)
      : 0;
    if (ocupado <= previsto + 0.001) return [];
    return [{id: pilar.id, nome: pilar.nome, ocupado, previsto}];
  });
}

function pilarDaSerie(serie: SerieConfig, ativos: ReadonlySet<string>): string | null {
  const ids = [
    ...(serie.pilarPrincipalId ? [serie.pilarPrincipalId] : []),
    ...(serie.pilarIds ?? []),
  ];
  return ids.find(id => ativos.has(id)) ?? null;
}

/**
 * Incompatibilidades da configuração, sem olhar a semana.
 * Frequência de pilar e peso de série não viram aviso de capacidade.
 * Rede ausente continua avisando.
 */
export function checkEditorialConfig(input: EditorialConfigInput): ConfigNota[] {
  const notas: ConfigNota[] = [];
  const distribuicao = input.settings.distribuicaoFuncoes;
  if (distribuicao && !distribuicaoFecha(distribuicao)) {
    const soma = percentuaisNaOrdem(distribuicao).reduce((total, valor) => total + valor, 0);
    notas.push({
      chave: 'distribuicao',
      mensagem: `A distribuição por função soma ${soma}. Ela fecha em 100.`,
    });
  }

  const redeId = input.settings.redeReferenciaId?.trim() || null;
  if (!redeId) {
    notas.push({
      chave: 'rede-referencia',
      mensagem: 'A rede de referência ainda não está escolhida.',
    });
  } else if (input.plataformas) {
    const rede = input.plataformas.find(plataforma => plataforma.id === redeId);
    if (!rede || rede.ativo === false) {
      notas.push({
        chave: 'rede-referencia',
        mensagem: 'A rede de referência não está entre as redes ativas.',
      });
    }
  }

  return notas;
}
