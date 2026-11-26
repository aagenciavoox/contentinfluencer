import { WEEKDAYS_ORDERED, WEEKDAY_SHORT, type Weekday } from './postingTimes';

export type GrupoDeHorarios = {
  dias: Weekday[];
  times: string[];
};

/** Junta os dias que têm a mesma lista de horários, na ordem da semana. */
export function agruparDiasComMesmosHorarios(
  timesDoDia: (dia: Weekday) => string[],
  dias: readonly Weekday[] = WEEKDAYS_ORDERED,
): GrupoDeHorarios[] {
  const porChave = new Map<string, GrupoDeHorarios>();
  const ordem: string[] = [];
  for (const dia of dias) {
    const times = [...timesDoDia(dia)];
    const chave = times.join('|');
    const grupo = porChave.get(chave);
    if (grupo) {
      grupo.dias.push(dia);
    } else {
      porChave.set(chave, { dias: [dia], times });
      ordem.push(chave);
    }
  }
  return ordem.map(chave => porChave.get(chave)!);
}

/** "Todos os dias", "Seg a Sex", "Sab e Dom", "Ter" ou "Seg, Qua e Sex". */
export function rotuloDosDias(dias: readonly Weekday[]): string {
  if (dias.length === 0) return '';
  if (dias.length === WEEKDAYS_ORDERED.length) return 'Todos os dias';
  const nomes = dias.map(dia => WEEKDAY_SHORT[dia]);
  if (nomes.length === 1) return nomes[0];
  if (eFaixaConsecutiva(dias)) {
    return nomes.length === 2 ? `${nomes[0]} e ${nomes[1]}` : `${nomes[0]} a ${nomes[nomes.length - 1]}`;
  }
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

function eFaixaConsecutiva(dias: readonly Weekday[]): boolean {
  if (dias.length <= 1) return true;
  const indices = dias.map(dia => WEEKDAYS_ORDERED.indexOf(dia));
  return indices.every((indice, i) => i === 0 || indice === indices[i - 1] + 1);
}
