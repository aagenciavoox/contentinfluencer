/**
 * Dia e hora no fuso do perfil. Comparações de "hoje", "já passou" e "é futuro"
 * usam este fuso, não o do navegador.
 */

export const FUSO_PADRAO = 'America/Sao_Paulo';

/** Preferência em user_preferences onde o fuso do perfil fica guardado. */
export const FUSO_PREFERENCE_KEY = 'fuso_horario';

/** Fuso válido para o Intl; qualquer outra coisa volta ao padrão. */
export function fusoValido(fuso: unknown): string {
  if (typeof fuso !== 'string' || !fuso.trim()) return FUSO_PADRAO;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: fuso.trim() });
    return fuso.trim();
  } catch {
    return FUSO_PADRAO;
  }
}

export type DiaEHora = {
  /** yyyy-MM-dd */
  data: string;
  /** HH:mm, 24 h */
  hora: string;
};

/** Um instante (Date ou texto ISO) visto no fuso: dia e hora locais. Null se não for data. */
export function noFuso(instante: Date | string, fuso: string = FUSO_PADRAO): DiaEHora | null {
  const date = typeof instante === 'string' ? new Date(instante) : instante;
  if (Number.isNaN(date.getTime())) return null;
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoValido(fuso),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(item => item.type === tipo)?.value ?? '00';
  return {
    data: `${parte('year')}-${parte('month')}-${parte('day')}`,
    hora: `${parte('hour')}:${parte('minute')}`,
  };
}

/** Hoje no fuso, yyyy-MM-dd. */
export function hojeNoFuso(agora: Date = new Date(), fuso: string = FUSO_PADRAO): string {
  return noFuso(agora, fuso)?.data ?? agora.toISOString().slice(0, 10);
}
