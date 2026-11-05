import type { EnergiaNivel } from '../../../lib/database.ts';

export const FREQUENCIAS_SERIE = ['Semanal', 'Quinzenal', 'Mensal', 'Sob demanda'] as const;

export const ENERGIA_NIVEIS: EnergiaNivel[] = ['baixa', 'média', 'alta'];

export const ENERGIA_LABELS: Record<EnergiaNivel, string> = {
  baixa: 'Baixa',
  média: 'Média',
  alta: 'Alta',
};

export const FORMATO_VISUAL_SUGESTOES = ['Reels', 'Carrossel', 'Post estático', 'Vídeo longo', 'Stories'];

/** Sugestões fixas primeiro, depois formatos já usados (sem repetir, ignorando maiúsculas). */
export function collectFormatoSuggestions(usedValues: Array<string | null | undefined>): string[] {
  const seen = new Set(FORMATO_VISUAL_SUGESTOES.map(value => value.toLowerCase()));
  const extras: string[] = [];
  for (const raw of usedValues) {
    const value = raw?.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    extras.push(value);
  }
  extras.sort((left, right) => left.localeCompare(right, 'pt-BR'));
  return [...FORMATO_VISUAL_SUGESTOES, ...extras];
}
