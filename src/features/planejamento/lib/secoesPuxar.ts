import type {Content, Serie, Temporada} from '../../../lib/database.ts';
import {filhosDaSerie, idsDaSubarvore} from '../../editorial/lib/serieArvore.ts';
import type {PreferenciaLista} from '../../settings/lib/preferenciaLista.ts';
import {
  FILTROS_LISTA_PADRAO,
  episodiosDaPagina,
  exibidosDoGrupo,
  montarLista,
  ordenarLista,
  resolverAgrupar,
  resolverOrdem,
  temporadasDaSerie,
} from '../../settings/lib/seriesLista.ts';

export type SecaoPuxar = {
  id: string;
  /** Null quando não há agrupamento: a lista segue sem cabeçalho. */
  rotulo: string | null;
  /** Em ordem manual a posição quer dizer algo; nas outras ordens, não se numera. */
  numerar: boolean;
  contents: Content[];
};

/** A mesma posição da página da série. Filtro do modal não reconta. */
export type PosicaoNaSerie = {
  numero: number;
  total: number;
  indicativo: string;
};

/** "2 de 6 ep da Temporada 1" quando a conta é a da temporada; senão a posição do grupo. */
export function indicativoDaPosicao(
  numero: number,
  total: number,
  temporadaDoGrupo: string | null,
  temporadaDoEpisodio: string | null,
): string {
  if (temporadaDoGrupo) return `${numero} de ${total} ep da ${temporadaDoGrupo}`;
  if (temporadaDoEpisodio) return `${numero} de ${total} · ${temporadaDoEpisodio}`;
  return `${numero} de ${total}`;
}

/** Séries escolhidas sem as que já estão dentro de outra escolhida, em ordem de nome. */
function raizesDaEscolha(serieIds: readonly string[], series: readonly Serie[]): Serie[] {
  const escolhidas = series.filter(serie => serieIds.includes(serie.id));
  return escolhidas
    .filter(serie => !escolhidas.some(outra => outra.id !== serie.id && idsDaSubarvore(outra.id, series).has(serie.id)))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Lista do "Puxar" com a série escolhida: a mesma lista da página da série, com o agrupamento e a ordem
 * que a pessoa salvou lá (quadro, temporada ou nenhum; manual, publicação, criação ou título).
 * Por temporada, as temporadas vêm primeiro e "Sem temporada" por último. Só lê: nada aqui grava vínculo.
 */
export function secoesDaSerie(
  lista: readonly Content[],
  serieIds: readonly string[],
  series: readonly Serie[],
  temporadas: readonly Temporada[],
  opcoes: {
    /** Escolha salva na página da série (localStorage). */
    preferencia: (serieId: string) => PreferenciaLista;
    /** O banco devolve ordem_episodio: a ordem manual existe. */
    ordemDisponivel: boolean;
  },
): SecaoPuxar[] {
  const raizes = raizesDaEscolha(serieIds, series);
  const variasRaizes = raizes.length > 1;
  const secoes: SecaoPuxar[] = [];
  const vistos = new Set<string>();

  for (const raiz of raizes) {
    const subarvore = idsDaSubarvore(raiz.id, series);
    const episodios = lista.filter(content => {
      if (!content.seriesId || !subarvore.has(content.seriesId) || vistos.has(content.id)) return false;
      vistos.add(content.id);
      return true;
    });
    if (episodios.length === 0) continue;

    const temporadasValidas = temporadasDaSerie(raiz.id, series, temporadas);
    const salva = opcoes.preferencia(raiz.id);
    const agrupar = resolverAgrupar(salva.agrupar, {
      temQuadros: filhosDaSerie(raiz.id, series).length > 0,
      temTemporadas: Boolean(temporadasValidas),
    });
    const ordem = resolverOrdem(salva.ordem, opcoes.ordemDisponivel);
    const grupos = montarLista({
      episodios,
      filtros: FILTROS_LISTA_PADRAO,
      agrupar,
      ordem,
      ctx: {serieId: raiz.id, series, contas: [], temporadasValidas: temporadasValidas ?? []},
      temporadas: temporadasValidas ?? [],
    });

    for (const grupo of grupos) {
      const contents = exibidosDoGrupo(grupo);
      if (contents.length === 0) continue;
      const partes = [variasRaizes ? raiz.name.trim() : null, agrupar === 'nenhum' ? null : grupo.rotulo]
        .filter((parte): parte is string => Boolean(parte));
      secoes.push({
        id: `${raiz.id}|${grupo.id}`,
        rotulo: partes.length > 0 ? partes.join(' · ') : null,
        numerar: ordem === 'manual',
        contents,
      });
    }
  }

  // Fora de qualquer série escolhida não deveria sobrar nada; se sobrar, ninguém some da lista.
  const fora = lista.filter(content => !vistos.has(content.id));
  if (fora.length > 0) {
    secoes.push({
      id: 'fora',
      rotulo: secoes.length > 0 ? 'Outros' : null,
      numerar: false,
      contents: [...fora].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'pt-BR')),
    });
  }
  return secoes;
}

/**
 * Posição de cada episódio como na página da série, contando a série inteira.
 * O que o modal esconde (busca, tag, rede) não vira o episódio 1.
 */
export function posicoesNaSerie(
  contents: readonly Content[],
  serieIds: readonly string[],
  series: readonly Serie[],
  temporadas: readonly Temporada[],
  opcoes: {
    preferencia: (serieId: string) => PreferenciaLista;
    ordemDisponivel: boolean;
  },
): Map<string, PosicaoNaSerie> {
  const posicoes = new Map<string, PosicaoNaSerie>();
  const nomeDaTemporada = new Map(temporadas.map(temporada => [temporada.id, temporada.nome.trim()]));

  for (const raiz of raizesDaEscolha(serieIds, series)) {
    const episodios = episodiosDaPagina(raiz.id, series, contents);
    if (episodios.length === 0) continue;

    const temporadasValidas = temporadasDaSerie(raiz.id, series, temporadas);
    const salva = opcoes.preferencia(raiz.id);
    const agrupar = resolverAgrupar(salva.agrupar, {
      temQuadros: filhosDaSerie(raiz.id, series).length > 0,
      temTemporadas: Boolean(temporadasValidas),
    });
    const ordem = resolverOrdem(salva.ordem, opcoes.ordemDisponivel);
    if (ordem !== 'manual') continue;

    const grupos = montarLista({
      episodios,
      filtros: FILTROS_LISTA_PADRAO,
      agrupar,
      ordem,
      ctx: {serieId: raiz.id, series, contas: [], temporadasValidas: temporadasValidas ?? []},
      temporadas: temporadasValidas ?? [],
    });

    for (const grupo of grupos) {
      const manual = ordenarLista(exibidosDoGrupo(grupo), 'manual');
      const total = manual.length;
      const temporadaDoGrupo = grupo.temporada?.nome.trim() || null;
      manual.forEach((content, indice) => {
        const numero = indice + 1;
        const temporadaDoEpisodio = content.temporadaId ? nomeDaTemporada.get(content.temporadaId) || null : null;
        posicoes.set(content.id, {
          numero,
          total,
          indicativo: indicativoDaPosicao(numero, total, temporadaDoGrupo, temporadaDoEpisodio),
        });
      });
    }
  }

  return posicoes;
}
