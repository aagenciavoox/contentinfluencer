import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Content, Serie, Temporada } from '../../../lib/database.ts';
import { agruparEpisodios, type GrupoEpisodios } from '../../editorial/lib/episodiosAgrupados.ts';
import { filhosDaSerie } from '../../editorial/lib/serieArvore.ts';
import { escopoTemporadas, temporadasDoEscopo } from '../../editorial/lib/temporadas.ts';
import { getDisplayStatusLabel } from '../../contents/lib/contentPipeline.ts';

export type VistaEpisodios = {
  temporadas: Temporada[];
  /** Null quando não há quadro nem temporada: a tela mostra uma lista simples. */
  grupos: GrupoEpisodios[] | null;
  episodios: Content[];
  fora: Content[];
};

/** Temporada inicial da página. Prefere a que já tem episódios; senão, os sem temporada. */
export function temporadaInicial(
  temporadas: readonly { id: string }[],
  contents: readonly { temporadaId?: string | null }[],
  preferida = '',
): string | null {
  if (temporadas.length === 0) return null;
  const ids = new Set(temporadas.map(item => item.id));
  const sem = contents.some(content => !content.temporadaId);
  if (preferida === 'none' && sem) return null;
  if (preferida && ids.has(preferida)) return preferida;
  const comEpisodio = temporadas.find(item => contents.some(content => content.temporadaId === item.id));
  if (comEpisodio) return comEpisodio.id;
  if (sem) return null;
  return temporadas[0]?.id ?? null;
}

export function ordenarEpisodios<T extends { id: string; createdAt?: string | null; title?: string | null }>(
  lista: readonly T[],
): T[] {
  return [...lista].sort((a, b) =>
    (a.createdAt || '').localeCompare(b.createdAt || '')
    || (a.title || '').localeCompare(b.title || '', 'pt-BR')
    || a.id.localeCompare(b.id),
  );
}

export function linhaDoEpisodio(
  content: Pick<Content, 'status' | 'publishDate' | 'postedAt' | 'edicaoConcluidaEm' | 'plataformas'>,
): string {
  const etapa = getDisplayStatusLabel(content);
  const bruto = content.postedAt || content.publishDate;
  if (!bruto) return `${etapa} · Sem data`;
  const iso = bruto.length <= 10 ? `${bruto}T12:00:00` : bruto;
  const data = parseISO(iso);
  if (Number.isNaN(data.getTime())) return `${etapa} · Sem data`;
  const quando = format(data, 'd MMM', { locale: ptBR }).replace(/\./g, '');
  return `${etapa} · ${quando}`;
}

function coletar(grupo: GrupoEpisodios): Content[] {
  return [...grupo.contents, ...grupo.subgrupos.flatMap(coletar)];
}

function comOrdem(grupo: GrupoEpisodios): GrupoEpisodios {
  return {
    ...grupo,
    contents: ordenarEpisodios(grupo.contents),
    subgrupos: grupo.subgrupos.map(comOrdem),
  };
}

function grupoVazio(filho: { id: string; name?: string | null }, temporadaId: string | null): GrupoEpisodios {
  return {
    id: `quadro:${filho.id}:${temporadaId ?? 'none'}`,
    rotulo: filho.name?.trim() || 'Quadro',
    serieId: filho.id,
    temporadaId,
    contents: [],
    subgrupos: [],
  };
}

function completarQuadros(
  grupos: readonly GrupoEpisodios[],
  serieId: string,
  series: readonly Serie[],
  temporadaId: string | null,
): GrupoEpisodios[] {
  const filhos = filhosDaSerie(serieId, series);
  const porSerie = new Map(grupos.map(grupo => [grupo.serieId, grupo]));
  const lista = filhos.map(filho => comOrdem(porSerie.get(filho.id) ?? grupoVazio(filho, temporadaId)));
  const direto = grupos.find(grupo => grupo.serieId === serieId && (grupo.contents.length > 0 || grupo.subgrupos.length > 0));
  if (direto) lista.push(comOrdem(direto));
  return lista;
}

export function montarVistaEpisodios({
  serieId,
  series,
  temporadas,
  contents,
  temporadaSelecionada,
}: {
  serieId: string;
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  contents: readonly Content[];
  /** Id da temporada, ou null para os episódios sem temporada. */
  temporadaSelecionada: string | null;
}): VistaEpisodios {
  const filhos = filhosDaSerie(serieId, series);
  const escopo = escopoTemporadas(serieId, series);
  const temps = escopo ? temporadasDoEscopo(escopo.id, temporadas) : [];
  const faixas = agruparEpisodios({ serieId, series, temporadas, contents });
  const fora = ordenarEpisodios(faixas.find(faixa => faixa.foraDoEscopo)?.contents ?? []);

  if (filhos.length === 0 && temps.length === 0) {
    const episodios = ordenarEpisodios(
      faixas.filter(faixa => !faixa.foraDoEscopo).flatMap(coletar),
    );
    return { temporadas: [], grupos: null, episodios, fora };
  }

  if (filhos.length === 0) {
    const faixa = faixas.find(item => item.id === (temporadaSelecionada ? `temp:${temporadaSelecionada}` : 'temp:none'));
    return {
      temporadas: temps,
      grupos: null,
      episodios: ordenarEpisodios(faixa ? coletar(faixa) : []),
      fora,
    };
  }

  const base = temps.length === 0
    ? faixas.filter(faixa => !faixa.foraDoEscopo)
    : (faixas.find(item => item.id === (temporadaSelecionada ? `temp:${temporadaSelecionada}` : 'temp:none'))?.subgrupos ?? []);
  return {
    temporadas: temps,
    grupos: completarQuadros(base, serieId, series, temps.length === 0 ? null : temporadaSelecionada),
    episodios: [],
    fora,
  };
}
