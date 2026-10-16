import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {
  FORMATOS_APRESENTACAO,
  FORMATO_DESCRICAO,
  listaDeFormatos,
} from '../campos.ts';
import {
  FUNCOES,
  FUNIL_DA_FUNCAO,
  check,
  invalidateLookups,
  isFuncao,
  json,
  loadLookups,
  newId,
  nowIso,
  resolvePilar,
  resolvePlatform,
  resolveSerie,
  tool,
  writeCompat,
  type Lookups,
  type Row,
} from '../lib.ts';
import type {Session} from '../supabase.ts';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM');
const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Use cor hexadecimal, ex.: #E07A5F');
const diaSchema = z.union([z.enum([...DIAS, 'sab']), z.number().int().min(0).max(6)]);
const FREQUENCIAS_SERIE = ['Semanal', 'Quinzenal', 'Mensal', 'Sob demanda'] as const;
const FUNCOES_SERIE = [...FUNCOES, 'varia'] as const;

const pilarPlataformaSchema = z.object({
  plataforma: z.string().describe('Nome ou id, ex.: Instagram'),
  hashtags: z.string().optional().describe('Preset de hashtags do pilar nessa rede'),
  melhores_dias: z.array(diaSchema).optional().describe('Ex.: ["seg","qua","sex"]. Lista vazia = todos os dias'),
  janela_inicio: timeSchema.nullable().optional(),
  janela_fim: timeSchema.nullable().optional(),
  remover: z.boolean().optional().describe('Tira a configuração dessa rede do pilar'),
});

const serieHashtagSchema = z.object({
  plataforma: z.string(),
  hashtags: z.string().describe('String vazia remove o preset dessa rede'),
});

function diaNumero(dia: z.infer<typeof diaSchema>): number {
  if (typeof dia === 'number') return dia;
  return dia === 'sab' ? 6 : DIAS.indexOf(dia);
}

function metaPadrao(frequencia: number | null | undefined): number | null {
  return frequencia == null ? null : Math.min(60, frequencia * 4);
}

function avisos(ignorados: string[]) {
  return ignorados.length > 0
    ? {campos_ignorados: ignorados, aviso: 'O banco ainda não tem esses campos (migration pendente); o resto foi salvo.'}
    : {};
}

async function fetchPilar(session: Session, id: string): Promise<Row> {
  const row = check('pilar', await session.client.from('pilares').select('*, pilar_plataformas(*)')
    .eq('user_id', session.userId).eq('id', id).maybeSingle());
  if (!row) throw new Error(`Pilar não encontrado: ${id}`);
  return row;
}

async function fetchSerie(session: Session, id: string): Promise<Row> {
  const row = check('série', await session.client.from('series').select('*, serie_pilares(pilar_id), serie_plataformas(*)')
    .eq('user_id', session.userId).eq('id', id).maybeSingle());
  if (!row) throw new Error(`Série não encontrada: ${id}`);
  return row;
}

function pilarView(row: Row, lookups: Lookups) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao || null,
    cor: row.cor,
    ativo: row.ativo,
    frequencia_semanal: row.frequencia_semanal ?? null,
    meta_ciclo: row.meta_ciclo ?? null,
    plataformas: (row.pilar_plataformas ?? []).map((p: Row) => ({
      plataforma: lookups.platformName(p.platform_id),
      hashtags: p.hashtags || null,
      melhores_dias: (p.melhores_dias ?? []).map((d: number) => DIAS[d]),
      janela_inicio: p.janela_inicio ?? null,
      janela_fim: p.janela_fim ?? null,
    })),
  };
}

function serieView(row: Row, lookups: Lookups) {
  return {
    id: row.id,
    nome: row.name,
    ativa: row.ativa,
    pilares: (row.serie_pilares ?? []).map((sp: Row) => lookups.pilarName(sp.pilar_id)),
    funcao_padrao: row.funcao_padrao ?? null,
    etapa_funil: isFuncao(row.funcao_padrao) ? FUNIL_DA_FUNCAO[row.funcao_padrao] ?? 'fora' : null,
    frequencia: row.frequencia_recomendada ?? null,
    formato_padrao: listaDeFormatos(row.formato_visual_padrao),
    formato_apresentacao: listaDeFormatos(row.formato_apresentacao),
    energia_padrao: row.energia_padrao ?? null,
    motivo_salvar: row.motivo_salvar ?? null,
    motivo_enviar: row.motivo_enviar ?? null,
    pilar_principal: lookups.pilarName(row.pilar_principal_id),
    bordao: row.bordao ?? null,
    estrutura_roteiro: row.estrutura_roteiro ?? null,
    modelo: row.template || null,
    notas: row.notes || null,
    cor: row.cor ?? null,
    capa_url: row.capa_url ?? null,
    hashtags: (row.serie_plataformas ?? []).map((sp: Row) => ({plataforma: lookups.platformName(sp.platform_id), hashtags: sp.hashtags})),
  };
}

async function mergePilarPlataformas(
  session: Session,
  lookups: Lookups,
  pilarId: string,
  existing: Row[],
  items: z.infer<typeof pilarPlataformaSchema>[],
) {
  const {client} = session;
  for (const item of items) {
    const platformId = resolvePlatform(lookups, item.plataforma);
    const current = existing.find(row => row.platform_id === platformId);
    const merged = {
      pilar_id: pilarId,
      platform_id: platformId,
      hashtags: (item.hashtags ?? current?.hashtags ?? '').trim(),
      melhores_dias: item.melhores_dias !== undefined
        ? (item.melhores_dias.length ? [...new Set(item.melhores_dias.map(diaNumero))].sort() : null)
        : current?.melhores_dias ?? null,
      janela_inicio: item.janela_inicio !== undefined ? item.janela_inicio : current?.janela_inicio ?? null,
      janela_fim: item.janela_fim !== undefined ? item.janela_fim : current?.janela_fim ?? null,
    };
    const empty = !merged.hashtags && !merged.melhores_dias?.length && !merged.janela_inicio && !merged.janela_fim;
    if (item.remover || empty) {
      check('remover rede do pilar', await client.from('pilar_plataformas').delete().eq('pilar_id', pilarId).eq('platform_id', platformId));
    } else {
      check('salvar rede do pilar', await client.from('pilar_plataformas').upsert(merged, {onConflict: 'pilar_id,platform_id'}));
    }
  }
}

async function mergeSerieHashtags(session: Session, lookups: Lookups, serieId: string, items: z.infer<typeof serieHashtagSchema>[]) {
  for (const item of items) {
    const platformId = resolvePlatform(lookups, item.plataforma);
    const hashtags = item.hashtags.trim();
    check('hashtags da série', hashtags
      ? await session.client.from('serie_plataformas').upsert({serie_id: serieId, platform_id: platformId, hashtags}, {onConflict: 'serie_id,platform_id'})
      : await session.client.from('serie_plataformas').delete().eq('serie_id', serieId).eq('platform_id', platformId));
  }
}

async function replaceSeriePilares(session: Session, lookups: Lookups, serieId: string, refs: string[]) {
  const ids = [...new Set(refs.map(ref => resolvePilar(lookups, ref)).filter((id): id is string => Boolean(id)))];
  check('limpar pilares da série', await session.client.from('serie_pilares').delete().eq('serie_id', serieId));
  if (ids.length > 0) {
    check('ligar pilares da série', await session.client.from('serie_pilares').insert(ids.map(pilarId => ({serie_id: serieId, pilar_id: pilarId}))));
  }
  return ids;
}

function idDoPilar(lookups: Lookups, ref: string | null | undefined): string | null {
  if (!ref) return null;
  return resolvePilar(lookups, ref) ?? null;
}

const serieFields = {
  pilares: z.array(z.string()).optional().describe('Nomes ou ids. Substitui a lista inteira'),
  funcao_padrao: z.enum(FUNCOES_SERIE).nullable().optional().describe(
    'Função editorial (antigo funil) herdada pelos roteiros da série: atrair/converter = topo, aprofundar/comunidade = meio, ' +
    'acao = fundo, reter = fora do funil, varia = cada roteiro escolhe. Antes de postar, mudar aqui reclassifica os roteiros que herdam.',
  ),
  frequencia: z.enum(FREQUENCIAS_SERIE).nullable().optional().describe('"Sob demanda" não cobra ritmo'),
  formato_padrao: z.union([z.string(), z.array(z.string())]).nullable().optional().describe(
    `Formatos de publicação da série (um ou vários; lista substitui a anterior, null ou [] limpa). ${FORMATO_DESCRICAO} ` +
    'O conteúdo criado na série herda o primeiro.',
  ),
  formato_apresentacao: z.union([z.string(), z.array(z.string())]).nullable().optional().describe(
    `Um ou vários (lista substitui a anterior). Como a série aparece na tela. Sugestões: ${FORMATOS_APRESENTACAO.join(', ')}. Texto livre também vale.`,
  ),
  energia_padrao: z.enum(['baixa', 'média', 'alta']).nullable().optional().describe('Esforço de produção'),
  motivo_salvar: z.string().nullable().optional().describe('O que faz a pessoa guardar'),
  motivo_enviar: z.string().nullable().optional().describe('O que faz a pessoa enviar'),
  pilar_principal: z.string().nullable().optional().describe(
    'Nome ou id. Se pilares não vier, a série fica ligada só a este pilar.',
  ),
  bordao: z.string().nullable().optional(),
  estrutura_roteiro: z.string().nullable().optional().describe('Passo a passo do roteiro da série (referência, não é colado no roteiro)'),
  notas: z.string().optional(),
  cor: colorSchema.nullable().optional(),
  capa_url: z.string().url().nullable().optional(),
  hashtags: z.array(serieHashtagSchema).optional().describe('Presets por rede; só as redes enviadas mudam'),
};

function serieColumns(args: Partial<Record<keyof typeof serieFields | 'nome' | 'ativa', unknown>>): Row {
  const map: Record<string, string> = {
    nome: 'name', ativa: 'ativa', funcao_padrao: 'funcao_padrao',
    frequencia: 'frequencia_recomendada', formato_padrao: 'formato_visual_padrao',
    formato_apresentacao: 'formato_apresentacao', energia_padrao: 'energia_padrao',
    motivo_salvar: 'motivo_salvar', motivo_enviar: 'motivo_enviar',
    bordao: 'bordao', estrutura_roteiro: 'estrutura_roteiro', notas: 'notes', cor: 'cor', capa_url: 'capa_url',
  };
  const row: Row = {};
  for (const [key, column] of Object.entries(map)) {
    const value = args[key as keyof typeof args];
    if (value === undefined) continue;
    if (column === 'formato_visual_padrao' || column === 'formato_apresentacao') {
      row[column] = listaDeFormatos(value);
      continue;
    }
    row[column] = typeof value === 'string' ? value.trim() || (column === 'notes' ? '' : null) : value;
  }
  return row;
}

/** A proporção em percentual saiu. A meta de cada função fica em `decisao_periodo`. */
export async function distribuicaoView(_session: Session) {
  return {distribuicao: null, por_etapa: null};
}

export function registerEditorial(server: McpServer) {
  server.registerTool(
    'definir_distribuicao_funcoes',
    {
      title: 'Definir distribuição por função (funil)',
      description:
        'A proporção em percentual não fica mais salva. A meta de cada função fica na decisão do intervalo (decisao_periodo). ' +
        'Esta chamada não grava nada.',
      inputSchema: {
        atrair: z.number().int().min(0).max(100).optional(),
        converter: z.number().int().min(0).max(100).optional(),
        aprofundar: z.number().int().min(0).max(100).optional(),
        comunidade: z.number().int().min(0).max(100).optional(),
        acao: z.number().int().min(0).max(100).optional(),
        limpar: z.boolean().optional(),
      },
    },
    tool(async (_args, session) => json({
      ...(await distribuicaoView(session)),
      aviso: 'A proporção em percentual não fica mais salva. A meta de cada função fica na decisão do intervalo.',
    })),
  );

  server.registerTool(
    'criar_pilar',
    {
      title: 'Criar pilar',
      description:
        'Cria um pilar (tema + ritmo). Frequência semanal: meta de posts por semana (0–14). ' +
        'Meta por ciclo (4 semanas, 0–60): se não vier, vira frequência × 4.',
      inputSchema: {
        nome: z.string().min(1),
        descricao: z.string().optional(),
        cor: colorSchema.optional(),
        frequencia_semanal: z.number().int().min(0).max(14).optional(),
        meta_ciclo: z.number().int().min(0).max(60).optional(),
        plataformas: z.array(pilarPlataformaSchema).optional(),
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      if (lookups.pilares.some(p => p.nome.trim().toLowerCase() === args.nome.trim().toLowerCase())) {
        throw new Error(`Já existe um pilar chamado "${args.nome}". Use atualizar_pilar.`);
      }
      const id = newId();
      check('criar pilar', await session.client.from('pilares').insert({
        id,
        user_id: session.userId,
        nome: args.nome.trim(),
        descricao: args.descricao?.trim() ?? '',
        cor: args.cor ?? '#888888',
        ativo: true,
        frequencia_semanal: args.frequencia_semanal ?? null,
        meta_ciclo: args.meta_ciclo ?? metaPadrao(args.frequencia_semanal),
      }));
      if (args.plataformas?.length) await mergePilarPlataformas(session, lookups, id, [], args.plataformas);
      invalidateLookups();
      return json(pilarView(await fetchPilar(session, id), await loadLookups(session)));
    }),
  );

  server.registerTool(
    'atualizar_pilar',
    {
      title: 'Atualizar pilar',
      description:
        'Edita um pilar. Só os campos enviados mudam. ativo=false desliga o pilar (sai das regras e seletores; conteúdos ligados continuam). ' +
        'Em plataformas, só as redes enviadas mudam, e dentro de cada rede só os campos enviados.',
      inputSchema: {
        pilar: z.string().describe('Nome ou id do pilar'),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        cor: colorSchema.optional(),
        ativo: z.boolean().optional(),
        frequencia_semanal: z.number().int().min(0).max(14).nullable().optional(),
        meta_ciclo: z.number().int().min(0).max(60).nullable().optional(),
        plataformas: z.array(pilarPlataformaSchema).optional(),
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const id = resolvePilar(lookups, args.pilar);
      if (!id) throw new Error('Informe o pilar.');
      const current = await fetchPilar(session, id);
      const patch: Row = {};
      if (args.nome !== undefined) patch.nome = args.nome.trim();
      if (args.descricao !== undefined) patch.descricao = args.descricao.trim();
      if (args.cor !== undefined) patch.cor = args.cor;
      if (args.ativo !== undefined) patch.ativo = args.ativo;
      if (args.frequencia_semanal !== undefined) {
        patch.frequencia_semanal = args.frequencia_semanal;
        const metaAutomatica = current.meta_ciclo == null || current.meta_ciclo === metaPadrao(current.frequencia_semanal);
        if (args.meta_ciclo === undefined && metaAutomatica) patch.meta_ciclo = metaPadrao(args.frequencia_semanal);
      }
      if (args.meta_ciclo !== undefined) patch.meta_ciclo = args.meta_ciclo;

      if (Object.keys(patch).length > 0) {
        check('atualizar pilar', await session.client.from('pilares').update({...patch, updated_at: nowIso()})
          .eq('id', id).eq('user_id', session.userId));
      }
      if (args.plataformas?.length) await mergePilarPlataformas(session, lookups, id, current.pilar_plataformas ?? [], args.plataformas);
      invalidateLookups();
      return json(pilarView(await fetchPilar(session, id), await loadLookups(session)));
    }),
  );

  server.registerTool(
    'criar_serie',
    {
      title: 'Criar série',
      description:
        'Cria uma série (formato recorrente). Formato, apresentação, motivos e energia padrão descrevem a série; ' +
        'formato e energia são copiados para os roteiros criados por ela. Bordão e estrutura do roteiro ficam só como referência. ' +
        'pilar_principal é o pilar que o app mostra; sem a lista pilares, a série fica ligada só a ele.',
      inputSchema: {nome: z.string().min(1), ...serieFields},
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      if (lookups.series.some(s => s.name.trim().toLowerCase() === args.nome.trim().toLowerCase())) {
        throw new Error(`Já existe uma série chamada "${args.nome}". Use atualizar_serie.`);
      }
      const id = newId();
      const row = serieColumns(args);
      if (args.pilar_principal !== undefined) row.pilar_principal_id = idDoPilar(lookups, args.pilar_principal);
      else if (args.pilares?.length) row.pilar_principal_id = idDoPilar(lookups, args.pilares[0]);
      const ignorados = await writeCompat('criar série', {
        template: '',
        notes: '',
        ...row,
        id,
        user_id: session.userId,
        ativa: true,
      }, payload => session.client.from('series').insert(payload));
      if (args.pilar_principal !== undefined && args.pilares === undefined) {
        const principal = idDoPilar(lookups, args.pilar_principal);
        await replaceSeriePilares(session, lookups, id, principal ? [principal] : []);
      } else if (args.pilares !== undefined) {
        await replaceSeriePilares(session, lookups, id, args.pilares);
      }
      if (args.hashtags?.length) await mergeSerieHashtags(session, lookups, id, args.hashtags);
      invalidateLookups();
      return json({...serieView(await fetchSerie(session, id), await loadLookups(session)), ...avisos(ignorados)});
    }),
  );

  server.registerTool(
    'atualizar_serie',
    {
      title: 'Atualizar série',
      description:
        'Edita uma série. Só os campos enviados mudam; null limpa. ativa=false desliga a série (conteúdos ligados continuam). ' +
        'pilares substitui a lista e, se pilar_principal não vier, o primeiro vira o principal. ' +
        'pilar_principal sem pilares deixa a série ligada só a esse pilar. hashtags muda só as redes enviadas.',
      inputSchema: {
        serie: z.string().describe('Nome ou id da série'),
        nome: z.string().min(1).optional(),
        ativa: z.boolean().optional(),
        ...serieFields,
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const id = resolveSerie(lookups, args.serie);
      if (!id) throw new Error('Informe a série.');
      await fetchSerie(session, id);
      const patch = serieColumns(args);
      if (args.pilar_principal !== undefined) patch.pilar_principal_id = idDoPilar(lookups, args.pilar_principal);
      else if (args.pilares !== undefined) patch.pilar_principal_id = idDoPilar(lookups, args.pilares[0]);
      let ignorados: string[] = [];
      if (Object.keys(patch).length > 0) {
        ignorados = await writeCompat('atualizar série', {...patch, updated_at: nowIso()}, row =>
          session.client.from('series').update(row).eq('id', id).eq('user_id', session.userId));
      }
      if (args.pilar_principal !== undefined && args.pilares === undefined) {
        const principal = idDoPilar(lookups, args.pilar_principal);
        await replaceSeriePilares(session, lookups, id, principal ? [principal] : []);
      } else if (args.pilares !== undefined) {
        await replaceSeriePilares(session, lookups, id, args.pilares);
      }
      if (args.hashtags?.length) await mergeSerieHashtags(session, lookups, id, args.hashtags);
      invalidateLookups();
      return json({...serieView(await fetchSerie(session, id), await loadLookups(session)), ...avisos(ignorados)});
    }),
  );
}
