import type { TagSelectOption } from '../../../components/ui/TagSelect.ts';
import type { Serie } from '../../../lib/database.ts';
import { TIPO_AGRUPAMENTO_LABEL, tipoDaSerie, tiposDasSeries } from '../../settings/lib/serieAgrupamento.ts';

export type SerieDoPostIt = Pick<Serie, 'id' | 'name' | 'parentId' | 'tipoAgrupamento' | 'ativa'>;

/** Opção do select de série/quadro no post-it: família só como cabeçalho, quadro recuado. */
export type OpcaoSerieDoPostIt = TagSelectOption;

function nomeDe(item: Pick<SerieDoPostIt, 'name'>): string {
  return item.name?.trim() || 'Sem nome';
}

function porNome(a: SerieDoPostIt, b: SerieDoPostIt): number {
  return nomeDe(a).localeCompare(nomeDe(b), 'pt-BR');
}

function visivel(item: SerieDoPostIt, atualId?: string | null): boolean {
  return Boolean(item.ativa) || item.id === atualId;
}

function rotulo(tipo: 'familia' | 'serie' | 'quadro', item: SerieDoPostIt): string {
  return `${TIPO_AGRUPAMENTO_LABEL[tipo]} · ${nomeDe(item)}`;
}

/** Quadros abaixo da série, na ordem da árvore (filhos antes dos netos), por nome em cada nível. */
function quadrosDaSerie(serieId: string, series: readonly SerieDoPostIt[], tipos: Map<string, 'familia' | 'serie' | 'quadro'>): SerieDoPostIt[] {
  const lista: SerieDoPostIt[] = [];
  const visitar = (paiId: string) => {
    const filhos = series
      .filter(item => item.parentId === paiId && tipos.get(item.id) === 'quadro')
      .sort(porNome);
    for (const filho of filhos) {
      lista.push(filho);
      visitar(filho.id);
    }
  };
  visitar(serieId);
  return lista;
}

/**
 * Opções do select de série no post-it: séries e quadros, sem temporada.
 * Família não é escolhível — só aparece como cabeçalho de grupo, quando agrupa itens.
 * O id já gravado entra mesmo inativo, para não sumir na edição.
 */
export function opcoesSerieDoPostIt(
  series: readonly SerieDoPostIt[],
  atualId?: string | null,
): OpcaoSerieDoPostIt[] {
  const tipos = tiposDasSeries(series);
  const familias = series.filter(item => tipos.get(item.id) === 'familia').sort(porNome);
  const soSeries = series.filter(item => tipos.get(item.id) === 'serie');
  const soQuadros = series.filter(item => tipos.get(item.id) === 'quadro');

  const usados = new Set<string>();
  const opcoes: OpcaoSerieDoPostIt[] = [];

  const blocoDaSerie = (serie: SerieDoPostIt): OpcaoSerieDoPostIt[] => {
    const quadros = quadrosDaSerie(serie.id, series, tipos).filter(item => visivel(item, atualId));
    if (!visivel(serie, atualId) && quadros.length === 0) return [];
    const bloco: OpcaoSerieDoPostIt[] = [];
    if (visivel(serie, atualId)) {
      bloco.push({ value: serie.id, label: rotulo('serie', serie) });
      usados.add(serie.id);
    }
    for (const quadro of quadros) {
      bloco.push({ value: quadro.id, label: rotulo('quadro', quadro), indent: true });
      usados.add(quadro.id);
    }
    return bloco;
  };

  for (const familia of familias) {
    const filhas = soSeries.filter(item => item.parentId === familia.id).sort(porNome);
    const bloco: OpcaoSerieDoPostIt[] = [];
    for (const serie of filhas) bloco.push(...blocoDaSerie(serie));
    const avulsos = soQuadros
      .filter(item => item.parentId === familia.id && visivel(item, atualId) && !usados.has(item.id))
      .sort(porNome);
    for (const quadro of avulsos) {
      bloco.push({ value: quadro.id, label: rotulo('quadro', quadro), indent: true });
      usados.add(quadro.id);
    }
    if (bloco.length === 0) continue;
    opcoes.push({
      value: `familia:${familia.id}`,
      label: rotulo('familia', familia),
      disabled: true,
      group: familia.id,
    });
    for (const item of bloco) opcoes.push({ ...item, group: familia.id });
  }

  const independentes = soSeries.filter(item => !usados.has(item.id)).sort(porNome);
  for (const serie of independentes) opcoes.push(...blocoDaSerie(serie));

  const soltos = soQuadros.filter(item => visivel(item, atualId) && !usados.has(item.id)).sort(porNome);
  for (const quadro of soltos) {
    opcoes.push({ value: quadro.id, label: rotulo('quadro', quadro) });
    usados.add(quadro.id);
  }

  // Id já gravado (inativo ou família escolhida antes) não pode sumir do campo.
  if (atualId && !opcoes.some(item => item.value === atualId)) {
    const atual = series.find(item => item.id === atualId);
    if (atual) {
      const tipo = tipos.get(atual.id) ?? tipoDaSerie(atual.id, series);
      opcoes.push({ value: atual.id, label: rotulo(tipo, atual) });
    }
  }

  return opcoes;
}
