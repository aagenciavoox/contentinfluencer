import type { Tema } from '../../../lib/database.ts';

/** Campos que só uma série tem. Um tema não carrega nenhum deles. */
const CAMPOS_DE_SERIE = ['name', 'template', 'funcaoPadrao', 'pilarIds', 'slotPadrao', 'plataformas'] as const;

export interface NovoTema {
  userId: string;
  now: string;
  novoId: () => string;
}

export function normalizarNomeTema(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}

function chaveTema(nome: string): string {
  return normalizarNomeTema(nome).toLocaleLowerCase('pt-BR');
}

export function temaNaoESerie(tema: object): boolean {
  return CAMPOS_DE_SERIE.every(campo => !(campo in tema));
}

/**
 * Liga os nomes pedidos aos temas do catálogo.
 * Nome novo vira tema. Nome que já existe é reaproveitado.
 * A série do roteiro não entra nesta conta.
 */
export function sincronizarTemasDoRoteiro(
  catalogo: readonly Tema[],
  nomes: readonly string[],
  criar: NovoTema,
  idsAtuais: readonly string[] = [],
): { temaIds: string[]; catalogo: Tema[]; criados: Tema[] } {
  const proximo = [...catalogo];
  const criados: Tema[] = [];
  const temaIds: string[] = [];
  const vistos = new Set<string>();

  for (const bruto of nomes) {
    const nome = normalizarNomeTema(bruto);
    if (!nome) continue;

    const chave = chaveTema(nome);
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const existente = proximo.find(tema => chaveTema(tema.nome) === chave)
      ?? proximo.find(tema => tema.id === bruto);
    if (existente) {
      temaIds.push(existente.id);
      continue;
    }

    if (idsAtuais.includes(bruto)) {
      temaIds.push(bruto);
      continue;
    }

    const tema: Tema = {
      id: criar.novoId(),
      userId: criar.userId,
      nome,
      createdAt: criar.now,
    };
    if (!temaNaoESerie(tema)) {
      throw new Error('Tema não pode ser uma série.');
    }
    proximo.push(tema);
    criados.push(tema);
    temaIds.push(tema.id);
  }

  return { temaIds, catalogo: proximo, criados };
}

/**
 * Atualiza só os temas do roteiro. Série, pilar e função permanecem.
 */
export function vincularTemasNoRoteiro<T extends {
  seriesId: string | null;
  temaIds?: readonly string[] | null;
}>(
  roteiro: T,
  catalogo: readonly Tema[],
  nomes: readonly string[],
  criar: NovoTema,
): { roteiro: T & { temaIds: string[] }; catalogo: Tema[]; criados: Tema[] } {
  const sync = sincronizarTemasDoRoteiro(catalogo, nomes, criar, roteiro.temaIds ?? []);
  return {
    roteiro: {
      ...roteiro,
      seriesId: roteiro.seriesId,
      temaIds: sync.temaIds,
    },
    catalogo: sync.catalogo,
    criados: sync.criados,
  };
}
