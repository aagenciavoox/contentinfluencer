import { BibliotecaItem, Content } from '../../../lib/database';

type BibliotecaTipo = BibliotecaItem['tipo'];

export interface LibraryStatCard {
  label: string;
  value: string;
  detail: string;
}

export interface LibraryDistributionEntry {
  key: string;
  label: string;
  count: number;
  share: number;
}

export interface LibraryTopItem {
  id: string;
  title: string;
  subtitle: string;
  typeLabel: string;
  contentCount: number;
  postedCount: number;
}

export interface LibraryOpportunityItem {
  id: string;
  title: string;
  reason: string;
}

export interface LibraryAnalyticsSnapshot {
  statCards: LibraryStatCard[];
  byType: LibraryDistributionEntry[];
  byStatus: LibraryDistributionEntry[];
  topItems: LibraryTopItem[];
  opportunities: LibraryOpportunityItem[];
}

const TYPE_LABELS: Record<BibliotecaTipo, string> = {
  livro: 'Livro',
  filme: 'Filme',
  'série': 'Serie',
  anime: 'Anime',
  manga: 'Manga',
  outro: 'Outro',
};

function buildDistribution(entries: [string, number][], total: number): LibraryDistributionEntry[] {
  return entries.map(([key, count]) => ({
    key,
    label: key,
    count,
    share: total === 0 ? 0 : Math.round((count / total) * 100),
  }));
}

export function buildLibraryAnalytics(
  items: BibliotecaItem[],
  contents: Content[]
): LibraryAnalyticsSnapshot {
  const linkedContents = contents.filter(content => content.bibliotecaItemId);
  const postedContents = linkedContents.filter(content => content.status === 'Postado');
  const contentCountByItem = new Map<string, number>();
  const postedCountByItem = new Map<string, number>();

  linkedContents.forEach(content => {
    if (!content.bibliotecaItemId) return;
    contentCountByItem.set(
      content.bibliotecaItemId,
      (contentCountByItem.get(content.bibliotecaItemId) ?? 0) + 1
    );

    if (content.status === 'Postado') {
      postedCountByItem.set(
        content.bibliotecaItemId,
        (postedCountByItem.get(content.bibliotecaItemId) ?? 0) + 1
      );
    }
  });

  const completedCount = items.filter(item => ['Concluído', 'Lido', 'Assistido'].includes(item.status)).length;
  const consumingCount = items.filter(item => ['Consumindo', 'Lendo', 'Assistindo'].includes(item.status)).length;
  const referencedItems = items.filter(item => (contentCountByItem.get(item.id) ?? 0) > 0).length;

  const statCards: LibraryStatCard[] = [
    {
      label: 'Acervo',
      value: String(items.length),
      detail: `${consumingCount} em consumo agora`,
    },
    {
      label: 'Concluidos',
      value: String(completedCount),
      detail: `${items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100)}% do acervo`,
    },
    {
      label: 'Conteudos',
      value: String(linkedContents.length),
      detail: `${postedContents.length} ja postados`,
    },
    {
      label: 'Itens aproveitados',
      value: String(referencedItems),
      detail: `${items.length === 0 ? 0 : Math.round((referencedItems / items.length) * 100)}% do acervo com desdobramento`,
    },
  ];

  const byTypeMap = items.reduce<Record<string, number>>((acc, item) => {
    const label = TYPE_LABELS[item.tipo] ?? TYPE_LABELS.outro;
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  const byStatusMap = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  const topItems = items
    .map(item => ({
      id: item.id,
      title: item.titulo,
      subtitle: item.autorDiretor || 'Sem autoria preenchida',
      typeLabel: TYPE_LABELS[item.tipo] ?? TYPE_LABELS.outro,
      contentCount: contentCountByItem.get(item.id) ?? 0,
      postedCount: postedCountByItem.get(item.id) ?? 0,
    }))
    .filter(item => item.contentCount > 0)
    .sort((left, right) => {
      if (right.postedCount !== left.postedCount) return right.postedCount - left.postedCount;
      return right.contentCount - left.contentCount;
    })
    .slice(0, 5);

  const opportunities = items
    .filter(item => (contentCountByItem.get(item.id) ?? 0) === 0)
    .sort((left, right) => (right.potencialConteudo ?? 0) - (left.potencialConteudo ?? 0))
    .slice(0, 5)
    .map(item => ({
      id: item.id,
      title: item.titulo,
      reason: item.potencialConteudo
        ? `Potencial ${item.potencialConteudo}/3 e nenhum conteudo derivado ainda`
        : 'Nenhum conteudo derivado ainda',
    }));

  return {
    statCards,
    byType: buildDistribution(Object.entries(byTypeMap), items.length),
    byStatus: buildDistribution(Object.entries(byStatusMap), items.length),
    topItems,
    opportunities,
  };
}
