import type { ContentPlataforma, PublicacaoStatus } from '../../../lib/database.ts';
import { isReadyToPublish } from '../../contents/lib/contentPipeline.ts';
import { cicloDaPublicacao } from './cicloPublicacao.ts';

/** Status canônicos no app. `agendada` só existe no banco legado. */
export type SituacaoPublicacao =
  | 'prevista'
  | 'programada'
  | 'publicada'
  | 'nao_publicada'
  | 'removida';

/** Lê o banco: agendada vira prevista. Valor desconhecido vira prevista. */
export function normalizePublicacaoStatus(value: unknown): SituacaoPublicacao {
  if (value === 'publicada' || value === 'nao_publicada' || value === 'removida' || value === 'programada' || value === 'prevista') {
    return value;
  }
  if (value === 'agendada') return 'prevista';
  return 'prevista';
}

/** Contas ativas do ciclo: previstas, programadas ou publicadas. */
export function publicacaoAtiva(
  publicacao: Pick<ContentPlataforma, 'status'>,
): boolean {
  const status = normalizePublicacaoStatus(publicacao.status);
  return status === 'prevista' || status === 'programada' || status === 'publicada';
}

export function publicacaoPublicada(
  publicacao: Pick<ContentPlataforma, 'status'>,
): boolean {
  return normalizePublicacaoStatus(publicacao.status) === 'publicada';
}

export type ProgressoPublicacao = {
  publicadas: number;
  previstas: number;
  /** Todas as contas ativas previstas foram publicadas. */
  completo: boolean;
  rotulo: string;
};

/**
 * Progresso do ciclo mais recente. Parcial não move o conteúdo para Publicado.
 * Ciclo sem contas ativas não fecha sozinho. Ciclo 1 legado = publicationKind !== repost.
 */
export function progressoPublicacao(
  publicacoes: readonly Pick<ContentPlataforma, 'status' | 'publicationKind' | 'ciclo'>[],
): ProgressoPublicacao {
  let cicloAtual = 1;
  for (const item of publicacoes) {
    if (!publicacaoAtiva(item)) continue;
    const ciclo = cicloDaPublicacao(item);
    if (ciclo > cicloAtual) cicloAtual = ciclo;
  }
  const ativas = publicacoes.filter(item =>
    publicacaoAtiva(item) && cicloDaPublicacao(item) === cicloAtual,
  );
  const publicadas = ativas.filter(publicacaoPublicada).length;
  const previstas = ativas.length;
  const completo = previstas > 0 && publicadas === previstas;
  return {
    publicadas,
    previstas,
    completo,
    rotulo: previstas === 0
      ? 'Sem publicações previstas'
      : `${publicadas} de ${previstas} publicações`,
  };
}

/** Selo Programado: conta programada + material em Edição · Pronto. */
export function contaProgramadaPronta(
  content: { status: string; edicaoConcluidaEm?: string | null; postedAt?: string | null },
  publicacoes: readonly Pick<ContentPlataforma, 'status'>[],
): boolean {
  if (!isReadyToPublish(content)) return false;
  return publicacoes.some(item => normalizePublicacaoStatus(item.status) === 'programada');
}

/** Pode confirmar Programado nesta conta? Exige material pronto. */
export function podeConfirmarProgramado(
  content: { status: string; edicaoConcluidaEm?: string | null },
): boolean {
  return isReadyToPublish(content);
}

export function rotuloSituacaoPublicacao(status: PublicacaoStatus | SituacaoPublicacao | null | undefined): string {
  switch (normalizePublicacaoStatus(status)) {
    case 'publicada':
      return 'Publicada';
    case 'programada':
      return 'Programada';
    case 'nao_publicada':
      return 'Não publicada';
    case 'removida':
      return 'Removida';
    default:
      return 'Prevista';
  }
}
