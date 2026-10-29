import { pilarPrincipalDaSerie } from './pilarDaSerie.ts';

type SeriePilar = {
  id: string;
  pilarPrincipalId?: string | null;
  pilarIds?: readonly string[] | null;
};

/** Série ligada a este pilar pelo principal ou pelo vínculo antigo. */
export function serieLigadaAoPilar(serie: SeriePilar, pilarId: string): boolean {
  return pilarPrincipalDaSerie(serie) === pilarId;
}

/**
 * Ao vincular no pilar: principal = este pilar e vínculo antigo = [principal].
 * Ao desvincular: limpa se o principal era este; senão só tira o id do vínculo antigo.
 * Retorna null quando nada muda.
 */
export function patchSerieAoVincularPilar(
  serie: SeriePilar,
  pilarId: string,
  vincular: boolean,
): { pilarPrincipalId: string | null; pilarIds: string[] } | null {
  if (vincular) {
    const pilarIds = [pilarId];
    if (serie.pilarPrincipalId === pilarId && sameIds(serie.pilarIds, pilarIds)) return null;
    return { pilarPrincipalId: pilarId, pilarIds };
  }

  const principal = serie.pilarPrincipalId?.trim() || null;
  const ids = [...(serie.pilarIds ?? [])];
  if (principal === pilarId) {
    if (!principal && ids.length === 0) return null;
    return { pilarPrincipalId: null, pilarIds: [] };
  }
  if (!ids.includes(pilarId)) return null;
  return { pilarPrincipalId: principal, pilarIds: ids.filter(id => id !== pilarId) };
}

function sameIds(atual: readonly string[] | null | undefined, esperado: readonly string[]): boolean {
  if (!atual || atual.length !== esperado.length) return false;
  return esperado.every((id, index) => atual[index] === id);
}
