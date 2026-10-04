import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {check, displayStatus, json, loadLookups, normalizeStatus, tool, type Row} from '../lib.ts';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function today(): string {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo'}).format(new Date());
}

export function registerEstrutura(server: McpServer) {
  server.registerTool(
    'ver_estrutura_editorial',
    {
      title: 'Ver estrutura editorial',
      description:
        'Mostra o DNA da voz, os pilares, as séries (com estrutura de roteiro, bordão e função padrão), ' +
        'as plataformas, as regras de ouro e os ajustes (rede de referência, destinos padrão, distribuição e estoque). ' +
        'Leia antes de escrever roteiros para manter a voz e o formato do perfil.',
      inputSchema: {
        secoes: z.array(z.enum(['voz', 'pilares', 'series', 'plataformas', 'regras', 'ajustes'])).optional().describe('Vazio = tudo'),
      },
      annotations: {readOnlyHint: true},
    },
    tool(async (args, session) => {
      const want = new Set(args.secoes?.length ? args.secoes : ['voz', 'pilares', 'series', 'plataformas', 'regras', 'ajustes']);
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
        result.pilares = lookups.pilares.filter(p => p.ativo !== false).map(p => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao || null,
          frequencia_semanal: p.frequencia_semanal ?? null,
          meta_ciclo: p.meta_ciclo ?? null,
          plataformas: (p.pilar_plataformas ?? []).map((pp: Row) => ({
            plataforma: lookups.platformName(pp.platform_id),
            hashtags: pp.hashtags || null,
            melhores_dias: Array.isArray(pp.melhores_dias) ? pp.melhores_dias.map((d: number) => DIAS[d]) : [],
            janela: pp.janela_inicio ? `${pp.janela_inicio}–${pp.janela_fim ?? ''}` : null,
          })),
        }));
      }
      if (want.has('series')) {
        result.series = lookups.series.filter(s => s.ativa !== false).map(s => ({
          id: s.id,
          nome: s.name,
          pilares: (s.serie_pilares ?? []).map((sp: Row) => lookups.pilarName(sp.pilar_id)),
          funcao_padrao: s.funcao_padrao ?? null,
          formato_apresentacao: s.formato_apresentacao ?? null,
          formato_padrao: s.formato_visual_padrao ?? null,
          energia_padrao: s.energia_padrao ?? null,
          frequencia: s.frequencia_recomendada ?? null,
          bordao: s.bordao ?? null,
          motivo_salvar: s.motivo_salvar ?? null,
          motivo_enviar: s.motivo_enviar ?? null,
          estrutura_roteiro: s.estrutura_roteiro ?? null,
          modelo: s.template || null,
          notas: s.notes || null,
          hashtags: (s.serie_plataformas ?? []).map((sp: Row) => ({plataforma: lookups.platformName(sp.platform_id), hashtags: sp.hashtags})),
        }));
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
        const prefs = check('ajustes editoriais', await client.from('user_preferences')
          .select('value')
          .eq('user_id', userId)
          .eq('key', 'editorial_settings')
          .maybeSingle());
        let saved: Row = {};
        if (prefs?.value) {
          try {
            const parsed = JSON.parse(prefs.value);
            if (parsed && typeof parsed === 'object') saved = parsed as Row;
          } catch {
            saved = {};
          }
        }
        const destinos = Array.isArray(saved.destinosPadrao) ? saved.destinosPadrao.filter((id: unknown) => typeof id === 'string') : [];
        result.ajustes = {
          rede_de_referencia: typeof saved.redeReferenciaId === 'string' && saved.redeReferenciaId
            ? lookups.platformName(saved.redeReferenciaId)
            : null,
          destinos_padrao: destinos.map((id: string) => lookups.platformName(id)),
          distribuicao_funcoes: saved.distribuicaoFuncoes ?? null,
          estoque_desejado: typeof saved.estoqueDesejado === 'number' ? saved.estoqueDesejado : null,
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
        'Panorama rápido: quantos conteúdos há em cada etapa, o que está programado para os próximos 7 dias ' +
        'e o que passou da data sem ser postado. Bom ponto de partida para planejar a semana.',
      inputSchema: {},
      annotations: {readOnlyHint: true},
    },
    tool(async (_args, session) => {
      const lookups = await loadLookups(session);
      const rows = check('conteúdos', await session.client
        .from('contents')
        .select('id, title, status, publish_date, publish_time, recording_date, posted_at, pilar_id, series_id')
        .eq('user_id', session.userId)
        .is('deleted_at', null)
        .is('archived_at', null)
        .limit(2000)) ?? [];

      const hoje = today();
      const limite = new Date(`${hoje}T12:00:00Z`);
      limite.setUTCDate(limite.getUTCDate() + 7);
      const fimSemana = limite.toISOString().slice(0, 10);

      const porEtapa: Record<string, number> = {Ideia: 0, Roteiro: 0, 'Produção': 0, Postado: 0};
      for (const row of rows) {
        const status = row.posted_at ? 'Postado' : normalizeStatus(row.status);
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
      const naoPostado = (row: Row) => normalizeStatus(row.status) !== 'Postado' && !row.posted_at;

      return json({
        hoje,
        por_etapa: porEtapa,
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
