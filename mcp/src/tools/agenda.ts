import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {
  check,
  displayStatus,
  json,
  loadLookups,
  newId,
  normalizeStatus,
  nowIso,
  resolvePlatform,
  tool,
  writeCompat,
  type Row,
} from '../lib.ts';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD');
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM');

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
        'Mostra, dia a dia, as publicações programadas (geral e por plataforma), as gravações marcadas ' +
        'e os compromissos da agenda num intervalo. Padrão: hoje + 14 dias.',
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
      const contentColumns = 'id, title, status, publish_date, publish_time, recording_date, posted_at, pilar_id, series_id, formato_visual';

      const [publicacoes, porPlataforma, gravacoes, compromissos] = await Promise.all([
        client.from('contents').select(contentColumns).eq('user_id', userId)
          .is('deleted_at', null).is('archived_at', null)
          .gte('publish_date', de).lte('publish_date', ate),
        client.from('content_plataformas')
          .select('id, platform_id, publish_date, publish_time, publication_kind, contents!inner(id, title, status, posted_at, deleted_at, archived_at)')
          .gte('publish_date', de).lte('publish_date', ate)
          .is('contents.deleted_at', null).is('contents.archived_at', null),
        client.from('contents').select(contentColumns).eq('user_id', userId)
          .is('deleted_at', null).is('archived_at', null)
          .gte('recording_date', de).lte('recording_date', ate),
        client.from('agenda_items').select('*').eq('user_id', userId).is('deleted_at', null)
          .gte('date', de).lte('date', ate),
      ]);

      const dias: Record<string, Row[]> = {};
      const push = (date: string, item: Row) => {
        (dias[date] ??= []).push(item);
      };

      for (const row of check('publicações', publicacoes) ?? []) {
        push(row.publish_date, {
          tipo: 'publicação',
          hora: row.publish_time ?? null,
          conteudo_id: row.id,
          titulo: row.title,
          status: displayStatus(row),
          pilar: lookups.pilarName(row.pilar_id),
          serie: lookups.serieName(row.series_id),
          formato: row.formato_visual ?? null,
        });
      }
      for (const row of check('publicações por plataforma', porPlataforma) ?? []) {
        const content = row.contents as Row;
        push(row.publish_date, {
          tipo: row.publication_kind === 'repost' ? 'repost' : 'publicação na plataforma',
          hora: row.publish_time ?? null,
          plataforma: lookups.platformName(row.platform_id),
          conteudo_id: content.id,
          titulo: content.title,
          status: normalizeStatus(content.status),
        });
      }
      for (const row of check('gravações', gravacoes) ?? []) {
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

      const ordered = Object.fromEntries(
        Object.keys(dias).sort().map(date => [
          date,
          dias[date].sort((a, b) => String(a.hora ?? '99').localeCompare(String(b.hora ?? '99'))),
        ]),
      );
      return json({de, ate, dias: ordered});
    }),
  );

  server.registerTool(
    'agendar_publicacao',
    {
      title: 'Agendar publicação',
      description:
        'Define a data (e hora) de publicação de um conteúdo e, se quiser, por plataforma, com legenda e hashtags. ' +
        'Plataformas já ligadas ao conteúdo são atualizadas; as novas são adicionadas. Envie data=null para desagendar.',
      inputSchema: {
        conteudo_id: z.string().min(1),
        data: dateSchema.nullable(),
        hora: timeSchema.optional(),
        plataformas: z.array(z.object({
          plataforma: z.string().describe('Nome ou id, ex.: Instagram, TikTok'),
          data: dateSchema.optional().describe('Padrão: a data geral'),
          hora: timeSchema.optional(),
          legenda: z.string().optional(),
          hashtags: z.string().optional(),
          tipo: z.enum(['post', 'repost']).default('post'),
        })).optional(),
      },
    },
    tool(async (args, session) => {
      const {client, userId} = session;
      const lookups = await loadLookups(session);
      const content = check(
        'conteúdo',
        await client.from('contents').select('id, title, content_plataformas(*)').eq('user_id', userId).eq('id', args.conteudo_id).maybeSingle(),
      );
      if (!content) throw new Error(`Conteúdo não encontrado: ${args.conteudo_id}`);
      const now = nowIso();

      await writeCompat('agendar', {
        publish_date: args.data,
        publish_time: args.data ? args.hora ?? null : null,
        publish_date_enabled: Boolean(args.data),
        updated_at: now,
      }, row => client.from('contents').update(row).eq('id', content.id).eq('user_id', userId));

      const existing = (content.content_plataformas ?? []) as Row[];
      if (args.data === null) {
        for (const row of existing) {
          await writeCompat('desagendar plataforma', {publish_date: null, publish_time: null, publish_date_enabled: false, updated_at: now},
            payload => client.from('content_plataformas').update(payload).eq('id', row.id));
        }
      }

      for (const item of args.plataformas ?? []) {
        const platformId = resolvePlatform(lookups, item.plataforma);
        const date = item.data ?? args.data;
        const fields: Row = {
          publish_date: date,
          publish_time: date ? item.hora ?? args.hora ?? null : null,
          publish_date_enabled: Boolean(date),
          publication_kind: item.tipo,
          updated_at: now,
          ...(item.legenda !== undefined ? {legenda: item.legenda, legenda_propria: true} : {}),
          ...(item.hashtags !== undefined ? {hashtags: item.hashtags} : {}),
        };
        const match = existing.find(row => row.platform_id === platformId && (row.publication_kind ?? 'post') === item.tipo);
        if (match) {
          await writeCompat('atualizar plataforma', fields, payload => client.from('content_plataformas').update(payload).eq('id', match.id));
        } else {
          await writeCompat('adicionar plataforma', {
            id: newId(),
            content_id: content.id,
            platform_id: platformId,
            legenda: '',
            hashtags: '',
            status: 'agendada',
            ...fields,
          }, payload => client.from('content_plataformas').insert(payload));
        }
      }

      const updated = check(
        'conteúdo',
        await client.from('contents').select('id, title, publish_date, publish_time, content_plataformas(platform_id, publish_date, publish_time, publication_kind, hashtags, legenda)').eq('id', content.id).single(),
      );
      if (!updated) throw new Error(`Conteúdo não encontrado depois de agendar: ${content.id}`);
      return json({
        id: updated.id,
        titulo: updated.title,
        data_publicacao: updated.publish_date,
        hora_publicacao: updated.publish_time,
        plataformas: (updated.content_plataformas ?? []).map((p: Row) => ({
          plataforma: lookups.platformName(p.platform_id),
          data: p.publish_date,
          hora: p.publish_time,
          tipo: p.publication_kind ?? 'post',
          legenda: p.legenda,
          hashtags: p.hashtags,
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
}
