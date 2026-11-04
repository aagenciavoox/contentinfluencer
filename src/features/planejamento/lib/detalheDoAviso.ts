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
};

const REGRA: Record<TipoAvisoOrientacao, { regra: string; acao: string }> = {
  'obra-repetida': { regra: 'mesma obra em pouco tempo (Variedade e concentração)', acao: 'espaçar as pautas ou marcar a repetição como intencional no Editorial' },
  'tema-concentrado': { regra: 'assunto acima da fração máxima do intervalo (Variedade e concentração)', acao: 'trocar o assunto de alguma pauta ou marcar como intencional no Editorial' },
  'serie-acima': { regra: 'mais episódios que a frequência da série', acao: 'mover um episódio para outro intervalo' },
  'serie-abaixo': { regra: 'menos episódios que a frequência da série', acao: 'planejar um episódio ou uma reserva no intervalo' },
  'serie-reservada': { regra: 'frequência só cumprida com post-it', acao: 'desenvolver a reserva em conteúdo' },
  'vespera-sem-pronto': { regra: 'publicação prevista sem conteúdo pronto na véspera', acao: 'finalizar o conteúdo ou mudar a data' },
  'gravacoes-no-dia': { regra: 'limite de gravações por dia e pausas de gravação ou produção', acao: 'mover gravações para outro dia' },
};

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

/** Dia para levar o calendário até o aviso: o intervalo, senão o primeiro post-it ou conteúdo envolvido. */
export function diaDoAviso(
  aviso: AvisoOrientacao,
  postIts: readonly PlanejamentoPostIt[],
  contents: readonly Content[],
): string | null {
  if (aviso.intervalo) return aviso.intervalo.inicio;
  const datas = postIts.filter(postIt => aviso.postItIds.includes(postIt.id) && postIt.date).map(postIt => postIt.date as string);
  for (const content of contents) {
    if (!aviso.contentIds.includes(content.id)) continue;
    const data = content.publishDate?.slice(0, 10) ?? content.recordingDate?.slice(0, 10);
    if (data) datas.push(data);
  }
  return datas.sort()[0] ?? null;
}
