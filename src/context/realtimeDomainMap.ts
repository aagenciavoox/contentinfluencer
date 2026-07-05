import type { AppDataDomain } from '../lib/database';

type RealtimeTableMapping = {
  domains: AppDataDomain[];
  namespaces: string[];
};

const REALTIME_TABLE_MAP: Record<string, RealtimeTableMapping> = {
  contents: {
    domains: ['content', 'content-summary', 'content-schedule'],
    namespaces: ['contents'],
  },
  content_plataformas: {
    domains: ['content', 'content-summary', 'content-schedule'],
    namespaces: ['contents'],
  },
  ideas: {
    domains: ['ideas'],
    namespaces: [],
  },
  biblioteca_items: {
    domains: ['library', 'library-generos'],
    namespaces: ['library'],
  },
  anotacoes: {
    domains: ['library', 'library-generos'],
    namespaces: ['library'],
  },
  biblioteca_generos: {
    domains: ['library', 'library-generos'],
    namespaces: ['library'],
  },
  item_generos: {
    domains: ['library', 'library-generos'],
    namespaces: ['library'],
  },
  pilares: {
    domains: ['production', 'bootstrap'],
    namespaces: [],
  },
  pilar_plataformas: {
    domains: ['production', 'bootstrap'],
    namespaces: [],
  },
  series: {
    domains: ['production', 'bootstrap'],
    namespaces: [],
  },
  serie_pilares: {
    domains: ['production', 'bootstrap'],
    namespaces: [],
  },
  serie_plataformas: {
    domains: ['production', 'bootstrap'],
    namespaces: [],
  },
  cenarios: {
    domains: ['production', 'bootstrap'],
    namespaces: [],
  },
  looks: {
    domains: ['production', 'bootstrap'],
    namespaces: [],
  },
  platforms: {
    domains: ['production', 'bootstrap'],
    namespaces: [],
  },
  user_preferences: {
    domains: ['production', 'bootstrap'],
    namespaces: [],
  },
  recording_blocks: {
    domains: ['recording'],
    namespaces: [],
  },
  recording_block_contents: {
    domains: ['recording'],
    namespaces: [],
  },
  projetos: {
    domains: ['projects'],
    namespaces: [],
  },
  projeto_etapas: {
    domains: ['projects'],
    namespaces: [],
  },
  projeto_conteudos: {
    domains: ['projects'],
    namespaces: [],
  },
  agenda_items: {
    domains: ['agenda'],
    namespaces: [],
  },
  templates: {
    domains: ['templates'],
    namespaces: [],
  },
  golden_rules: {
    domains: ['rules', 'schedule'],
    namespaces: [],
  },
  posting_times: {
    domains: ['rules', 'schedule'],
    namespaces: [],
  },
  content_metrics: {
    domains: ['analytics'],
    namespaces: [],
  },
};

export function getDomainsForRealtimeTable(table: string): AppDataDomain[] {
  return REALTIME_TABLE_MAP[table]?.domains ?? [];
}

export function getListNamespacesForRealtimeTable(table: string): string[] {
  return REALTIME_TABLE_MAP[table]?.namespaces ?? [];
}
