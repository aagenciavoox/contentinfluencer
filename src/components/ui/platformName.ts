/**
 * Nomes de plataforma vêm do cadastro da pessoa e podem estar salvos com
 * grafias diferentes ("TikTok", "Tiktok", " tik tok"). Estas funções só
 * normalizam para comparar e exibir; nunca alteram o valor salvo.
 */

const DISPLAY_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

/** Chave estável para comparar plataformas: minúsculas, sem acentos e sem espaços. */
export function platformKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, '');
}

/** Grafia oficial das plataformas conhecidas; as demais voltam como vieram. */
export function platformDisplayName(name: string): string {
  return DISPLAY_NAMES[platformKey(name)] ?? name;
}
