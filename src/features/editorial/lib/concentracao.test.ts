import assert from 'node:assert/strict';
import { excecaoCobre, LIMITES_CONCENTRACAO_PADRAO, lerLimitesConcentracao, rotuloFracao } from './concentracao.ts';

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
