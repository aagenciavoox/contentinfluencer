import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {
  descreverColunasOmitidas,
  parsePostCode,
  patchPrimeiraPublicacao,
  PUBLICACAO_STATUS,
  TIPOS_PROJETO,
} from '../editorial.ts';
import {
  check,
  displayStatus,
  json,
  loadLookups,
  newId,
  normalizeStatus,
  nowIso,
  readCompat,
  resolvePlatform,
  tool,
  writeCompat,
  type Row,
} from '../lib.ts';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD');
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM');
const statusPublicacaoSchema = z.enum(PUBLICACAO_STATUS);

function avisoEm(inicio: string, dias: number): string {
  return addDays(inicio, -dias);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function today(): string {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo'}).format(new Date());
}

export function registerAgenda(server: McpServer) {
  server.registerTool(
    'ver_agenda',
    {
      title: 'Ver agenda',
      description:
        'Mostra, dia a dia, as publicações programadas (geral e por plataforma), as gravações marcadas, ' +
        'os compromissos e os eventos com aviso de antecedência num intervalo. Padrão: hoje + 14 dias.',
      inputSchema: {
        de: dateSchema.optional(),
        ate: dateSchema.optional(),
      },
      annotations: {readOnlyHint: true},
    },
    tool(async (args, session) => {
      const {client, userId} = session;
      const de = args.de ?? today();
      const ate = args.ate ?? addDays(de, 14);
      const lookups = await loadLookups(session);
      const contentColumns = 'id, title, status, publish_date, publish_time, recording_date, posted_at, pilar_id, series_id, formato_visual, funcao, funcao_origem, conta_na_grade';
      const platformColumns = 'id, platform_id, publish_date, publish_time, publication_kind, status, post_url, conta_na_grade, contents!inner(id, title, status, posted_at, deleted_at, archived_at)';

      const [publicacoes, porPlataforma, gravacoes, compromissos, projetos] = await Promise.all([
        readCompat('publicações', contentColumns, columns => client.from('contents').select(columns).eq('user_id', userId)
          .is('deleted_at', null).is('archived_at', null)
          .gte('publish_date', de).lte('publish_date', ate)),
        readCompat('publicações por plataforma', platformColumns, columns => client.from('content_plataformas').select(columns)
          .gte('publish_date', de).lte('publish_date', ate)
          .is('contents.deleted_at', null).is('contents.archived_at', null)),
        readCompat('gravações', contentColumns, columns => client.from('contents').select(columns).eq('user_id', userId)
          .is('deleted_at', null).is('archived_at', null)
          .gte('recording_date', de).lte('recording_date', ate)),
        client.from('agenda_items').select('*').eq('user_id', userId).is('deleted_at', null)
          .gte('date', de).lte('date', ate),
        readCompat('projetos', 'id, nome, tipo, status, data_inicio, data_fim, aviso_dias', columns => client.from('projetos').select(columns)
          .eq('user_id', userId).is('deleted_at', null)
          .gte('data_inicio', addDays(de, -120)).lte('data_inicio', addDays(ate, 120))),
      ]);

      const dias: Record<string, Row[]> = {};
      const push = (date: string, item: Row) => {
        (dias[date] ??= []).push(item);
      };

      for (const row of (publicacoes.data ?? []) as Row[]) {
        push(row.publish_date, {
          tipo: 'publicação',
          hora: row.publish_time ?? null,
          conteudo_id: row.id,
          titulo: row.title,
          status: displayStatus(row),
          pilar: lookups.pilarName(row.pilar_id),
          serie: lookups.serieName(row.series_id),
          formato: row.formato_visual ?? null,
          funcao: row.funcao ?? null,
          conta_na_grade: row.conta_na_grade === false ? false : true,
        });
      }
      for (const row of (porPlataforma.data ?? []) as Row[]) {
        const content = row.contents as Row;
        push(row.publish_date, {
          tipo: row.publication_kind === 'repost' ? 'repost' : 'publicação na plataforma',
          hora: row.publish_time ?? null,
          plataforma: lookups.platformName(row.platform_id),
          conteudo_id: content.id,
          titulo: content.title,
          status: normalizeStatus(content.status),
          status_publicacao: row.status ?? null,
          conta_na_grade: row.conta_na_grade === false ? false : true,
          link_do_post: row.post_url ?? null,
        });
      }
      for (const row of (gravacoes.data ?? []) as Row[]) {
        push(row.recording_date, {
          tipo: 'gravação',
          conteudo_id: row.id,
          titulo: row.title,
          status: normalizeStatus(row.status),
          formato: row.formato_visual ?? null,
        });
      }
      for (const row of check('agenda', compromissos) ?? []) {
        push(row.date, {
          tipo: `compromisso (${row.tipo})`,
          hora: row.time ?? null,
          compromisso_id: row.id,
          titulo: row.title,
          projeto_id: row.projeto_id ?? null,
        });
      }
      for (const row of (projetos.data ?? []) as Row[]) {
        const inicio = row.data_inicio as string | null;
        if (!inicio) continue;
        const aviso = typeof row.aviso_dias === 'number' ? row.aviso_dias : null;
        const evento = row.tipo === 'evento';
        if (inicio >= de && inicio <= ate) {
          push(inicio, {
            tipo: evento ? 'evento' : 'projeto',
            projeto_id: row.id,
            titulo: row.nome,
            status: row.status,
            aviso_dias: aviso,
            data_fim: row.data_fim ?? null,
          });
        }
        const diaDoAviso = evento && aviso != null ? avisoEm(inicio, aviso) : null;
        if (diaDoAviso && diaDoAviso >= de && diaDoAviso <= ate && diaDoAviso !== inicio) {
          push(diaDoAviso, {
            tipo: 'aviso de evento',
            projeto_id: row.id,
            titulo: row.nome,
            aviso_dias: aviso,
            data_inicio: inicio,
          });
        }
      }

      const ordered = Object.fromEntries(
        Object.keys(dias).sort().map(date => [
          date,
          dias[date].sort((a, b) => String(a.hora ?? '99').localeCompare(String(b.hora ?? '99'))),
        ]),
      );
      const ausentes = [...publicacoes.omitidas, ...porPlataforma.omitidas, ...gravacoes.omitidas, ...projetos.omitidas];
      return json({de, ate, ...(ausentes.length ? {colunas_ausentes_no_banco: ausentes} : {}), dias: ordered});
    }),
  );

  server.registerTool(
    'agendar_publicacao',
    {
      title: 'Agendar publicação',
      description:
        'Define a data (e hora) de publicação de um conteúdo e, se quiser, por plataforma, com legenda, hashtags e status. ' +
        'Status: agendada, publicada, nao_publicada ou removida. Publicada congela a função na primeira vez e marca o roteiro como Postado. ' +
        'Plataformas já ligadas ao conteúdo são atualizadas; as novas são adicionadas. Envie data=null para desagendar.',
      inputSchema: {
        conteudo_id: z.string().min(1),
        data: dateSchema.nullable(),
        hora: timeSchema.optional(),
        legenda_base: z.string().nullable().optional().describe('Legenda compartilhada do roteiro'),
        plataformas: z.array(z.object({
          plataforma: z.string().describe('Nome ou id, ex.: Instagram, TikTok'),
          data: dateSchema.optional().describe('Padrão: a data geral'),
          hora: timeSchema.optional(),
          legenda: z.string().optional(),
          hashtags: z.string().optional(),
          tipo: z.enum(['post', 'repost']).default('post'),
          status: statusPublicacaoSchema.optional(),
          link_do_post: z.string().nullable().optional(),
          conta_na_grade: z.boolean().optional().describe('No repost, false deixa essa saída fora da grade'),
        })).optional(),
      },
    },
    tool(async (args, session) => {
      const {client, userId} = session;
      const lookups = await loadLookups(session);
      const loaded = await readCompat(
        'conteúdo',
        '*, content_plataformas(*)',
        columns => client.from('contents').select(columns).eq('user_id', userId).eq('id', args.conteudo_id).maybeSingle(),
      );
      const content = loaded.data as Row | null;
      if (!content) throw new Error(`Conteúdo não encontrado: ${args.conteudo_id}`);
      const now = nowIso();
      const omitidasConteudo = [...loaded.omitidas];

      omitidasConteudo.push(...await writeCompat('agendar', {
        publish_date: args.data,
        publish_time: args.data ? args.hora ?? null : null,
        publish_date_enabled: Boolean(args.data),
        ...(args.legenda_base !== undefined ? {legenda_base: args.legenda_base || null} : {}),
        updated_at: now,
      }, row => client.from('contents').update(row).eq('id', content.id).eq('user_id', userId)));

      const existing = (content.content_plataformas ?? []) as Row[];
      const omitidasPlataforma: string[] = [];
      if (args.data === null) {
        for (const row of existing) {
          omitidasPlataforma.push(...await writeCompat('desagendar plataforma', {publish_date: null, publish_time: null, publish_date_enabled: false, updated_at: now},
            payload => client.from('content_plataformas').update(payload).eq('id', row.id)));
        }
      }

      for (const item of args.plataformas ?? []) {
        const platformId = resolvePlatform(lookups, item.plataforma);
        const date = item.data ?? args.data;
        const match = existing.find(row => row.platform_id === platformId && (row.publication_kind ?? 'post') === item.tipo);
        const fields: Row = {
          publish_date: date,
          publish_time: date ? item.hora ?? args.hora ?? null : null,
          publish_date_enabled: Boolean(date),
          publication_kind: item.tipo,
          updated_at: now,
          ...(item.legenda !== undefined ? {legenda: item.legenda, legenda_propria: true} : {}),
          ...(item.hashtags !== undefined ? {hashtags: item.hashtags} : {}),
          ...(item.status !== undefined ? {status: item.status} : {}),
          ...(item.conta_na_grade !== undefined ? {conta_na_grade: item.conta_na_grade} : {}),
          ...(item.link_do_post !== undefined ? {
            post_url: item.link_do_post || null,
            post_codigo: parsePostCode(item.link_do_post),
          } : {}),
          ...(item.status === 'publicada' ? {realizada_manual_em: match?.realizada_manual_em ?? now} : {}),
        };
        if (match) {
          omitidasPlataforma.push(...await writeCompat('atualizar plataforma', fields, payload => client.from('content_plataformas').update(payload).eq('id', match.id)));
        } else {
          omitidasPlataforma.push(...await writeCompat('adicionar plataforma', {
            id: newId(),
            content_id: content.id,
            platform_id: platformId,
            legenda: '',
            hashtags: '',
            status: 'agendada',
            ...fields,
          }, payload => client.from('content_plataformas').insert(payload)));
        }
      }

      const querPublicar = (args.plataformas ?? []).some(item => item.status === 'publicada');
      if (querPublicar && !omitidasPlataforma.includes('status')) {
        const fresh = await readCompat(
          'conteúdo publicado',
          '*, content_plataformas(*)',
          columns => client.from('contents').select(columns).eq('id', content.id).single(),
        );
        const row = fresh.data as Row;
        const publicadas = ((row.content_plataformas ?? []) as Row[]).filter(item => item.status === 'publicada');
        const postUrl = publicadas.find(item => item.post_url)?.post_url ?? null;
        const serie = row.series_id ? lookups.series.find(item => item.id === row.series_id) : null;
        const realizadas = publicadas.map(item => item.realizada_api_em ?? item.realizada_manual_em ?? now);
        omitidasConteudo.push(...await writeCompat(
          'congelar publicação',
          {...patchPrimeiraPublicacao(row, serie, now, realizadas.length ? realizadas : [now], postUrl), updated_at: now},
          payload => client.from('contents').update(payload).eq('id', content.id).eq('user_id', userId),
        ));
      }

      const updatedResult = await readCompat(
        'conteúdo',
        'id, title, status, publish_date, publish_time, posted_at, funcao, funcao_origem, classificacao_congelada_em, legenda_base, link, content_plataformas(platform_id, publish_date, publish_time, publication_kind, hashtags, legenda, status, post_url, post_codigo, conta_na_grade, legenda_propria)',
        columns => client.from('contents').select(columns).eq('id', content.id).single(),
      );
      const updated = updatedResult.data as Row | null;
      if (!updated) throw new Error(`Conteúdo não encontrado depois de agendar: ${content.id}`);
      const gravadoSem = [
        ...descreverColunasOmitidas([...new Set(omitidasConteudo.filter(coluna => !coluna.includes('.')))], 'contents'),
        ...descreverColunasOmitidas([...new Set(omitidasPlataforma)], 'content_plataformas'),
      ];
      return json({
        id: updated.id,
        titulo: updated.title,
        status: updated.status,
        data_publicacao: updated.publish_date,
        hora_publicacao: updated.publish_time,
        postado_em: updated.posted_at ?? null,
        funcao: updated.funcao ?? null,
        funcao_origem: updated.funcao_origem ?? null,
        classificacao_congelada: Boolean(updated.classificacao_congelada_em),
        legenda_base: updated.legenda_base ?? null,
        link: updated.link ?? null,
        ...(gravadoSem.length ? {gravado_sem: gravadoSem} : {}),
        plataformas: (updated.content_plataformas ?? []).map((p: Row) => ({
          plataforma: lookups.platformName(p.platform_id),
          data: p.publish_date,
          hora: p.publish_time,
          tipo: p.publication_kind ?? 'post',
          status: p.status ?? null,
          conta_na_grade: p.conta_na_grade === false ? false : true,
          legenda: p.legenda,
          legenda_propria: Boolean(p.legenda_propria),
          hashtags: p.hashtags,
          link_do_post: p.post_url ?? null,
          post_codigo: p.post_codigo ?? null,
        })),
      });
    }),
  );

  server.registerTool(
    'criar_compromisso',
    {
      title: 'Criar compromisso',
      description: 'Adiciona um compromisso à agenda (reunião, entrega, publicação avulsa ou outro).',
      inputSchema: {
        titulo: z.string().min(1),
        data: dateSchema,
        hora: timeSchema.optional(),
        tipo: z.enum(['Reunião', 'Entrega', 'Publicação', 'Outro']).default('Outro'),
        projeto_id: z.string().optional(),
      },
    },
    tool(async (args, session) => {
      const id = newId();
      const row = check('criar compromisso', await session.client.from('agenda_items').insert({
        id,
        user_id: session.userId,
        title: args.titulo.trim(),
        date: args.data,
        time: args.hora ?? null,
        tipo: args.tipo,
        projeto_id: args.projeto_id ?? null,
      }).select().single());
      return json(row);
    }),
  );

  server.registerTool(
    'remover_compromisso',
    {
      title: 'Remover compromisso',
      description: 'Apaga um compromisso da agenda (não afeta conteúdos).',
      inputSchema: {id: z.string().min(1)},
      annotations: {destructiveHint: true},
    },
    tool(async (args, session) => {
      const removed = check('remover compromisso', await session.client.from('agenda_items')
        .delete().eq('id', args.id).eq('user_id', session.userId).select('id, title'));
      if (!removed?.length) throw new Error(`Compromisso não encontrado: ${args.id}`);
      return json({removido: removed[0]});
    }),
  );

  server.registerTool(
    'salvar_evento',
    {
      title: 'Salvar evento',
      description:
        'Cria ou atualiza um projeto e o aviso de antecedência (0 a 120 dias, ou null para limpar). ' +
        'Na criação o tipo é evento. Num projeto que já existe, o tipo só muda se for enviado. ' +
        'A tela do app que edita esse aviso está em outro pull request; esta ferramenta grava a coluna aviso_dias.',
      inputSchema: {
        id: z.string().min(1).optional().describe('Vazio cria um evento novo'),
        nome: z.string().min(1).optional(),
        aviso_dias: z.number().int().min(0).max(120).nullable().optional(),
        data_inicio: dateSchema.nullable().optional(),
        data_fim: dateSchema.nullable().optional(),
        tipo: z.enum(TIPOS_PROJETO).optional().describe('evento, publi, producao, outro ou campanha'),
      },
    },
    tool(async (args, session) => {
      const {client, userId} = session;
      const id = args.id ?? newId();
      const creating = !args.id;
      if (creating && !args.nome?.trim()) throw new Error('Um evento novo precisa de nome.');
      if (!creating && args.nome === undefined && args.aviso_dias === undefined && args.data_inicio === undefined && args.data_fim === undefined && args.tipo === undefined) {
        throw new Error('Nenhum campo para atualizar.');
      }
      const now = nowIso();
      const payload: Row = {updated_at: now};
      if (creating) {
        payload.id = id;
        payload.user_id = userId;
        payload.nome = args.nome!.trim();
        payload.tipo = args.tipo === 'campanha' ? 'publi' : args.tipo ?? 'evento';
        payload.status = 'Planejando';
        payload.currency = 'BRL';
      } else if (args.nome !== undefined) {
        payload.nome = args.nome.trim();
      }
      if (!creating && args.tipo !== undefined) payload.tipo = args.tipo === 'campanha' ? 'publi' : args.tipo;
      if (args.aviso_dias !== undefined) payload.aviso_dias = args.aviso_dias;
      if (args.data_inicio !== undefined) payload.data_inicio = args.data_inicio;
      if (args.data_fim !== undefined) payload.data_fim = args.data_fim;

      const omitidas = await writeCompat('salvar evento', payload, row => (
        creating
          ? client.from('projetos').insert(row)
          : client.from('projetos').update(row).eq('id', id).eq('user_id', userId)
      ));
      const loaded = await readCompat(
        'evento',
        'id, nome, tipo, status, data_inicio, data_fim, aviso_dias',
        columns => client.from('projetos').select(columns).eq('user_id', userId).eq('id', id).maybeSingle(),
      );
      const row = loaded.data as Row | null;
      if (!row) throw new Error(`Evento não encontrado: ${id}`);
      const gravadoSem = descreverColunasOmitidas(omitidas, 'projetos');
      return json({
        id: row.id,
        nome: row.nome,
        tipo: row.tipo,
        status: row.status,
        data_inicio: row.data_inicio ?? null,
        data_fim: row.data_fim ?? null,
        aviso_dias: row.aviso_dias ?? null,
        ...(gravadoSem.length ? {gravado_sem: gravadoSem} : {}),
        ...(loaded.omitidas.length ? {colunas_ausentes_no_banco: loaded.omitidas} : {}),
      });
    }),
  );

  server.registerTool(
    'remover_evento',
    {
      title: 'Remover evento',
      description: 'Apaga um projeto. Não mexe nos roteiros ligados a ele.',
      inputSchema: {id: z.string().min(1)},
      annotations: {destructiveHint: true},
    },
    tool(async (args, session) => {
      const removed = check('remover evento', await session.client.from('projetos')
        .delete().eq('id', args.id).eq('user_id', session.userId).select('id, nome'));
      if (!removed?.length) throw new Error(`Evento não encontrado: ${args.id}`);
      return json({removido: removed[0]});
    }),
  );
}
