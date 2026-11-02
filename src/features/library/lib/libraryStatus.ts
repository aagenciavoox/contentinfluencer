import { format } from 'date-fns';
import type { BibliotecaItem } from '../../../lib/database';

type BibliotecaTipo = BibliotecaItem['tipo'];
type StatusLeitura = BibliotecaItem['status'];

/** Status que cada tipo de obra aceita, na ordem do seletor. */
export const STATUS_BY_TYPE: Record<BibliotecaTipo, StatusLeitura[]> = {
  livro: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  manga: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  quadrinho: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  filme: ['Quero ver', 'Assistido', 'Abandonado'],
  'série': ['Quero ver', 'Assistindo', 'Assistido', 'Abandonado'],
  anime: ['Quero ver', 'Assistindo', 'Assistido', 'Abandonado'],
  outro: ['Quero consumir', 'Consumindo', 'Concluído', 'Abandonado'],
};

/**
 * Fase da obra, igual para todos os tipos: os botões da Biblioteca filtram por fase,
 * então "Lendo" também acha o que ficou gravado como "Consumindo" num livro.
 */
export type StatusFase = 'andamento' | 'quero' | 'concluido' | 'abandonado';

export const STATUS_FASES: readonly StatusFase[] = ['andamento', 'quero', 'concluido', 'abandonado'];

const STATUS_POR_FASE: Record<StatusFase, readonly StatusLeitura[]> = {
  andamento: ['Lendo', 'Assistindo', 'Consumindo', 'Pausado'],
  quero: ['Quero ler', 'Quero ver', 'Quero consumir'],
  concluido: ['Lido', 'Assistido', 'Concluído'],
  abandonado: ['Abandonado'],
};

export function statusesDaFase(fase: StatusFase): readonly StatusLeitura[] {
  return STATUS_POR_FASE[fase];
}

export function faseDoStatus(status: StatusLeitura): StatusFase | null {
  return STATUS_FASES.find(fase => STATUS_POR_FASE[fase].includes(status)) ?? null;
}

const ASSISTIR: ReadonlySet<BibliotecaTipo | 'Todos'> = new Set(['filme', 'série', 'anime']);

/** Rótulo da fase no tipo filtrado: livros leem, filmes e séries se assistem. */
export function rotuloDaFase(fase: StatusFase, tipo: BibliotecaTipo | 'Todos'): string {
  if (fase === 'abandonado') return 'Abandonados';
  if (ASSISTIR.has(tipo)) {
    return { andamento: 'Assistindo', quero: 'Quero ver', concluido: 'Assistidos' }[fase];
  }
  if (tipo === 'outro') {
    return { andamento: 'Em andamento', quero: 'Quero consumir', concluido: 'Concluídos' }[fase];
  }
  return { andamento: 'Lendo', quero: 'Quero ler', concluido: 'Lidos' }[fase];
}

// Valor da fase no endereço da página. "andamento" e "concluidos" já vêm dos links da Análise.
const FASE_NA_URL: Record<StatusFase, string> = {
  andamento: 'andamento',
  quero: 'quero',
  concluido: 'concluidos',
  abandonado: 'abandonados',
};

export function faseParaUrl(fase: StatusFase): string {
  return FASE_NA_URL[fase];
}

export function faseDaUrl(value: string | null): StatusFase | null {
  if (!value) return null;
  return STATUS_FASES.find(fase => FASE_NA_URL[fase] === value) ?? null;
}

/**
 * Datas que mudam junto com o status: começar preenche o início, terminar preenche o fim.
 * Só completa o que está vazio; datas já escritas ficam.
 */
export function datasAoMudarStatus(
  status: StatusLeitura,
  atuais: { dataInicio: string | null; dataFim: string | null },
  hoje: Date = new Date(),
): { dataInicio: string | null; dataFim: string | null } {
  const dia = format(hoje, 'yyyy-MM-dd');
  const fase = faseDoStatus(status);
  return {
    dataInicio: atuais.dataInicio || (fase === 'andamento' ? dia : null),
    dataFim: atuais.dataFim || (fase === 'concluido' ? dia : null),
  };
}

export const COMPLETED_STATUS_BY_TYPE: Record<BibliotecaTipo, StatusLeitura> = {
  livro: 'Lido',
  manga: 'Lido',
  quadrinho: 'Lido',
  filme: 'Assistido',
  'série': 'Assistido',
  anime: 'Assistido',
  outro: 'Concluído',
};

export function isCompletedStatus(status: StatusLeitura) {
  return status === 'Lido' || status === 'Assistido' || status === 'Concluído';
}

// Ponto do selo de status, igual no card e no cabeçalho do item:
// rosa em andamento, verde concluído, cinza no resto (quero ler, pausado, abandonado).
const STATUS_DOT_COLOR: Partial<Record<StatusLeitura, string>> = {
  Lendo: 'var(--brand-accent)',
  Assistindo: 'var(--brand-accent)',
  Consumindo: 'var(--brand-accent)',
  Lido: 'var(--accent-green)',
  Assistido: 'var(--accent-green)',
  'Concluído': 'var(--accent-green)',
};

export function statusDotColor(status: string) {
  return STATUS_DOT_COLOR[status as StatusLeitura] ?? 'var(--text-tertiary)';
}
