/**
 * Campos e opções que o app já edita e a API precisa devolver no mesmo vocabulário.
 * Janelas espelham src/features/contents/lib/postingWindow.ts.
 * Temas espelham src/features/contents/lib/temas.ts.
 * A ficha da biblioteca espelha BibliotecaItemMeta, em colunas de `biblioteca_items`.
 */

export const JANELAS = ['manha', 'tarde', 'noite'] as const;
export type Janela = (typeof JANELAS)[number];

export const HORA_DA_JANELA: Record<Janela, string> = {
  manha: '09:00',
  tarde: '14:00',
  noite: '20:00',
};

export const JANELA_ROTULO: Record<Janela, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

/** Valores salvos em contents.formato_visual quando o campo é o formato de tela. */
export const FORMATOS_VISUAIS = [
  'Talking Head',
  'Tela Verde',
  'Voiceover',
  'POV Texto',
  'Reacao',
  'Vlog',
  'Misto',
] as const;

/** Sugestões do formato de publicação da série. O app também aceita texto livre. */
export const FORMATOS_PUBLICACAO = [
  'Reels',
  'Carrossel',
  'Post estático',
  'Vídeo longo',
  'Stories',
] as const;

export const FORMATOS_APRESENTACAO = [
  'Falando para a câmera',
  'Narrando',
  'Texto na tela',
  'Entrevista',
  'Vlog',
] as const;

export const FORMATO_DESCRICAO =
  'Formato visual do roteiro (Talking Head, Tela Verde, Voiceover, POV Texto, Reacao, Vlog, Misto) ' +
  'ou formato de publicação (Reels, Carrossel, Post estático, Vídeo longo, Stories). Texto livre também vale.';

export function horaCurta(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
}

/** Manhã 05:00–11:59, tarde 12:00–17:59, noite no resto. Igual ao seletor do roteiro. */
export function janelaDaHora(hora: string | null | undefined): Janela | null {
  const curta = horaCurta(hora);
  if (!curta) return null;
  const hours = Number(curta.slice(0, 2));
  if (Number.isNaN(hours)) return null;
  if (hours >= 5 && hours < 12) return 'manha';
  if (hours >= 12 && hours < 18) return 'tarde';
  return 'noite';
}

/**
 * Hora explícita ganha da janela. Janela sozinha usa o horário padrão do app.
 * Os dois ausentes devolvem undefined (não mexe no valor gravado).
 */
export function horaEscolhida(
  hora: string | null | undefined,
  janela: Janela | null | undefined,
): string | null | undefined {
  if (hora !== undefined) return hora ? horaCurta(hora) : null;
  if (janela) return HORA_DA_JANELA[janela];
  if (janela === null) return null;
  return undefined;
}

export function normalizarNomeTema(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}

export function chaveTema(nome: string): string {
  return normalizarNomeTema(nome).toLocaleLowerCase('pt-BR');
}

export type TemaCatalogo = {id: string; nome: string};

/** Liga nomes ou ids ao catálogo. Nome novo entra em `criados`. Repetição é ignorada. */
export function resolverTemas(
  catalogo: readonly TemaCatalogo[],
  pedidos: readonly string[],
  novoId: () => string,
): {ids: string[]; criados: TemaCatalogo[]} {
  const todos = [...catalogo];
  const criados: TemaCatalogo[] = [];
  const ids: string[] = [];
  const vistos = new Set<string>();

  for (const bruto of pedidos) {
    const nome = normalizarNomeTema(bruto);
    if (!nome) continue;
    const chave = chaveTema(nome);
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const existente = todos.find(tema => tema.id === bruto)
      ?? todos.find(tema => chaveTema(tema.nome) === chave);
    if (existente) {
      ids.push(existente.id);
      continue;
    }

    const tema = {id: novoId(), nome};
    todos.push(tema);
    criados.push(tema);
    ids.push(tema.id);
  }

  return {ids, criados};
}

/** Chave da API (snake) → chave que o app guarda na preferência. */
export const FICHA_PARA_APP = {
  editora: 'editora',
  ano_publicacao: 'anoPublicacao',
  isbn: 'isbn',
  idioma: 'idioma',
  traducao: 'traducao',
  serie_colecao: 'serieColecao',
  colecao_status: 'colecaoStatus',
  colecao_nome: 'colecaoNome',
  genero_autor: 'generoAutor',
  pais_autor: 'paisAutor',
  raca_autor: 'racaAutor',
  duracao: 'duracao',
  episodios: 'episodios',
  duracao_por_episodio: 'duracaoPorEpisodio',
  roteirista: 'roteirista',
  distribuidora: 'distribuidora',
  plataforma: 'plataforma',
  data_lancamento: 'dataLancamento',
  pais_origem: 'paisOrigem',
  faz_parte_de_serie: 'fazParteDeSerie',
  nome_da_serie: 'nomeDaSerie',
  tags: 'tagsPersonalizadas',
  quem_indicou: 'quemIndicou',
  motivo_escolha: 'motivoEscolha',
  capitulos_cobertos: 'capitulosCobertos',
} as const;

export type CampoFicha = keyof typeof FICHA_PARA_APP;

const FICHA_LISTAS = new Set<CampoFicha>(['tags', 'capitulos_cobertos']);
const FICHA_SIM_NAO = new Set<CampoFicha>(['colecao_status', 'faz_parte_de_serie']);

function limparTexto(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function limparLista(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const itens = value.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  return itens.length ? itens : null;
}

/** Objeto do app (camelCase) ou da coluna metadata → ficha da API, sem vazios. */
export function lerFicha(bruto: unknown): Record<string, string | string[]> {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {};
  const source = bruto as Record<string, unknown>;
  const ficha: Record<string, string | string[]> = {};
  for (const campo of Object.keys(FICHA_PARA_APP) as CampoFicha[]) {
    const appKey = FICHA_PARA_APP[campo];
    const value = source[appKey] ?? source[campo];
    if (FICHA_LISTAS.has(campo)) {
      const lista = limparLista(value);
      if (lista) ficha[campo] = lista;
      continue;
    }
    if (FICHA_SIM_NAO.has(campo)) {
      if (value === 'sim' || value === 'nao') ficha[campo] = value;
      continue;
    }
    const texto = limparTexto(value);
    if (texto) ficha[campo] = texto;
  }
  return ficha;
}

/** Aplica o patch da API em cima da ficha atual e devolve o objeto camelCase do app. */
export function aplicarFicha(
  atual: Record<string, string | string[]>,
  patch: Partial<Record<CampoFicha, string | string[] | null>>,
): Record<string, string | string[]> {
  const next: Record<string, string | string[]> = {...atual};
  for (const [campo, value] of Object.entries(patch) as Array<[CampoFicha, string | string[] | null | undefined]>) {
    if (value === undefined || !(campo in FICHA_PARA_APP)) continue;
    if (value === null) {
      delete next[campo];
      continue;
    }
    if (FICHA_LISTAS.has(campo)) {
      const lista = limparLista(value);
      if (lista) next[campo] = lista;
      else delete next[campo];
      continue;
    }
    if (FICHA_SIM_NAO.has(campo)) {
      if (value === 'sim' || value === 'nao') next[campo] = value;
      else delete next[campo];
      continue;
    }
    const texto = limparTexto(value);
    if (texto) next[campo] = texto;
    else delete next[campo];
  }

  const stored: Record<string, string | string[]> = {};
  for (const campo of Object.keys(next) as CampoFicha[]) {
    stored[FICHA_PARA_APP[campo]] = next[campo];
  }
  return stored;
}
