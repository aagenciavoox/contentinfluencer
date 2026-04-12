import { supabase } from './supabase';
import { AppState } from '../context/AppContext';

// ─── Tipo para rastrear exclusões pendentes ──────────────────────────────────

export interface PendingDelete {
  table: string;
  id: string;
}

// ─── Buscar dados ativos (ignora soft-deleted) ──────────────────────────────

export async function fetchAllData(): Promise<Partial<AppState>> {
  if (!supabase) return {};

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  const userId = session.user.id;

  const [
    { data: contents },
    { data: ideas },
    { data: series },
    { data: results },
    { data: agenda },
    { data: energyLogs },
    { data: partnerships },
    { data: books },
    { data: pilares },
    { data: looks },
    { data: cenarios },
    { data: config },
    { data: dnaVoz },
    { data: recordingBlocks },
    { data: goldenRules }
  ] = await Promise.all([
    supabase.from('contents').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('ideas').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('series').select('*').is('deleted_at', null).order('id'),
    supabase.from('results').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('agenda_items').select('*').is('deleted_at', null).order('date'),
    supabase.from('energy_logs').select('*').is('deleted_at', null).order('date'),
    supabase.from('partnerships').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('books').select('*, book_annotations(*)').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('pilares').select('*').is('deleted_at', null).order('id'),
    supabase.from('looks').select('*').is('deleted_at', null).order('numero'),
    supabase.from('cenarios').select('*').is('deleted_at', null).order('id'),
    supabase.from('app_config').select('*'),
    supabase.from('dna_voz').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('recording_blocks').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('golden_rules').select('*').is('deleted_at', null).order('id')
  ]);

  const state: Partial<AppState> = {};

  if (contents) state.contents = contents.map(c => ({
    id: c.id,
    title: c.title,
    seriesId: c.series_id,
    pillar: c.pillar,
    format: c.format || '',
    status: c.status,
    slotType: c.slot_type,
    publishDate: c.publish_date,
    recordingDate: c.recording_date,
    lookId: c.look_id,
    scenario: c.scenario,
    estimatedDuration: c.estimated_duration,
    link: c.link,
    script: c.script,
    caption: c.caption,
    tags: c.tags,
    notes: c.notes,
    references: c.references,
    plataformas: c.plataformas || [],
    formatoVisual: c.formato_visual,
    livroOrigemId: c.livro_origem_id,
    legendas: c.legendas || {},
    scriptNotes: c.script_notes || [],
    createdAt: c.created_at,
  }));

  if (ideas) state.ideas = ideas.map(i => ({
    id: i.id,
    text: i.text,
    pillar: i.pillar,
    seriesId: i.series_id,
    promotedToContentId: i.promoted_to_content_id,
    archived: i.archived,
    livroOrigemId: i.livro_origem_id,
    createdAt: i.created_at,
  }));

  if (series) state.series = series.map(s => ({
    id: s.id,
    name: s.name,
    template: s.template || '',
    notes: s.notes || '',
    pilarId: s.pilar_id,
    slotPadrao: s.slot_padrao,
    plataformasPrincipais: s.plataformas_principais || [],
    formatoVisualPadrao: s.formato_visual_padrao,
    estruturaRoteiro: s.estrutura_roteiro,
    bordao: s.bordao,
    cor: s.cor,
    ativa: s.ativa ?? true,
    frequenciaRecomendada: s.frequencia_recomendada,
    hashtagsPorPlataforma: s.hashtags_por_plataforma || {},
  }));

  if (results) state.results = results.map(r => ({
    id: r.id,
    contentId: r.content_id,
    partnershipId: r.partnership_id,
    metrics: r.metrics || '',
    detailedMetrics: r.detailed_metrics,
    qualitativeNotes: r.qualitative_notes || '',
    worthIt: r.worth_it,
    engagement: r.engagement,
    creativeSatisfaction: r.creative_satisfaction,
    learningBySeries: r.learning_by_series,
    createdAt: r.created_at,
  }));

  if (agenda) state.agenda = agenda.map(a => ({
    id: a.id,
    title: a.title,
    date: a.date,
    type: a.type,
    slotType: a.slot_type,
    external: a.external ?? false,
  }));

  if (energyLogs) state.energyLogs = energyLogs.map(e => ({
    date: e.date,
    level: e.level,
  }));

  if (partnerships) state.partnerships = partnerships.map(p => ({
    id: p.id,
    brand: p.brand,
    brandColor: p.brand_color,
    title: p.title,
    status: p.status,
    startDate: p.start_date,
    deadline: p.deadline,
    publishDate: p.publish_date,
    recordingDate: p.recording_date,
    value: p.value,
    notes: p.notes,
    script: p.script,
    link: p.link,
    createdAt: p.created_at,
    deliveredOnTime: p.delivered_on_time,
    relationshipQuality: p.relationship_quality,
    wouldDoAgain: p.would_do_again,
  }));

  if (books) state.books = books.map(b => ({
    id: b.id,
    titulo: b.titulo,
    autor: b.autor,
    generos: b.generos || [],
    capaUrl: b.capa_url,
    statusLeitura: b.status_leitura,
    dataInicio: b.data_inicio,
    dataFim: b.data_fim,
    avaliacao: b.avaliacao,
    notasGerais: b.notas_gerais,
    createdAt: b.created_at,
    // Filtra anotações deletadas também
    paginasLidas: b.paginas_lidas ?? undefined,
    totalPaginas: b.total_paginas ?? undefined,
    editora: b.editora ?? undefined,
    anoPublicacao: b.ano_publicacao ?? undefined,
    isbn: b.isbn ?? undefined,
    idioma: b.idioma ?? undefined,
    traducao: b.traducao ?? undefined,
    serieColecao: b.serie_colecao ?? undefined,
    quemIndicou: b.quem_indicou ?? undefined,
    motivoEscolha: b.motivo_escolha ?? undefined,
    potencialConteudo: b.potencial_conteudo ?? undefined,
    capitulosCobertos: b.capitulos_cobertos ?? [],
    anotacoes: (b.book_annotations || [])
      .filter((a: any) => !a.deleted_at)
      .map((a: any) => ({
        id: a.id,
        livroId: a.livro_id,
        texto: a.texto,
        tipo: a.tipo,
        capituloRef: a.capitulo_ref,
        destilada: a.destilada ?? false,
        contentPotential: a.content_potential ?? false,
        createdAt: a.created_at,
      })),
  }));

  if (pilares) state.pilares = pilares.map(p => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao || '',
    cor: p.cor,
    hashtagsInstagram: p.hashtags_instagram || '',
    hashtagsTikTok: p.hashtags_tiktok || '',
    hashtagsYouTube: p.hashtags_youtube || '',
    templateLegenda: p.template_legenda || '',
    ativo: p.ativo ?? true,
    metaSemanalMin: p.meta_semanal_min ?? 0,
    metaSemanalMax: p.meta_semanal_max ?? 0,
  }));

  if (looks) state.looks = looks.map(l => ({
    id: l.id,
    numero: l.numero,
    descricao: l.descricao || '',
    cenarioAssociadoId: l.cenario_associado_id,
    ativo: l.ativo ?? true,
  }));

  if (cenarios) state.cenarios = cenarios.map(c => ({
    id: c.id,
    nome: c.nome,
    descricao: c.descricao || '',
    tempoSetupMinutos: c.tempo_setup_minutos ?? 0,
    ativo: c.ativo ?? true,
  }));

  if (config) {
    const onboarding = config.find((c: any) => c.key === 'onboarding_completo');
    const theme = config.find((c: any) => c.key === 'theme');
    const viewedGuides = config.find((c: any) => c.key === 'viewed_guides');
    if (onboarding) state.onboardingCompleto = onboarding.value;
    if (theme) state.theme = theme.value;
    if (viewedGuides) state.viewedGuides = viewedGuides.value || [];
  }

  if (dnaVoz) {
    state.dnaVoz = {
      promessaCentral: dnaVoz.promessa_central || '',
      publico: dnaVoz.publico || '',
      tom: dnaVoz.tom || '',
      pilares: dnaVoz.pilares || [],
      naoFaco: dnaVoz.nao_faco || [],
      alertas: dnaVoz.alertas || [],
    };
  }

  if (recordingBlocks) {
    state.recordingBlocks = recordingBlocks.map(rb => ({
      id: rb.id,
      name: rb.name,
      contentIds: rb.content_ids || [],
      createdAt: rb.created_at
    }));
  }

  if (goldenRules) {
    state.goldenRules = goldenRules.map((gr: any) => ({
      id: gr.id,
      descricao: gr.descricao,
      tipo: gr.tipo,
      ativa: gr.ativa,
    }));
  }

  return state;
}

// ─── Soft Delete: marca registros com deleted_at (nunca apaga de verdade) ────

export async function softDeleteFromSupabase(deletes: PendingDelete[]): Promise<void> {
  if (!supabase || deletes.length === 0) return;

  const now = new Date().toISOString();

  // Agrupa por tabela para fazer batch updates
  const byTable = deletes.reduce((acc, del) => {
    if (!acc[del.table]) acc[del.table] = [];
    acc[del.table].push(del.id);
    return acc;
  }, {} as Record<string, string[]>);

  const operations = Object.entries(byTable).map(([table, ids]) =>
    supabase!
      .from(table)
      .update({ deleted_at: now })
      .in('id', ids)
  );

  const results = await Promise.allSettled(operations);

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[Supabase] Soft delete failed for table ${Object.keys(byTable)[i]}:`, result.reason);
    }
  });
}

// ─── Salvar state ativo no Supabase (upsert) ────────────────────────────────

export async function saveToSupabase(state: AppState) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const userId = session.user.id;

  const results = await Promise.allSettled([
    // App config — upsert por linha para evitar conflito de constraint
    ...([
      { key: 'onboarding_completo', value: state.onboardingCompleto, user_id: userId },
      { key: 'theme', value: state.theme, user_id: userId },
      { key: 'viewed_guides', value: state.viewedGuides, user_id: userId },
    ].map(row => supabase!.from('app_config').upsert(row, { onConflict: 'user_id, key' }).then(({ error }) => {
      if (error) throw new Error(`app_config (${row.key}): ${error.message}`);
    }))),

    // DNA da Voz
    supabase!.from('dna_voz').upsert({
      user_id: userId,
      promessa_central: state.dnaVoz.promessaCentral,
      publico: state.dnaVoz.publico,
      tom: state.dnaVoz.tom,
      pilares: state.dnaVoz.pilares,
      nao_faco: state.dnaVoz.naoFaco,
      alertas: state.dnaVoz.alertas,
    }).then(({ error }) => { if (error) throw new Error(`dna_voz: ${error.message}`); }),

    // Contents
    (async () => {
      if (state.contents.length === 0) return;
      const { error } = await supabase!.from('contents').upsert(
        state.contents.map(c => ({
          id: c.id,
          title: c.title,
          series_id: c.seriesId && c.seriesId !== 'none' ? c.seriesId : null,
          pillar: c.pillar || 'Ideia',
          format: c.format || '',
          status: c.status || 'Ideia',
          slot_type: c.slotType || null,
          publish_date: c.publishDate || null,
          recording_date: c.recordingDate || null,
          look_id: c.lookId || null,
          scenario: c.scenario || null,
          estimated_duration: c.estimatedDuration ?? null,
          link: c.link || null,
          script: c.script || null,
          caption: c.caption || null,
          tags: c.tags || null,
          notes: c.notes || null,
          references: c.references || null,
          plataformas: c.plataformas || [],
          formato_visual: c.formatoVisual || null,
          livro_origem_id: c.livroOrigemId || null,
          legendas: c.legendas || {},
          script_notes: c.scriptNotes || [],
          created_at: c.createdAt,
          user_id: userId,
        }))
      );
      if (error) throw new Error(`contents: ${error.message}`);
    })(),

    // Ideas
    (async () => {
      if (state.ideas.length === 0) return;
      const { error } = await supabase!.from('ideas').upsert(
        state.ideas.map(i => ({
          id: i.id,
          text: i.text,
          pillar: i.pillar || null,
          series_id: i.seriesId || null,
          promoted_to_content_id: i.promotedToContentId || null,
          archived: i.archived,
          livro_origem_id: i.livroOrigemId || null,
          created_at: i.createdAt,
          user_id: userId,
        }))
      );
      if (error) throw new Error(`ideas: ${error.message}`);
    })(),

    // Series
    (async () => {
      if (state.series.length === 0) return;
      const { error } = await supabase!.from('series').upsert(
        state.series.map(s => ({
          id: s.id,
          name: s.name,
          template: s.template || '',
          notes: s.notes || '',
          pilar_id: s.pilarId || null,
          slot_padrao: s.slotPadrao || null,
          plataformas_principais: s.plataformasPrincipais || [],
          formato_visual_padrao: s.formatoVisualPadrao || null,
          estrutura_roteiro: s.estruturaRoteiro || null,
          bordao: s.bordao || null,
          cor: s.cor || null,
          ativa: s.ativa ?? true,
          frequencia_recomendada: s.frequenciaRecomendada || 'Sob demanda',
          hashtags_por_plataforma: s.hashtagsPorPlataforma || {},
          user_id: userId,
        }))
      );
      if (error) throw new Error(`series: ${error.message}`);
    })(),

    // Pilares
    (async () => {
      if (state.pilares.length === 0) return;
      const { error } = await supabase!.from('pilares').upsert(
        state.pilares.map(p => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao || '',
          cor: p.cor,
          hashtags_instagram: p.hashtagsInstagram || '',
          hashtags_tiktok: p.hashtagsTikTok || '',
          hashtags_youtube: p.hashtagsYouTube || '',
          template_legenda: p.templateLegenda || '',
          ativo: p.ativo ?? true,
          meta_semanal_min: p.metaSemanalMin ?? 0,
          meta_semanal_max: p.metaSemanalMax ?? 0,
          user_id: userId,
        }))
      );
      if (error) throw new Error(`pilares: ${error.message}`);
    })(),

    // Looks
    state.looks.length > 0 && supabase.from('looks').upsert(
      state.looks.map(l => ({
        id: l.id,
        numero: l.numero,
        descricao: l.descricao || '',
        cenario_associado_id: l.cenarioAssociadoId || null,
        ativo: l.ativo ?? true,
        user_id: userId,
      }))
    ),

    // Cenários
    state.cenarios.length > 0 && supabase.from('cenarios').upsert(
      state.cenarios.map(c => ({
        id: c.id,
        nome: c.nome,
        descricao: c.descricao || '',
        tempo_setup_minutos: c.tempoSetupMinutos ?? 0,
        ativo: c.ativo ?? true,
        user_id: userId,
      }))
    ),

    // Agenda
    state.agenda.length > 0 && supabase.from('agenda_items').upsert(
      state.agenda.map(a => ({
        id: a.id,
        title: a.title,
        date: a.date,
        type: a.type,
        slot_type: a.slotType || null,
        external: a.external ?? false,
        user_id: userId,
      }))
    ),

    // Energy logs
    state.energyLogs.length > 0 && supabase.from('energy_logs').upsert(
      state.energyLogs.map(e => ({
        date: e.date,
        level: e.level,
        user_id: userId,
      })),
      { onConflict: 'date' }
    ),

    // Partnerships
    state.partnerships.length > 0 && supabase.from('partnerships').upsert(
      state.partnerships.map(p => ({
        id: p.id,
        brand: p.brand,
        brand_color: p.brandColor,
        title: p.title,
        status: p.status,
        start_date: p.startDate || null,
        deadline: p.deadline || null,
        publish_date: p.publishDate || null,
        recording_date: p.recordingDate || null,
        value: p.value || 0,
        notes: p.notes || null,
        script: p.script || null,
        link: p.link || null,
        created_at: p.createdAt,
        delivered_on_time: p.deliveredOnTime ?? null,
        relationship_quality: p.relationshipQuality || null,
        would_do_again: p.wouldDoAgain ?? null,
        user_id: userId,
      }))
    ),

    // Results
    state.results.length > 0 && supabase.from('results').upsert(
      state.results.map(r => ({
        id: r.id,
        content_id: r.contentId || null,
        partnership_id: r.partnershipId || null,
        metrics: r.metrics || '',
        detailed_metrics: r.detailedMetrics || null,
        qualitative_notes: r.qualitativeNotes || '',
        worth_it: r.worthIt,
        engagement: r.engagement || null,
        creative_satisfaction: r.creativeSatisfaction || null,
        learning_by_series: r.learningBySeries || null,
        created_at: r.createdAt,
        user_id: userId,
      }))
    ),

    // Books
    state.books.length > 0 && supabase.from('books').upsert(
      state.books.map(b => ({
        id: b.id,
        titulo: b.titulo,
        autor: b.autor,
        generos: b.generos || [],
        capa_url: b.capaUrl || null,
        status_leitura: b.statusLeitura,
        data_inicio: b.dataInicio || null,
        data_fim: b.dataFim || null,
        avaliacao: b.avaliacao || null,
        notas_gerais: b.notasGerais || null,
        paginas_lidas: b.paginasLidas ?? null,
        total_paginas: b.totalPaginas ?? null,
        editora: b.editora || null,
        ano_publicacao: b.anoPublicacao || null,
        isbn: b.isbn || null,
        idioma: b.idioma || null,
        traducao: b.traducao || null,
        serie_colecao: b.serieColecao || null,
        quem_indicou: b.quemIndicou || null,
        motivo_escolha: b.motivoEscolha || null,
        potencial_conteudo: b.potencialConteudo || null,
        capitulos_cobertos: b.capitulosCobertos || [],
        created_at: b.createdAt,
        user_id: userId,
      }))
    ),
  ]);

  // Book annotations — upsert separately after books
  const allAnnotations = state.books.flatMap(b =>
    (b.anotacoes || []).map(a => ({
      id: a.id,
      livro_id: b.id,
      texto: a.texto,
      tipo: a.tipo,
      capitulo_ref: a.capituloRef || null,
      destilada: a.destilada ?? false,
      content_potential: a.contentPotential ?? false,
      created_at: a.createdAt,
      user_id: userId,
    }))
  );
  if (allAnnotations.length > 0) {
    await supabase.from('book_annotations').upsert(allAnnotations);
  }

  // Recording Blocks
  if (state.recordingBlocks.length > 0) {
    await supabase.from('recording_blocks').upsert(
      state.recordingBlocks.map(rb => ({
        id: rb.id,
        name: rb.name,
        content_ids: rb.contentIds,
        created_at: rb.createdAt,
        user_id: userId,
      }))
    );
  }

  // Golden Rules
  if (state.goldenRules.length > 0) {
    await supabase.from('golden_rules').upsert(
      state.goldenRules.map(gr => ({
        id: gr.id,
        descricao: gr.descricao,
        tipo: gr.tipo,
        ativa: gr.ativa,
        user_id: userId,
      }))
    );
  }
}
