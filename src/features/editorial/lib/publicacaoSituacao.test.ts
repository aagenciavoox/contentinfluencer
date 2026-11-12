import assert from 'node:assert/strict';
import {
  confirmarProgramado,
  contaProgramadaPronta,
  normalizePublicacaoStatus,
  podeConfirmarProgramado,
  progressoPublicacao,
  rotuloSituacaoPublicacao,
  seloDaPublicacao,
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

function testSeloDaAbaPublicacao() {
  const pronto = { status: 'Edição', edicaoConcluidaEm: '2026-10-28T12:00:00.000Z' };
  const cedo = { status: 'Edição', edicaoConcluidaEm: null };
  // Nenhuma saiu: não é "parcial".
  assert.deepEqual(seloDaPublicacao(pronto, [{ status: 'prevista' }, { status: 'prevista' }]), { texto: '2 contas previstas', tom: 'previsto' });
  assert.equal(seloDaPublicacao(pronto, [{ status: 'prevista' }])?.texto, '1 conta prevista');
  // Programado pede conta programada + material pronto; data futura não basta.
  assert.deepEqual(seloDaPublicacao(pronto, [{ status: 'programada' }, { status: 'programada' }]), { texto: 'Programado', tom: 'programado' });
  assert.equal(seloDaPublicacao(pronto, [{ status: 'programada' }, { status: 'prevista' }])?.texto, '1 de 2 contas programadas');
  assert.equal(seloDaPublicacao(cedo, [{ status: 'programada' }])?.texto, '1 conta prevista');
  // Parcial só quando alguma saiu.
  assert.deepEqual(seloDaPublicacao(pronto, [{ status: 'publicada' }, { status: 'programada' }, { status: 'nao_publicada' }]), { texto: 'Publicação parcial · 1 de 2 publicadas', tom: 'parcial' });
  assert.equal(seloDaPublicacao(pronto, [{ status: 'publicada' }, { status: 'removida' }])?.texto, 'Publicado');
  assert.equal(seloDaPublicacao({ status: 'Postado' }, [])?.texto, 'Publicado');
  assert.equal(seloDaPublicacao(pronto, [{ status: 'nao_publicada' }]), null);
}

function testConfirmarProgramado() {
  const pronto = { status: 'Edição', edicaoConcluidaEm: '2026-10-28T12:00:00.000Z', publishDate: '2026-11-12T12:00:00.000Z' };
  const contas = [
    { id: 'a', status: 'prevista' as const, publishDate: '2026-11-12T12:00:00.000Z' },
    { id: 'b', status: 'publicada' as const, publishDate: '2026-11-10T12:00:00.000Z' },
    { id: 'c', status: 'nao_publicada' as const, publishDate: null },
    { id: 'd', status: 'removida' as const, publishDate: null },
    { id: 'e', status: 'programada' as const, publishDate: '2026-11-12T12:00:00.000Z' },
    { id: 'f', status: 'prevista' as const, publishDate: null },
  ];
  const ok = confirmarProgramado(pronto, contas);
  assert.ok(ok.pode);
  if (!ok.pode) return;
  // f não tem data própria, mas a principal vale; b, c, d não mudam; e continua programada.
  assert.deepEqual(ok.publicacoes.map(item => item.status), ['programada', 'publicada', 'nao_publicada', 'removida', 'programada', 'programada']);
  assert.equal(ok.programadas, 2);
  // Sem data em lugar nenhum.
  const semData = confirmarProgramado({ ...pronto, publishDate: null }, [{ status: 'prevista', publishDate: null }]);
  assert.deepEqual(semData, { pode: false, motivo: 'sem-data', texto: 'Escolha a data primeiro.' });
  // Material não pronto.
  const cedo = confirmarProgramado({ status: 'Roteiro', edicaoConcluidaEm: null, publishDate: pronto.publishDate }, [{ status: 'prevista', publishDate: null }]);
  assert.deepEqual(cedo, { pode: false, motivo: 'material', texto: 'Programado pede o material pronto na Edição.' });
  // Carrossel pronto em Produção vale, como no selo.
  assert.ok(confirmarProgramado({ status: 'Produção', edicaoConcluidaEm: '2026-10-28T12:00:00.000Z', writingMode: 'carrossel', publishDate: pronto.publishDate }, [{ status: 'prevista', publishDate: null }]).pode);
  // Sem conta ativa.
  const semConta = confirmarProgramado(pronto, [{ status: 'nao_publicada', publishDate: null }]);
  assert.equal(semConta.pode ? null : semConta.motivo, 'sem-conta');
  assert.equal(confirmarProgramado(pronto, []).pode, false);
  // Já programado / já publicado.
  const ja = confirmarProgramado(pronto, [{ status: 'programada', publishDate: null }, { status: 'publicada', publishDate: null }]);
  assert.equal(ja.pode ? null : ja.motivo, 'ja-programado');
  const pub = confirmarProgramado(pronto, [{ status: 'publicada', publishDate: null }]);
  assert.equal(pub.pode ? null : pub.motivo, 'publicado');
}

testAgendadaViraPrevista();
testSeloDaAbaPublicacao();
testConfirmarProgramado();
testProgressoParcialNaoFecha();
testProgressoCompletoESemContas();
testProgramadoExigeMaterialPronto();
console.log('publicacaoSituacao tests passed');
