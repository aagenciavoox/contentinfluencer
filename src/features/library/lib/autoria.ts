import type { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';

/**
 * Quem escreveu a obra: gênero, país e raça da autoria, digitados livremente na ficha.
 * O Panorama conta esses valores; aqui eles viram um rótulo só, para "mulher", "Mulher"
 * e "feminino" caírem no mesmo grupo.
 */

export type CampoAutoria = 'generoAutor' | 'paisAutor' | 'racaAutor';

export const CAMPOS_AUTORIA: ReadonlyArray<{ campo: CampoAutoria; rotulo: string }> = [
  { campo: 'generoAutor', rotulo: 'Gênero' },
  { campo: 'paisAutor', rotulo: 'País' },
  { campo: 'racaAutor', rotulo: 'Raça' },
];

/** Tipos com autoria na ficha (filmes e séries têm direção, não entram). */
const TIPOS_COM_AUTORIA: ReadonlySet<BibliotecaItem['tipo']> = new Set(['livro', 'manga', 'quadrinho']);

export function temAutoria(tipo: BibliotecaItem['tipo']) {
  return TIPOS_COM_AUTORIA.has(tipo);
}

/** Chave de comparação: sem acento, minúscula, hífen vira espaço. */
function dobrar(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[-_./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapa(grupos: Record<string, string[]>) {
  const resultado = new Map<string, string>();
  for (const [rotulo, variantes] of Object.entries(grupos)) {
    resultado.set(dobrar(rotulo), rotulo);
    for (const variante of variantes) resultado.set(dobrar(variante), rotulo);
  }
  return resultado;
}

const SINONIMOS: Record<CampoAutoria, Map<string, string>> = {
  generoAutor: mapa({
    Mulher: ['mulheres', 'feminino', 'feminina', 'f'],
    Homem: ['homens', 'masculino', 'm'],
    'Não binárie': ['não binário', 'não binária', 'não-binárie', 'não-binário', 'não-binária', 'nb', 'enby'],
  }),
  paisAutor: mapa({
    Brasil: ['brazil', 'br'],
    'Estados Unidos': ['eua', 'usa', 'us', 'estados unidos da américa', 'united states'],
    'Reino Unido': ['uk', 'united kingdom'],
  }),
  racaAutor: mapa({
    Branca: ['branco', 'brancas', 'brancos'],
    Preta: ['preto', 'pretas', 'pretos'],
    Parda: ['pardo', 'pardas', 'pardos'],
    Negra: ['negro', 'negras', 'negros'],
    Amarela: ['amarelo', 'amarelas', 'amarelos'],
    'Indígena': ['indigena', 'indígenas'],
  }),
};

/** Opções que aparecem na ficha antes de qualquer valor digitado. */
const SUGESTOES_PADRAO: Record<CampoAutoria, readonly string[]> = {
  generoAutor: ['Mulher', 'Homem', 'Não binárie'],
  paisAutor: ['Brasil'],
  racaAutor: ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena'],
};

/** Rótulo do grupo: o sinônimo conhecido ou o texto com a primeira letra maiúscula. Vazio vira `null`. */
export function rotuloAutoria(campo: CampoAutoria, valor: string | null | undefined): string | null {
  const texto = (valor ?? '').replace(/\s+/g, ' ').trim();
  if (!texto) return null;
  const conhecido = SINONIMOS[campo].get(dobrar(texto));
  if (conhecido) return conhecido;
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1);
}

export interface ContagemAutoria {
  label: string;
  count: number;
}

/** Quantas obras em cada valor do campo, do mais comum ao menos comum. Obras sem o campo ficam de fora. */
export function contarAutoria(fichas: ReadonlyArray<BibliotecaItemMeta | undefined>, campo: CampoAutoria): ContagemAutoria[] {
  const grupos = new Map<string, ContagemAutoria>();
  for (const ficha of fichas) {
    const rotulo = rotuloAutoria(campo, ficha?.[campo]);
    if (!rotulo) continue;
    const chave = dobrar(rotulo);
    const grupo = grupos.get(chave);
    if (grupo) grupo.count += 1;
    else grupos.set(chave, { label: rotulo, count: 1 });
  }
  return [...grupos.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
}

/** Sugestões do campo na ficha: as padrão e as que já foram usadas, sem repetir grafias. */
export function sugestoesAutoria(itens: ReadonlyArray<Pick<BibliotecaItem, 'ficha' | 'deletedAt'>>, campo: CampoAutoria): string[] {
  const vistos = new Map<string, string>();
  const incluir = (rotulo: string | null) => {
    if (rotulo && !vistos.has(dobrar(rotulo))) vistos.set(dobrar(rotulo), rotulo);
  };
  SUGESTOES_PADRAO[campo].forEach(incluir);
  for (const item of itens) {
    if (!item.deletedAt) incluir(rotuloAutoria(campo, item.ficha?.[campo]));
  }
  return [...vistos.values()];
}
