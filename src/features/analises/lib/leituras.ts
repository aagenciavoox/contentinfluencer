import type { ContaMetrica } from '../../../lib/database.ts';

function diasDesdeEpoch(iso: string): number | null {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  return Math.round(Date.UTC(ano, mes - 1, dia) / 86_400_000);
}

/**
 * Leitura da conta mais perto da data.
 * No empate, fica a que já estava registrada (no dia ou antes).
 * Se as duas estão do mesmo lado, fica a atualizada por último.
 */
export function leituraMaisProxima<T extends Pick<ContaMetrica, 'platformId' | 'registradoEm' | 'updatedAt'>>(
  leituras: readonly T[],
  platformId: string,
  data: string,
): T | null {
  const alvo = diasDesdeEpoch(data);
  if (alvo == null) return null;
  let melhor: T | null = null;
  let melhorDist = Number.POSITIVE_INFINITY;
  for (const leitura of leituras) {
    if (leitura.platformId !== platformId) continue;
    const diaLeitura = diasDesdeEpoch(leitura.registradoEm);
    if (diaLeitura == null) continue;
    const dist = Math.abs(diaLeitura - alvo);
    if (!melhor || dist < melhorDist) {
      melhor = leitura;
      melhorDist = dist;
      continue;
    }
    if (dist !== melhorDist) continue;
    const melhorDia = diasDesdeEpoch(melhor.registradoEm) ?? alvo + 1;
    const leituraAntes = diaLeitura <= alvo;
    const melhorAntes = melhorDia <= alvo;
    if (leituraAntes !== melhorAntes) {
      if (leituraAntes) melhor = leitura;
      continue;
    }
    if (leitura.updatedAt > melhor.updatedAt) melhor = leitura;
  }
  return melhor;
}

export type SomaDePublicacoes = {
  views: number | null;
  alcance: number | null;
  interacoes: number | null;
};

function somar(valores: readonly (number | null | undefined)[]): number | null {
  let soma = 0;
  let algum = false;
  for (const valor of valores) {
    if (valor == null || !Number.isFinite(valor)) continue;
    soma += valor;
    algum = true;
  }
  return algum ? soma : null;
}

/** Soma views, alcance e interações. Sem nenhum número, o campo continua vazio. */
export function somarPublicacoes(
  linhas: readonly { views: number | null; alcance: number | null; interacoes: number | null }[],
): SomaDePublicacoes {
  return {
    views: somar(linhas.map(linha => linha.views)),
    alcance: somar(linhas.map(linha => linha.alcance)),
    interacoes: somar(linhas.map(linha => linha.interacoes)),
  };
}

/** Vazio é null. O que não for um inteiro ≥ 0 fica indefinido. */
export function inteiroDoCampo(texto: string): number | null | undefined {
  const limpo = texto.trim();
  if (!limpo) return null;
  if (!/^\d+$/.test(limpo)) return undefined;
  const valor = Number(limpo);
  return Number.isSafeInteger(valor) ? valor : undefined;
}
