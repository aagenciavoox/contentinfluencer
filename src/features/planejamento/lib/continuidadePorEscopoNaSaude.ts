import { format, parseISO } from 'date-fns';
import type { Content, Platform, Serie } from '../../../lib/database.ts';
import { rotuloConta } from '../../contas/lib/contas.ts';
import { acompanhamentosPorEscopo } from '../../editorial/lib/acompanhamento.ts';
import { TEXTO_SEM_ANCORA } from '../../editorial/lib/apuracaoSerie.ts';
import { continuidadePorEscopo, type ContinuidadeDoEscopo } from '../../editorial/lib/continuidadeEscopo.ts';
import type { PausaEditorial } from '../../editorial/lib/pausas.ts';
import { publicacoesDaAgenda, rotuloDoFormato } from '../../editorial/lib/publicacoes.ts';
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

function textoDoEscopo(resultado: ContinuidadeDoEscopo): { texto: string; atencao: boolean } | null {
  if (resultado.estado === 'inativo' || resultado.estado === 'encerrado') return null;
  if (resultado.estado === 'nao-iniciado') return { texto: 'Acompanhamento ainda não começou', atencao: false };
  if (resultado.estado === 'pendente') {
    const tipo = resultado.situacao.tipo;
    const texto = tipo === 'sem-ancora' ? TEXTO_SEM_ANCORA
      : tipo === 'incompleta' ? 'Frequência incompleta: escolha a unidade'
        : tipo === 'sob-demanda' ? 'Sob demanda: não avaliada'
          : 'Sem frequência definida';
    // Configuração pendente nunca conta como abaixo da meta.
    return { texto, atencao: false };
  }
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
  hoje?: string;
}): LinhaDoEscopoNaSaude[] {
  const acompanhamentos = input.series
    .filter(serie => serie.ativa !== false)
    .flatMap(acompanhamentosPorEscopo)
    .filter(item => item.ativo);
  if (acompanhamentos.length === 0) return [];
  const resultados = continuidadePorEscopo({
    acompanhamentos,
    series: input.series,
    metas: input.series.flatMap(serie => serie.metasPorEscopo ?? []),
    publicacoes: publicacoesDaAgenda({ contents: input.contents, contas: input.platforms, series: input.series }),
    reservas: input.postIts.map(postIt => ({
      id: postIt.id,
      data: postIt.date,
      serieId: postIt.serieId ?? null,
      contaIds: postIt.contaIds ?? [],
    })),
    periodo: input.periodo,
    pausas: input.pausas,
    hoje: input.hoje ?? format(new Date(), 'yyyy-MM-dd'),
  });
  const nomes = new Map(input.series.map(serie => [serie.id, serie.name]));
  return resultados.flatMap(resultado => {
    const leitura = textoDoEscopo(resultado);
    if (!leitura) return [];
    return [{
      id: resultado.acompanhamentoId,
      serieId: resultado.serieId,
      platformId: resultado.platformId ?? null,
      formato: resultado.formato ?? null,
      titulo: `${nomes.get(resultado.serieId) ?? 'Série'} · ${rotuloDoEscopo(resultado, input.platforms)}`,
      ...leitura,
    }];
  }).sort((a, b) => Number(b.atencao) - Number(a.atencao) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
}
