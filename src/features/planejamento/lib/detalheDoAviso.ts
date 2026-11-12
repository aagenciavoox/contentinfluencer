import { format, parseISO } from 'date-fns';
import type { Content } from '../../../lib/database.ts';
import type { AvisoOrientacao, TipoAvisoOrientacao } from './orientacaoEditorial.ts';
import type { PlanejamentoPostIt } from './postIt.ts';

/** Bloco da análise da Saúde em que o aviso aparece. */
export type BlocoDoAviso = 'continuidade' | 'concentracao' | 'producao';

const BLOCO: Record<TipoAvisoOrientacao, BlocoDoAviso> = {
  'obra-repetida': 'concentracao',
  'tema-concentrado': 'concentracao',
  'serie-acima': 'continuidade',
  'serie-abaixo': 'continuidade',
  'serie-reservada': 'continuidade',
  'vespera-sem-pronto': 'producao',
  'gravacoes-no-dia': 'producao',
  'capacidade-semana': 'producao',
  'ausencia-12-dias': 'continuidade',
  'ausencia-mes': 'continuidade',
  'videos-dia-abaixo': 'producao',
  'videos-dia-acima': 'producao',
  'saturacao-quadro': 'concentracao',
};

const REGRA: Record<TipoAvisoOrientacao, { regra: string; acao: string }> = {
  'obra-repetida': { regra: 'mesma obra em pouco tempo (Variedade e concentração)', acao: 'espaçar as pautas ou marcar a repetição como intencional no Editorial' },
  'tema-concentrado': { regra: 'assunto acima da fração máxima do intervalo (Variedade e concentração)', acao: 'trocar o assunto de alguma pauta ou marcar como intencional no Editorial' },
  'serie-acima': { regra: 'mais episódios que a frequência da série', acao: 'mover um episódio para outro intervalo' },
  'serie-abaixo': { regra: 'menos episódios que a frequência da série', acao: 'planejar um episódio ou uma reserva no intervalo' },
  'serie-reservada': { regra: 'frequência só cumprida com post-it', acao: 'desenvolver a reserva em conteúdo' },
  'vespera-sem-pronto': { regra: 'publicação prevista sem conteúdo pronto na véspera', acao: 'finalizar o conteúdo ou mudar a data' },
  'gravacoes-no-dia': { regra: 'limite de gravações por dia e pausas de gravação ou produção', acao: 'mover gravações para outro dia' },
  'capacidade-semana': { regra: 'ritmo das séries e waves acompanhadas na semana × dias de gravação e limite por dia', acao: 'rever o ritmo no Editorial ou abrir mais um dia de gravação' },
  'ausencia-12-dias': { regra: 'série, quadro ou wave acompanhada sem episódio nem post-it nos próximos 12 dias', acao: 'planejar um episódio ou uma reserva na janela' },
  'ausencia-mes': { regra: 'série, quadro ou wave acompanhada sem episódio nem post-it no mês', acao: 'planejar um episódio ou uma reserva no mês, ou rever a frequência no Editorial' },
  'videos-dia-abaixo': { regra: 'vídeos por dia de gravação abaixo do mínimo (ou da meta, sem mínimo) da Rotina de criação', acao: 'juntar gravações no mesmo dia ou rever a faixa no Editorial' },
  'videos-dia-acima': { regra: 'vídeos por dia de gravação acima do máximo (ou da meta, sem máximo) da Rotina de criação', acao: 'mover gravações para outro dia ou rever a faixa no Editorial' },
  'saturacao-quadro': { regra: 'mesmo quadro mais vezes na semana do que o limite de saturação (Rotina de criação › Avisos)', acao: 'trocar uma das pautas por outro quadro ou série, ou mover para outra semana' },
};

const ABRE_ANALISE: ReadonlySet<TipoAvisoOrientacao> = new Set(['capacidade-semana', 'ausencia-12-dias', 'ausencia-mes']);

/** Sem pauta para destacar, Localizar abre "Ver análise". */
export function abreAnaliseAoLocalizar(aviso: Pick<AvisoOrientacao, 'tipo' | 'postItIds' | 'contentIds'>): boolean {
  return ABRE_ANALISE.has(aviso.tipo) && aviso.postItIds.length === 0 && aviso.contentIds.length === 0;
}

export function blocoDoAviso(aviso: Pick<AvisoOrientacao, 'tipo'>): BlocoDoAviso {
  return BLOCO[aviso.tipo];
}

function dia(iso: string): string {
  return format(parseISO(iso), 'dd/MM');
}

/** A entidade e o fato estão no texto do aviso; aqui vêm o intervalo, a regra e a ação. */
export function detalheDoAviso(aviso: AvisoOrientacao): { intervalo: string | null; regra: string; acao: string } {
  const intervalo = aviso.intervalo
    ? aviso.intervalo.inicio === aviso.intervalo.fim ? dia(aviso.intervalo.inicio) : `${dia(aviso.intervalo.inicio)} a ${dia(aviso.intervalo.fim)}`
    : null;
  return { intervalo, ...REGRA[aviso.tipo] };
}

/** Dia para levar o calendário até a pauta. Sem pauta no quadro, cai no início do intervalo. */
export function diaDoAviso(
  aviso: AvisoOrientacao,
  postIts: readonly PlanejamentoPostIt[],
  contents: readonly Content[],
): string | null {
  const datas = postIts.filter(postIt => aviso.postItIds.includes(postIt.id) && postIt.date).map(postIt => postIt.date as string);
  for (const content of contents) {
    if (!aviso.contentIds.includes(content.id)) continue;
    const data = content.publishDate?.slice(0, 10) ?? content.recordingDate?.slice(0, 10);
    if (data) datas.push(data);
  }
  return datas.sort()[0] ?? aviso.intervalo?.inicio ?? null;
}
