import type { ClubeConteudo, ClubeOrigem, ClubePasta, ClubeSerie, Content, Serie, TemplateBloco } from '../../../lib/database.ts';
import { templateToHtml } from '../../contents/lib/seriesScriptTemplate.ts';
import { isActiveCreation } from '../../contents/lib/contentWorkflow.ts';
import { tipoDaSerie } from '../../settings/lib/serieAgrupamento.ts';

export const ORIGEM_DO_CLUBE: Record<ClubeOrigem, string> = {
  catarse: 'Catarse',
  apoiase: 'Apoia.se',
  outro: 'Outro',
};

const BLOCOS_DO_CLUBE: TemplateBloco[] = [
  { id: 'leitura', tipo: 'variavel', label: 'Leitura do mês', conteudo: '', placeholder: '' },
  { id: 'pauta', tipo: 'variavel', label: 'Pauta do encontro', conteudo: '', placeholder: '' },
  { id: 'materiais', tipo: 'variavel', label: 'Materiais de apoio', conteudo: '', placeholder: '' },
  { id: 'recados', tipo: 'variavel', label: 'Recados do apoio', conteudo: '', placeholder: '' },
  { id: 'falta', tipo: 'variavel', label: 'O que falta fazer', conteudo: '', placeholder: '' },
];

/** Texto inicial da peça que nasce no clube, no mesmo formato dos blocos do roteiro. */
export function htmlInicialDoClube(): string {
  return templateToHtml({ estrutura: BLOCOS_DO_CLUBE });
}

type ConteudoDoClube = Pick<Content, 'id' | 'seriesId' | 'title' | 'ordemEpisodio' | 'deletedAt' | 'archivedAt'> & {
  clubeId?: string | null;
};

/** Casa da peça: nasceu neste clube e não pertence a série nem quadro. */
export function exclusivaDoClube(clubeId: string, content: Pick<ConteudoDoClube, 'seriesId' | 'clubeId'>): boolean {
  return !content.seriesId && content.clubeId === clubeId;
}

export type ItemDoClube<T extends ConteudoDoClube = ConteudoDoClube> = {
  vinculo: ClubeConteudo;
  content: T;
  atalho: boolean;
};

/** Lista do clube na ordem dele. Some o conteúdo, some o item. A ordem da série não entra aqui. */
export function itensDoClube<T extends ConteudoDoClube>(
  clubeId: string,
  vinculos: readonly ClubeConteudo[],
  contents: readonly T[],
): ItemDoClube<T>[] {
  const porId = new Map(contents.map(content => [content.id, content]));
  return vinculos
    .filter(vinculo => vinculo.clubeId === clubeId)
    .sort((a, b) => a.ordem - b.ordem || a.contentId.localeCompare(b.contentId))
    .flatMap(vinculo => {
      const content = porId.get(vinculo.contentId);
      if (!content || !isActiveCreation(content)) return [];
      return [{
        vinculo,
        content,
        atalho: !exclusivaDoClube(clubeId, content),
      }];
    });
}

export function proximaOrdem(clubeId: string, vinculos: readonly ClubeConteudo[], pastaId: string | null = null): number {
  const ordens = vinculos
    .filter(vinculo => vinculo.clubeId === clubeId && (vinculo.pastaId ?? null) === pastaId)
    .map(vinculo => vinculo.ordem);
  return ordens.length > 0 ? Math.max(...ordens) + 1 : 1;
}

/** Roteiros de série ou quadro que ainda não estão neste clube. */
export function candidatosParaPuxar<T extends ConteudoDoClube>(
  clubeId: string,
  vinculos: readonly ClubeConteudo[],
  contents: readonly T[],
): T[] {
  const ja = new Set(
    vinculos.filter(vinculo => vinculo.clubeId === clubeId).map(vinculo => vinculo.contentId),
  );
  return contents.filter(content =>
    Boolean(content.seriesId)
    && isActiveCreation(content)
    && !ja.has(content.id),
  );
}

/** Nova ordem dentro de uma pasta. O id do conteúdo não muda. */
export function reordenarVinculos(
  vinculos: readonly ClubeConteudo[],
  clubeId: string,
  contentIds: readonly string[],
  pastaId: string | null = null,
): ClubeConteudo[] {
  const naPasta = (vinculo: ClubeConteudo) => vinculo.clubeId === clubeId && (vinculo.pastaId ?? null) === pastaId;
  const doClube = vinculos.filter(naPasta);
  const outros = vinculos.filter(vinculo => !naPasta(vinculo));
  const porId = new Map(doClube.map(vinculo => [vinculo.contentId, vinculo]));
  const ordenados: ClubeConteudo[] = [];
  let ordem = 1;
  for (const contentId of contentIds) {
    const atual = porId.get(contentId);
    if (!atual) continue;
    ordenados.push({ ...atual, ordem });
    porId.delete(contentId);
    ordem += 1;
  }
  for (const resto of [...porId.values()].sort((a, b) => a.ordem - b.ordem || a.contentId.localeCompare(b.contentId))) {
    ordenados.push({ ...resto, ordem });
    ordem += 1;
  }
  return [...outros, ...ordenados];
}

/** Leva conteúdos para uma pasta e põe no fim da ordem dela. O id e a série de origem ficam. */
export function moverConteudosDePasta(
  vinculos: readonly ClubeConteudo[],
  clubeId: string,
  contentIds: readonly string[],
  pastaId: string | null,
): ClubeConteudo[] {
  const ids = new Set(contentIds);
  const jaLa = vinculos.filter(vinculo =>
    vinculo.clubeId === clubeId && !ids.has(vinculo.contentId) && (vinculo.pastaId ?? null) === pastaId,
  );
  let ordem = jaLa.reduce((maximo, vinculo) => Math.max(maximo, vinculo.ordem), 0);
  return vinculos.map(vinculo => {
    if (vinculo.clubeId !== clubeId || !ids.has(vinculo.contentId)) return vinculo;
    if ((vinculo.pastaId ?? null) === pastaId) return vinculo;
    ordem += 1;
    return { ...vinculo, pastaId, ordem };
  });
}

export type OrdemDoClube = 'manual' | 'publicacao' | 'criacao' | 'titulo';

export const ROTULO_ORDEM_CLUBE: Record<OrdemDoClube, string> = {
  manual: 'Ordem manual',
  publicacao: 'Data de publicação',
  criacao: 'Data de criação',
  titulo: 'Título A-Z',
};

type ComData = ConteudoDoClube & { publishDate?: string | null; createdAt?: string | null };

function diaDe(valor: string | null | undefined): string {
  return valor && /^\d{4}-\d{2}-\d{2}/.test(valor) ? valor.slice(0, 10) : '';
}

/** Só a apresentação. A ordem gravada continua sendo a manual. */
export function ordenarItensDoClube<T extends ComData>(
  itens: readonly ItemDoClube<T>[],
  ordem: OrdemDoClube,
): ItemDoClube<T>[] {
  const lista = [...itens];
  if (ordem === 'manual') return lista.sort((a, b) => a.vinculo.ordem - b.vinculo.ordem);
  if (ordem === 'titulo') {
    return lista.sort((a, b) => a.content.title.localeCompare(b.content.title, 'pt-BR') || a.vinculo.ordem - b.vinculo.ordem);
  }
  const campo = ordem === 'publicacao' ? 'publishDate' : 'createdAt';
  return lista.sort((a, b) => {
    const diaA = diaDe(a.content[campo]);
    const diaB = diaDe(b.content[campo]);
    if (!diaA && !diaB) return a.vinculo.ordem - b.vinculo.ordem;
    if (!diaA) return 1;
    if (!diaB) return -1;
    return diaA.localeCompare(diaB) || a.vinculo.ordem - b.vinculo.ordem;
  });
}

type SerieDoRotulo = Pick<Serie, 'id' | 'name' | 'parentId' | 'tipoAgrupamento'>;

/** De onde veio o atalho: série, quadro (com a série pai) ou outro clube. */
export function rotuloDaOrigem(
  content: Pick<ConteudoDoClube, 'seriesId' | 'ordemEpisodio' | 'clubeId'>,
  series: readonly SerieDoRotulo[],
  clubes: readonly { id: string; nome: string }[] = [],
): string | null {
  if (content.seriesId) {
    const no = series.find(serie => serie.id === content.seriesId);
    const episodio = typeof content.ordemEpisodio === 'number' ? ` · Ep. ${content.ordemEpisodio}` : '';
    if (!no) return `Série${episodio}`;
    const tipo = tipoDaSerie(no.id, series);
    if (tipo === 'quadro') {
      const pai = no.parentId ? series.find(serie => serie.id === no.parentId) : null;
      const serieNome = pai?.name?.trim();
      const quadro = no.name.trim() || 'Quadro';
      return serieNome ? `Quadro · ${quadro} · ${serieNome}${episodio}` : `Quadro · ${quadro}${episodio}`;
    }
    return `Série · ${no.name.trim() || 'Série'}${episodio}`;
  }
  if (content.clubeId) {
    const casa = clubes.find(clube => clube.id === content.clubeId);
    return casa ? `Clube · ${casa.nome.trim() || 'Clube'}` : 'Clube';
  }
  return null;
}

export function pastasDoClube(clubeId: string, pastas: readonly ClubePasta[]): ClubePasta[] {
  return pastas
    .filter(pasta => pasta.clubeId === clubeId)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function proximaOrdemDePasta(clubeId: string, pastas: readonly ClubePasta[]): number {
  const ordens = pastas.filter(pasta => pasta.clubeId === clubeId).map(pasta => pasta.ordem);
  return ordens.length > 0 ? Math.max(...ordens) + 1 : 1;
}

type SerieVinculavel = Pick<Serie, 'id' | 'name' | 'parentId' | 'tipoAgrupamento'>;

export type SerieNoClube<T extends SerieVinculavel = SerieVinculavel> = {
  vinculo: ClubeSerie;
  serie: T;
};

/** Séries do clube, na ordem da pasta. O objeto da série é o mesmo da árvore. */
export function seriesDoClube<T extends SerieVinculavel>(
  clubeId: string,
  vinculos: readonly ClubeSerie[],
  series: readonly T[],
  pastaId: string | null,
): SerieNoClube<T>[] {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  return vinculos
    .filter(vinculo => vinculo.clubeId === clubeId && (vinculo.pastaId ?? null) === pastaId)
    .sort((a, b) => a.ordem - b.ordem || a.serieId.localeCompare(b.serieId))
    .flatMap(vinculo => {
      const serie = porId.get(vinculo.serieId);
      if (!serie) return [];
      return [{ vinculo, serie }];
    });
}

export function proximaOrdemDeSerie(
  clubeId: string,
  vinculos: readonly ClubeSerie[],
  pastaId: string | null,
): number {
  const ordens = vinculos
    .filter(vinculo => vinculo.clubeId === clubeId && (vinculo.pastaId ?? null) === pastaId)
    .map(vinculo => vinculo.ordem);
  return ordens.length > 0 ? Math.max(...ordens) + 1 : 1;
}

/** Séries e quadros que ainda não estão neste clube. Família fica de fora. */
export function candidatosDeSerie<T extends SerieVinculavel>(
  clubeId: string,
  vinculos: readonly ClubeSerie[],
  series: readonly T[],
): T[] {
  const ja = new Set(vinculos.filter(vinculo => vinculo.clubeId === clubeId).map(vinculo => vinculo.serieId));
  return series.filter(serie => !ja.has(serie.id) && tipoDaSerie(serie.id, series) !== 'familia');
}
