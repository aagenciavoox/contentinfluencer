import { addDays, format, parseISO } from 'date-fns';
import { resolverPausa } from './metaDoPeriodo.ts';

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

type Intervalo = { inicio: string; fim: string };

/** Ordem em que os escopos aparecem na tela. */
export const ESCOPOS_DA_PAUSA: readonly EscopoDaPausa[] = ['publicacao', 'gravacao', 'producao', 'conta', 'serie'];

export const ROTULO_DO_ESCOPO: Record<EscopoDaPausa, string> = {
  publicacao: 'Publicação',
  gravacao: 'Gravação',
  producao: 'Produção',
  conta: 'Uma conta',
  serie: 'Uma série',
};

/** O que a pausa muda, dito na escolha do escopo. */
export const EFEITO_DO_ESCOPO: Record<EscopoDaPausa, string> = {
  publicacao: 'Nada sai nesses dias: eles saem da meta geral, das contas e das séries.',
  gravacao: 'Sem gravar nesses dias. A publicação segue e a meta não muda.',
  producao: 'Sem roteiro, gravação nem edição. A publicação segue e a meta não muda.',
  conta: 'Só esta conta para: os dias saem da meta dela.',
  serie: 'A série não cobra frequência nesses dias.',
};

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Pausas que cruzam o intervalo, pela data de início. */
export function pausasNoIntervalo(pausas: readonly PausaEditorial[], intervalo: Intervalo): PausaEditorial[] {
  return pausas
    .filter(pausa => pausa.inicio <= intervalo.fim && pausa.fim >= intervalo.inicio)
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.fim.localeCompare(b.fim));
}

/** Dias seguidos viram um trecho: 24, 25, 26 e 31 → 24–26 e 31–31. */
export function trechosDosDias(dias: readonly string[]): Intervalo[] {
  const ordenados = [...new Set(dias)].sort();
  const trechos: Intervalo[] = [];
  for (const dia of ordenados) {
    const ultimo = trechos.at(-1);
    if (ultimo && format(addDays(parseISO(ultimo.fim), 1), 'yyyy-MM-dd') === dia) ultimo.fim = dia;
    else trechos.push({ inicio: dia, fim: dia });
  }
  return trechos;
}

/** O alvo só fica no escopo que usa: a tabela recusa conta numa pausa de série e o contrário. */
export function pausaLimpa(pausa: PausaEditorial): PausaEditorial {
  return {
    ...pausa,
    platformId: pausa.escopo === 'conta' ? pausa.platformId : null,
    serieId: pausa.escopo === 'serie' ? pausa.serieId : null,
    nota: pausa.nota.trim(),
  };
}

/** O que falta para gravar a pausa; null quando está pronta. */
export function problemaDaPausa(pausa: Omit<PausaEditorial, 'id'>): string | null {
  if (!DATA_ISO.test(pausa.inicio) || !DATA_ISO.test(pausa.fim)) return 'Escolha o início e o fim.';
  if (pausa.inicio > pausa.fim) return 'O fim vem depois do início.';
  if (pausa.escopo === 'conta' && !pausa.platformId) return 'Escolha a conta.';
  if (pausa.escopo === 'serie' && !pausa.serieId) return 'Escolha a série.';
  return null;
}

/** Grava a pausa no lugar da de mesmo id, ou acrescenta. */
export function salvarPausa(pausas: readonly PausaEditorial[], pausa: PausaEditorial): PausaEditorial[] {
  const limpa = pausaLimpa(pausa);
  const existe = pausas.some(item => item.id === limpa.id);
  const lista = existe ? pausas.map(item => (item.id === limpa.id ? limpa : item)) : [...pausas, limpa];
  return lista.sort((a, b) => a.inicio.localeCompare(b.inicio) || a.fim.localeCompare(b.fim));
}

export function removerPausa(pausas: readonly PausaEditorial[], id: string): PausaEditorial[] {
  return pausas.filter(pausa => pausa.id !== id);
}

/**
 * A pausa escrita em "Pausas & Exceções" vira pausa de publicação com data, nos mesmos dias que
 * já eram descontados. Só quando o texto inteiro foi lido sem dúvida e cai no período; senão, null
 * e o texto fica como está, para revisão.
 */
export function pausasDoTexto(texto: string | null | undefined, periodo: Intervalo, novoId: () => string): PausaEditorial[] | null {
  const lida = resolverPausa(texto, periodo);
  if (lida.pendencia || lida.dias.length === 0) return null;
  const nota = texto?.trim() ?? '';
  return trechosDosDias(lida.dias).map(trecho => ({
    id: novoId(),
    ...trecho,
    escopo: 'publicacao' as const,
    platformId: null,
    serieId: null,
    nota,
  }));
}
