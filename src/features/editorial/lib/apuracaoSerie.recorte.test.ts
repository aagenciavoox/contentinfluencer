import assert from 'node:assert/strict';
import { apurarSerie, situacaoDaJanela, situacaoDoRecorte, textoDaMetaNoRecorte, type SerieDaApuracao } from './apuracaoSerie.ts';
import { definirLimiteDaRegraDeOuro } from './regraDeOuro.ts';

const serie = (unidade: string, vezes: number, aPartirDe: string): SerieDaApuracao => ({
  id: 's',
  name: 'Série',
  parentId: null,
  frequenciaRecomendada: null,
  frequenciaVezes: vezes,
  frequenciaUnidade: unidade,
  frequenciaAPartirDe: aPartirDe,
  acompanharContinuidade: true,
});

const mes = { inicio: '2026-11-02', fim: '2026-11-29' };
definirLimiteDaRegraDeOuro(2);
let semanal: ReturnType<typeof apurarSerie>;
try {
  semanal = apurarSerie({
    serie: serie('semana', 2, '2026-11-02'),
    series: [serie('semana', 2, '2026-11-02')],
    itens: [],
    periodo: mes,
  });
} finally {
  definirLimiteDaRegraDeOuro(1);
}
assert.equal(semanal!.janelas.length, 4, 'quatro semanas inteiras dentro do mês');
assert.equal(semanal!.metaDasJanelas, 8, '2 por semana no mês soma 8, sem fração');
assert.equal(textoDaMetaNoRecorte(semanal!.janelas, mes), '8 no período');

const semana = { inicio: '2026-11-02', fim: '2026-11-08' };
const mensalSerie = serie('mes', 1, '2026-11-01');
const mensal = apurarSerie({ serie: mensalSerie, series: [mensalSerie], itens: [], periodo: semana });
assert.equal(mensal.janelas.length, 1);
assert.equal(mensal.janelas[0]?.meta, 1);
assert.equal(mensal.janelas[0]?.fim, '2026-11-30');
assert.equal(textoDaMetaNoRecorte(mensal.janelas, semana), '1 até 30/11');

const hoje = '2026-11-10';
const janela = (fim: string, estado: 'vazia' | 'atendida' | 'reservada' | 'abaixo', extra: { pausada?: boolean } = {}) => ({
  inicio: '2026-11-02', fim, meta: 1, estado, ...extra,
});
assert.equal(situacaoDaJanela(janela('2026-11-08', 'vazia'), hoje), 'abaixo');
assert.equal(situacaoDaJanela(janela('2026-11-15', 'vazia'), hoje), 'no-prazo');
assert.equal(situacaoDaJanela(janela('2026-11-15', 'atendida'), hoje), 'no-ritmo');
assert.equal(situacaoDaJanela(janela('2026-11-15', 'reservada'), hoje), 'so-com-post-it');
assert.equal(situacaoDaJanela(janela('2026-11-15', 'vazia', { pausada: true }), hoje), 'pausada');
assert.equal(situacaoDoRecorte([janela('2026-11-08', 'vazia'), janela('2026-11-15', 'vazia')], hoje), 'abaixo');
assert.equal(situacaoDoRecorte([janela('2026-11-15', 'vazia')], hoje), 'no-prazo');

console.log('apuracaoSerie recorte: ok');
