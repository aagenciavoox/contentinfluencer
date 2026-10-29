import assert from 'node:assert/strict';
import {
  contaProgramadaPronta,
  normalizePublicacaoStatus,
  podeConfirmarProgramado,
  progressoPublicacao,
  rotuloSituacaoPublicacao,
} from './publicacaoSituacao.ts';

function testAgendadaViraPrevista() {
  assert.equal(normalizePublicacaoStatus('agendada'), 'prevista');
  assert.equal(normalizePublicacaoStatus('prevista'), 'prevista');
  assert.equal(normalizePublicacaoStatus('programada'), 'programada');
  assert.equal(normalizePublicacaoStatus('publicada'), 'publicada');
  assert.equal(normalizePublicacaoStatus('lixo'), 'prevista');
}

function testProgressoParcialNaoFecha() {
  const progresso = progressoPublicacao([
    { status: 'publicada', publicationKind: 'post' },
    { status: 'prevista', publicationKind: 'post' },
    { status: 'agendada', publicationKind: 'post' },
  ]);
  assert.equal(progresso.publicadas, 1);
  assert.equal(progresso.previstas, 3);
  assert.equal(progresso.completo, false);
  assert.equal(progresso.rotulo, '1 de 3 publicações');
}

function testProgressoCompletoESemContas() {
  assert.equal(
    progressoPublicacao([
      { status: 'publicada' },
      { status: 'publicada' },
    ]).completo,
    true,
  );
  assert.deepEqual(progressoPublicacao([]), {
    publicadas: 0,
    previstas: 0,
    completo: false,
    rotulo: 'Sem publicações previstas',
  });
  // Removida e não publicada saem das pendências.
  assert.equal(
    progressoPublicacao([
      { status: 'removida' },
      { status: 'nao_publicada' },
    ]).previstas,
    0,
  );
}

function testProgramadoExigeMaterialPronto() {
  const pronto = { status: 'Edição', edicaoConcluidaEm: '2026-10-28T12:00:00.000Z' };
  const cedo = { status: 'Roteiro', edicaoConcluidaEm: null };
  assert.equal(podeConfirmarProgramado(pronto), true);
  assert.equal(podeConfirmarProgramado(cedo), false);
  assert.equal(contaProgramadaPronta(pronto, [{ status: 'programada' }]), true);
  assert.equal(contaProgramadaPronta(cedo, [{ status: 'programada' }]), false);
  assert.equal(contaProgramadaPronta(pronto, [{ status: 'prevista' }]), false);
  assert.equal(rotuloSituacaoPublicacao('agendada'), 'Prevista');
}

testAgendadaViraPrevista();
testProgressoParcialNaoFecha();
testProgressoCompletoESemContas();
testProgramadoExigeMaterialPronto();
console.log('publicacaoSituacao tests passed');
