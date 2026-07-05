export type RecommendationKind = 'post' | 'record' | 'on_track' | 'configure_meta';

export interface SerieProductionMetrics {
  serieId: string;
  roteirosEscritos: number;
  gravadosProntos: number;
  publicadosNoCiclo: number;
  ultimaPublicacao: string | null;
  ativa: boolean;
  postableContentIds: string[];
  scriptContentIds: string[];
}

export interface PilarCycleMetrics {
  pilarId: string;
  totalDisponivel: number;
  gapCiclo: number | null;
  metaCiclo: number | null;
  postableContentIds: string[];
}

export interface DailyRecommendation {
  kind: RecommendationKind;
  pilar: {
    id: string;
    nome: string;
    cor: string;
    gapCiclo: number | null;
    totalDisponivel: number;
    metaCiclo: number | null;
  };
  serie?: {
    id: string;
    name: string;
    gravadosProntos: number;
    roteirosEscritos: number;
  };
  contentIds?: string[];
  message: string;
  href: string;
}

export interface CycleWindow {
  start: Date;
  end: Date;
}
