export type LegacyCreationSource = 'contents' | 'ideas';

export function resolveLegacyCreationTab(
  source: LegacyCreationSource,
  pathname: string,
  searchParams: URLSearchParams,
) {
  if (source === 'ideas') return 'ideias';

  const view = searchParams.get('view');
  if (
    pathname.endsWith('/historico')
    || pathname.endsWith('/publicados')
    || view === 'historico'
    || view === 'publicados'
  ) {
    return 'publicados';
  }
  if (view === 'postagem' || view === 'producao') return 'producao';

  const status = searchParams.get('status');
  if (status === 'Ideia') return 'ideias';
  if (
    status === 'Produção'
    || status === 'Pronto para Gravar'
    || status === 'Gravado'
    || status === 'A Editar'
    || status === 'Editado'
    || status === 'Programado'
  ) {
    return 'producao';
  }
  if (status === 'Postado') return 'publicados';

  return 'roteiros';
}

export function buildLegacyCreationTarget(
  source: LegacyCreationSource,
  pathname: string,
  search: string,
) {
  const searchParams = new URLSearchParams(search);
  const tab = resolveLegacyCreationTab(source, pathname, searchParams);

  searchParams.delete('tab');
  searchParams.delete('tipo');
  if (tab === 'ideias') {
    searchParams.set('tipo', 'ideia');
  } else if (tab === 'roteiros') {
    searchParams.set('tipo', 'roteiro');
  } else {
    searchParams.set('tab', tab);
  }
  if (searchParams.get('compose') === '1') {
    searchParams.set('compose', source === 'ideas' ? 'idea' : 'script');
  }
  searchParams.delete('view');
  searchParams.delete('status');

  return `/criacao?${searchParams.toString()}`;
}
