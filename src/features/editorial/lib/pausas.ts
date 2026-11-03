import { addDays, format, parseISO } from 'date-fns';

/**
 * Pausas com datas e escopo (tabela editorial_pausa). Cada escopo pausa uma coisa só:
 * - publicacao: não publica nada; vale para a meta geral, para todas as contas e para as séries.
 * - producao e gravacao: não reduzem publicação (conteúdo já pronto pode sair).
 * - conta: só aquela conta.
 * - serie: só a frequência daquela série; não vira falta naquele intervalo.
 */
export type EscopoDaPausa = 'publicacao' | 'producao' | 'gravacao' | 'conta' | 'serie';

export type PausaEditorial = {
  id: string;
  inicio: string;
  fim: string;
  escopo: EscopoDaPausa;
  platformId: string | null;
  serieId: string | null;
  nota: string;
};

/** O que está sendo medido, para saber quais pausas valem. */
export type AlvoDaPausa =
  | { tipo: 'publicacao' }
  | { tipo: 'conta'; platformId: string }
  | { tipo: 'serie'; serieIds: ReadonlySet<string> }
  | { tipo: 'gravacao' }
  | { tipo: 'producao' };

/** A pausa vale para o alvo? */
export function pausaValePara(pausa: PausaEditorial, alvo: AlvoDaPausa): boolean {
  switch (alvo.tipo) {
    case 'publicacao':
      return pausa.escopo === 'publicacao';
    case 'conta':
      return pausa.escopo === 'publicacao' || (pausa.escopo === 'conta' && pausa.platformId === alvo.platformId);
    case 'serie':
      return pausa.escopo === 'publicacao' || (pausa.escopo === 'serie' && pausa.serieId != null && alvo.serieIds.has(pausa.serieId));
    case 'gravacao':
      return pausa.escopo === 'gravacao' || pausa.escopo === 'producao';
    case 'producao':
      return pausa.escopo === 'producao';
  }
}

/** Dias pausados para o alvo dentro do intervalo, sem repetição e em ordem. */
export function diasDePausa(
  pausas: readonly PausaEditorial[],
  alvo: AlvoDaPausa,
  intervalo: { inicio: string; fim: string },
): string[] {
  const dias = new Set<string>();
  for (const pausa of pausas) {
    if (!pausaValePara(pausa, alvo)) continue;
    const ini = pausa.inicio > intervalo.inicio ? pausa.inicio : intervalo.inicio;
    const fim = pausa.fim < intervalo.fim ? pausa.fim : intervalo.fim;
    if (ini > fim) continue;
    let cursor = parseISO(ini);
    const termo = parseISO(fim);
    while (cursor <= termo) {
      dias.add(format(cursor, 'yyyy-MM-dd'));
      cursor = addDays(cursor, 1);
    }
  }
  return [...dias].sort();
}

/** O intervalo inteiro está em pausa para o alvo (pausa integral). */
export function intervaloTodoPausado(
  pausas: readonly PausaEditorial[],
  alvo: AlvoDaPausa,
  intervalo: { inicio: string; fim: string },
): boolean {
  const dias = diasDePausa(pausas, alvo, intervalo);
  if (dias.length === 0) return false;
  let total = 0;
  let cursor = parseISO(intervalo.inicio);
  const termo = parseISO(intervalo.fim);
  while (cursor <= termo) {
    total += 1;
    cursor = addDays(cursor, 1);
  }
  return dias.length === total;
}
