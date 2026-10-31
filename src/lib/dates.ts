/** Formatação visível. Datas sem hora ficam no meio do dia local, sem pular de fuso. */

export type Instante = Date | string;

function paraData(value: Instante): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [ano, mes, dia] = value.split('-').map(Number);
    return new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  }
  return new Date(value);
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const SEMANAS_CURTAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function diaCurto(data: Date, comAno: boolean) {
  const base = `${data.getDate()} de ${MESES_CURTOS[data.getMonth()]}`;
  return comAno ? `${base} de ${data.getFullYear()}` : base;
}

export function dia(value: Instante, agora: Date = new Date()): string {
  const data = paraData(value);
  return diaCurto(data, data.getFullYear() !== agora.getFullYear());
}

/** "15/10/2026": para telas que pedem a data completa em números. */
export function diaNumerico(value: Instante): string {
  const data = paraData(value);
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}

export function diaComSemana(value: Instante, agora: Date = new Date()): string {
  const data = paraData(value);
  return `${SEMANAS_CURTAS[data.getDay()]}, ${dia(data, agora)}`;
}

export function tituloDoDia(value: Instante): string {
  const data = paraData(value);
  return `${SEMANAS[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()]}`;
}

export function mes(value: Instante): string {
  const data = paraData(value);
  const nome = MESES[data.getMonth()];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${data.getFullYear()}`;
}

export function intervalo(inicio: Instante, fim: Instante, agora: Date = new Date()): string {
  const a = paraData(inicio);
  const b = paraData(fim);
  const mesmoAno = a.getFullYear() === b.getFullYear();
  const noAnoAtual = mesmoAno && a.getFullYear() === agora.getFullYear();
  if (noAnoAtual) return `${diaCurto(a, false)} – ${diaCurto(b, false)}`;
  if (mesmoAno) return `${diaCurto(a, false)} – ${diaCurto(b, true)}`;
  return `${diaCurto(a, true)} – ${diaCurto(b, true)}`;
}

export function relativo(value: Instante, agora: Date = new Date()): string {
  const data = paraData(value);
  const passado = agora.getTime() - data.getTime();
  if (passado >= 0 && passado < 60_000) return 'agora';
  if (passado >= 0 && passado < 3_600_000) {
    const minutos = Math.max(1, Math.floor(passado / 60_000));
    return `há ${minutos} min`;
  }
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioAlvo = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const dias = Math.round((inicioHoje.getTime() - inicioAlvo.getTime()) / 86_400_000);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias > 1 && dias < 7) return `há ${dias} dias`;
  return dia(data, agora);
}

export function hora(value: Instante): string {
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) return value;
  const data = paraData(value);
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}
