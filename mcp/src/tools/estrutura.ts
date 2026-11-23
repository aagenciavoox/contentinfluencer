import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {
  FORMATOS_PUBLICACAO,
  FORMATOS_VISUAIS,
  HORA_DA_JANELA,
  JANELA_ROTULO,
  JANELAS,
  listaDeFormatos,
} from '../campos.ts';
import {
  FUNCAO_LABELS,
  FUNCOES,
  FUNIL_DA_FUNCAO,
  check,
  displayStatus,
  funcaoEfetiva,
  isFuncao,
  json,
  loadLookups,
  readCompat,
  normalizeStatus,
  tool,
  type Lookups,
  type Row,
} from '../lib.ts';
import {distribuicaoView} from './editorial.ts';
import {carregarTemporadas} from './temporadas.ts';
import {
  arvore,
  acompanhaNoGeralDaLinha,
  escopoDe,
  frequenciaDaLinha,
  serieDaLinha,
  temporadasDoEscopo,
  tipoDaSerie,
  type SerieNoMcp,
  type Temporada,
} from '../serieEstrutura.ts';
import {carregarTemas} from '../temas.ts';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function today(): string {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo'}).format(new Date());
}

function numeroDaFaixa(row: Row | null, chave: string): number | null {
  const valor = row?.[chave];
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

async function lerComColunasOpcionais(
  label: string,
  columns: string,
  run: (columns: string) => PromiseLike<{data: Row[] | null; error: {message?: string} | null}>,
): Promise<{linhas: Row[] | null; omitidas: string[]}> {
  try {
    const lido = await readCompat(label, columns, run);
    return {linhas: lido.data ?? [], omitidas: lido.omitidas};
  } catch {
    return {linhas: null, omitidas: [`${label}.indisponivel`]};
  }
}

function descreverFaixas(vigente: Row | null, metas: readonly Row[], lookups: Lookups, hoje: string) {
  const gravacaoMeta = numeroDaFaixa(vigente, 'gravacao_meta_semanal');
  const porConta = new Map<string, Row>();
  for (const row of metas) {
    if (typeof row.platform_id !== 'string' || typeof row.vigente_desde !== 'string' || row.vigente_desde > hoje) continue;
    porConta.set(row.platform_id, row);
  }
  return {
    regra: 'Geral: esforço por roteiro (um roteiro em três contas conta uma vez). Conta e formato: por publicação. Gravação é reels, short, vídeo longo e o vídeo do TikTok. Produção é carrossel e imagem. Stories ficam fora de toda faixa. Meta de gravação vazia esconde a faixa. Máximo vazio avisa acima da meta. Mínimo e máximo são opcionais. Abaixo do mínimo é esforço, acima do máximo é sobrecarga, entre eles é progresso. Nada bloqueia. Total da conta vazio é a soma dos formatos.',
    postagem: {
      minimo: numeroDaFaixa(vigente, 'minimo_semanal'),
      meta: numeroDaFaixa(vigente, 'limite_semanal'),
      maximo: numeroDaFaixa(vigente, 'maximo_semanal'),
    },
    gravacao: gravacaoMeta != null && gravacaoMeta > 0
      ? {
        minimo: numeroDaFaixa(vigente, 'gravacao_minimo_semanal'),
        meta: gravacaoMeta,
        maximo: numeroDaFaixa(vigente, 'gravacao_maximo_semanal'),
      }
      : null,
    contas: [...porConta.values()].map(row => ({
      conta: lookups.platformName(String(row.platform_id)),
      minimo: numeroDaFaixa(row, 'minimo_semanal'),
      meta: numeroDaFaixa(row, 'limite_semanal'),
      maximo: numeroDaFaixa(row, 'maximo_semanal'),
      formatos: row.parcelas_formato ?? null,
      faixas_formato: row.faixas_formato ?? null,
    })),
  };
}


/** Tipo, pai, quadros (árvore), temporadas, frequência detalhada, continuidade e legenda de uma série. */
function estruturaDaSerieView(row: Row, series: SerieNoMcp[], temporadas: Temporada[], lookups: Lookups) {
  const id = String(row.id);
  const tipo = tipoDaSerie(id, series);
  const freq = frequenciaDaLinha(row);
  const escopo = escopoDe(id, series);
  const quadros = arvore<Row>(id, series, (filhoId, filhos) => ({
    id: filhoId,
    nome: lookups.serieName(filhoId),
    ativa: series.find(item => item.id === filhoId)?.ativa !== false,
    ...(filhos.length ? {quadros: filhos} : {}),
    ...((series.find(item => item.id === filhoId)?.focoRedes.length ?? 0) > 0
      ? {foco_redes: series.find(item => item.id === filhoId)?.focoRedes ?? []}
      : {}),
  })).quadros ?? [];
  return {
    tipo,
    pai: row.parent_id ? {id: row.parent_id, nome: lookups.serieName(row.parent_id)} : null,
    quadros,
    usa_temporadas: row.usa_temporadas === true,
    temporadas: escopo
      ? temporadasDoEscopo(escopo.id, temporadas).map(item => ({
        id: item.id,
        nome: item.nome,
        descricao: item.descricao ?? null,
        foco_redes: item.focoRedes ?? [],
        acompanhar: item.acompanhar === true,
        frequencia_vezes: item.frequenciaVezes ?? null,
        frequencia_unidade: item.frequenciaUnidade ?? null,
        frequencia_a_partir_de: item.frequenciaAPartirDe ?? null,
        ...(escopo.id !== id ? {da_serie: escopo.name} : {}),
      }))
      : [],
    frequencia_detalhada: {vezes: freq.vezes, unidade: freq.unidade, a_partir_de: freq.a_partir_de, resumo: freq.resumo},
    acompanhar_continuidade: acompanhaNoGeralDaLinha(row),
    legenda_base: typeof row.legenda_base === 'string' && row.legenda_base.trim() ? row.legenda_base : null,
    youtube_titulo_base: typeof row.youtube_titulo_base === 'string' && row.youtube_titulo_base.trim()
      ? row.youtube_titulo_base
      : null,
    youtube_descricao_base: typeof row.youtube_descricao_base === 'string' && row.youtube_descricao_base.trim()
      ? row.youtube_descricao_base
      : null,
  };
}

export function registerEstrutura(server: McpServer) {
  server.registerTool(
    'ver_estrutura_editorial',
    {
      title: 'Ver estrutura editorial',
      description:
        'Mostra o DNA da voz, os pilares, as séries (com estrutura de roteiro, função padrão, formato, motivos e pilar principal; ' +
        'tipo família/série/quadro, pai, árvore de quadros, temporadas, frequência detalhada, continuidade e legenda), ' +
        'os temas, as opções fechadas (formatos, janelas, energia), as funções editoriais (antigo funil) com a distribuição desejada, ' +
        'as plataformas, as regras de ouro e os ajustes (rede de referência, destinos padrão, distribuição, estoque e faixas). ' +
        'Faixa geral: esforço por roteiro. Conta e formato: por publicação. Gravação (reels, short, vídeo longo, vídeo do TikTok) e produção (carrossel, imagem) saem do formato. Stories ficam fora. Meta de gravação vazia esconde a faixa. Máximo vazio avisa acima da meta. Nada bloqueia. ' +
        'Leia antes de escrever roteiros para manter a voz e o formato do perfil.',
      inputSchema: {
        secoes: z.array(z.enum(['voz', 'pilares', 'series', 'temas', 'opcoes', 'funcoes', 'plataformas', 'regras', 'ajustes'])).optional().describe('Vazio = tudo'),
        incluir_inativos: z.boolean().default(false).describe('Mostra também pilares e séries desligados'),
      },
      annotations: {readOnlyHint: true},
    },
    tool(async (args, session) => {
      const want = new Set(args.secoes?.length ? args.secoes : ['voz', 'pilares', 'series', 'temas', 'opcoes', 'funcoes', 'plataformas', 'regras', 'ajustes']);
      const lookups = await loadLookups(session);
      const {client, userId} = session;
      const result: Row = {};

      if (want.has('voz')) {
        const voz = check('DNA da voz', await client.from('dna_voz').select('*').eq('user_id', userId).maybeSingle());
        result.dna_da_voz = voz
          ? {promessa_central: voz.promessa_central, publico: voz.publico, tom: voz.tom, nao_faco: voz.nao_faco ?? [], alertas: voz.alertas ?? []}
          : null;
      }
      if (want.has('pilares')) {
        result.pilares = lookups.pilares.filter(p => args.incluir_inativos || p.ativo !== false).map(p => ({
          id: p.id,
          nome: p.nome,
          ativo: p.ativo !== false,
          cor: p.cor,
          descricao: p.descricao || null,
          plataformas: (p.pilar_plataformas ?? []).map((pp: Row) => ({
            plataforma: lookups.platformName(pp.platform_id),
            hashtags: pp.hashtags || null,
            melhores_dias: Array.isArray(pp.melhores_dias) ? pp.melhores_dias.map((d: number) => DIAS[d]) : [],
            janela: pp.janela_inicio ? `${pp.janela_inicio}–${pp.janela_fim ?? ''}` : null,
          })),
        }));
      }
      if (want.has('series')) {
        const arvoreSeries = lookups.series.map(serieDaLinha);
        const temporadas = await carregarTemporadas(session);
        if (temporadas.ausente) result.temporadas_ausentes_no_banco = true;
        result.series = lookups.series.filter(s => args.incluir_inativos || s.ativa !== false).map(s => ({
          id: s.id,
          nome: s.name,
          ativa: s.ativa !== false,
          pilares: (s.serie_pilares ?? []).map((sp: Row) => lookups.pilarName(sp.pilar_id)),
          funcao_padrao: s.funcao_padrao ?? null,
          etapa_funil: isFuncao(s.funcao_padrao) ? FUNIL_DA_FUNCAO[s.funcao_padrao] ?? 'fora' : null,
          formato_padrao: listaDeFormatos(s.formato_visual_padrao),
          energia_padrao: s.energia_padrao ?? null,
          motivo_salvar: s.motivo_salvar ?? null,
          motivo_enviar: s.motivo_enviar ?? null,
          pilar_principal: lookups.pilarName(s.pilar_principal_id),
          frequencia: s.frequencia_recomendada ?? null,
          estrutura_roteiro: s.estrutura_roteiro ?? null,
          modelo: s.template || null,
          notas: s.notes || null,
          hashtags: (s.serie_plataformas ?? []).map((sp: Row) => ({
            plataforma: lookups.platformName(sp.platform_id),
            hashtags: sp.hashtags,
            legenda: typeof sp.legenda === 'string' && sp.legenda.trim() ? sp.legenda : null,
          })),
          ...estruturaDaSerieView(s, arvoreSeries, temporadas.itens, lookups),
        }));
      }
      if (want.has('temas')) {
        const temas = await carregarTemas(session);
        result.temas = temas.itens.map(tema => ({id: tema.id, nome: tema.nome}));
        if (temas.ausente) result.temas_ausentes_no_banco = true;
      }
      if (want.has('opcoes')) {
        result.opcoes = {
          formatos_visuais: [...FORMATOS_VISUAIS],
          formatos_publicacao: [...FORMATOS_PUBLICACAO],
          energia: ['baixa', 'média', 'alta'],
          janelas: JANELAS.map(id => ({id, rotulo: JANELA_ROTULO[id], hora: HORA_DA_JANELA[id]})),
          funcoes: FUNCOES,
        };
      }
      if (want.has('funcoes')) {
        result.funcoes = {
          opcoes: FUNCOES.map(f => ({funcao: f, rotulo: FUNCAO_LABELS[f], etapa_funil: FUNIL_DA_FUNCAO[f] ?? 'fora'})),
          ...(await distribuicaoView(session)),
        };
      }
      if (want.has('plataformas')) {
        result.plataformas = lookups.platforms.filter(p => p.ativo !== false).map(p => ({id: p.id, nome: p.nome}));
      }
      if (want.has('regras')) {
        const regras = check('regras de ouro', await client.from('golden_rules').select('*').eq('user_id', userId).eq('ativa', true)) ?? [];
        result.regras_de_ouro = regras.map((r: Row) => ({
          titulo: r.titulo ?? null,
          descricao: r.descricao,
          tipo: r.tipo,
          condicao: r.condicao,
          periodo: r.periodo,
          valor: r.valor,
        }));
      }
      if (want.has('ajustes')) {
        const faixasColunas = 'limite_semanal, minimo_semanal, maximo_semanal, gravacao_minimo_semanal, gravacao_meta_semanal, gravacao_maximo_semanal';
        const contaLida = await readCompat(
          'ajustes editoriais',
          `rede_referencia_id, reserva_prontos, publico_linguagem, hashtags_fora_series, ${faixasColunas}`,
          columns => client.from('editorial_conta').select(columns).eq('user_id', userId).maybeSingle(),
        );
        const conta = (contaLida.data ?? null) as Row | null;
        const vigencias = await lerComColunasOpcionais('vigências editoriais', `vigente_desde, ${faixasColunas}`, columns =>
          client.from('editorial_vigencia').select(columns).eq('user_id', userId).order('vigente_desde'));
        const metas = await lerComColunasOpcionais(
          'metas das contas',
          'platform_id, vigente_desde, limite_semanal, minimo_semanal, maximo_semanal, parcelas_formato, faixas_formato',
          columns => client.from('editorial_conta_meta').select(columns).eq('user_id', userId).order('vigente_desde'),
        );
        const destinos = check('destinos padrão', await client.from('editorial_destino_padrao')
          .select('platform_id')
          .eq('user_id', userId)) ?? [];
        const hoje = today();
        const vigente = (vigencias.linhas ?? [])
          .filter(row => typeof row.vigente_desde === 'string' && row.vigente_desde <= hoje)
          .at(-1) ?? conta;
        const omitidas = [...contaLida.omitidas, ...vigencias.omitidas, ...metas.omitidas];
        result.ajustes = {
          rede_de_referencia: typeof conta?.rede_referencia_id === 'string' && conta.rede_referencia_id
            ? lookups.platformName(conta.rede_referencia_id)
            : null,
          destinos_padrao: destinos.map((row: Row) => lookups.platformName(row.platform_id)),
          distribuicao_funcoes: (await distribuicaoView(session)).distribuicao,
          estoque_desejado: typeof conta?.reserva_prontos === 'number' ? conta.reserva_prontos : null,
          publico_linguagem: typeof conta?.publico_linguagem === 'string' && conta.publico_linguagem.trim()
            ? conta.publico_linguagem.trim()
            : null,
          hashtags_fora_series: typeof conta?.hashtags_fora_series === 'string' && conta.hashtags_fora_series.trim()
            ? conta.hashtags_fora_series.trim()
            : null,
          faixas: descreverFaixas(vigente, metas.linhas ?? [], lookups, hoje),
          ...(omitidas.length > 0 ? { faixas_colunas_ausentes: omitidas } : {}),
        };
      }
      return json(result);
    }),
  );

  server.registerTool(
    'resumo_do_momento',
    {
      title: 'Resumo do momento',
      description:
        'Panorama rápido: quantos conteúdos há em cada etapa, o que está programado para os próximos 7 dias, ' +
        'o que passou da data sem ser postado e quantas peças de cada função editorial saíram nos últimos 28 dias. ' +
        'Bom ponto de partida para planejar a semana.',
      inputSchema: {},
      annotations: {readOnlyHint: true},
    },
    tool(async (_args, session) => {
      const lookups = await loadLookups(session);
      const rows = check('conteúdos', await session.client
        .from('contents')
        .select('id, title, status, publish_date, publish_time, recording_date, posted_at, pilar_id, series_id, funcao, funcao_origem, classificacao_congelada_em')
        .eq('user_id', session.userId)
        .is('deleted_at', null)
        .is('archived_at', null)
        .limit(2000)) ?? [];

      const hoje = today();
      const limite = new Date(`${hoje}T12:00:00Z`);
      limite.setUTCDate(limite.getUTCDate() + 7);
      const fimSemana = limite.toISOString().slice(0, 10);

      const porEtapa: Record<string, number> = {Ideia: 0, Roteiro: 0, 'Produção': 0, 'Edição': 0, Publicado: 0};
      for (const row of rows) {
        const status = row.posted_at ? 'Publicado' : normalizeStatus(row.status);
        porEtapa[status] = (porEtapa[status] ?? 0) + 1;
      }
      const brief = (row: Row) => ({
        id: row.id,
        titulo: row.title,
        status: displayStatus(row),
        data: row.publish_date,
        hora: row.publish_time ?? null,
        pilar: lookups.pilarName(row.pilar_id),
        serie: lookups.serieName(row.series_id),
      });
      const naoPostado = (row: Row) => normalizeStatus(row.status) !== 'Publicado' && !row.posted_at;

      const inicioCiclo = new Date(`${hoje}T12:00:00Z`);
      inicioCiclo.setUTCDate(inicioCiclo.getUTCDate() - 27);
      const desde = inicioCiclo.toISOString().slice(0, 10);
      const porFuncao: Record<string, number> = {...Object.fromEntries(FUNCOES.map(f => [f, 0])), sem_funcao: 0};
      for (const row of rows) {
        if (naoPostado(row)) continue;
        const dia = String(row.posted_at ?? row.publish_date ?? '').slice(0, 10);
        if (!dia || dia < desde || dia > hoje) continue;
        const {funcao} = funcaoEfetiva(row, lookups);
        porFuncao[funcao ?? 'sem_funcao'] += 1;
      }

      return json({
        hoje,
        por_etapa: porEtapa,
        postados_por_funcao_28_dias: porFuncao,
        proximos_7_dias: rows
          .filter(row => row.publish_date && row.publish_date >= hoje && row.publish_date <= fimSemana)
          .sort((a, b) => String(a.publish_date).localeCompare(String(b.publish_date)))
          .map(brief),
        gravacoes_proximos_7_dias: rows
          .filter(row => row.recording_date && row.recording_date >= hoje && row.recording_date <= fimSemana)
          .map(row => ({id: row.id, titulo: row.title, data: row.recording_date})),
        atrasados: rows
          .filter(row => row.publish_date && row.publish_date < hoje && naoPostado(row))
          .sort((a, b) => String(a.publish_date).localeCompare(String(b.publish_date)))
          .map(brief),
      });
    }),
  );
}
