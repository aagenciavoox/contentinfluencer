import type { EnergiaNivel } from '../../../lib/database.ts';
import { ENERGIA_LABELS } from '../../editorial/lib/editorialOptions.ts';
import { FUNCAO_LABELS } from '../../editorial/lib/funcoes.ts';
import {
  energiaDaSerie,
  objetivoDoConteudo,
  origemDaHeranca,
  pilarDoConteudo,
  type ConteudoHeranca,
  type SerieHeranca,
} from '../../editorial/lib/herancaSerie.ts';

export type LinhaDeHeranca = {
  campo: 'pilar' | 'objetivo' | 'energia';
  rotulo: string;
  valor: string;
  /** Texto da origem: herdado da série ou definido neste roteiro. */
  origem: string;
  herdado: boolean;
};

/**
 * De onde vêm pilar, objetivo e energia do roteiro, para mostrar na ficha.
 * Só com série vinculada; usa os mesmos resolvedores da Saúde e do calendário.
 */
export function herancaNaFicha(
  content: ConteudoHeranca & { pilarOrigem?: string | null },
  series: readonly SerieHeranca[],
  pilares: readonly { id: string; nome: string }[],
): LinhaDeHeranca[] {
  const serieId = content.seriesId?.trim();
  if (!serieId) return [];
  const origens = origemDaHeranca(serieId, series);
  const daSerie = (fonte: SerieHeranca | null) => `herdado da série ${fonte?.name.trim() || 'vinculada'}`;
  const neste = 'definido neste roteiro';
  const congelado = Boolean(content.classificacaoCongeladaEm);

  const pilarId = pilarDoConteudo(content, series);
  const pilar = pilarId ? pilares.find(item => item.id === pilarId) : undefined;
  const pilarHerdado = Boolean(pilarId) && !congelado && !content.pilarId?.trim();

  const objetivo = objetivoDoConteudo(content, series);
  const objetivoHerdado = Boolean(objetivo) && !congelado && (content.funcaoOrigem === 'herdada' || !content.funcao);

  const energia: EnergiaNivel | null = energiaDaSerie(content, series);
  const energiaHerdada = Boolean(energia) && !content.energiaNecessaria;

  const linha = (campo: LinhaDeHeranca['campo'], rotulo: string, valor: string | null, herdado: boolean): LinhaDeHeranca => ({
    campo,
    rotulo,
    valor: valor ?? 'Não definido',
    origem: valor ? (herdado ? daSerie(origens[campo]) : neste) : 'nem no roteiro nem na série',
    herdado,
  });

  return [
    linha('pilar', 'Pilar', pilarId ? pilar?.nome ?? 'Pilar removido' : null, pilarHerdado),
    linha('objetivo', 'Objetivo', objetivo ? FUNCAO_LABELS[objetivo] : null, objetivoHerdado),
    linha('energia', 'Energia', energia ? ENERGIA_LABELS[energia] : null, energiaHerdada),
  ];
}
