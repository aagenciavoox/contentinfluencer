import assert from 'node:assert/strict';
import { apurarSerie, type ItemDaApuracao, type SerieDaApuracao } from './apuracaoSerie.ts';
import { exclusaoDeMetaPropria, ritmoProprioMarcado, type OndaDaExclusao } from './metaPropria.ts';

const pai = {
  id: 'pai', name: 'Série', ativa: true, tipoAgrupamento: 'serie',
  frequenciaVezes: 2, frequenciaUnidade: 'semana', acompanharContinuidade: true,
} as unknown as SerieDaApuracao;
const quadro = {
  id: 'quadro', name: 'Quadro', parentId: 'pai', ativa: true, tipoAgrupamento: 'quadro',
  frequenciaVezes: 1, frequenciaUnidade: 'semana', acompanharContinuidade: true,
} as unknown as SerieDaApuracao;
const quadroSemMeta = {
  id: 'livre', name: 'Livre', parentId: 'pai', ativa: true, tipoAgrupamento: 'quadro',
} as unknown as SerieDaApuracao;
const series = [pai, quadro, quadroSemMeta];

function item(id: string, serieId: string, temporadaId: string | null = null): ItemDaApuracao {
  return { id, contentId: id, serieId, temporadaId, data: '2026-11-03', tipo: 'post', realizada: false, postItId: null, etapa: 'pauta' } as unknown as ItemDaApuracao;
}

function testQuadroSaiDaContaDoPai() {
  // Quadro é sob demanda: nenhum quadro conta na cadência da série (com meta antiga gravada ou sem).
  const excluir = exclusaoDeMetaPropria(pai, series);
  assert.deepEqual([...(excluir.serieIds ?? [])].sort(), ['livre', 'quadro']);
  const periodo = { inicio: '2026-11-02', fim: '2026-11-08' };
  const itens = [item('a', 'pai'), item('b', 'quadro'), item('c', 'livre')];
  assert.equal(apurarSerie({ serie: pai, series, itens, periodo }).noPeriodo.episodios, 1);
  assert.equal(apurarSerie({ serie: pai, series, itens, periodo, excluir }).noPeriodo.episodios, 1);
  // O próprio quadro continua contando o episódio dele.
  assert.equal(apurarSerie({ serie: quadro, series, itens, periodo, excluir: exclusaoDeMetaPropria(quadro, series) }).noPeriodo.episodios, 1);
}

function testWaveComRitmoProprioSaiDaContaDaSerie() {
  const ondas = [
    { id: 'w1', serieId: 'pai', acompanhar: true, ritmoProprio: true, frequenciaVezes: 1 },
    { id: 'w2', serieId: 'pai', acompanhar: true, ritmoProprio: false, frequenciaVezes: 1 },
    { id: 'w3', serieId: 'pai', acompanhar: false, ritmoProprio: true, frequenciaVezes: 1 },
  ];
  const excluir = exclusaoDeMetaPropria(pai, series, ondas);
  assert.deepEqual([...(excluir.temporadaIds ?? [])], ['w1']);
  const periodo = { inicio: '2026-11-02', fim: '2026-11-08' };
  const itens = [item('a', 'pai', 'w1'), item('b', 'pai', 'w2'), item('c', 'pai', 'w3')];
  assert.equal(apurarSerie({ serie: pai, series, itens, periodo, excluir }).noPeriodo.episodios, 2);
}

function testRascunhoFicaForaDaConta() {
  // Wave em rascunho organiza sem cobrar: sai da conta da série, mesmo sem ritmo próprio.
  const ondas = [{ id: 'r', serieId: 'pai', acompanhar: false, status: 'rascunho' as const }];
  const excluir = exclusaoDeMetaPropria(pai, series, ondas);
  assert.deepEqual([...(excluir.temporadaIds ?? [])], ['r']);
  const periodo = { inicio: '2026-11-02', fim: '2026-11-08' };
  assert.equal(apurarSerie({ serie: pai, series, itens: [item('a', 'pai', 'r'), item('b', 'pai')], periodo, excluir }).noPeriodo.episodios, 1);
  // Série em rascunho abaixo de uma família não entra na conta da família.
  const familia = { id: 'fam', name: 'Família', ativa: true, tipoAgrupamento: 'familia' } as unknown as SerieDaApuracao;
  const rascunho = { id: 'nat', name: 'Natal', parentId: 'fam', ativa: false, status: 'rascunho', tipoAgrupamento: 'serie' } as unknown as SerieDaApuracao;
  const arvore = [familia, rascunho];
  assert.equal(apurarSerie({ serie: familia, series: arvore, itens: [item('x', 'nat'), item('y', 'fam')], periodo }).noPeriodo.episodios, 1);
}

function testToggleDeRitmoProprio() {
  // Caixa do modal: ligada por padrão; desmarcada, a wave volta para a conta da série.
  assert.equal(ritmoProprioMarcado({}), true);
  assert.equal(ritmoProprioMarcado({ ritmoProprio: null }), true);
  assert.equal(ritmoProprioMarcado({ ritmoProprio: false }), false);
  const onda: OndaDaExclusao = { id: 'w', serieId: 'pai', acompanhar: true, frequenciaVezes: 1 };
  const ligada = { ...onda, ritmoProprio: ritmoProprioMarcado(onda) };
  assert.deepEqual([...(exclusaoDeMetaPropria(pai, series, [ligada]).temporadaIds ?? [])], ['w']);
  const desligada = { ...onda, ritmoProprio: false };
  assert.deepEqual([...(exclusaoDeMetaPropria(pai, series, [desligada]).temporadaIds ?? [])], []);
}

testQuadroSaiDaContaDoPai();
testToggleDeRitmoProprio();
testRascunhoFicaForaDaConta();
testWaveComRitmoProprioSaiDaContaDaSerie();
console.log('metaPropria.test.ts ok');

// --- Plano do período: episódios únicos, por conta, família, temporada arquivada e meta do ritmo.
{
  const plano = await import('./planoDoPeriodo.ts');
  const { comDataDoArquivo } = await import('./arquivoTemporada.ts');
  type Arq = { status: 'ativa' | 'arquivada'; arquivadaEm?: string | null };
  const arq = (status: Arq['status'], arquivadaEm?: string | null): Arq => (arquivadaEm === undefined ? { status } : { status, arquivadaEm });
  const NOV = { inicio: '2026-11-02', fim: '2026-11-15' };
  const ep = (contentId: string, serieId: string | null, temporadaId: string | null, pubs: Array<[string, string | null, 'realizada' | 'prevista' | 'vencida' | 'sem-data', boolean?]>) => ({
    contentId, serieId, temporadaId,
    publicacoes: pubs.map(([platformId, data, situacao, programada]) => ({ platformId, data, situacao, programada: programada === true })),
  });
  const eps = [
    ep('e1', 'S', null, [['ig', '2026-11-03', 'realizada'], ['tt', '2026-11-05', 'realizada']]),
    ep('e2', 'S', null, [['ig', '2026-11-10', 'prevista', true]]),
    ep('e3', 'S', null, [['ig', '2026-10-20', 'realizada'], ['tt', '2026-11-04', 'prevista']]),
    ep('e4', 'Q', null, [['ig', '2026-11-06', 'prevista']]),
    ep('e5', 'S', 'T', [['ig', '2026-11-05', 'prevista']]),
    ep('e6', 'S', 'T', [['ig', '2026-11-12', 'prevista']]),
  ];
  // Publicado em dois destinos conta uma vez; já publicado antes do período fica fora.
  assert.deepEqual(plano.contarEpisodios(eps.slice(0, 3), NOV), { comData: 2, publicados: 1, programados: 1 });
  // Na conta, cada publicação conta com a situação daquela conta.
  assert.deepEqual(plano.contarNaConta(eps, 'tt', NOV), { comData: 2, publicados: 1, programados: 0 });

  const series = [
    { id: 'F', name: 'Família', parentId: null, tipoAgrupamento: 'familia', ativa: true, frequenciaVezes: 3, frequenciaUnidade: 'semana' },
    { id: 'S', name: 'Série', parentId: 'F', tipoAgrupamento: 'serie', ativa: true, frequenciaVezes: 2, frequenciaUnidade: 'semana', acompanharContinuidade: true },
    { id: 'Q', name: 'Quadro', parentId: 'S', tipoAgrupamento: 'quadro', ativa: true, frequenciaVezes: 1, frequenciaUnidade: 'semana', acompanharContinuidade: true },
  ] as unknown as SerieDaApuracao[];
  const temporadas = [{ id: 'T', serieId: 'S', acompanhar: true, ritmoProprio: true, frequenciaVezes: 1, frequenciaUnidade: 'semana', status: 'arquivada' as const, arquivadaEm: '2026-11-10' }];
  const ids = (lista: { contentId: string }[]) => lista.map(item => item.contentId).sort();

  // Família: soma as séries dela, cada episódio uma vez; quadro (sob demanda) fica fora.
  assert.deepEqual(ids(plano.episodiosDaLinha({ tipo: 'familia', id: 'F', episodios: eps, series, temporadas })), ['e1', 'e2', 'e3', 'e5', 'e6']);
  // Série: sem o quadro; episódio da temporada arquivada volta do dia do arquivo em diante.
  assert.deepEqual(ids(plano.episodiosDaLinha({ tipo: 'serie', id: 'S', episodios: eps, series, temporadas })), ['e1', 'e2', 'e3', 'e6']);
  // Temporada arquivada: só até a véspera do arquivo.
  assert.deepEqual(ids(plano.episodiosDaLinha({ tipo: 'temporada', id: 'T', episodios: eps, series, temporadas })), ['e5']);

  // Meta do ritmo: quantidade × janelas que tocam o intervalo. Sem ritmo, null (não zero).
  // Regra de ouro: 2/semana gravado vale 1/semana para uma série (2 janelas = 2).
  assert.deepEqual(plano.metaDoRitmo({ frequenciaRecomendada: null, frequenciaVezes: 2, frequenciaUnidade: 'semana', frequenciaAPartirDe: null }, NOV), { valor: 2, janelas: 2 });
  // Família com 3 séries ativas: até 3 por semana.
  assert.deepEqual(plano.metaDoRitmo({ frequenciaRecomendada: null, frequenciaVezes: 3, frequenciaUnidade: 'semana', frequenciaAPartirDe: null }, NOV, 3), { valor: 6, janelas: 2 });
  assert.equal(plano.metaDoRitmo({ frequenciaRecomendada: null, frequenciaVezes: null, frequenciaUnidade: null, frequenciaAPartirDe: null }, NOV), null);

  // Busca sem acento e filtro por tipo.
  const linhas = [{ tipo: 'serie' as const, nome: 'Ciência Explica' }, { tipo: 'conta' as const, nome: 'Instagram' }, { tipo: 'quadro' as const, nome: 'Bastidores', detalhe: 'Quadro de Ciência Explica' }];
  assert.deepEqual(plano.filtrarLinhas(linhas, 'ciencia', 'todos').map(l => l.nome), ['Ciência Explica', 'Bastidores']);
  assert.deepEqual(plano.filtrarLinhas(linhas, '', 'conta').map(l => l.nome), ['Instagram']);

  // Arquivo da temporada: data do dia ao arquivar; mantém a antiga; sai ao reativar.
  assert.equal(comDataDoArquivo(arq('arquivada'), arq('ativa'), '2026-11-11').arquivadaEm, '2026-11-11');
  assert.equal(comDataDoArquivo(arq('arquivada', null), arq('arquivada', '2026-10-01'), '2026-11-11').arquivadaEm, '2026-10-01');
  assert.equal(comDataDoArquivo(arq('arquivada'), arq('arquivada'), '2026-11-11').arquivadaEm, undefined, 'arquivada antiga sem data não ganha data inventada');
  assert.equal(comDataDoArquivo(arq('ativa', '2026-10-01'), arq('arquivada', '2026-10-01'), '2026-11-11').arquivadaEm, null);
}
// --- Regra de Ouro na árvore: família não tem meta; quadro é sob demanda; série fica em 1 por semana.
{
  const regra = await import('./regraDeOuro.ts');
  const { situacaoNaArvore } = await import('./apuracaoSerie.ts');
  const no = (id: string, extra: Record<string, unknown> = {}) => ({
    id, name: id, parentId: null, ativa: true, frequenciaRecomendada: null, frequenciaVezes: 3, frequenciaUnidade: 'semana', frequenciaAPartirDe: null, ...extra,
  }) as unknown as SerieDaApuracao;
  const arvore = [
    no('F', { tipoAgrupamento: 'familia' }),
    no('S1', { parentId: 'F', tipoAgrupamento: 'serie' }),
    no('S2', { parentId: 'F', tipoAgrupamento: 'serie' }),
    no('S3', { parentId: 'F', tipoAgrupamento: 'serie', ativa: false, status: 'rascunho' }),
    no('Q', { parentId: 'S1', tipoAgrupamento: 'quadro' }),
  ];
  assert.equal(regra.unidadesDaRegraDeOuro('F', arvore), 1, 'família não tem cota própria');
  assert.equal(regra.unidadesDaRegraDeOuro('S1', arvore), 1);
  assert.deepEqual([...regra.quadrosDaSubarvore('F', arvore)], ['Q']);
  const familia = situacaoNaArvore(arvore[0], arvore);
  assert.equal(familia.tipo, 'sem-frequencia', 'ritmo gravado na família é ignorado');
  const serie = situacaoNaArvore(arvore[1], arvore);
  assert.equal(serie.tipo === 'definida' ? serie.freq.vezes : null, 1);
  assert.equal(situacaoNaArvore(arvore[4], arvore).tipo, 'sob-demanda');
  // Família não tem meta: a apuração não abre janelas, mesmo com número gravado.
  const periodo = { inicio: '2026-11-02', fim: '2026-11-08' };
  const itens = [item('a', 'S1'), item('b', 'S2'), item('c', 'Q')];
  const apuracaoFamilia = apurarSerie({ serie: arvore[0], series: arvore, itens, periodo });
  assert.equal(apuracaoFamilia.situacao.tipo, 'sem-frequencia');
  assert.equal(apuracaoFamilia.janelas.length, 0);
  console.log('metaPropria.test.ts (regra de ouro) ok');
}
