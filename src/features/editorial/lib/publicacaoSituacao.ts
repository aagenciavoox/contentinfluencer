import type { ContentPlataforma, PublicacaoStatus } from '../../../lib/database.ts';
import { CONTENT_STATUS, isReadyToPublish, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
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

/** Contas ativas do ciclo mais recente (o repost abre um ciclo novo). */
function ativasDoCicloAtual<P extends Pick<ContentPlataforma, 'status' | 'publicationKind' | 'ciclo'>>(
  publicacoes: readonly P[],
): P[] {
  let cicloAtual = 1;
  for (const item of publicacoes) {
    if (!publicacaoAtiva(item)) continue;
    const ciclo = cicloDaPublicacao(item);
    if (ciclo > cicloAtual) cicloAtual = ciclo;
  }
  return publicacoes.filter(item =>
    publicacaoAtiva(item) && cicloDaPublicacao(item) === cicloAtual,
  );
}

/**
 * Progresso do ciclo mais recente. Parcial não move o conteúdo para Publicado.
 * Ciclo sem contas ativas não fecha sozinho. Ciclo 1 legado = publicationKind !== repost.
 */
export function progressoPublicacao(
  publicacoes: readonly Pick<ContentPlataforma, 'status' | 'publicationKind' | 'ciclo'>[],
): ProgressoPublicacao {
  const ativas = ativasDoCicloAtual(publicacoes);
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
  content: { status: string; edicaoConcluidaEm?: string | null; writingMode?: ConteudoDoSelo['writingMode'] },
): boolean {
  return isReadyToPublish(content);
}

type ConteudoDoSelo = Parameters<typeof isReadyToPublish>[0] & { postedAt?: string | null };

export type SeloDaPublicacao = {
  texto: string;
  tom: 'publicado' | 'programado' | 'parcial' | 'previsto';
};

function contas(total: number, singular: string, plural: string): string {
  return `${total} ${total === 1 ? singular : plural}`;
}

/**
 * Selo do topo da aba Publicação. Nenhuma conta publicada não é "parcial";
 * Programado segue a mesma regra do selo do conteúdo: conta programada + material pronto.
 * Sem contas ativas e sem publicação: null (nada a mostrar).
 */
export function seloDaPublicacao(
  content: ConteudoDoSelo,
  publicacoes: readonly Pick<ContentPlataforma, 'status' | 'publicationKind' | 'ciclo'>[],
): SeloDaPublicacao | null {
  const progresso = progressoPublicacao(publicacoes);
  if (progresso.completo || normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO || content.postedAt) {
    return { texto: 'Publicado', tom: 'publicado' };
  }
  if (progresso.previstas === 0) return null;
  if (progresso.publicadas > 0) {
    return {
      texto: `Publicação parcial · ${progresso.publicadas} de ${progresso.previstas} publicadas`,
      tom: 'parcial',
    };
  }
  const programadas = ativasDoCicloAtual(publicacoes)
    .filter(item => normalizePublicacaoStatus(item.status) === 'programada').length;
  if (programadas > 0 && isReadyToPublish(content)) {
    return {
      texto: programadas === progresso.previstas
        ? 'Programado'
        : `${programadas} de ${contas(progresso.previstas, 'conta programada', 'contas programadas')}`,
      tom: 'programado',
    };
  }
  return { texto: contas(progresso.previstas, 'conta prevista', 'contas previstas'), tom: 'previsto' };
}

export type MotivoSemProgramar = 'sem-conta' | 'sem-data' | 'material' | 'ja-programado' | 'publicado';

export const TEXTO_SEM_PROGRAMAR: Record<MotivoSemProgramar, string> = {
  'sem-conta': 'Marque pelo menos uma conta.',
  'sem-data': 'Escolha a data primeiro.',
  material: 'Programado pede o material pronto na Edição.',
  'ja-programado': 'Já programado. Uma conta nova marcada volta a pedir a confirmação.',
  publicado: 'Todas as contas marcadas já foram publicadas.',
};

export type ConfirmacaoDoProgramado<P> =
  | { pode: true; publicacoes: P[]; programadas: number; motivo?: undefined; texto?: undefined }
  | { pode: false; motivo: MotivoSemProgramar; texto: string; publicacoes?: undefined; programadas?: undefined };

/**
 * Botão Programar: as contas ativas ainda previstas e com data (da conta ou a principal) viram
 * programadas. Publicada, não publicada e removida não mudam; programada fica como está.
 * Exige material pronto (podeConfirmarProgramado), a mesma regra do selo Programado.
 */
export function confirmarProgramado<P extends Pick<ContentPlataforma, 'status' | 'publishDate'>>(
  content: ConteudoDoSelo & { publishDate?: string | null },
  publicacoes: readonly P[],
): ConfirmacaoDoProgramado<P> {
  const nao = (motivo: MotivoSemProgramar) => ({ pode: false as const, motivo, texto: TEXTO_SEM_PROGRAMAR[motivo] });
  const ativas = publicacoes.filter(publicacaoAtiva);
  if (ativas.length === 0) return nao('sem-conta');
  const previstas = ativas.filter(item => normalizePublicacaoStatus(item.status) === 'prevista');
  if (previstas.length === 0) {
    return nao(ativas.some(item => normalizePublicacaoStatus(item.status) === 'programada') ? 'ja-programado' : 'publicado');
  }
  const comData = new Set(previstas.filter(item => Boolean(item.publishDate || content.publishDate)));
  if (comData.size === 0) return nao('sem-data');
  if (!podeConfirmarProgramado(content)) return nao('material');
  return {
    pode: true,
    programadas: comData.size,
    publicacoes: publicacoes.map(item => (comData.has(item) ? { ...item, status: 'programada' as const } : item)),
  };
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
