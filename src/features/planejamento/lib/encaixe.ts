import type { Content, FuncaoEditorial, Serie } from '../../../lib/database.ts';
import { etapaDoStatus, type Etapa } from '../../editorial/lib/etapas.ts';
import { FUNCAO_CURTA } from '../../editorial/lib/funcoes.ts';
import type { GradeSerie } from '../../editorial/lib/gradeEntries.ts';
import { objetivoDoConteudo, pilarDoConteudo } from '../../editorial/lib/herancaSerie.ts';
import { compararPeloModoSequencia } from '../../settings/lib/modoSequencia.ts';
import type { ProgressoDaOnda } from './episodioNaTemporada.ts';
import type { LinhaContinuidade, LinhaObjetivoSaude } from './saudeIndicadores.ts';
import { canPullContent, type PlanejamentoPostIt } from './postIt.ts';

export type MotivoEncaixe = 'objetivo' | 'serie' | 'pilar';

/** O que subiu o candidato dentro do bloco. Não separa combinam de outros. */
export type DestaqueEncaixe = 'ritmo' | 'sequencia';

export type CandidatoEncaixe = {
  content: Content;
  etapa: Etapa;
  /** O objetivo com que ele vai contar: o do conteúdo, não o do post-it. */
  objetivo: FuncaoEditorial | null;
  /** Na ordem de peso: objetivo, série, pilar. */
  motivos: MotivoEncaixe[];
  /** "ritmo em aberto" e/ou "próximo na sequência", só quando de fato subiu o item. */
  destaques: DestaqueEncaixe[];
};

/** Série com o que o encaixe lê do plano. `slotPadrao` não entra aqui: o Planejamento não sugere dia nem horário. */
export type SerieDoEncaixe = GradeSerie & Partial<Pick<Serie, 'modoSequencia' | 'status' | 'ativa'>>;

export type TemporadaDoEncaixe = { id: string; status?: 'rascunho' | 'ativa' | 'arquivada' };

/** A mesma continuidade da régua/Saúde do período visível. */
export type RitmoDoEncaixe = {
  linhas: readonly Pick<LinhaContinuidade<unknown>, 'serieId' | 'temporadaId' | 'abaixo'>[];
  temporadas?: readonly TemporadaDoEncaixe[];
  progressoDasOndas?: ReadonlyMap<string, ProgressoDaOnda>;
  /** Objetivos do período (os mesmos da Saúde): previsto × proporção do plano. Sem eles, o objetivo não ordena. */
  objetivos?: readonly Pick<LinhaObjetivoSaude<unknown>, 'funcao' | 'previstoPct' | 'desejadoPct'>[];
};

const PESO: Record<MotivoEncaixe, number> = { objetivo: 4, serie: 2, pilar: 1 };

/** Mais adiantado primeiro: preenche o espaço com menos trabalho. Edição > Produção > Roteiro > Ideia. */
const ORDEM_DA_ETAPA: Partial<Record<Etapa, number>> = { edicao: 0, producao: 1, roteiro: 2, ideia: 3 };

function peso(motivos: readonly MotivoEncaixe[]): number {
  return motivos.reduce((total, motivo) => total + PESO[motivo], 0);
}

function motivosDoConteudo(
  postIt: Pick<PlanejamentoPostIt, 'serieId' | 'pilarId' | 'objetivo'>,
  content: Content,
  series: readonly GradeSerie[],
  objetivo: FuncaoEditorial | null,
): MotivoEncaixe[] {
  const motivos: MotivoEncaixe[] = [];
  if (postIt.objetivo && objetivo === postIt.objetivo) motivos.push('objetivo');
  if (postIt.serieId && content.seriesId === postIt.serieId) motivos.push('serie');
  const pilar = pilarDoConteudo(content, series);
  if (postIt.pilarId && pilar === postIt.pilarId) motivos.push('pilar');
  return motivos;
}

function emRascunho(serie: SerieDoEncaixe | undefined): boolean {
  return serie?.status === 'rascunho';
}

/** A série e as de cima, até a raiz. */
function cadeia(serieId: string | null | undefined, porId: ReadonlyMap<string, SerieDoEncaixe>): string[] {
  const ids: string[] = [];
  let atual = serieId ?? null;
  while (atual && !ids.includes(atual)) {
    ids.push(atual);
    atual = porId.get(atual)?.parentId ?? null;
  }
  return ids;
}

/** Onde mora o modo de sequência: a série acima do quadro, ou a própria série. */
function serieDaSequencia(content: Content, porId: ReadonlyMap<string, SerieDoEncaixe>): string | null {
  const id = content.seriesId ?? null;
  if (!id) return null;
  const serie = porId.get(id);
  if (!serie) return id;
  const quadro = serie.tipoAgrupamento === 'quadro' || (!serie.tipoAgrupamento && Boolean(serie.parentId));
  return quadro && serie.parentId ? serie.parentId : id;
}

/**
 * Atrás no ritmo: a wave, o quadro ou a série do conteúdo tem janela vazia ou abaixo
 * na continuidade do período (a mesma da régua). Wave com linha própria conta só nela.
 */
function atrasNoRitmo(content: Content, ritmo: RitmoDoEncaixe | undefined, porId: ReadonlyMap<string, SerieDoEncaixe>): boolean {
  if (!ritmo || !content.seriesId) return false;
  if (emRascunho(porId.get(content.seriesId))) return false;
  if (content.temporadaId) {
    const daWave = ritmo.linhas.find(linha => linha.temporadaId === content.temporadaId);
    if (daWave) return daWave.abaixo.length > 0;
  }
  const ids = new Set(cadeia(content.seriesId, porId));
  return ritmo.linhas.some(linha => !linha.temporadaId && ids.has(linha.serieId) && linha.abaixo.length > 0);
}

function waveIncompleta(content: Content, ritmo: RitmoDoEncaixe | undefined): boolean {
  if (!ritmo || !content.temporadaId) return false;
  const temporada = ritmo.temporadas?.find(item => item.id === content.temporadaId);
  if (!temporada || (temporada.status && temporada.status !== 'ativa')) return false;
  const progresso = ritmo.progressoDasOndas?.get(content.temporadaId);
  return Boolean(progresso && progresso.publicados < progresso.total);
}

/**
 * Quadro do episódio mais recente já no plano ou no calendário, por série da sequência:
 * conteúdos com dia na grade e os já encaixados em post-it.
 */
export function ultimosQuadros({
  contents,
  series,
  datas,
  postIts,
}: {
  contents: readonly Content[];
  series: readonly SerieDoEncaixe[];
  datas: ReadonlyMap<string, readonly string[]>;
  postIts: readonly Pick<PlanejamentoPostIt, 'contentId' | 'date'>[];
}): Map<string, string> {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const dataDoPostIt = new Map<string, string>();
  for (const item of postIts) {
    if (!item.contentId) continue;
    const anterior = dataDoPostIt.get(item.contentId);
    const data = item.date ?? '';
    if (anterior === undefined || data > anterior) dataDoPostIt.set(item.contentId, data);
  }
  const melhor = new Map<string, { data: string; quadro: string }>();
  for (const content of contents) {
    if (!content.seriesId) continue;
    const dias = datas.get(content.id) ?? [];
    const noPlano = dataDoPostIt.get(content.id);
    if (dias.length === 0 && noPlano === undefined) continue;
    const data = [...dias, noPlano ?? ''].reduce((max, dia) => (dia > max ? dia : max), '');
    const grupo = serieDaSequencia(content, porId);
    if (!grupo) continue;
    const atual = melhor.get(grupo);
    if (!atual || data > atual.data) melhor.set(grupo, { data, quadro: content.seriesId });
  }
  return new Map([...melhor].map(([grupo, item]) => [grupo, item.quadro]));
}

function porEtapaETitulo(a: CandidatoEncaixe, b: CandidatoEncaixe): number {
  const porEtapa = (ORDEM_DA_ETAPA[a.etapa] ?? 9) - (ORDEM_DA_ETAPA[b.etapa] ?? 9);
  if (porEtapa !== 0) return porEtapa;
  return (a.content.title || '').localeCompare(b.content.title || '', 'pt-BR');
}

/**
 * Quanto o objetivo do candidato está abaixo da proporção do plano no período (pontos percentuais).
 * Maior = mais longe da proporção. Sem objetivo fica por último; sem proporção no plano, todos empatam.
 */
export function faltaDoObjetivo(objetivo: FuncaoEditorial | null, ritmo: RitmoDoEncaixe | undefined): number {
  const linhas = ritmo?.objetivos ?? [];
  if (!linhas.some(linha => linha.desejadoPct != null)) return 0;
  if (!objetivo) return Number.NEGATIVE_INFINITY;
  const linha = linhas.find(item => item.funcao === objetivo);
  return (linha?.desejadoPct ?? 0) - (linha?.previstoPct ?? 0);
}

/** Etapa; depois o objetivo mais abaixo da proporção; o título só desempata. */
function porEtapaEObjetivo(a: Interno, b: Interno): number {
  const porEtapa = (ORDEM_DA_ETAPA[a.etapa] ?? 9) - (ORDEM_DA_ETAPA[b.etapa] ?? 9);
  if (porEtapa !== 0) return porEtapa;
  if (a.falta !== b.falta) return a.falta > b.falta ? -1 : 1;
  return (a.content.title || '').localeCompare(b.content.title || '', 'pt-BR');
}

type Interno = CandidatoEncaixe & { atras: boolean; wave: boolean; grupo: string | null; posicao: number; falta: number };

/**
 * Dentro de um bloco: quem está atrás no ritmo; depois a etapa (Edição > Produção > Roteiro > Ideia);
 * depois o objetivo mais abaixo da proporção do plano. Na mesma série, a wave em andamento
 * e o modo de sequência trocam os episódios de lugar entre si. O título só desempata.
 */
function ordenarBloco(bloco: Interno[]): CandidatoEncaixe[] {
  const ordenado = [...bloco].sort((a, b) => {
    if (a.atras !== b.atras) return a.atras ? -1 : 1;
    return porEtapaEObjetivo(a, b);
  });
  // Na mesma série (e no mesmo lado do ritmo), os episódios trocam de lugar entre si:
  // a wave em andamento e o modo de sequência decidem quem fica com a primeira vaga.
  const vagas = new Map<string, number[]>();
  ordenado.forEach((item, indice) => {
    if (!item.grupo) return;
    const chave = `${item.atras ? 1 : 0}:${item.grupo}`;
    vagas.set(chave, [...(vagas.get(chave) ?? []), indice]);
  });
  const resultado = [...ordenado];
  for (const indices of vagas.values()) {
    if (indices.length < 2) continue;
    const membros = indices.map(indice => ordenado[indice])
      .sort((a, b) => (a.wave === b.wave ? 0 : a.wave ? -1 : 1) || a.posicao - b.posicao);
    indices.forEach((indice, i) => { resultado[indice] = membros[i]; });
  }

  // "ritmo em aberto": só quando passou à frente de alguém que não está atrás.
  const temSemAtraso = bloco.some(item => !item.atras);
  // "próximo na sequência": o primeiro da série pelo modo, quando sem o modo outro vinha antes.
  const porGrupo = new Map<string, Interno[]>();
  for (const item of bloco) {
    if (!item.grupo) continue;
    porGrupo.set(item.grupo, [...(porGrupo.get(item.grupo) ?? []), item]);
  }
  const sobe = new Set<string>();
  for (const itens of porGrupo.values()) {
    if (itens.length < 2) continue;
    const pelaSequencia = [...itens].sort((a, b) =>
      (a.atras === b.atras ? 0 : a.atras ? -1 : 1) || (a.wave === b.wave ? 0 : a.wave ? -1 : 1) || a.posicao - b.posicao);
    const semSequencia = [...itens].sort((a, b) =>
      (a.atras === b.atras ? 0 : a.atras ? -1 : 1) || (a.wave === b.wave ? 0 : a.wave ? -1 : 1) || porEtapaEObjetivo(a, b));
    if (pelaSequencia[0] !== semSequencia[0]) sobe.add(pelaSequencia[0].content.id);
  }

  return resultado.map(({ atras, wave: _wave, grupo: _grupo, posicao: _posicao, falta: _falta, ...candidato }) => {
    const destaques: DestaqueEncaixe[] = [];
    if (atras && temSemAtraso) destaques.push('ritmo');
    if (sobe.has(candidato.content.id)) destaques.push('sequencia');
    return { ...candidato, destaques };
  });
}

/**
 * O que pode ocupar um espaço planejado: ideia, roteiro ou conteúdo em Produção,
 * sem dia na grade e sem outro post-it. Nada é ligado aqui: a lista só mostra.
 * `combinam` tem o mesmo objetivo, série ou pilar do post-it; `outros`, o resto.
 * Dentro de cada bloco: ritmo, etapa, objetivo abaixo da proporção; wave e sequência dentro da série.
 */
export function candidatosDoEncaixe({
  postIt,
  postIts,
  contents,
  series,
  datas,
  ritmo,
}: {
  postIt: Pick<PlanejamentoPostIt, 'id' | 'serieId' | 'pilarId' | 'objetivo'>;
  postIts: readonly (Pick<PlanejamentoPostIt, 'id' | 'contentId'> & Partial<Pick<PlanejamentoPostIt, 'date'>>)[];
  contents: readonly Content[];
  series: readonly SerieDoEncaixe[];
  /** De `datasNaGrade`. Quem tem algum dia já está planejado. */
  datas: ReadonlyMap<string, readonly string[]>;
  /** Continuidade do período visível. Sem ela, só a sequência e a etapa ordenam. */
  ritmo?: RitmoDoEncaixe;
}): { combinam: CandidatoEncaixe[]; outros: CandidatoEncaixe[] } {
  const ligados = new Set(postIts.flatMap(item => item.id !== postIt.id && item.contentId ? [item.contentId] : []));
  const porId = new Map(series.map(serie => [serie.id, serie]));

  const base = contents
    .filter(canPullContent)
    .filter(content => !ligados.has(content.id))
    .filter(content => (datas.get(content.id)?.length ?? 0) === 0)
    .map(content => {
      // O mesmo objetivo e pilar com que ele vai contar na Saúde.
      const objetivo = objetivoDoConteudo(content, series);
      const grupo = serieDaSequencia(content, porId);
      return {
        content,
        etapa: etapaDoStatus(content.status),
        objetivo,
        motivos: motivosDoConteudo(postIt, content, series, objetivo),
        destaques: [] as DestaqueEncaixe[],
        atras: atrasNoRitmo(content, ritmo, porId),
        wave: waveIncompleta(content, ritmo),
        grupo: grupo && !emRascunho(porId.get(grupo)) ? grupo : null,
        posicao: 0,
        falta: faltaDoObjetivo(objetivo, ritmo),
      };
    });

  // Posição de cada um pelo modo de sequência da série (null = ordem da temporada).
  const ultimos = ultimosQuadros({
    contents,
    series,
    datas,
    postIts: postIts.map(item => ({ contentId: item.contentId ?? null, date: item.date ?? null })),
  });
  const porGrupo = new Map<string, Interno[]>();
  for (const item of base) {
    if (!item.grupo) continue;
    porGrupo.set(item.grupo, [...(porGrupo.get(item.grupo) ?? []), item]);
  }
  for (const [grupo, itens] of porGrupo) {
    const modo = porId.get(grupo)?.modoSequencia;
    const ultimo = ultimos.get(grupo) ?? null;
    // Empate no modo (ex.: sem número de episódio) fica com a etapa e o título, como antes.
    const ordem = [...itens].sort((a, b) =>
      compararPeloModoSequencia(a.content, b.content, modo, ultimo) || porEtapaETitulo(a, b));
    const indice = new Map(ordem.map((item, i) => [item.content.id, i]));
    for (const item of itens) item.posicao = indice.get(item.content.id) ?? 0;
  }

  // O peso só separa os blocos; dentro de cada um vale o plano: ritmo, etapa, objetivo.
  return {
    combinam: ordenarBloco(base.filter(item => item.motivos.length > 0)),
    outros: ordenarBloco(base.filter(item => item.motivos.length === 0)),
  };
}

/**
 * "Atrair · mesma série": o objetivo com que ele vai contar e o que mais combina.
 * O objetivo vem sempre, para não surpreender quando for diferente do espaço.
 */
export function descricaoDoCandidato(candidato: Pick<CandidatoEncaixe, 'objetivo' | 'motivos'> & Partial<Pick<CandidatoEncaixe, 'destaques'>>): string {
  const partes = [candidato.objetivo ? FUNCAO_CURTA[candidato.objetivo] : 'Sem objetivo'];
  if (candidato.motivos.includes('serie')) partes.push('mesma série');
  if (candidato.motivos.includes('pilar')) partes.push('mesmo pilar');
  if (candidato.destaques?.includes('ritmo')) partes.push('ritmo em aberto');
  if (candidato.destaques?.includes('sequencia')) partes.push('próximo na sequência');
  return partes.join(' · ');
}
