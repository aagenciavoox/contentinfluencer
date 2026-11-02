import assert from 'node:assert/strict';
import {
  STATUS_BY_TYPE,
  STATUS_FASES,
  datasAoMudarStatus,
  faseDaUrl,
  faseDoStatus,
  faseParaUrl,
  rotuloDaFase,
  statusesDaFase,
} from './libraryStatus.ts';

// Todo status que algum tipo aceita cai numa fase.
for (const statuses of Object.values(STATUS_BY_TYPE)) {
  for (const status of statuses) assert.notEqual(faseDoStatus(status), null, status);
}

// "Consumindo" gravado num livro entra em "Lendo" (em andamento).
assert.equal(faseDoStatus('Consumindo'), 'andamento');
assert.ok(statusesDaFase('andamento').includes('Lendo'));
assert.ok(statusesDaFase('andamento').includes('Consumindo'));
assert.ok(statusesDaFase('concluido').includes('Lido'));

// Os links da Análise (?status=andamento e ?status=concluidos) continuam valendo.
assert.equal(faseDaUrl('andamento'), 'andamento');
assert.equal(faseDaUrl('concluidos'), 'concluido');
assert.equal(faseDaUrl('Lendo'), null);
assert.equal(faseDaUrl(null), null);
for (const fase of STATUS_FASES) assert.equal(faseDaUrl(faseParaUrl(fase)), fase);

assert.equal(rotuloDaFase('andamento', 'Todos'), 'Lendo');
assert.equal(rotuloDaFase('concluido', 'livro'), 'Lidos');
assert.equal(rotuloDaFase('andamento', 'filme'), 'Assistindo');
assert.equal(rotuloDaFase('quero', 'outro'), 'Quero consumir');
assert.equal(rotuloDaFase('abandonado', 'anime'), 'Abandonados');

const hoje = new Date(2026, 10, 2, 15, 30);
// Começar preenche só o início; terminar preenche só o fim.
assert.deepEqual(datasAoMudarStatus('Lendo', { dataInicio: null, dataFim: null }, hoje), { dataInicio: '2026-11-02', dataFim: null });
assert.deepEqual(datasAoMudarStatus('Lido', { dataInicio: null, dataFim: null }, hoje), { dataInicio: null, dataFim: '2026-11-02' });
// Datas já escritas ficam.
assert.deepEqual(
  datasAoMudarStatus('Lido', { dataInicio: '2026-10-01', dataFim: '2026-10-20' }, hoje),
  { dataInicio: '2026-10-01', dataFim: '2026-10-20' },
);
assert.deepEqual(datasAoMudarStatus('Quero ler', { dataInicio: null, dataFim: null }, hoje), { dataInicio: null, dataFim: null });

console.log('libraryStatus.test.ts passed');
