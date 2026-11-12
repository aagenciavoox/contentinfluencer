import { format, parseISO } from 'date-fns';
import type { Content, Platform, Serie } from '../../../lib/database.ts';
import { rotuloConta } from '../../contas/lib/contas.ts';
import { tipoDaSerie } from '../../settings/lib/serieAgrupamento.ts';
import { acompanhamentosPorEscopo } from '../../editorial/lib/acompanhamento.ts';
import { TEXTO_SEM_ANCORA } from '../../editorial/lib/apuracaoSerie.ts';
import { continuidadePorEscopo, type ContinuidadeDoEscopo } from '../../editorial/lib/continuidadeEscopo.ts';
import type { OndaDaExclusao } from '../../editorial/lib/metaPropria.ts';
import type { PausaEditorial } from '../../editorial/lib/pausas.ts';
import { publicacoesDaAgenda, rotuloDoFormato } from '../../editorial/lib/publicacoes.ts';
import { reservaPendente } from '../../editorial/lib/reservaPendente.ts';
import { avisoLigado, type AvisosLigados } from '../../editorial/lib/avisosEditoriais.ts';
import type { PlanejamentoPostIt } from './postIt.ts';

/** Uma linha da Saúde para um acompanhamento por conta ou formato. */
export type LinhaDoEscopoNaSaude = {
  id: string;
  serieId: string;
  titulo: string;
  texto: string;
  atencao: boolean;
  /** Para os filtros do calendário: conta e formato do acompanhamento (null = todas). */
  platformId: string | null;
  formato: string | null;
  /** Acompanhamento ligado sem frequência definida: não conta como em dia nem como abaixo. */
  semFrequencia?: boolean;
  /** Série ou quadro dono do acompanhamento, para o resumo da Saúde. */
  tipo?: 'serie' | 'quadro';
};

function dia(iso: string): string {
  return format(parseISO(iso), 'dd/MM');
}

function rotuloDoEscopo(item: Pick<ContinuidadeDoEscopo, 'escopo' | 'platformId' | 'formato'>, platforms: readonly Platform[]): string {
  const conta = platforms.find(platform => platform.id === item.platformId);
  const nomeConta = conta ? rotuloConta(conta) : null;
  if (item.escopo === 'conta') return nomeConta ?? 'conta removida';
  const formato = item.formato ? rotuloDoFormato(item.formato, conta?.rede ?? null) : 'formato';
  return nomeConta ? `${formato} em ${nomeConta}` : `${formato} em todas as contas`;
}

function textoDoEscopo(resultado: ContinuidadeDoEscopo, hoje: string): { texto: string; atencao: boolean } | null {
  if (resultado.estado === 'inativo' || resultado.estado === 'encerrado') return null;
  if (resultado.estado === 'nao-iniciado') return { texto: 'Acompanhamento ainda não começou', atencao: false };
  if (resultado.estado === 'pendente') {
    const tipo = resultado.situacao.tipo;
    const texto = tipo === 'sem-ancora' ? TEXTO_SEM_ANCORA
      : tipo === 'incompleta' ? 'Frequência incompleta: escolha a unidade'
        : tipo === 'sob-demanda' ? 'Sob demanda: não avaliada'
          : 'Sem frequência definida';
    // Configuração em aberto nunca conta como ritmo em aberto.
    return { texto, atencao: false };
  }
  const encerradas = resultado.janelas.filter(janela => janela.fim < hoje);
  const atuais = resultado.janelas.filter(janela => janela.fim >= hoje);
  if (encerradas.length > 0 && atuais.length === 0) {
    return {texto: 'Histórico: ' + encerradas.map(j => dia(j.inicio) + '–' + dia(j.fim) + ': ' + (j.episodios + j.reservas) + ' de ' + j.meta).join(' · '), atencao: false};
  }
  resultado = {...resultado, janelas: atuais,
    faltas: resultado.faltas.filter(j => j.fim >= hoje), reservadas: resultado.reservadas.filter(j => j.fim >= hoje),
    semEpisodios: atuais.some(j => j.cobrada) && atuais.filter(j => j.cobrada).every(j => j.estado === 'vazia'),
    concentrada: atuais.some(j => j.cobrada && j.episodios + j.reservas > j.meta) && atuais.some(j => j.cobrada && j.estado === 'vazia'),
    distancias: resultado.distancias.filter(d => d.fim >= hoje), diasSeguidos: resultado.diasSeguidos.filter(d => d.seguinte >= hoje)};
  const cobradas = resultado.janelas.filter(janela => janela.cobrada).length;
  const partes: string[] = [];
  if (resultado.semEpisodios) partes.push('Sem episódios no período');
  else if (resultado.faltas.length > 0) {
    partes.push(`${resultado.faltas.length} de ${cobradas} abaixo: ${resultado.faltas.slice(0, 3).map(janela => `${dia(janela.inicio)}–${dia(janela.fim)}`).join(', ')}`);
  }
  if (resultado.reservadas.length > 0) partes.push(`${resultado.reservadas.length} só com post-it`);
  if (resultado.concentrada) partes.push('episódios concentrados');
  for (const distancia of resultado.distancias.slice(0, 2)) {
    partes.push(`${distancia.dias} dias sem episódio (${dia(distancia.inicio)}–${dia(distancia.fim)})${distancia.futuro ? ', falta prever' : ''}`);
  }
  if (resultado.diasSeguidos.length > 0) partes.push(`episódios em dias seguidos: ${resultado.diasSeguidos.slice(0, 2).map(item => dia(item.dia)).join(', ')}`);
  if (partes.length === 0) return { texto: 'Em dia', atencao: false };
  return { texto: partes.join(' · '), atencao: true };
}

/** Continuidade dos acompanhamentos por conta ou formato no período da Saúde. Só lê. */
export function linhasDaContinuidadePorEscopo(input: {
  series: readonly Serie[];
  contents: readonly Content[];
  postIts: readonly PlanejamentoPostIt[];
  platforms: readonly Platform[];
  periodo: { inicio: string; fim: string };
  pausas: readonly PausaEditorial[];
  temporadas?: readonly OndaDaExclusao[];
  hoje?: string;
  /** Editorial › Avisos: "dias sem episódio" e "dias seguidos" desligados não entram no texto. */
  avisosLigados?: AvisosLigados | null;
}): LinhaDoEscopoNaSaude[] {
  const acompanhamentos = input.series
    .filter(serie => serie.ativa !== false)
    .flatMap(acompanhamentosPorEscopo)
    .filter(item => item.ativo);
  if (acompanhamentos.length === 0) return [];
  const hoje = input.hoje ?? format(new Date(), 'yyyy-MM-dd');
  const resultados = continuidadePorEscopo({
    acompanhamentos,
    series: input.series,
    metas: input.series.flatMap(serie => serie.metasPorEscopo ?? []),
    publicacoes: publicacoesDaAgenda({ contents: input.contents, contas: input.platforms, series: input.series }),
    // Reserva pendente (sem roteiro, dia passado) não segura mais a janela.
    reservas: input.postIts.filter(postIt => !reservaPendente(postIt, hoje)).map(postIt => ({
      id: postIt.id,
      data: postIt.date,
      serieId: postIt.serieId ?? null,
      contaIds: postIt.contaIds ?? [],
    })),
    periodo: input.periodo,
    pausas: input.pausas,
    temporadas: input.temporadas ?? [],
    hoje,
  });
  const nomes = new Map(input.series.map(serie => [serie.id, serie.name]));
  const semDistancia = !avisoLigado(input.avisosLigados, 'distancia');
  const semSeguidos = !avisoLigado(input.avisosLigados, 'dias-seguidos');
  return resultados.flatMap(bruto => {
    const resultado = semDistancia || semSeguidos
      ? { ...bruto, distancias: semDistancia ? [] : bruto.distancias, diasSeguidos: semSeguidos ? [] : bruto.diasSeguidos }
      : bruto;
    const leitura = textoDoEscopo(resultado, input.hoje ?? format(new Date(), 'yyyy-MM-dd'));
    if (!leitura) return [];
    return [{
      id: resultado.acompanhamentoId,
      serieId: resultado.serieId,
      platformId: resultado.platformId ?? null,
      formato: resultado.formato ?? null,
      titulo: `${nomes.get(resultado.serieId) ?? 'Série'} · ${rotuloDoEscopo(resultado, input.platforms)}`,
      ...leitura,
      semFrequencia: resultado.estado === 'pendente' && resultado.situacao.tipo === 'sem-frequencia',
      tipo: tipoDaSerie(resultado.serieId, input.series) === 'quadro' ? 'quadro' as const : 'serie' as const,
    }];
  }).sort((a, b) => Number(b.atencao) - Number(a.atencao) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
}
