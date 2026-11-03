import assert from 'node:assert/strict';
import {diaDaRede, dividirPorRede, weekdayDaData} from './divisoriaRede.ts';
import type {RedeSocial} from '../../../lib/database.ts';

const CONTAS = [
  {id: 'yt', nome: 'Canal', rede: 'youtube' as const},
  {id: 'ig', nome: 'Insta', rede: 'instagram' as const},
  {id: 'yt2', nome: 'YouTube'},
];

// Conta do YouTube com horário próprio na quarta marca a quarta.
assert.equal(diaDaRede({weekday: 3, rede: 'youtube', contas: CONTAS, horarios: [{platformId: 'yt', weekday: 3}]}), true);
// Nome "YouTube" sem rede gravada também conta.
assert.equal(diaDaRede({weekday: 5, rede: 'youtube', contas: CONTAS, horarios: [{platformId: 'yt2', weekday: 5}]}), true);
// Dia sem horário: sem divisória.
assert.equal(diaDaRede({weekday: 4, rede: 'youtube', contas: CONTAS, horarios: [{platformId: 'yt', weekday: 3}]}), false);
// Horário geral (null) não marca dia; horário de outra rede também não.
assert.equal(diaDaRede({weekday: 3, rede: 'youtube', contas: CONTAS, horarios: [{platformId: null, weekday: 3}, {platformId: 'ig', weekday: 3}]}), false);
// Conta inativa não marca.
assert.equal(diaDaRede({weekday: 3, rede: 'youtube', contas: [{id: 'yt', nome: 'Canal', rede: 'youtube', ativo: false}], horarios: [{platformId: 'yt', weekday: 3}]}), false);

assert.equal(weekdayDaData('2026-11-04'), 3);

type Card = {id: string; redes: RedeSocial[]};
const cards: Card[] = [
  {id: 'so-yt', redes: ['youtube']},
  {id: 'misto', redes: ['youtube', 'instagram']},
  {id: 'ig', redes: ['instagram']},
  {id: 'sem-rede', redes: []},
];
const {acima, abaixo} = dividirPorRede(cards, card => card.redes, 'youtube');
assert.deepEqual(abaixo.map(c => c.id), ['so-yt']);
assert.deepEqual(acima.map(c => c.id), ['misto', 'ig', 'sem-rede']);