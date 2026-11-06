import {differenceInCalendarDays, format, isValid, parseISO} from 'date-fns';
import type {Cenario, Content, EnergiaNivel, Look, Platform, RecordingBlock, Serie} from '../../../lib/database.ts';
import type {EditorialSettings} from '../../editorial/lib/editorialSettings.ts';
import {energiaDaSerie} from '../../editorial/lib/herancaSerie.ts';
import {idsComAncestrais} from '../../editorial/lib/acompanhamento.ts';
import {exclusaoDeMetaPropria} from '../../editorial/lib/metaPropria.ts';
import {semanaDe} from '../../editorial/lib/periodoEditorial.ts';
import {entriesDaConcentracao} from '../../planejamento/lib/concentracaoAoColocar.ts';
import {idsDeObras} from '../../planejamento/lib/assuntosObras.ts';
import {continuidadeDasSeries, janelaDaContinuidade, type TemporadaDaSaude} from '../../planejamento/lib/saudeIndicadores.ts';
import {saudeDoMes} from '../../planejamento/lib/monthHealth.ts';
import type {PlanejamentoPostIt} from '../../planejamento/lib/postIt.ts';
import {entraNoBloco, montarBlocoDeGravacao} from './blocoDeGravacao.ts';

export type EscolhaDeGravacao = {energia: EnergiaNivel; lookId: string | null; cenarioId: string | null};
export type SugestaoDeGravacao = {content: Content; energia: EnergiaNivel | null; pontos: number; motivos: string[]};
export type ContextoSugestaoDeGravacao = {
  contents: readonly Content[];
  blocks: readonly RecordingBlock[];
  series: readonly Serie[];
  postIts: readonly PlanejamentoPostIt[];
  settings: EditorialSettings;
  platforms: readonly Platform[];
  temporadas?: readonly TemporadaDaSaude[];
  /** Dia local, sem passar por UTC. */
  hoje: string;
};

const PESO_ENERGIA: Record<EnergiaNivel, number> = {baixa: 1, média: 2, alta: 3};

function atualizacao(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function dia(value: string | null | undefined): string | null {
  const date = value?.slice(0, 10);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) && isValid(parseISO(date)) ? date : null;
}

/** Escolha cumulativa, separada do filtro exato que já existe na gravação. */
export function energiaCompativel(energia: EnergiaNivel | null, hoje: EnergiaNivel): boolean {
  return energia == null || PESO_ENERGIA[energia] <= PESO_ENERGIA[hoje];
}

/** Só usa as apurações da Saúde (3.5) e as entradas conciliadas da concentração (4). */
export function sugerirGravacao(input: ContextoSugestaoDeGravacao & EscolhaDeGravacao): SugestaoDeGravacao[] {
  const semana = semanaDe(input.hoje);
  const estendido = saudeDoMes({
    ...input, pilares: [], periodo: janelaDaContinuidade(semana),
  });
  const continuidade = continuidadeDasSeries({
    series: input.series, itens: estendido.itens, periodo: semana,
    pausas: input.settings.pausas, temporadas: input.temporadas, hoje: input.hoje,
  });
  const linhasEmAberto = continuidade.linhas.filter(linha => linha.abaixo.length > 0).flatMap(linha => {
    const serie = input.series.find(item => item.id === linha.serieId);
    return serie ? [{linha, excluir: exclusaoDeMetaPropria(serie, input.series, input.temporadas)}] : [];
  });
  const porId = new Map(input.contents.map(content => [content.id, content]));
  const idsNaSemana = new Set(entriesDaConcentracao({
    ...input, temas: [], obras: [], periodo: semana,
  }).filter(entry => entry.contaNaGrade && entry.data && entry.data >= semana.inicio && entry.data <= semana.fim)
    .map(entry => entry.contentId));
  const naSemana = [...idsNaSemana].flatMap(id => porId.has(id) ? [porId.get(id)!] : []);
  const resultados = input.contents.filter(content => entraNoBloco(content, input.blocks)).flatMap((content, ordem) => {
    const energia = energiaDaSerie(content, input.series);
    if (!energiaCompativel(energia, input.energia)) return [];
    let pontos = 0;
    const motivos: string[] = [];
    const somar = (valor: number, motivo: string) => {pontos += valor; motivos.push(motivo);};
    if (dia(content.recordingDate) === input.hoje) somar(100, 'gravação prevista hoje');
    const publicacao = dia(content.publishDate);
    const dias = publicacao ? differenceInCalendarDays(parseISO(publicacao), parseISO(input.hoje)) : null;
    if (dias === 1) somar(80, 'publica amanhã');
    if (dias === 2) somar(40, 'publica em 2 dias');
    if (dias === 3) somar(20, 'publica em 3 dias');
    if (input.lookId && content.lookId === input.lookId) somar(30, 'mesmo look');
    if (input.cenarioId && content.cenarioId === input.cenarioId) somar(30, 'mesmo cenário');
    const ancestrais = new Set(content.seriesId ? idsComAncestrais(content.seriesId, input.series) : []);
    const ritmoEmAberto = linhasEmAberto.some(({linha, excluir}) => linha.temporadaId
      ? content.temporadaId === linha.temporadaId
      : ancestrais.has(linha.serieId) && !excluir.serieIds.has(content.seriesId!)
        && !excluir.temporadaIds.has(content.temporadaId ?? ''));
    if (ritmoEmAberto) somar(25, 'série atrás do ritmo');
    if (energia === input.energia) somar(10, 'mesma energia');
    const obras = new Set(idsDeObras(content));
    const temas = new Set(content.temaIds ?? []);
    const repeteNaSemana = naSemana.some(outro => outro.id !== content.id
      && ((outro.temaIds ?? []).some(id => temas.has(id)) || idsDeObras(outro).some(id => obras.has(id))));
    if (repeteNaSemana) somar(-15, 'assunto ou obra já nesta semana');
    return [{content, energia, pontos, motivos, ordem}];
  });
  return resultados.sort((a, b) => Number(a.energia == null) - Number(b.energia == null)
    || b.pontos - a.pontos
    || (dia(a.content.publishDate) ?? '9999').localeCompare(dia(b.content.publishDate) ?? '9999')
    || atualizacao(b.content.updatedAt) - atualizacao(a.content.updatedAt)
    || a.ordem - b.ordem).map(({ordem: _ordem, ...sugestao}) => sugestao);
}

/** Sem escolha, pega o topo. Com escolha, só os compatíveis (sem contexto definido também cabe). */
export function primeirosParaBloco(sugestoes: readonly SugestaoDeGravacao[], escolha: EscolhaDeGravacao, limite?: number | null): Content[] {
  const n = limite != null && Number.isInteger(limite) && limite > 0 ? limite : 5;
  return sugestoes.filter(({content}) => (!escolha.lookId || !content.lookId || content.lookId === escolha.lookId)
    && (!escolha.cenarioId || !content.cenarioId || content.cenarioId === escolha.cenarioId))
    .slice(0, n).map(item => item.content);
}

export function nomeDoLook(look: Look): string {
  return look.descricao.trim() || `Look ${look.numero}`;
}

/** Não reordena blocos existentes; monta um novo com o mesmo mecanismo dos blocos manuais. */
export function montarBlocoComEnergia(input: EscolhaDeGravacao & {
  id: string; userId: string; hoje: string; contents: readonly Content[]; looks: readonly Look[]; cenarios: readonly Cenario[]; now?: string;
}) {
  const montado = montarBlocoDeGravacao({
    ...input, nome: `Gravação ${format(parseISO(input.hoje), 'dd/MM')} · energia ${input.energia}`,
  });
  const look = input.looks.find(item => item.id === input.lookId);
  montado.block.lookLabel = look ? nomeDoLook(look) : null;
  montado.block.cenarioLabel = input.cenarioId ? input.cenarios.find(cenario => cenario.id === input.cenarioId)?.nome ?? null : null;
  return montado;
}
