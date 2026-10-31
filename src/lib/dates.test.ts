import assert from 'node:assert/strict';
import { dia, diaComSemana, hora, intervalo, mes, relativo, tituloDoDia } from './dates.ts';

const agora = new Date(2026, 9, 29, 15, 0, 0, 0);

assert.equal(dia('2026-10-16', agora), '16 de out');
assert.equal(dia('2025-12-31', agora), '31 de dez de 2025');
assert.equal(diaComSemana('2026-10-29', agora), 'qui, 29 de out');
assert.equal(tituloDoDia('2026-10-29'), 'Quinta, 29 de outubro');
assert.equal(mes('2026-10-29'), 'Outubro de 2026');
assert.equal(intervalo('2026-10-16', '2026-11-30', agora), '16 de out – 30 de nov');
assert.equal(intervalo('2025-12-16', '2026-01-05', agora), '16 de dez de 2025 – 5 de jan de 2026');
assert.equal(intervalo('2025-03-02', '2025-03-20', agora), '2 de mar – 20 de mar de 2025');

assert.equal(relativo(new Date(2026, 9, 29, 14, 59, 40), agora), 'agora');
assert.equal(relativo(new Date(2026, 9, 29, 14, 55, 0), agora), 'há 5 min');
assert.equal(relativo(new Date(2026, 9, 29, 8, 0, 0), agora), 'hoje');
assert.equal(relativo('2026-10-28', agora), 'ontem');
assert.equal(relativo('2026-10-26', agora), 'há 3 dias');
assert.equal(relativo('2026-10-22', agora), '22 de out');
assert.equal(hora('19:00'), '19:00');
assert.equal(hora(new Date(2026, 9, 29, 19, 0, 0)), '19:00');

console.log('dates.test.ts passed');
