import type { Pilar } from '../../../lib/database';

export function getActivePilares(pilares: Pilar[]): Pilar[] {
  return pilares.filter(p => p.ativo);
}

export function sortPilares(pilares: Pilar[]): Pilar[] {
  return [...pilares].sort((a, b) => {
    if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}
