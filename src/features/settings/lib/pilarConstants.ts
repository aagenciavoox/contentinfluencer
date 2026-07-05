export const PILAR_PRESET_CORES = [
  '#F5C543',
  '#4A90D9',
  '#E8A0BF',
  '#D44C47',
  '#448361',
  '#9065B0',
  '#2EAADC',
  '#D9730D',
  '#F5F0E4',
  '#37352F',
] as const;

export const PILAR_DEFAULT_COR = PILAR_PRESET_CORES[0];

export const PILAR_COR_LABELS: Record<string, string> = {
  '#F5C543': 'Amarelo',
  '#4A90D9': 'Azul',
  '#E8A0BF': 'Rosa',
  '#D44C47': 'Vermelho',
  '#448361': 'Verde',
  '#9065B0': 'Roxo',
  '#2EAADC': 'Ciano',
  '#D9730D': 'Laranja',
  '#F5F0E4': 'Bege',
  '#37352F': 'Preto',
};

export const PILAR_DESCRICAO_MAX = 500;

export function pilarSlugFromNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'pilar';
}
