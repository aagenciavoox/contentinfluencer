export interface SerieProductionMetrics {
  serieId: string;
  /** Episódios cadastrados na série e nos quadros, uma vez cada. */
  episodios: number;
  /** Publicações por conta ainda previstas ou programadas. */
  publicacoesPrevistas: number;
  /** Publicações por conta já publicadas. */
  publicacoesRealizadas: number;
  roteirosEscritos: number;
  gravadosProntos: number;
  publicadosNoCiclo: number;
  ultimaPublicacao: string | null;
  ativa: boolean;
  postableContentIds: string[];
  scriptContentIds: string[];
}

export interface CycleWindow {
  start: Date;
  end: Date;
}
