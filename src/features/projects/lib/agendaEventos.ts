import {addDays, format, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import type {AgendaItem, BibliotecaItem, ProjetoLivro} from '../../../lib/database.ts';

/** Tipos oferecidos ao criar um evento. `Entrega` permanece só nos registros antigos. */
export const AGENDA_TIPOS = [
  'Reunião',
  'Escrever roteiro',
  'Enviar roteiro',
  'Publicação',
  'Período de leitura',
  'Outro',
] as const;

export type AgendaTipoNovo = (typeof AGENDA_TIPOS)[number];

export type AgendaTipo = AgendaTipoNovo | 'Entrega';

export function isPeriodoLeitura(tipo: string | null | undefined): boolean {
  return tipo === 'Período de leitura';
}

export function opcoesTipoEvento(atual: string | null | undefined): AgendaTipo[] {
  if (atual === 'Entrega') return [...AGENDA_TIPOS, 'Entrega'];
  return [...AGENDA_TIPOS];
}

export function diaChave(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

/** Dias inclusivos do evento. Sem data final, só o dia de início. */
export function diasCobertos(item: {date: string; dateEnd?: string | null}): string[] {
  const inicio = diaChave(item.date);
  if (!inicio) return [];
  const fim = diaChave(item.dateEnd) || inicio;
  if (fim <= inicio) return [inicio];

  const dias: string[] = [];
  let cursor = parseISO(inicio);
  const ultimo = parseISO(fim);
  while (dias.length < 800 && format(cursor, 'yyyy-MM-dd') <= format(ultimo, 'yyyy-MM-dd')) {
    dias.push(format(cursor, 'yyyy-MM-dd'));
    cursor = addDays(cursor, 1);
  }
  if (dias[dias.length - 1] !== fim) dias.push(fim);
  return dias;
}

export function eventoCobreDia(
  item: {date: string; dateEnd?: string | null},
  dia: string,
): boolean {
  const inicio = diaChave(item.date);
  const fim = diaChave(item.dateEnd) || inicio;
  const chave = diaChave(dia);
  if (!inicio || !chave) return false;
  return chave >= inicio && chave <= fim;
}

export type PapelNoIntervalo = 'single' | 'start' | 'middle' | 'end';

export function papelNoIntervalo(dia: string, inicio: string, fim: string): PapelNoIntervalo {
  const chave = diaChave(dia);
  const start = diaChave(inicio);
  const end = diaChave(fim) || start;
  if (!end || end <= start) return 'single';
  if (chave === start) return 'start';
  if (chave === end) return 'end';
  return 'middle';
}

export function tituloLeitura(nome: string): string {
  return `Leitura de ${nome.trim()}`;
}

/** Ex.: Leitura de Reis e Ladrões — de 5 a 12 de novembro. */
export function rotuloPeriodoLeitura(nome: string, inicio: string, fim: string): string {
  const start = parseISO(diaChave(inicio));
  const end = parseISO(diaChave(fim) || diaChave(inicio));
  const livro = nome.trim() || 'livro';
  if (diaChave(inicio) === diaChave(fim) || !diaChave(fim)) {
    return `Leitura de ${livro} — ${format(start, "d 'de' MMMM", {locale: ptBR})}`;
  }
  const mesmoMes = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (mesmoMes) {
    return `Leitura de ${livro} — de ${format(start, 'd')} a ${format(end, "d 'de' MMMM", {locale: ptBR})}`;
  }
  return `Leitura de ${livro} — de ${format(start, "d 'de' MMMM", {locale: ptBR})} a ${format(end, "d 'de' MMMM", {locale: ptBR})}`;
}

export function encontrarLivroDoProjeto(
  livros: readonly ProjetoLivro[],
  busca: {bibliotecaItemId?: string | null; nome?: string | null},
): ProjetoLivro | null {
  if (busca.bibliotecaItemId) {
    const peloItem = livros.find(livro => livro.bibliotecaItemId === busca.bibliotecaItemId);
    if (peloItem) return peloItem;
  }
  const nome = busca.nome?.trim().toLocaleLowerCase('pt-BR');
  if (!nome) return null;
  return livros.find(livro => livro.nome.trim().toLocaleLowerCase('pt-BR') === nome) ?? null;
}

export function nomeDoLivro(
  item: Pick<AgendaItem, 'projetoLivroId' | 'title'>,
  livros: readonly ProjetoLivro[],
): string | null {
  if (!item.projetoLivroId) return null;
  return livros.find(livro => livro.id === item.projetoLivroId)?.nome ?? null;
}

function chaveNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

/** Livro da Biblioteca com o mesmo título (sem diferenciar maiúsculas). Ignora excluídos e outros formatos. */
export function encontrarLivroNaBiblioteca(
  itens: readonly BibliotecaItem[],
  nome: string | null | undefined,
): BibliotecaItem | null {
  const chave = chaveNome(nome);
  if (!chave) return null;
  return itens.find(item => item.tipo === 'livro' && !item.deletedAt && chaveNome(item.titulo) === chave) ?? null;
}

/** Livro novo da Biblioteca só com o nome, criado a partir de um período de leitura. */
export function novoLivroDaBiblioteca(nome: string, userId: string, agora: string, id: string): BibliotecaItem {
  return {
    id,
    userId,
    tipo: 'livro',
    titulo: nome.trim().replace(/\s+/g, ' '),
    autorDiretor: '',
    capaUrl: null,
    status: 'Quero ler',
    dataInicio: null,
    dataFim: null,
    avaliacao: null,
    notasGerais: null,
    potencialConteudo: null,
    totalPaginas: null,
    paginasLidas: null,
    createdAt: agora,
    updatedAt: agora,
    deletedAt: null,
    generoIds: [],
    anotacoes: [],
  };
}
