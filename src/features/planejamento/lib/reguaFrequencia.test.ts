import assert from 'node:assert/strict';
import {
  classeDiaPausaPublicacao,
  comClasseDiaPausaPublicacao,
  diasDePausaPublicacao,
  hrefEditorialDaWave,
  linhasDaRegua,
  marcaDaJanela,
  marcasDaLinha,
  resumoDaRegua,
  rotuloDaMarca,
  textoSeloSoNoPlano,
  vistaTemRoteiroNosPostIts,
  CLASSE_DIA_PAUSA_PUBLICACAO,
} from './reguaFrequencia.ts';
import type { Continuidade, IntervaloAvaliado, LinhaContinuidade } from './saudeIndicadores.ts';
import type { PausaEditorial } from '../../editorial/lib/pausas.ts';

function janela(parcial: Partial<IntervaloAvaliado> & Pick<IntervaloAvaliado, 'estado'>): IntervaloAvaliado {
  return {
    inicio: '2026-11-02',
    fim: '2026-11-08',
    meta: 2,
    episodios: 0,
    reservas: 0,
    foraDoPeriodo: 0,
    nota: null,
    quantidade: 0,
    abaixo: parcial.estado === 'abaixo' || parcial.estado === 'vazia',
    ...parcial,
  };
}

function linha(parcial: Partial<LinhaContinuidade<unknown>> = {}): LinhaContinuidade<unknown> {
  return {
    chave: 's:1',
    serieId: '1',
    nome: 'Diário',
    tipo: 'serie',
    paiNome: null,
    frequencia: '2 por semana',
    intervalos: [],
    abaixo: [],
    reservadas: [],
    concentrada: false,
    semEpisodios: false,
    foraDoPeriodo: 0,
    precisaAtencao: false,
    itens: [],
    ...parcial,
  };
}

// --- Marcas espelham a apuração.
assert.equal(marcaDaJanela({ estado: 'atendida' }), 'atendida');
assert.equal(marcaDaJanela({ estado: 'reservada' }), 'reservada');
assert.equal(marcaDaJanela({ estado: 'abaixo' }), 'buraco');
assert.equal(marcaDaJanela({ estado: 'vazia' }), 'buraco');
assert.equal(marcaDaJanela({ estado: 'abaixo', pausada: true }), 'pausada');

{
  const marcas = marcasDaLinha({
    intervalos: [
      janela({ estado: 'atendida', episodios: 2, quantidade: 2 }),
      janela({ inicio: '2026-11-09', fim: '2026-11-15', estado: 'reservada', episodios: 1, reservas: 1, quantidade: 2 }),
      janela({ inicio: '2026-11-16', fim: '2026-11-22', estado: 'vazia', abaixo: true }),
      janela({ inicio: '2026-11-23', fim: '2026-11-29', estado: 'abaixo', pausada: true, abaixo: true }),
    ],
  });
  assert.deepEqual(marcas.map(m => m.marca), ['atendida', 'reservada', 'buraco', 'pausada']);
  assert.equal(marcas[0].meta, 2);
  assert.equal(marcas[1].quantidade, 2);
}

// --- Linhas da régua a partir da continuidade.
{
  const continuidade: Continuidade<unknown> = {
    linhas: [
      linha({
        intervalos: [janela({ estado: 'atendida', episodios: 2, quantidade: 2 })],
        pausadas: [],
      }),
      linha({
        chave: 't:w1',
        serieId: '1',
        temporadaId: 'w1',
        nome: 'T1 Instagram',
        tipo: 'temporada',
        paiNome: 'Diário',
        frequencia: '1 por semana',
        intervalos: [janela({ estado: 'vazia', abaixo: true })],
        pausadas: [janela({ estado: 'vazia', pausada: true, abaixo: true })],
        progresso: { publicados: 3, total: 12, diasDesdeUltima: 2, limiteDias: 7 },
      }),
    ],
    pendencias: [],
    naoAvaliadas: [],
    resumo: '',
    resumoPendencias: null,
    nenhumaAcompanhada: false,
  };
  const linhas = linhasDaRegua(continuidade);
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].tipo, 'serie');
  assert.equal(linhas[0].seriePausada, false);
  assert.equal(linhas[1].tipo, 'temporada');
  assert.equal(linhas[1].seriePausada, true);
  assert.equal(linhas[1].progressoTexto, 'Wave 3/12');
  assert.deepEqual(linhasDaRegua(null), []);
  assert.deepEqual(linhasDaRegua({ ...continuidade, nenhumaAcompanhada: true, linhas: [] }), []);
}

// --- Selo Só no plano: só quando a vista mistura reserva e roteiro.
assert.equal(textoSeloSoNoPlano({ semRoteiro: true, vistaTemRoteiro: true }), 'Só no plano');
assert.equal(textoSeloSoNoPlano({ semRoteiro: true, vistaTemRoteiro: false }), null);
assert.equal(textoSeloSoNoPlano({ semRoteiro: false, vistaTemRoteiro: true }), null);
assert.equal(vistaTemRoteiroNosPostIts([{ contentId: null }, { contentId: 'c1' }]), true);
assert.equal(vistaTemRoteiroNosPostIts([{ contentId: null }, { contentId: '' }]), false);

// --- Pausa de publicação: só escopo publicação.
{
  const pausas: PausaEditorial[] = [
    { id: '1', inicio: '2026-11-10', fim: '2026-11-11', escopo: 'publicacao', platformId: null, serieId: null, nota: '' },
    { id: '2', inicio: '2026-11-12', fim: '2026-11-12', escopo: 'gravacao', platformId: null, serieId: null, nota: '' },
    { id: '3', inicio: '2026-11-13', fim: '2026-11-13', escopo: 'serie', platformId: null, serieId: 's1', nota: '' },
  ];
  assert.deepEqual(diasDePausaPublicacao(pausas, { inicio: '2026-11-01', fim: '2026-11-30' }), [
    '2026-11-10',
    '2026-11-11',
  ]);
  assert.equal(classeDiaPausaPublicacao('2026-11-10', ['2026-11-10']), CLASSE_DIA_PAUSA_PUBLICACAO);
  assert.equal(classeDiaPausaPublicacao('2026-11-12', ['2026-11-10']), undefined);
  assert.equal(
    comClasseDiaPausaPublicacao('planejamento-fim-de-semana', '2026-11-10', new Set(['2026-11-10'])),
    `planejamento-fim-de-semana ${CLASSE_DIA_PAUSA_PUBLICACAO}`,
  );
}

assert.equal(rotuloDaMarca('buraco'), 'ainda em aberto');
assert.equal(hrefEditorialDaWave('w1'), '/editorial?aba=continuidade&editar=t%3Aw1');

{
  const m = (marca: 'atendida' | 'reservada' | 'buraco' | 'pausada') => ({ inicio: 'a', fim: 'b', marca, meta: 1, quantidade: 0 });
  assert.equal(resumoDaRegua([]), 'Sem janela neste período');
  assert.equal(resumoDaRegua([{ marcas: [m('buraco'), m('atendida')] }, { marcas: [m('buraco')] }]), '2 janelas em aberto');
  assert.equal(resumoDaRegua([{ marcas: [m('buraco'), m('reservada')] }]), '1 janela em aberto · 1 só com reserva');
  assert.equal(resumoDaRegua([{ marcas: [m('atendida'), m('pausada')] }]), 'Tudo atendido');
  assert.equal(resumoDaRegua([{ marcas: [m('pausada')] }]), 'Em pausa');
}

console.log('reguaFrequencia: ok');
