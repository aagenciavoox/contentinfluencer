import { addDays, differenceInCalendarDays, endOfWeek, format, parseISO, startOfWeek } from 'date-fns';
import type { BibliotecaItem, FuncaoEditorial, Pilar, Serie } from '../../../lib/database.ts';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute.ts';
import { getGentleExperienceSettings } from '../../settings/lib/gentleExperience.ts';
import { getModuleFlags } from '../../settings/lib/moduleFlags.ts';
import { contarEstoque, type EstoqueContent } from './estoque.ts';
import { buildGradeEntries, type GradeContent, type GradeSerie } from './gradeEntries.ts';
import { countGrade, type PilarContagem } from './gradeCounts.ts';
import { getEditorialSettings, type EditorialSettings } from './editorialSettings.ts';
import { FUNCOES } from './funcoes.ts';
import { getSerieOpenItems } from './serieCompleteness.ts';

export type Leitura = {
  chave: string;
  prioridade: 1 | 2 | 4;
  mensagem: string;
  acao: { rotulo: string; href: string };
  /** Frase que aponta o próximo espaço a preencher. No máximo uma por tela. */
  destrava?: boolean;
};

export type PeriodoLeitura = {
  inicio: string;
  fim: string;
};

type ConteudoLeitura = GradeContent & {
  title?: string | null;
  script?: string | null;
  tags?: readonly string[] | null;
  recordedAt?: string | null;
  bibliotecaItemId?: string | null;
  /** Lista, quando o roteiro já a tiver. Sem ela, vale o livro único. */
  livroIds?: readonly string[] | null;
};

type ProjetoLeitura = {
  id: string;
  nome: string;
  tipo: string;
  dataInicio: string | null;
  contentIds: readonly string[];
  deletedAt?: string | null;
  avisoDias?: number | null;
};

type SerieLeitura = GradeSerie & {
  name: string;
  ativa?: boolean;
  pilarIds?: string[];
  pilarPrincipalId?: string | null;
  frequenciaRecomendada?: string | null;
  formatoVisualPadrao?: string | null;
  energiaPadrao?: Serie['energiaPadrao'];
};

export type ReadingsState = {
  contents: readonly ConteudoLeitura[];
  series: readonly SerieLeitura[];
  pilares: readonly PilarContagem[];
  projetos: readonly ProjetoLeitura[];
  bibliotecaItems: readonly Pick<BibliotecaItem, 'id' | 'status' | 'deletedAt'>[];
  pauseMode?: boolean;
  mostrarNumeros?: boolean;
  libraryEnabled?: boolean;
  semana?: PeriodoLeitura;
};

/** Nome usado na frase da semana. O exemplo do plano é "Conversão" e "Ação". */
const FUNCAO_NA_LEITURA: Record<FuncaoEditorial, string> = {
  atrair: 'Atração',
  converter: 'Conversão',
  aprofundar: 'Aprofundamento',
  comunidade: 'Comunidade',
  acao: 'Ação',
  reter: 'Retenção',
};

function dia(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function diasEntre(alvo: string, hoje: string): number {
  return differenceInCalendarDays(parseISO(alvo), parseISO(hoje));
}

function textoQuando(dias: number, mostrarNumeros: boolean): string {
  if (!mostrarNumeros) return 'em breve';
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'em 1 dia';
  return `em ${dias} dias`;
}

function idsDeLivros(content: ConteudoLeitura): string[] {
  const listed = [...new Set(
    (content.livroIds ?? []).filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()),
  )];
  if (listed.length > 0) return listed;
  const single = content.bibliotecaItemId?.trim();
  return single ? [single] : [];
}

function temChecar(tags: readonly string[] | null | undefined): boolean {
  return (tags ?? []).some(tag => tag.trim().toLocaleLowerCase('pt-BR') === 'checar');
}

function avisoDiasDe(projeto: ProjetoLeitura): number | null {
  const value = projeto.avisoDias;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 120) return null;
  return value;
}

function comoEstoque(content: ConteudoLeitura): EstoqueContent {
  return {
    id: content.id,
    status: content.status,
    script: content.script ?? null,
    title: content.title ?? content.id,
    recordedAt: content.recordedAt ?? null,
    postedAt: content.postedAt ?? null,
    publishDate: content.publishDate ?? null,
    tags: [...(content.tags ?? [])],
    deletedAt: content.deletedAt ?? null,
    pilarId: content.pilarId ?? null,
    seriesId: content.seriesId ?? null,
    contaNaGrade: content.contaNaGrade,
  };
}

/**
 * Leituras de organização, uma por causa.
 * O modo pausa devolve lista vazia. Sem números, as quantidades saem da frase.
 */
export function computeReadings(
  state: ReadingsState,
  settings: Pick<EditorialSettings, 'redeReferenciaId' | 'distribuicaoFuncoes' | 'estoqueDesejado' | 'openInfoNotices'>,
  now: Date = new Date(),
): Leitura[] {
  if (state.pauseMode) return [];

  const mostrarNumeros = state.mostrarNumeros !== false;
  const hoje = dia(now);
  const limite = dia(addDays(now, 3));
  const semana = state.semana ?? {
    inicio: dia(startOfWeek(now, { weekStartsOn: 1 })),
    fim: dia(endOfWeek(now, { weekStartsOn: 1 })),
  };
  const entries = buildGradeEntries({
    contents: state.contents,
    series: state.series,
    settings: { redeReferenciaId: settings.redeReferenciaId },
  });
  const contagem = countGrade({
    entries,
    pilares: state.pilares,
    settings: { distribuicaoFuncoes: settings.distribuicaoFuncoes },
    periodo: semana,
  });
  const livros = new Map(state.bibliotecaItems.filter(item => !item.deletedAt).map(item => [item.id, item]));
  const leituras: Leitura[] = [];

  const checagens = state.contents.flatMap(content => {
    if (content.deletedAt || content.archivedAt || !temChecar(content.tags)) return [];
    const proximas = entries.filter(entry => {
      if (entry.contentId !== content.id || !entry.data) return false;
      return entry.data >= hoje && entry.data <= limite;
    });
    if (proximas.length === 0) return [];
    const maisPerto = [...proximas].sort((left, right) => (left.data! > right.data! ? 1 : -1))[0];
    return [{ content, dias: diasEntre(maisPerto.data!, hoje) }];
  }).sort((left, right) => left.dias - right.dias || left.content.id.localeCompare(right.content.id));

  for (const item of checagens) {
    leituras.push({
      chave: `checar:${item.content.id}`,
      prioridade: 1,
      mensagem: `Este roteiro tem 'checar' e sai ${textoQuando(item.dias, mostrarNumeros)}`,
      acao: { rotulo: 'Abrir roteiro', href: buildContentDetailRoute(item.content.id) },
    });
  }

  if (state.libraryEnabled !== false) {
    const comLivroAberto = state.contents.filter(content => {
      if (content.deletedAt || content.archivedAt) return false;
      return idsDeLivros(content).some(id => {
        const livro = livros.get(id);
        return Boolean(livro) && livro!.status !== 'Lido';
      });
    });
    for (const content of comLivroAberto) {
      leituras.push({
        chave: `livro:${content.id}`,
        prioridade: 1,
        mensagem: 'Este roteiro cita um livro ainda não lido',
        acao: { rotulo: 'Abrir roteiro', href: buildContentDetailRoute(content.id) },
      });
    }
  }

  const funcoesComEspaco = contagem.funcoes
    .map(linha => ({ linha, falta: linha.meta - linha.planejado }))
    .filter(item => item.linha.meta > 0 && item.falta > 0)
    .sort((left, right) => right.falta - left.falta || left.linha.id.localeCompare(right.linha.id));

  for (const item of funcoesComEspaco) {
    const funcao = item.linha.id as FuncaoEditorial;
    if (!FUNCOES.includes(funcao)) continue;
    const nome = FUNCAO_NA_LEITURA[funcao];
    const mensagem = mostrarNumeros
      ? (item.falta === 1
        ? `Esta semana ainda cabe 1 de ${nome}`
        : `Esta semana ainda cabem ${item.falta} de ${nome}`)
      : `Esta semana ainda cabe espaço de ${nome}`;
    leituras.push({
      chave: `funcao:${funcao}`,
      prioridade: 2,
      mensagem,
      acao: { rotulo: 'Ver na criação', href: `/criacao?funcao=${funcao}` },
      destrava: true,
    });
  }

  if (typeof settings.estoqueDesejado === 'number') {
    const estoque = contarEstoque(state.contents.map(comoEstoque));
    if (estoque < settings.estoqueDesejado) {
      leituras.push({
        chave: 'estoque',
        prioridade: 2,
        mensagem: 'Estoque abaixo do que você definiu',
        acao: { rotulo: 'Ver estoque', href: '/editorial?aba=ajustes' },
      });
    }
  }

  const eventos = state.projetos
    .flatMap(projeto => {
      if (projeto.deletedAt || projeto.tipo !== 'evento') return [];
      const aviso = avisoDiasDe(projeto);
      const inicio = projeto.dataInicio?.slice(0, 10) ?? '';
      if (aviso == null || !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return [];
      const dias = diasEntre(inicio, hoje);
      if (dias < 0 || dias > aviso) return [];
      const ids = new Set(projeto.contentIds);
      const temAcao = entries.some(entry => ids.has(entry.contentId) && entry.funcao === 'acao');
      if (temAcao) return [];
      return [{ projeto, dias }];
    })
    .sort((left, right) => left.dias - right.dias || left.projeto.nome.localeCompare(right.projeto.nome, 'pt-BR'));

  for (const item of eventos) {
    const nome = item.projeto.nome.trim() || 'Este evento';
    leituras.push({
      chave: `evento:${item.projeto.id}`,
      prioridade: 2,
      mensagem: `${nome} começa ${textoQuando(item.dias, mostrarNumeros)} e ainda não tem conteúdo de Ação`,
      acao: { rotulo: 'Abrir evento', href: `/projetos/${item.projeto.id}` },
    });
  }

  if (settings.openInfoNotices) {
    const seriesAbertas = [...state.series]
      .filter(serie => getSerieOpenItems(serie).length > 0)
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
    for (const serie of seriesAbertas) {
      leituras.push({
        chave: `serie:${serie.id}`,
        prioridade: 4,
        mensagem: 'Esta série tem informações em aberto',
        acao: { rotulo: 'Abrir série', href: `/editorial/series/${serie.id}` },
      });
    }
  }

  const vistas = new Set<string>();
  return leituras.filter(leitura => {
    if (vistas.has(leitura.chave)) return false;
    vistas.add(leitura.chave);
    return true;
  });
}

/** Mantém a primeira frase que aponta o próximo espaço. As outras causas ficam. */
export function limitarDestrava(leituras: readonly Leitura[]): Leitura[] {
  let usada = false;
  return leituras.filter(leitura => {
    if (!leitura.destrava) return true;
    if (usada) return false;
    usada = true;
    return true;
  });
}

export function leiturasDoHoje(leituras: readonly Leitura[]): Leitura[] {
  return limitarDestrava(leituras).slice(0, 3);
}

export function leiturasDaSemana(leituras: readonly Leitura[]): Leitura[] {
  return limitarDestrava(leituras.filter(leitura => leitura.prioridade === 2));
}

export function leiturasDoEditorial(leituras: readonly Leitura[]): Leitura[] {
  return leituras.filter(leitura => leitura.prioridade === 4);
}

type AppParaLeituras = {
  contents: readonly ConteudoLeitura[];
  series: readonly SerieLeitura[];
  pilares: readonly PilarContagem[];
  projetos: readonly ProjetoLeitura[];
  bibliotecaItems: readonly Pick<BibliotecaItem, 'id' | 'status' | 'deletedAt'>[];
  preferences: Record<string, unknown> | null | undefined;
};

export function computeReadingsFromApp(
  state: AppParaLeituras,
  options?: { now?: Date; semana?: PeriodoLeitura },
): Leitura[] {
  const gentle = getGentleExperienceSettings(state.preferences);
  const modules = getModuleFlags(state.preferences);
  const settings = getEditorialSettings(state.preferences);
  return computeReadings(
    {
      contents: state.contents,
      series: state.series,
      pilares: state.pilares,
      projetos: state.projetos,
      bibliotecaItems: state.bibliotecaItems,
      pauseMode: gentle.pauseMode,
      mostrarNumeros: gentle.dashboardCounts,
      libraryEnabled: modules.library,
      semana: options?.semana,
    },
    settings,
    options?.now ?? new Date(),
  );
}

export type { Pilar, Serie };
