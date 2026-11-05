import assert from 'node:assert/strict';
import {
  continuidadeDasSeries,
  distribuicaoPorObjetivo,
  intervalosDaFrequencia,
  janelaDaContinuidade,
  objetivoEfetivo,
  proporcaoDesejadaDoPeriodo,
  situacaoDaFrequencia,
  textoSemObjetivo,
  type ConteudoDaSaude,
  type ItemSaude,
  type SerieDaSaude,
} from './saudeIndicadores.ts';

const PERIODO = { inicio: '2026-10-03', fim: '2026-12-30' };

function serie(partial: Partial<SerieDaSaude> & { id: string }): SerieDaSaude & { funcaoPadrao: null } {
  return {
    name: partial.id,
    parentId: null,
    frequenciaRecomendada: null,
    frequenciaVezes: null,
    frequenciaUnidade: null,
    frequenciaAPartirDe: null,
    funcaoPadrao: null,
    acompanharContinuidade: true,
    ...partial,
  } as SerieDaSaude & { funcaoPadrao: null };
}

function item(id: string, data: string, extra: Partial<ItemSaude> = {}): ItemSaude {
  return { id, contentId: id, data, serieId: null, pilarId: null, funcao: null, ...extra };
}

// --- Objetivo efetivo: do conteúdo, depois da série, depois do post-it solto.
{
  const series = [{ id: 's1', funcaoPadrao: 'atrair', pilarIds: [] }, { id: 'q1', parentId: 's1', funcaoPadrao: null, pilarIds: [] }] as never;
  const contents = new Map<string, ConteudoDaSaude>([
    ['c1', { id: 'c1', funcao: 'comunidade', funcaoOrigem: 'escolhida', seriesId: 's1' }],
    ['c2', { id: 'c2', funcao: null, funcaoOrigem: 'herdada', seriesId: 'q1' }],
    ['c3', { id: 'c3', funcao: null, funcaoOrigem: null, seriesId: null }],
  ] as never);
  assert.equal(objetivoEfetivo(item('c1', '2026-10-05'), contents, series), 'comunidade');
  assert.equal(objetivoEfetivo(item('c2', '2026-10-05'), contents, series), 'atrair', 'quadro herda da série acima');
  assert.equal(objetivoEfetivo(item('c3', '2026-10-05'), contents, series), null);
  assert.equal(objetivoEfetivo(item('p1', '2026-10-05', { funcao: 'converter', postItId: 'p1' }), contents, series), 'converter');
}

// --- Distribuição sobre TODOS os itens, sem objetivo no total.
{
  const contents = [
    { id: 'a', funcao: 'atrair', funcaoOrigem: 'escolhida', seriesId: null },
    { id: 'b', funcao: null, funcaoOrigem: null, seriesId: null },
    { id: 'c', funcao: null, funcaoOrigem: null, seriesId: null },
    { id: 'd', funcao: null, funcaoOrigem: null, seriesId: null },
  ] as never;
  const dist = distribuicaoPorObjetivo({
    itens: ['a', 'b', 'c', 'd'].map(id => item(id, '2026-10-10')),
    contents,
    series: [],
    proporcao: { atrair: 40, converter: 30 },
  });
  assert.equal(dist.total, 4);
  assert.equal(dist.incompleta, true);
  assert.equal(dist.semObjetivo.length, 3);
  assert.equal(dist.semObjetivoPct, 75);
  const atrair = dist.linhas.find(l => l.funcao === 'atrair')!;
  assert.equal(atrair.previstoPct, 25, 'não é 100% só porque é o único classificado');
  assert.equal(atrair.desejadoPct, 40);
  assert.equal(dist.linhas.find(l => l.funcao === 'converter')!.quantidade, 0);
  assert.equal(textoSemObjetivo(dist), '3 de 4 conteúdos sem objetivo');
  // Nada foi preenchido nos conteúdos.
  assert.equal((contents as { funcao: unknown }[])[1].funcao, null);
}

// --- Proporção do período: vigente usa a atual; encerrado pesa as semanas.
{
  const vigencias = [
    { vigenteDesde: '2000-01-02', limiteSemanal: 7, proporcaoFuncoes: { atrair: 20 } },
    { vigenteDesde: '2026-10-11', limiteSemanal: 7, proporcaoFuncoes: { atrair: 40 } },
  ] as never;
  assert.deepEqual(proporcaoDesejadaDoPeriodo({ periodo: PERIODO, limiteSemanal: 7, proporcaoFuncoes: { atrair: 40 }, vigencias, hoje: '2026-11-02' }), { atrair: 40 });
  const passado = proporcaoDesejadaDoPeriodo({ periodo: { inicio: '2026-10-04', fim: '2026-10-17' }, limiteSemanal: 7, proporcaoFuncoes: { atrair: 40 }, vigencias, hoje: '2026-11-02' });
  assert.equal(passado?.atrair, 30);
}

// --- Situação da frequência.
assert.equal(situacaoDaFrequencia(serie({ id: 'x' })).tipo, 'sem-frequencia');
assert.equal(situacaoDaFrequencia(serie({ id: 'x', frequenciaVezes: 2, frequenciaRecomendada: 'Quinzenal' })).tipo, 'incompleta');
assert.equal(situacaoDaFrequencia(serie({ id: 'x', frequenciaRecomendada: 'Sob demanda' })).tipo, 'sob-demanda');
{
  const legado = situacaoDaFrequencia(serie({ id: 'x', frequenciaRecomendada: 'Semanal' }));
  assert.equal(legado.tipo, 'definida');
  assert.equal(legado.tipo === 'definida' && legado.freq.unidade, 'semana');
}

// --- Semanas entre meses: semana inteira, com nota explícita.
{
  const s = serie({ id: 'sem', frequenciaVezes: 1, frequenciaUnidade: 'semana' });
  const situacao = situacaoDaFrequencia(s);
  assert.equal(situacao.tipo, 'definida');
  const semanas = intervalosDaFrequencia((situacao as unknown as { freq: never }).freq, PERIODO);
  assert.deepEqual(semanas[0], { inicio: '2026-09-27', fim: '2026-10-03' });
  assert.deepEqual(semanas.at(-1), { inicio: '2026-12-27', fim: '2027-01-02' });
  assert.equal(semanas.length, 14);

  // Episódio no dia 29/09 (antes do período) conta para a semana inteira 27/09–03/10.
  const itens = [item('e0', '2026-09-29', { serieId: 'sem' }), item('e1', '2026-10-05', { serieId: 'sem' }), item('e2', '2026-10-06', { serieId: 'sem' })];
  const cont = continuidadeDasSeries({ series: [s], itens, periodo: PERIODO });
  const linha = cont.linhas[0];
  assert.equal(linha.intervalos[0].quantidade, 1);
  assert.equal(linha.intervalos[0].abaixo, false);
  assert.match(linha.intervalos[0].nota ?? '', /semana 27\/09–03\/10 avaliada inteira \(começa antes do período, atravessa dois meses\)/);
  // Duas na semana 04/10–10/10 não compensam as vazias: sem sobra.
  assert.equal(linha.intervalos[1].quantidade, 2);
  assert.equal(linha.abaixo.length, 12);
  assert.equal(linha.concentrada, true);
  assert.equal(cont.resumo, '1 série abaixo da frequência');
  assert.equal(linha.semEpisodios, false);
  const novembro = linha.intervalos.find(i => i.inicio === '2026-11-29')!;
  assert.match(novembro.nota ?? '', /atravessa dois meses/);
}

// --- Mensal mês a mês; quinzenal ancorado no início da meta.
{
  const mensal = situacaoDaFrequencia(serie({ id: 'm', frequenciaVezes: 1, frequenciaUnidade: 'mes' }));
  assert.deepEqual(intervalosDaFrequencia((mensal as unknown as { freq: never }).freq, PERIODO).map(i => i.inicio), ['2026-10-01', '2026-11-01', '2026-12-01']);
  const quinzenal = situacaoDaFrequencia(serie({ id: 'q', frequenciaVezes: 1, frequenciaUnidade: 'quinzena', frequenciaAPartirDe: '2026-10-07' }));
  const janelas = intervalosDaFrequencia((quinzenal as unknown as { freq: never }).freq, PERIODO);
  assert.deepEqual(janelas[0], { inicio: '2026-10-07', fim: '2026-10-20' });
  assert.deepEqual(janelas.at(-1), { inicio: '2026-12-30', fim: '2027-01-12' });
  const semAncora = situacaoDaFrequencia(serie({ id: 'q2', frequenciaVezes: 1, frequenciaUnidade: 'quinzena' }));
  // Sem data de início não há âncora: a avaliação fica suspensa, sem ciclo inventado pelo período.
  assert.equal(semAncora.tipo, 'sem-ancora');
}

// --- Início da meta no futuro: não avaliada, não conta como abaixo.
{
  const s = serie({ id: 'fut', frequenciaVezes: 1, frequenciaUnidade: 'semana', frequenciaAPartirDe: '2027-02-01' });
  const cont = continuidadeDasSeries({ series: [s], itens: [], periodo: PERIODO });
  assert.equal(cont.linhas.length, 0);
  assert.equal(cont.naoAvaliadas[0].motivo, 'inicio-futuro');
  // Início no meio do período: semanas anteriores ficam de fora.
  const meio = serie({ id: 'meio', frequenciaVezes: 1, frequenciaUnidade: 'semana', frequenciaAPartirDe: '2026-12-06' });
  const cont2 = continuidadeDasSeries({ series: [meio], itens: [], periodo: PERIODO });
  assert.deepEqual(cont2.linhas[0].intervalos.map(i => i.inicio), ['2026-12-06', '2026-12-13', '2026-12-20', '2026-12-27']);
}

// --- Configuração ausente nunca é "abaixo da meta".
{
  const cont = continuidadeDasSeries({
    series: [
      serie({ id: 'branbran', name: 'Descomplicando o Branbran' }),
      serie({ id: 'clube', name: 'Clube Enevoada', frequenciaVezes: 2, frequenciaRecomendada: 'Quinzenal' }),
      serie({ id: 'geral', name: 'Geral', frequenciaRecomendada: 'Sob demanda' }),
      serie({ id: 'qsem', name: 'Por onde eu começo?', parentId: 'branbran', tipoAgrupamento: 'quadro', acompanharContinuidade: false }),
    ],
    itens: [],
    periodo: PERIODO,
  });
  assert.equal(cont.linhas.length, 0);
  assert.deepEqual(cont.pendencias.map(p => [p.nome, p.texto]), [
    ['Clube Enevoada', 'Frequência incompleta: escolha a unidade'],
    ['Descomplicando o Branbran', 'Sem frequência definida'],
  ]);
  assert.equal(cont.naoAvaliadas.length, 1);
  assert.equal(cont.resumo, 'Nenhuma série com frequência para conferir');
  assert.match(cont.resumoPendencias ?? '', /^2 configurações pendentes/);
}

// --- Quadro com meta própria: linha própria, e os episódios dele saem da conta da série (sem cobrança dupla).
{
  const pai = serie({ id: 'pai', name: 'Resenha', frequenciaVezes: 1, frequenciaUnidade: 'mes' });
  const quadro = serie({ id: 'quadro', name: 'Indicação', parentId: 'pai', tipoAgrupamento: 'quadro', frequenciaVezes: 2, frequenciaUnidade: 'mes' });
  const itens = [
    item('q1', '2026-10-05', { serieId: 'quadro' }),
    item('q2', '2026-10-20', { serieId: 'quadro' }),
    item('p1', '2026-11-03', { serieId: 'pai' }),
  ];
  const cont = continuidadeDasSeries({ series: [pai, quadro], itens, periodo: PERIODO });
  const linhaPai = cont.linhas.find(l => l.serieId === 'pai')!;
  const linhaQuadro = cont.linhas.find(l => l.serieId === 'quadro')!;
  assert.deepEqual(linhaPai.intervalos.map(i => i.quantidade), [0, 1, 0]);
  assert.equal(linhaPai.itens.length, 1, 'episódios do quadro com meta própria contam só no quadro');
  assert.deepEqual(linhaQuadro.intervalos.map(i => i.quantidade), [2, 0, 0]);
  assert.equal(linhaQuadro.paiNome, 'Resenha');
  assert.equal(cont.resumo, '1 série e 1 quadro abaixo da frequência');
  assert.match(linhaPai.intervalos[0].nota ?? '', /mês 01\/10–31\/10 avaliado inteiro/);
}

// --- Janela de busca cobre as pontas inteiras.
assert.deepEqual(janelaDaContinuidade(PERIODO), { inicio: '2026-09-20', fim: '2027-01-12' });

// --- Só quem foi marcado entra: nem pendência aparece para as outras.
{
  const cont = continuidadeDasSeries({
    series: [
      serie({ id: 'off', name: 'Sem acompanhar', frequenciaVezes: 1, frequenciaUnidade: 'semana', acompanharContinuidade: false }),
      serie({ id: 'off2', name: 'Sem frequência e sem acompanhar', acompanharContinuidade: false }),
      serie({ id: 'off3', name: 'Incompleta e sem acompanhar', frequenciaVezes: 2, acompanharContinuidade: false }),
    ],
    itens: [],
    periodo: PERIODO,
  });
  assert.equal(cont.linhas.length, 0);
  assert.equal(cont.pendencias.length, 0);
  assert.equal(cont.naoAvaliadas.length, 0);
  assert.equal(cont.nenhumaAcompanhada, true);
  assert.equal(cont.resumo, 'Nenhuma série acompanhada');
}

// --- Wave sob demanda: não avaliada e fora da contagem de acompanhadas.
{
  const cont = continuidadeDasSeries({
    series: [serie({ id: 'mae', name: 'Mãe', acompanharContinuidade: false })],
    temporadas: [{ id: 'w', serieId: 'mae', nome: 'Wave livre', acompanhar: true, frequenciaUnidade: 'sob-demanda' }],
    itens: [],
    periodo: PERIODO,
  });
  assert.equal(cont.linhas.length, 0);
  assert.equal(cont.pendencias.length, 0);
  assert.deepEqual(cont.naoAvaliadas.map(item => item.motivo), ['sob-demanda']);
  assert.equal(cont.nenhumaAcompanhada, true);
}

// --- Marcada e sem frequência (ou quadro marcado sem meta): pendência, não "abaixo".
{
  const cont = continuidadeDasSeries({
    series: [
      serie({ id: 'perdeu', name: 'Perdeu a frequência' }),
      serie({ id: 'pai2', name: 'Pai' , acompanharContinuidade: false }),
      serie({ id: 'qd', name: 'Quadro marcado', parentId: 'pai2', tipoAgrupamento: 'quadro' }),
    ],
    itens: [],
    periodo: PERIODO,
  });
  assert.deepEqual(cont.pendencias.map(p => [p.nome, p.tipo, p.texto]), [
    ['Perdeu a frequência', 'serie', 'Sem frequência definida'],
    ['Quadro marcado', 'quadro', 'Sem frequência definida'],
  ]);
  assert.equal(cont.linhas.length, 0);
  assert.equal(cont.nenhumaAcompanhada, false);
}

// --- Zero episódios: "sem episódios no período", contado à parte de "abaixo".
{
  const cont = continuidadeDasSeries({
    series: [
      serie({ id: 'vazia1', name: 'Vazia 1', frequenciaVezes: 1, frequenciaUnidade: 'semana' }),
      serie({ id: 'vazia2', name: 'Vazia 2', frequenciaVezes: 1, frequenciaUnidade: 'mes' }),
      serie({ id: 'pouca', name: 'Pouca', frequenciaVezes: 1, frequenciaUnidade: 'mes' }),
    ],
    itens: [item('x1', '2026-10-10', { serieId: 'pouca' })],
    periodo: PERIODO,
  });
  assert.equal(cont.linhas.find(l => l.serieId === 'vazia1')!.semEpisodios, true);
  assert.equal(cont.linhas.find(l => l.serieId === 'pouca')!.semEpisodios, false);
  assert.equal(cont.resumo, '1 série abaixo da frequência · 2 séries sem episódios no período');
}

// --- Post-it é reserva: janela coberta só por ele fica "reservada", não atendida.
{
  const s = serie({ id: 'res', name: 'Resenha', frequenciaVezes: 1, frequenciaUnidade: 'mes' });
  const cont = continuidadeDasSeries({
    series: [s],
    itens: [
      item('ep1', '2026-10-10', { serieId: 'res', etapa: 'roteiro' }),
      item('post-it:p1', '2026-11-10', { serieId: 'res', contentId: 'p1', postItId: 'p1', etapa: 'planejamento' }),
    ],
    periodo: PERIODO,
  });
  const linha = cont.linhas[0];
  assert.deepEqual(linha.intervalos.map(i => i.estado), ['atendida', 'reservada', 'vazia']);
  assert.equal(linha.reservadas.length, 1);
  assert.equal(linha.abaixo.length, 1, 'só dezembro falta');
}

// --- Repost não é episódio novo; o mesmo conteúdo conta uma vez.
{
  const s = serie({ id: 'rp', name: 'Repost', frequenciaVezes: 1, frequenciaUnidade: 'mes' });
  const cont = continuidadeDasSeries({
    series: [s],
    itens: [
      item('c1:original', '2026-10-05', { serieId: 'rp', contentId: 'c1', tipo: 'original' }),
      item('c1:ciclo:2', '2026-11-05', { serieId: 'rp', contentId: 'c1', tipo: 'repost' }),
    ],
    periodo: PERIODO,
  });
  assert.deepEqual(cont.linhas[0].intervalos.map(i => i.episodios), [1, 0, 0]);
}

// --- Ciclo de 14 dias sem data de início: pendência, não "abaixo".
{
  const cont = continuidadeDasSeries({
    series: [serie({ id: 'q', name: 'Quinzenal', frequenciaVezes: 1, frequenciaUnidade: 'quinzena' })],
    itens: [],
    periodo: PERIODO,
  });
  assert.equal(cont.linhas.length, 0);
  assert.deepEqual(cont.pendencias.map(p => [p.motivo, p.texto]), [['sem-ancora', 'Defina o início dos ciclos de 14 dias']]);
}

// --- Episódio fora do período ajuda a janela, mas aparece à parte.
{
  const s = serie({ id: 'fora', name: 'Fora', frequenciaVezes: 1, frequenciaUnidade: 'semana' });
  const cont = continuidadeDasSeries({ series: [s], itens: [item('e0', '2026-09-29', { serieId: 'fora' })], periodo: PERIODO });
  assert.equal(cont.linhas[0].foraDoPeriodo, 1);
  assert.equal(cont.linhas[0].intervalos[0].foraDoPeriodo, 1);
}

// --- Metas numéricas por objetivo chegam à Saúde.
{
  const dist = distribuicaoPorObjetivo({
    itens: [item('a', '2026-10-10')],
    contents: [{ id: 'a', funcao: 'atrair', funcaoOrigem: 'escolhida', seriesId: null }] as never,
    series: [],
    proporcao: { atrair: 50 },
    metas: { atrair: { meta: 7, origem: 'ajustada' }, converter: { meta: 3, origem: 'proporcao' } },
  });
  const atrair = dist.linhas.find(l => l.funcao === 'atrair')!;
  assert.equal(atrair.metaQuantidade, 7);
  assert.equal(atrair.metaAjustada, true);
  assert.equal(dist.linhas.find(l => l.funcao === 'converter')!.metaQuantidade, 3);
}

console.log('saudeIndicadores: ok');

// --- Acompanhamento geral com início: antes dele não há cobrança; a semana em que ele começa é parcial.
{
  const geral = (inicio: string | null, termino: string | null = null) => [{
    id: 'g', serieId: 'sg', escopo: 'geral' as const, platformId: null, formato: null, ativo: true,
    inicio, termino, distanciaMaxDias: null, evitarDiasSeguidos: false,
  }];
  const semanal = { frequenciaVezes: 1, frequenciaUnidade: 'semana' };
  const novembro = { inicio: '2026-11-01', fim: '2026-11-30' };

  const futura = continuidadeDasSeries({ series: [serie({ id: 'sg', ...semanal, acompanhamentos: geral('2026-12-06') } as never)], itens: [], periodo: novembro });
  assert.equal(futura.linhas.length, 0, 'acompanhamento que ainda não começou não cobra');
  assert.equal(futura.naoAvaliadas[0]?.motivo, 'inicio-futuro');

  const noMeio = continuidadeDasSeries({ series: [serie({ id: 'sg', ...semanal, acompanhamentos: geral('2026-11-18') } as never)], itens: [], periodo: novembro });
  const linha = noMeio.linhas[0];
  assert.ok(linha.intervalos.every(intervalo => intervalo.fim >= '2026-11-18'), 'semanas antes do início ficam de fora');
  assert.equal(linha.parciais?.length, 1, 'a semana de 15/11 começa no meio: parcial');
  assert.equal(linha.abaixo.some(intervalo => intervalo.inicio === '2026-11-15'), false, 'parcial não vira falta');

  const encerrado = continuidadeDasSeries({ series: [serie({ id: 'sg', ...semanal, acompanhamentos: geral(null, '2026-10-31') } as never)], itens: [], periodo: novembro });
  assert.equal(encerrado.naoAvaliadas[0]?.motivo, 'encerrado');

  // Pausa em parte da semana: parcial, sem falta; semana toda em pausa: pausa.
  const pausas = [
    { id: 'p1', inicio: '2026-11-02', fim: '2026-11-06', escopo: 'publicacao' as const, platformId: null, serieId: null, nota: '' },
    { id: 'p2', inicio: '2026-11-08', fim: '2026-11-14', escopo: 'publicacao' as const, platformId: null, serieId: null, nota: '' },
  ];
  const comPausa = continuidadeDasSeries({ series: [serie({ id: 'sg', ...semanal, acompanhamentos: geral(null) } as never)], itens: [], periodo: novembro, pausas });
  const semanaDaPausa = comPausa.linhas[0].intervalos.find(intervalo => intervalo.inicio === '2026-11-01');
  assert.equal(semanaDaPausa?.parcial, true);
  assert.equal(semanaDaPausa?.abaixo, false);
  assert.equal(comPausa.linhas[0].intervalos.find(intervalo => intervalo.inicio === '2026-11-08')?.pausada, true);
}

console.log('saudeIndicadores (acompanhamento geral): ok');
