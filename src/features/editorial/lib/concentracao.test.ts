import assert from 'node:assert/strict';
import { excecaoCobre, excecoesEmVigor, LIMITES_CONCENTRACAO_PADRAO, lerLimitesConcentracao, limitesPadrao, problemaDaExcecao, rotuloFracao } from './concentracao.ts';

// Sem nada gravado: os limites de antes.
assert.deepEqual(lerLimitesConcentracao(null), LIMITES_CONCENTRACAO_PADRAO);
assert.deepEqual(lerLimitesConcentracao({ obraRepeticoes: 3 }), { ...LIMITES_CONCENTRACAO_PADRAO, obraRepeticoes: 3 });
// Fora da faixa volta ao padrão, campo a campo.
assert.equal(lerLimitesConcentracao({ obraRepeticoes: 1, assuntoFracaoMax: 2 }).obraRepeticoes, 2);
assert.equal(lerLimitesConcentracao({ assuntoFracaoMax: 2 }).assuntoFracaoMax, 1 / 3);
assert.equal(rotuloFracao(1 / 3), '33%');

// Exceção cobre só o próprio alvo, no período dela, e a de uma conta só naquela conta.
const excecoes = [
  { id: '1', tipo: 'obra' as const, alvoId: 'o1', platformId: null, inicio: '2026-11-01', fim: '2026-11-30', nota: '' },
  { id: '2', tipo: 'assunto' as const, alvoId: 't1', platformId: 'ig', inicio: '2026-11-01', fim: '2026-11-30', nota: '' },
];
assert.ok(excecaoCobre(excecoes, { tipo: 'obra', alvoId: 'o1' }, { inicio: '2026-11-02', fim: '2026-11-08' }));
assert.equal(excecaoCobre(excecoes, { tipo: 'obra', alvoId: 'o2' }, { inicio: '2026-11-02', fim: '2026-11-08' }), null);
assert.equal(excecaoCobre(excecoes, { tipo: 'obra', alvoId: 'o1' }, { inicio: '2026-11-28', fim: '2026-12-04' }), null, 'passa do fim da exceção');
assert.equal(excecaoCobre(excecoes, { tipo: 'assunto', alvoId: 't1' }, { inicio: '2026-11-02', fim: '2026-11-08' }), null, 'exceção da conta não vale na visão geral');
assert.ok(excecaoCobre(excecoes, { tipo: 'assunto', alvoId: 't1' }, { inicio: '2026-11-02', fim: '2026-11-08' }, 'ig'));

console.log('concentracao: ok');

// --- Exceções em vigor e o que falta para gravar.
{
  const excecoes = [
    { id: 'velha', tipo: 'obra' as const, alvoId: 'l1', platformId: null, inicio: '2026-10-01', fim: '2026-10-31', nota: '' },
    { id: 'nova', tipo: 'assunto' as const, alvoId: 't1', platformId: null, inicio: '2026-11-01', fim: '2026-11-30', nota: '' },
  ];
  assert.deepEqual(excecoesEmVigor(excecoes, '2026-11-03').map(item => item.id), ['nova']);
  assert.equal(problemaDaExcecao({ tipo: 'obra', alvoId: '', platformId: null, inicio: '2026-11-01', fim: '2026-11-30', nota: '' }), 'Escolha a obra.');
  assert.equal(problemaDaExcecao({ tipo: 'assunto', alvoId: 't1', platformId: null, inicio: '2026-11-30', fim: '2026-11-01', nota: '' }), 'O fim vem depois do início.');
  assert.equal(limitesPadrao(LIMITES_CONCENTRACAO_PADRAO), true);
  assert.equal(limitesPadrao({ ...LIMITES_CONCENTRACAO_PADRAO, obraJanelaDias: 10 }), false);
}

console.log('concentracao (exceções): ok');

// Leitura tolerante dos novos limites e do toggle; desligado não é o padrão.
for (const contarSequencia of [undefined, null, 'false', 0, {}]) {
  assert.equal(lerLimitesConcentracao({contarSequencia}).contarSequencia, true);
}
assert.equal(lerLimitesConcentracao({contarSequencia: false}).contarSequencia, false);
assert.equal(limitesPadrao({...LIMITES_CONCENTRACAO_PADRAO, contarSequencia: false}), false);
assert.deepEqual(lerLimitesConcentracao({assuntoRepeticoes: 30, assuntoJanelaDias: 90}), {
  ...LIMITES_CONCENTRACAO_PADRAO, assuntoRepeticoes: 30, assuntoJanelaDias: 90,
});
for (const limites of [{assuntoRepeticoes: 1, assuntoJanelaDias: 0}, {assuntoRepeticoes: 31, assuntoJanelaDias: 91}]) {
  assert.deepEqual(lerLimitesConcentracao(limites), LIMITES_CONCENTRACAO_PADRAO);
}
assert.equal(limitesPadrao({...LIMITES_CONCENTRACAO_PADRAO, assuntoRepeticoes: 3}), false);
assert.equal(limitesPadrao({...LIMITES_CONCENTRACAO_PADRAO, assuntoJanelaDias: 8}), false);
