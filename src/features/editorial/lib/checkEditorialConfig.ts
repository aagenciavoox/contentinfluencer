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

/**
 * Incompatibilidades da configuração, sem olhar a semana.
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
