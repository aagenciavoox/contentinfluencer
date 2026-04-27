import { AgendaItem } from '../../types';

export type ItemType = 'organico' | 'parceria' | 'reuniao' | 'entrega' | 'publicacao';

export interface CalendarItem {
  id: string;
  tipo: ItemType;
  titulo: string;
  subtitulo?: string;
  cor?: string;
  status?: string;
  raw: any;
}

export type FiltroAtivo = Record<ItemType, boolean>;

export const FILTRO_LABELS: Record<ItemType, string> = {
  organico: 'Orgânico',
  parceria: 'Parceria',
  reuniao: 'Reunião',
  entrega: 'Entrega',
  publicacao: 'Publicação',
};

export const ITEM_CLASSES: Record<ItemType, (status?: string) => string> = {
  organico: (status) =>
    status === 'Postado'
      ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)] text-[var(--accent-green)]'
      : 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)] text-[var(--accent-blue)]',
  parceria: () => 'bg-[var(--bg-secondary)] border-2 text-[var(--text-primary)]',
  reuniao: () => 'bg-purple-50 border-purple-400 text-purple-700',
  entrega: () => 'bg-orange-50 border-orange-400 text-orange-700',
  publicacao: () => 'bg-teal-50 border-teal-400 text-teal-700',
};

export const TIPO_COR_MAP: Record<string, string> = {
  Reunião: 'bg-purple-50 text-purple-700 border-purple-200',
  Entrega: 'bg-orange-50 text-orange-700 border-orange-200',
  Publicação: 'bg-teal-50 text-teal-700 border-teal-200',
};

export type AgendaTipo = AgendaItem['type'];
