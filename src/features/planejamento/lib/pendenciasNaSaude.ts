import {format, parseISO, subDays} from 'date-fns';
import {buildGradeEntries} from '../../editorial/lib/gradeEntries.ts';
import {saudeDoMes} from './monthHealth.ts';

type DadosDaSaude = Omit<Parameters<typeof saudeDoMes>[0], 'periodo'>;

/** A dívida de publicação atravessa períodos; frequência encerrada continua sendo histórico. */
export function pendenciasNaSaude(input: DadosDaSaude, hoje = format(new Date(), 'yyyy-MM-dd')) {
  const oficiais = buildGradeEntries({contents: input.contents, series: input.series, settings: {redeReferenciaId: input.settings.preferencias?.redeReferenciaId ?? input.settings.redeReferenciaId}, platforms: input.platforms});
  const datas = [...oficiais.map(i => i.data), ...input.postIts.map(p => p.date)]
    .filter((d): d is string => Boolean(d && d < hoje)).sort();
  if (!datas.length) return [];
  return saudeDoMes({...input, periodo: {inicio: datas[0], fim: format(subDays(parseISO(hoje), 1), 'yyyy-MM-dd')}})
    .itens.filter(i => !i.realizada && i.etapa !== 'postado');
}
