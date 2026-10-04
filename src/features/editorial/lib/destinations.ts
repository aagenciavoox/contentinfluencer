import type { ContentPlataforma } from '../../../lib/database.ts';
import { platformKey } from '../../../components/ui/platformName.ts';
import { generateUUID } from '../../../utils/uuid.ts';

export type DestinoPlataforma = {
  id: string;
  nome: string;
};

/** A publicação no cliente pode guardar o id ou o nome da rede. */
export function mesmoDestino(ref: string, plataforma: DestinoPlataforma): boolean {
  if (!ref) return false;
  if (ref === plataforma.id || ref === plataforma.nome) return true;
  return platformKey(ref) === platformKey(plataforma.nome);
}

export function publicacaoOriginal(
  publicacao: Pick<ContentPlataforma, 'publicationKind'>,
): boolean {
  return publicacao.publicationKind !== 'repost';
}

export function publicacaoPublicada(
  publicacao: Pick<ContentPlataforma, 'status'>,
): boolean {
  return publicacao.status === 'publicada';
}

function contaComoDestino(publicacao: Pick<ContentPlataforma, 'status'>): boolean {
  return publicacao.status !== 'nao_publicada' && publicacao.status !== 'removida';
}

export function destinoMarcado(
  publicacoes: readonly ContentPlataforma[],
  plataforma: DestinoPlataforma,
): boolean {
  return publicacoes.some(item =>
    publicacaoOriginal(item)
    && mesmoDestino(item.platformId, plataforma)
    && contaComoDestino(item),
  );
}

export function publicacaoDoDestino(
  publicacoes: readonly ContentPlataforma[],
  plataforma: DestinoPlataforma,
): ContentPlataforma | undefined {
  return publicacoes.find(item =>
    publicacaoOriginal(item) && mesmoDestino(item.platformId, plataforma) && contaComoDestino(item),
  ) ?? publicacoes.find(item => mesmoDestino(item.platformId, plataforma));
}

export function criarPublicacaoAgendada(
  contentId: string,
  platformId: string,
  id: string = generateUUID(),
): ContentPlataforma {
  return {
    id,
    contentId,
    platformId,
    legenda: '',
    hashtags: '',
    publishDate: null,
    publishTime: null,
    publishDateEnabled: false,
    publicationKind: 'post',
    status: 'agendada',
    realizadaManualEm: null,
    realizadaApiEm: null,
    postCodigo: null,
    postUrl: null,
    legendaPropria: false,
    contaNaGrade: true,
  };
}

/**
 * Marcar cria uma publicação agendada. Desmarcar remove a que ainda não foi publicada.
 * Publicada e repost ficam.
 */
export function alternarDestino(input: {
  publicacoes: readonly ContentPlataforma[];
  plataforma: DestinoPlataforma;
  contentId: string;
  marcar: boolean;
  criarId?: () => string;
}): ContentPlataforma[] {
  const criarId = input.criarId ?? generateUUID;
  if (input.marcar) {
    if (destinoMarcado(input.publicacoes, input.plataforma)) return [...input.publicacoes];
    return [
      ...input.publicacoes,
      criarPublicacaoAgendada(input.contentId, input.plataforma.id, criarId()),
    ];
  }

  return input.publicacoes.filter(item => {
    if (!publicacaoOriginal(item) || !mesmoDestino(item.platformId, input.plataforma)) return true;
    return publicacaoPublicada(item);
  });
}

/** Destinos padrão são ids de plataforma. Nomes antigos ainda casam. Inativas ficam de fora. */
export function destinosPadraoAtivos(
  destinosPadrao: readonly string[],
  plataformas: readonly DestinoPlataforma[],
): DestinoPlataforma[] {
  const vistos = new Set<string>();
  const escolhidas: DestinoPlataforma[] = [];
  for (const ref of destinosPadrao) {
    const plataforma = plataformas.find(item => mesmoDestino(ref, item));
    if (!plataforma || vistos.has(plataforma.id)) continue;
    vistos.add(plataforma.id);
    escolhidas.push(plataforma);
  }
  return escolhidas;
}

export function publicacoesDosDestinos(input: {
  destinos: readonly DestinoPlataforma[];
  contentId: string;
  criarId?: () => string;
}): ContentPlataforma[] {
  const criarId = input.criarId ?? generateUUID;
  return input.destinos.map(destino => criarPublicacaoAgendada(input.contentId, destino.id, criarId()));
}

/** Repost é outra publicação, com data própria. A grade já vira entrada a partir dela. */
export function criarRepost(input: {
  publicacoes: readonly ContentPlataforma[];
  contentId: string;
  platformId: string;
  publishDate: string;
  publishTime?: string | null;
  criarId?: () => string;
}): ContentPlataforma[] {
  const id = (input.criarId ?? generateUUID)();
  const data = input.publishDate.trim();
  return [
    ...input.publicacoes,
    {
      ...criarPublicacaoAgendada(input.contentId, input.platformId, id),
      publicationKind: 'repost',
      publishDate: data || null,
      publishTime: input.publishTime ?? null,
      publishDateEnabled: Boolean(data),
      contaNaGrade: true,
    },
  ];
}