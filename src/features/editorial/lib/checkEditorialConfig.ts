import type { FuncaoEditorial, FuncaoPadraoSerie } from '../../../lib/database.ts';
import {
  distribuirEspacos,
  percentuaisNaOrdem,
  somaEspacosSemana,
  totalDaContagem,
} from './distribuirEspacos.ts';
import { distribuicaoFecha } from './gradeCounts.ts';
import { FUNCAO_LABELS, FUNCOES } from './funcoes.ts';

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

function formatarNumero(valor: number): string {
  const arredondado = Math.round(valor * 100) / 100;
  const [inteiro, frac = ''] = arredondado.toFixed(2).split('.');
  const fracao = frac.replace(/0+$/, '');
  return fracao ? `${inteiro},${fracao}` : inteiro;
}

function rotuloEspaco(valor: number): string {
  const texto = formatarNumero(valor);
  return `${texto} ${valor === 1 ? 'espaço' : 'espaços'}`;
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
 * Distribuição fora de 100, séries acima do pilar, função com espaço sem série, rede ausente.
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

  const ativos = input.pilares.filter(pilar => pilar.ativo !== false);
  const ativosIds = new Set(ativos.map(pilar => pilar.id));
  const pesoPorPilar = new Map<string, number>();
  for (const serie of input.series) {
    if (serie.ativa === false) continue;
    const peso = pesoSemanalSerie(serie.frequenciaRecomendada);
    if (peso <= 0) continue;
    const pilarId = pilarDaSerie(serie, ativosIds);
    if (!pilarId) continue;
    pesoPorPilar.set(pilarId, (pesoPorPilar.get(pilarId) ?? 0) + peso);
  }

  for (const pilar of ativos) {
    const peso = pesoPorPilar.get(pilar.id) ?? 0;
    if (peso <= 0) continue;
    const capacidade = typeof pilar.frequenciaSemanal === 'number' && pilar.frequenciaSemanal > 0
      ? Math.floor(pilar.frequenciaSemanal)
      : 0;
    if (peso <= capacidade + 0.001) continue;
    const capacidadeTexto = capacidade > 0
      ? `o pilar tem ${rotuloEspaco(capacidade)}`
      : 'o pilar não tem espaços';
    notas.push({
      chave: `pilar-capacidade:${pilar.id}`,
      mensagem: `${pilar.nome}: as séries ocupam ${rotuloEspaco(peso)} por semana e ${capacidadeTexto}.`,
    });
  }

  if (distribuicaoFecha(distribuicao)) {
    const total = totalDaContagem(somaEspacosSemana(input.pilares));
    const metas = distribuirEspacos(total, percentuaisNaOrdem(distribuicao));
    const seriesAtivas = input.series.filter(serie => serie.ativa !== false);
    FUNCOES.forEach((funcao, index) => {
      if ((metas[index] ?? 0) <= 0) return;
      const entrega = seriesAtivas.some(serie => serie.funcaoPadrao === funcao);
      if (entrega) return;
      notas.push({
        chave: `funcao-sem-serie:${funcao}`,
        mensagem: `${FUNCAO_LABELS[funcao]} tem espaço na grade e nenhuma série com essa função.`,
      });
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
