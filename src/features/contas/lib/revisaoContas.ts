import type { Content, ContentMetric, ContentPlataforma, RedeSocial } from '../../../lib/database.ts';
import { platformKey } from '../../../components/ui/platformName.ts';
import { normalizarHandle, redeDaConta, resolverConta, rotuloConta, type ContaRef } from './contas.ts';

/**
 * Casos que a migração para contas não resolve sozinha. A mesma lista existe no
 * banco (view `contas_revisao`); aqui ela é calculada com o que o app já carregou,
 * e vale também antes de a migração ser aplicada.
 */
export type CasoRevisao =
  | 'conta_sem_plataforma'
  | 'contas_indistintas'
  | 'publicacao_sem_conta'
  | 'referencia_ambigua'
  | 'publicacao_repetida'
  | 'cadastro_compartilhado'
  | 'metrica_sem_publicacao'
  | 'link_sem_publicacao';

export type ItemRevisao = {
  id: string;
  caso: CasoRevisao;
  titulo: string;
  detalhe: string;
  contaId?: string;
  contentId?: string;
};

type ConteudoRevisao = Pick<Content, 'id' | 'title' | 'plataformas'> & Partial<Pick<Content, 'link' | 'deletedAt'>>;

type MetricaRevisao = Pick<ContentMetric, 'id' | 'contentId' | 'platformId'> & Partial<Pick<ContentMetric, 'publicacaoId'>>;

export type ReferenciaSalva = { origem: string; ref: string };

function titulo(content: Pick<Content, 'title'>): string {
  return content.title.trim() || 'Sem título';
}

function original(publicacao: Pick<ContentPlataforma, 'publicationKind'>): boolean {
  return publicacao.publicationKind !== 'repost';
}

/**
 * Publicação de uma métrica. Com `publicacaoId`, é ela. Sem, só quando existe
 * exatamente uma publicação original do conteúdo naquela conta — a mesma regra
 * da migração. Zero ou várias: null, e a métrica entra na revisão.
 */
export function publicacaoDaMetrica<P extends Pick<ContentPlataforma, 'id' | 'platformId' | 'publicationKind'>>(
  metrica: MetricaRevisao,
  publicacoesDoConteudo: readonly P[],
  contas: readonly ContaRef[] = [],
): P | null {
  if (metrica.publicacaoId) {
    return publicacoesDoConteudo.find(publicacao => publicacao.id === metrica.publicacaoId) ?? null;
  }
  const contaDaMetrica = resolverConta(metrica.platformId, contas).conta?.id ?? metrica.platformId;
  const candidatas = publicacoesDoConteudo.filter(publicacao => {
    if (!original(publicacao)) return false;
    const conta = resolverConta(publicacao.platformId, contas).conta?.id ?? publicacao.platformId;
    return conta === contaDaMetrica;
  });
  return candidatas.length === 1 ? candidatas[0] : null;
}

export function revisoesDeContas({
  contas,
  contents,
  metricas = [],
  referencias = [],
}: {
  contas: readonly ContaRef[];
  contents: readonly ConteudoRevisao[];
  metricas?: readonly MetricaRevisao[];
  referencias?: readonly ReferenciaSalva[];
}): ItemRevisao[] {
  const itens: ItemRevisao[] = [];

  for (const conta of contas) {
    if (conta.userId === null) continue;
    if (!redeDaConta(conta)) {
      itens.push({
        id: `conta_sem_plataforma:${conta.id}`,
        caso: 'conta_sem_plataforma',
        titulo: `Plataforma de "${conta.nome}" a definir`,
        detalhe: 'O nome não indica se é Instagram, TikTok, YouTube ou outra. Escolha a plataforma na conta.',
        contaId: conta.id,
      });
    }
  }

  const semHandle = contas.filter(conta => conta.userId !== null && redeDaConta(conta) && !normalizarHandle(conta.handle));
  const vistas = new Set<string>();
  for (const conta of semHandle) {
    const iguais = semHandle.filter(outra =>
      outra.id !== conta.id
      && redeDaConta(outra) === redeDaConta(conta)
      && platformKey(outra.nome) === platformKey(conta.nome),
    );
    if (iguais.length === 0 || vistas.has(conta.id)) continue;
    [conta, ...iguais].forEach(item => vistas.add(item.id));
    itens.push({
      id: `contas_indistintas:${conta.id}`,
      caso: 'contas_indistintas',
      titulo: `${iguais.length + 1} contas iguais: ${rotuloConta(conta)}`,
      detalhe: 'Mesma plataforma, mesmo nome e nenhum @. Informe o @ de cada uma para separá-las.',
      contaId: conta.id,
    });
  }

  for (const content of contents) {
    if (content.deletedAt) continue;
    const porConta = new Map<string, number>();
    for (const publicacao of content.plataformas ?? []) {
      const resolucao = resolverConta(publicacao.platformId, contas);
      if (!resolucao.conta) {
        itens.push({
          id: `${resolucao.ambigua ? 'referencia_ambigua' : 'publicacao_sem_conta'}:${publicacao.id}`,
          caso: resolucao.ambigua ? 'referencia_ambigua' : 'publicacao_sem_conta',
          titulo: titulo(content),
          detalhe: resolucao.ambigua
            ? `A publicação aponta para "${publicacao.platformId}", e mais de uma conta tem esse nome. Escolha a conta no roteiro.`
            : 'A publicação aponta para uma conta que não existe mais. Escolha a conta no roteiro.',
          contentId: content.id,
        });
        continue;
      }
      if (resolucao.conta.userId === null) {
        itens.push({
          id: `cadastro_compartilhado:${publicacao.id}`,
          caso: 'cadastro_compartilhado',
          titulo: titulo(content),
          detalhe: `A publicação usa "${resolucao.conta.nome}", um cadastro compartilhado que não guarda @ nem conexão.`,
          contentId: content.id,
          contaId: resolucao.conta.id,
        });
      }
      if (original(publicacao)) {
        porConta.set(resolucao.conta.id, (porConta.get(resolucao.conta.id) ?? 0) + 1);
      }
    }
    for (const [contaId, total] of porConta) {
      if (total < 2) continue;
      const conta = contas.find(item => item.id === contaId);
      itens.push({
        id: `publicacao_repetida:${content.id}:${contaId}`,
        caso: 'publicacao_repetida',
        titulo: titulo(content),
        detalhe: `${total} publicações originais em ${conta ? rotuloConta(conta) : 'uma mesma conta'}. Remova a repetida ou marque-a como repost.`,
        contentId: content.id,
        contaId,
      });
    }

    const link = content.link?.trim();
    if (link && !(content.plataformas ?? []).some(publicacao => publicacao.postUrl?.trim() === link)) {
      itens.push({
        id: `link_sem_publicacao:${content.id}`,
        caso: 'link_sem_publicacao',
        titulo: titulo(content),
        detalhe: 'Link guardado no conteúdo, de antes das publicações por conta. Informe-o na publicação certa.',
        contentId: content.id,
      });
    }
  }

  const porId = new Map(contents.map(content => [content.id, content]));
  for (const metrica of metricas) {
    const content = porId.get(metrica.contentId);
    if (publicacaoDaMetrica(metrica, content?.plataformas ?? [], contas)) continue;
    itens.push({
      id: `metrica_sem_publicacao:${metrica.id}`,
      caso: 'metrica_sem_publicacao',
      titulo: content ? titulo(content) : 'Conteúdo não carregado',
      detalhe: 'Métrica antiga sem uma única publicação naquela conta para recebê-la.',
      contentId: metrica.contentId,
    });
  }

  for (const referencia of referencias) {
    const resolucao = resolverConta(referencia.ref, contas);
    if (resolucao.conta) continue;
    itens.push({
      id: `referencia_ambigua:${referencia.origem}:${referencia.ref}`,
      caso: 'referencia_ambigua',
      titulo: referencia.origem,
      detalhe: resolucao.ambigua
        ? `"${referencia.ref}" corresponde a mais de uma conta. Escolha a conta de novo.`
        : `"${referencia.ref}" não corresponde a nenhuma conta. Escolha a conta de novo.`,
    });
  }

  return itens;
}

/**
 * A pessoa escolheu a publicação. O link passa para ela e sai do conteúdo,
 * para a revisão não voltar se o endereço da publicação mudar depois.
 * Publicação inexistente não altera nada.
 */
export function moverLinkParaPublicacao<T extends { link?: string | null; plataformas: ContentPlataforma[] }>(
  conteudo: T,
  publicacaoId: string,
): T | null {
  const link = conteudo.link?.trim();
  if (!link) return null;
  if (!conteudo.plataformas.some(publicacao => publicacao.id === publicacaoId)) return null;
  return {
    ...conteudo,
    link: null,
    plataformas: conteudo.plataformas.map(publicacao => (
      publicacao.id === publicacaoId ? { ...publicacao, postUrl: link } : publicacao
    )),
  };
}

/** A rede que o endereço deixa óbvia. Fora de Instagram, TikTok e YouTube, null. */
export function redeSugeridaPeloLink(link: string): RedeSocial | null {
  let host = '';
  try {
    host = new URL(link).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
  if (host === 'instagram.com') return 'instagram';
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';
  if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) return 'youtube';
  return null;
}

/** Contas em que este link antigo pode virar publicação. A rede do endereço restringe; se nenhuma bater, ficam todas. */
export function contasParaLinkAntigo(link: string, contas: readonly ContaRef[]): ContaRef[] {
  const proprias = contas.filter(conta => conta.userId !== null);
  const rede = redeSugeridaPeloLink(link);
  if (!rede) return proprias;
  const daRede = proprias.filter(conta => redeDaConta(conta) === rede);
  return daRede.length > 0 ? daRede : proprias;
}

/** Roteiro sem publicação: cria a linha escolhida e tira o link do conteúdo. */
export function anexarPublicacaoComLink<T extends { link?: string | null; plataformas: ContentPlataforma[] }>(
  conteudo: T,
  publicacao: ContentPlataforma,
): T | null {
  const link = conteudo.link?.trim();
  if (!link || !publicacao.id.trim()) return null;
  return {
    ...conteudo,
    link: null,
    plataformas: [...conteudo.plataformas, { ...publicacao, postUrl: link }],
  };
}
