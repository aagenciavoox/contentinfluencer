/** Conteúdo que nasce de um item da biblioteca entra neste pilar, se ele existir. */
const NOME_ALVO = 'indicacao/resenha';

function nomeComparavel(nome: string): string {
  return nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, '');
}

export function pilarDeItemDaBiblioteca<T extends { id: string; nome: string; ativo?: boolean }>(
  pilares: readonly T[],
): T | null {
  const bate = (item: T) => nomeComparavel(item.nome) === NOME_ALVO;
  return pilares.find(item => item.ativo !== false && bate(item))
    ?? pilares.find(bate)
    ?? null;
}

/** Pilar explícito, para a série não substituir depois. */
export function pilarEscolhidoDaBiblioteca(
  pilares: readonly { id: string; nome: string; ativo?: boolean }[],
): { pilarId: string; pilarOrigem: 'escolhida' } | null {
  const pilar = pilarDeItemDaBiblioteca(pilares);
  return pilar ? { pilarId: pilar.id, pilarOrigem: 'escolhida' } : null;
}
