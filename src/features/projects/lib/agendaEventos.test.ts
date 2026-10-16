import assert from 'node:assert/strict';
import {
  diasCobertos,
  encontrarLivroDoProjeto,
  eventoCobreDia,
  papelNoIntervalo,
  rotuloPeriodoLeitura,
} from './agendaEventos.ts';
import {rotuloProjetoTipo, tipoDoFormulario, tiposPersonalizadosUsados} from './evento.ts';
import {normalizeProjetoTipo} from '../../../lib/database.ts';

function testCampanhaContinuaPubliEProducaoPermanece() {
  assert.equal(normalizeProjetoTipo('campanha'), 'publi');
  assert.equal(normalizeProjetoTipo('producao'), 'producao');
  assert.equal(normalizeProjetoTipo('parceria'), 'parceria');
  assert.equal(normalizeProjetoTipo('maratona'), 'maratona');
  assert.equal(tipoDoFormulario('producao'), 'producao');
  assert.equal(tipoDoFormulario('campanha'), 'publi');
  assert.equal(rotuloProjetoTipo('campanha'), 'Publi');
  assert.equal(rotuloProjetoTipo('producao'), 'Produção');
  assert.equal(rotuloProjetoTipo('maratona'), 'Maratona de leitura');
  assert.equal(rotuloProjetoTipo('outro', 'Collab editora'), 'Collab editora');
}

function testTiposPersonalizadosReutilizaveis() {
  assert.deepEqual(tiposPersonalizadosUsados([
    {tipo: 'outro', tipoPersonalizado: 'Collab editora'},
    {tipo: 'outro', tipoPersonalizado: 'collab editora'},
    {tipo: 'publi', tipoPersonalizado: 'Ignorar'},
    {tipo: 'outro', tipoPersonalizado: '  Feira  '},
  ]), ['Collab editora', 'Feira']);
}

function testPeriodoOcupaOIntervaloInteiro() {
  const item = {date: '2026-11-05', dateEnd: '2026-11-12'};
  assert.deepEqual(diasCobertos(item), [
    '2026-11-05',
    '2026-11-06',
    '2026-11-07',
    '2026-11-08',
    '2026-11-09',
    '2026-11-10',
    '2026-11-11',
    '2026-11-12',
  ]);
  assert.equal(eventoCobreDia(item, '2026-11-05'), true);
  assert.equal(eventoCobreDia(item, '2026-11-12'), true);
  assert.equal(eventoCobreDia(item, '2026-11-04'), false);
  assert.equal(eventoCobreDia(item, '2026-12-01'), false);
  assert.equal(papelNoIntervalo('2026-11-05', item.date, item.dateEnd), 'start');
  assert.equal(papelNoIntervalo('2026-11-08', item.date, item.dateEnd), 'middle');
  assert.equal(papelNoIntervalo('2026-11-12', item.date, item.dateEnd), 'end');
  assert.equal(
    rotuloPeriodoLeitura('Reis e Ladrões', '2026-11-05', '2026-11-12'),
    'Leitura de Reis e Ladrões — de 5 a 12 de novembro',
  );
}

function testLivroManualReaproveitaOMesmoRegistro() {
  const livros = [{
    id: 'l1',
    projetoId: 'p',
    userId: 'u',
    nome: 'Reis e Ladrões',
    bibliotecaItemId: null,
    createdAt: '',
  }];
  assert.equal(encontrarLivroDoProjeto(livros, {nome: 'reis e ladrões'})?.id, 'l1');
  assert.equal(encontrarLivroDoProjeto(livros, {nome: 'Outro livro'}), null);
}

testCampanhaContinuaPubliEProducaoPermanece();
testTiposPersonalizadosReutilizaveis();
testPeriodoOcupaOIntervaloInteiro();
testLivroManualReaproveitaOMesmoRegistro();
