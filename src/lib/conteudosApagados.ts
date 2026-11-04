/**
 * Marca de sessão: um roteiro apagado aqui não volta numa busca que ainda o viu vivo.
 * A marca some ao recarregar a página e ao restaurar o roteiro.
 */
const apagados = new Set<string>();

export function marcarConteudoApagado(id: string) {
  apagados.add(id);
}

export function marcarConteudosApagados(ids: readonly string[]) {
  for (const id of ids) apagados.add(id);
}

export function liberarConteudoApagado(id: string) {
  apagados.delete(id);
}

export function liberarConteudosApagados(ids: readonly string[]) {
  for (const id of ids) apagados.delete(id);
}

export function conteudoApagado(id: string): boolean {
  return apagados.has(id);
}

/** Só para testes. A marca não pode vazar de um caso para o outro. */
export function limparConteudosApagados() {
  apagados.clear();
}
