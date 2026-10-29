import type { Content, Serie, Temporada } from '../../../lib/database.ts';
import { filhosDaSerie } from './serieArvore.ts';
import { escopoTemporadas, temporadaNoEscopo, temporadasDoEscopo } from './temporadas.ts';

export type GrupoEpisodios = {
  id: string;
  rotulo: string;
  /** Série/quadro destino ao adicionar. */
  serieId: string;
  temporadaId: string | null;
  contents: Content[];
  /** Temporada de outro escopo: pede Reorganizar. */
  foraDoEscopo?: boolean;
  subgrupos: GrupoEpisodios[];
};

/**
 * Organiza episódios da página da série conforme a especificação:
 * faixas de temporada (se houver) → grupos de quadro / Direto nesta série.
 */
export function agruparEpisodios({
  serieId,
  series,
  temporadas,
  contents,
}: {
  serieId: string;
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  contents: readonly Content[];
}): GrupoEpisodios[] {
  const serie = series.find(item => item.id === serieId);
  if (!serie) return [];

  const escopo = escopoTemporadas(serieId, series);
  const usaTemp = Boolean(escopo);
  const temps = usaTemp && escopo ? temporadasDoEscopo(escopo.id, temporadas) : [];
  const filhos = filhosDaSerie(serieId, series);

  const doGrupo = (filtro: (c: Content) => boolean) =>
    contents.filter(c => !c.deletedAt && filtro(c));

  const montarQuadros = (lista: Content[], temporadaId: string | null): GrupoEpisodios[] => {
    const grupos: GrupoEpisodios[] = [];
    for (const filho of filhos) {
      const doFilho = lista.filter(c => c.seriesId === filho.id);
      const subFilhos = filhosDaSerie(filho.id, series);
      const subgrupos: GrupoEpisodios[] = subFilhos.map(neto => ({
        id: `quadro:${neto.id}:${temporadaId ?? 'none'}`,
        rotulo: neto.name?.trim() || 'Quadro',
        serieId: neto.id,
        temporadaId,
        contents: lista.filter(c => c.seriesId === neto.id),
        subgrupos: [],
      })).filter(g => g.contents.length > 0 || true);

      grupos.push({
        id: `quadro:${filho.id}:${temporadaId ?? 'none'}`,
        rotulo: filho.name?.trim() || 'Quadro',
        serieId: filho.id,
        temporadaId,
        contents: doFilho,
        subgrupos: subgrupos.filter(g => g.contents.length > 0),
      });
    }
    grupos.push({
      id: `direto:${serieId}:${temporadaId ?? 'none'}`,
      rotulo: 'Direto nesta série',
      serieId,
      temporadaId,
      contents: lista.filter(c => c.seriesId === serieId),
      subgrupos: [],
    });
    return grupos.filter(g => g.contents.length > 0 || g.subgrupos.length > 0);
  };

  if (usaTemp && temps.length > 0) {
    const faixas: GrupoEpisodios[] = temps.map(temp => ({
      id: `temp:${temp.id}`,
      rotulo: temp.nome,
      serieId,
      temporadaId: temp.id,
      contents: [],
      subgrupos: montarQuadros(
        doGrupo(c => c.temporadaId === temp.id),
        temp.id,
      ),
    }));

    faixas.push({
      id: 'temp:none',
      rotulo: 'Sem temporada',
      serieId,
      temporadaId: null,
      contents: [],
      subgrupos: montarQuadros(
        doGrupo(c => !c.temporadaId),
        null,
      ),
    });

    // Episódios com temporada de outro escopo
    const fora = doGrupo(c =>
      Boolean(c.temporadaId) && !temporadaNoEscopo(c.temporadaId, c.seriesId, series, temporadas),
    );
    if (fora.length > 0) {
      faixas.push({
        id: 'temp:fora',
        rotulo: 'Temporada de outro escopo',
        serieId,
        temporadaId: null,
        contents: fora,
        foraDoEscopo: true,
        subgrupos: [],
      });
    }

    return faixas.filter(f => f.contents.length > 0 || f.subgrupos.length > 0);
  }

  if (filhos.length > 0) {
    return montarQuadros(doGrupo(() => true), null);
  }

  if (usaTemp && temps.length > 0) {
    return [
      ...temps.map(temp => ({
        id: `temp:${temp.id}`,
        rotulo: temp.nome,
        serieId,
        temporadaId: temp.id,
        contents: doGrupo(c => c.temporadaId === temp.id && c.seriesId === serieId),
        subgrupos: [],
      })),
      {
        id: 'temp:none',
        rotulo: 'Sem temporada',
        serieId,
        temporadaId: null,
        contents: doGrupo(c => !c.temporadaId && c.seriesId === serieId),
        subgrupos: [],
      },
    ].filter(g => g.contents.length > 0);
  }

  return [{
    id: `lista:${serieId}`,
    rotulo: serie.name,
    serieId,
    temporadaId: null,
    contents: doGrupo(c => c.seriesId === serieId),
    subgrupos: [],
  }];
}
