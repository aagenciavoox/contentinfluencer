import {addDays, format, getISODay, parseISO} from 'date-fns';
import type {Content, Platform} from '../../../lib/database.ts';
import type {PausaEditorial} from '../../editorial/lib/pausas.ts';
import {
  nomeDaEtapaNaTela,
  pendenciasDoRoteiro,
  PENDENCIA_LABEL,
  rotuloDasPendencias,
} from '../../contents/lib/esteiraDisplay.ts';
import {buildPublishCalendarItems} from '../../editorial-calendar/lib/publishCalendarItems.ts';
import {diasDePausa} from '../../editorial/lib/pausas.ts';
import type {GradeSerie} from '../../editorial/lib/gradeEntries.ts';

export type ItemPendenciaDoDia = {
  contentId: string;
  titulo: string;
  date: string;
  etapa: string;
  pendencias: string[];
  texto: string;
};

function diaIso(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return format(value, 'yyyy-MM-dd');
}

/** Próximo dia de gravação depois de hoje (não inclui hoje). */
function proximaGravacao(
  hoje: string,
  diasGravacao: readonly number[],
): string | null {
  if (diasGravacao.length === 0) return null;
  const base = parseISO(hoje);
  for (let offset = 1; offset <= 14; offset += 1) {
    const candidato = addDays(base, offset);
    if (diasGravacao.includes(getISODay(candidato))) return diaIso(candidato);
  }
  return null;
}

function noIntervalo(data: string, inicio: string, fim: string): boolean {
  return data >= inicio && data <= fim;
}

/**
 * Itens do Calendário que ainda têm pendência e disparam aviso hoje:
 * dia de gravar (até a véspera da próxima) ou antecedência da postagem.
 */
export function itensPendenciaDoDia(input: {
  contents: readonly Content[];
  platforms: readonly Platform[];
  series: readonly GradeSerie[];
  redeReferenciaId: string | null;
  diasGravacao?: readonly number[];
  antecedenciaPostagemDias?: number | null;
  pausas?: readonly PausaEditorial[];
  hoje?: Date | string;
}): ItemPendenciaDoDia[] {
  const hoje = diaIso(input.hoje ?? new Date());
  const diasGravacao = input.diasGravacao ?? [];
  const antecedencia = input.antecedenciaPostagemDias ?? null;
  if (diasGravacao.length === 0 && (antecedencia == null || antecedencia < 0)) return [];

  const hojeDate = parseISO(hoje);
  const ehDiaGravar = diasGravacao.includes(getISODay(hojeDate));
  const janelaPausa = {
    inicio: hoje,
    fim: addDays(hojeDate, 14).toISOString().slice(0, 10),
  };
  const pausados = new Set([
    ...diasDePausa(input.pausas ?? [], {tipo: 'gravacao'}, janelaPausa),
    ...diasDePausa(input.pausas ?? [], {tipo: 'producao'}, janelaPausa),
  ]);
  const loteGravarAtivo = ehDiaGravar && !pausados.has(hoje);
  const ate = loteGravarAtivo ? proximaGravacao(hoje, diasGravacao) : null;
  const fimLote = ate ? diaIso(addDays(parseISO(ate), -1)) : hoje;

  const itens = buildPublishCalendarItems({
    contents: input.contents as Content[],
    platforms: input.platforms,
    series: input.series,
    redeReferenciaId: input.redeReferenciaId,
  });

  const vistos = new Set<string>();
  const resultado: ItemPendenciaDoDia[] = [];

  for (const item of itens) {
    if (!item.date || item.posted || item.cancelled) continue;
    const content = input.contents.find(candidato => candidato.id === item.contentId);
    if (!content || content.deletedAt || content.archivedAt) continue;

    const pendencias = pendenciasDoRoteiro(content, input.platforms);
    if (pendencias.length === 0) continue;

    const data = item.date.slice(0, 10);
    let entra = false;
    if (loteGravarAtivo && (data < hoje || noIntervalo(data, hoje, fimLote))) entra = true;
    if (antecedencia != null && antecedencia >= 0) {
      const inicioJanela = diaIso(addDays(parseISO(data), -antecedencia));
      if (hoje >= inicioJanela && hoje <= data) entra = true;
    }
    if (!entra) continue;

    const chave = `${content.id}:${data}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const labels = pendencias.map(itemPendencia => PENDENCIA_LABEL[itemPendencia]);
    const etapa = nomeDaEtapaNaTela(content, input.platforms);
    resultado.push({
      contentId: content.id,
      titulo: content.title?.trim() || 'Sem título',
      date: data,
      etapa,
      pendencias: labels,
      texto: `${content.title?.trim() || 'Sem título'} · ${etapa}: ${rotuloDasPendencias(pendencias)}.`,
    });
  }

  return resultado.sort((a, b) => a.date.localeCompare(b.date) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
}
