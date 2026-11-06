import {addDays, format, parseISO} from 'date-fns';
import type {Content} from '../../../lib/database.ts';
import type {EditorialSettings} from '../../editorial/lib/editorialSettings.ts';
import {publicacoesDaAgenda} from '../../editorial/lib/publicacoes.ts';
import {conteudoPassa, filtroAtivo, indiceDaAgenda, postItPassa, type FiltroCalendario} from './filtroCalendario.ts';
import {entriesDaSaudeDoMes} from './monthHealth.ts';
import {avisosDeOrientacao, type AvisoOrientacao} from './orientacaoEditorial.ts';
import type {PlanejamentoPostIt} from './postIt.ts';

type Orientacao = Parameters<typeof avisosDeOrientacao>[0];
export type PlanoDaConcentracao = {postIts: readonly PlanejamentoPostIt[]; contents: readonly Content[]};
export type ContextoDaConcentracao = Pick<Orientacao, 'series' | 'temas' | 'obras' | 'periodo' | 'platforms'> & {
  settings: EditorialSettings;
  filtro?: FiltroCalendario;
};

/** Mesmos itens conciliados da Saúde, inclusive publicados, sem duplicar o roteiro ligado.
 * A margem mantém as janelas de obra que cruzam as pontas do período.
 */
export function entriesDaConcentracao(input: ContextoDaConcentracao & PlanoDaConcentracao) {
  const margem = input.settings.concentracao.obraJanelaDias - 1;
  let {postIts, contents} = input;
  if (input.filtro && filtroAtivo(input.filtro)) {
    const filtro = input.filtro;
    const indice = indiceDaAgenda(publicacoesDaAgenda({contents, contas: input.platforms ?? [], series: input.series}));
    contents = contents.filter(content => conteudoPassa(indice, content.id, filtro));
    postIts = postIts.filter(postIt => postItPassa(indice, postIt, filtro));
  }
  return entriesDaSaudeDoMes({
    ...input, postIts, contents,
    periodo: {
      inicio: format(addDays(parseISO(input.periodo.inicio), -margem), 'yyyy-MM-dd'),
      fim: format(addDays(parseISO(input.periodo.fim), margem), 'yyyy-MM-dd'),
    },
  });
}

export function avisosDeConcentracaoNoPlano(input: ContextoDaConcentracao & PlanoDaConcentracao): AvisoOrientacao[] {
  return avisosDeOrientacao({
    ...input,
    entries: entriesDaConcentracao(input),
    concentracao: input.settings.concentracao,
    excecoesConcentracao: input.settings.excecoesConcentracao,
  }).filter(ehConcentracao);
}

function ehConcentracao(aviso: AvisoOrientacao): boolean {
  return aviso.tipo === 'obra-repetida' || aviso.tipo === 'tema-concentrado';
}

function chaveDoAviso(aviso: AvisoOrientacao): string {
  // A data inicial da janela pode mudar com o movimento: não torna nova a mesma obra já avisada.
  return aviso.tipo === 'obra-repetida' ? aviso.id.replace(/:\d{4}-\d{2}-\d{2}$/, '') : aviso.id;
}

/** Só o que esta ação passou a disparar, não um lembrete de concentrações já existentes. */
export function novosAvisosDaAcao(input: {
  antes: readonly AvisoOrientacao[];
  depois: readonly AvisoOrientacao[];
  date: string | null;
  postItIds: readonly string[];
  contentIds: readonly string[];
}): AvisoOrientacao[] {
  if (!input.date) return [];
  const existentes = new Set(input.antes.filter(ehConcentracao).map(chaveDoAviso));
  const postIts = new Set(input.postItIds);
  const contents = new Set(input.contentIds);
  return input.depois.filter(aviso => ehConcentracao(aviso)
    && !existentes.has(chaveDoAviso(aviso))
    && (aviso.postItIds.some(id => postIts.has(id)) || aviso.contentIds.some(id => contents.has(id))))
    .map(aviso => ({...aviso, severidade: 'info'}));
}

export function concentracaoAoColocar(input: ContextoDaConcentracao & {
  antes: PlanoDaConcentracao;
  depois: PlanoDaConcentracao;
  date: string | null;
  postItIds: readonly string[];
  contentIds: readonly string[];
}): AvisoOrientacao[] {
  if (!input.date) return [];
  return novosAvisosDaAcao({
    ...input,
    antes: avisosDeConcentracaoNoPlano({...input, ...input.antes}),
    depois: avisosDeConcentracaoNoPlano({...input, ...input.depois}),
  });
}

/** Uma ação, um momento de UI, sempre depois do commit. Falha de gravação mantém o feedback de erro existente. */
export async function colocarEAvisarConcentracao(
  input: Parameters<typeof concentracaoAoColocar>[0],
  commit: () => void | Promise<unknown>,
  avisar: (avisos: readonly AvisoOrientacao[]) => void,
): Promise<void> {
  try {
    await commit();
  } catch {
    return;
  }
  const avisos = concentracaoAoColocar(input);
  if (avisos.length > 0) avisar(avisos);
}
