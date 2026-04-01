-- ============================================================
-- Content OS — Cloudflare D1 Schema
-- Banco: sbp_d1b38037605199ed6f0a6ec1cef0c3dabff141ca
-- Engine: SQLite (D1)
-- ============================================================
-- Arrays e objetos JSON são armazenados como TEXT (JSON.stringify)
-- BOOLEAN → INTEGER (0 = false, 1 = true)
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─── Configuração Global ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO app_config (key, value) VALUES
  ('theme', '"light"'),
  ('onboarding_completo', 'false');

-- ─── DNA da Voz ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dna_voz (
  id               INTEGER PRIMARY KEY CHECK (id = 1), -- single-row
  promessa_central TEXT    NOT NULL DEFAULT '',
  publico          TEXT    NOT NULL DEFAULT '',
  tom              TEXT    NOT NULL DEFAULT '',
  pilares          TEXT    NOT NULL DEFAULT '[]',   -- JSON string[]
  nao_faco         TEXT    NOT NULL DEFAULT '[]',   -- JSON string[]
  alertas          TEXT    NOT NULL DEFAULT '[]'    -- JSON string[]
);

INSERT OR IGNORE INTO dna_voz (id, promessa_central, publico, tom, pilares, nao_faco, alertas)
VALUES (1, '', '', '', '[]', '[]', '[]');

-- ─── Pilares Editoriais ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pilares (
  id                  TEXT    PRIMARY KEY,
  nome                TEXT    NOT NULL,
  descricao           TEXT    NOT NULL DEFAULT '',
  cor                 TEXT    NOT NULL DEFAULT '#888888',
  hashtags_instagram  TEXT    NOT NULL DEFAULT '',
  hashtags_tiktok     TEXT    NOT NULL DEFAULT '',
  hashtags_youtube    TEXT    NOT NULL DEFAULT '',
  template_legenda    TEXT    NOT NULL DEFAULT '',
  ativo               INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO pilares
  (id, nome, descricao, cor, hashtags_instagram, hashtags_tiktok, hashtags_youtube, template_legenda, ativo)
VALUES
  ('pilar-humor',
   'Humor',
   'GSA, POV, Tipos de Leitores, trends, exagero',
   '#F5C543',
   '#dizaianne #gsadiza #booktok #humor #leitura',
   '#dizaianne #gsadiza #booktok #humor #leitura',
   '#dizaianne #booktube #humor #livros #leitura #literatura #booktok #literário',
   'Gancho: [Situação absurda/engraçada]

Corpo: [Desenvolvimento do humor]

CTA: [Marca quem é assim / Salva pra mandar pra alguém]',
   1),

  ('pilar-analise',
   'Análise',
   'Calma eu te explico, Teoria da Conspiração, profundidade',
   '#4A90D9',
   '#dizaianne #calmaeudiza #booktok #leitura #literatura',
   '#dizaianne #calmaeudiza #booktok #leitura #análise',
   '#dizaianne #booktube #análise #livros #leitura #literatura #resenha #booktok',
   'Gancho: [Fato curioso ou questão provocativa]

Corpo: [Explicação aprofundada]

CTA: [Compartilhe com um amigo / O que você acha?]',
   1),

  ('pilar-identificacao',
   'Identificação',
   'É sobre você sim, frases, situações relacionáveis',
   '#E8A0BF',
   '#dizaianne #booktok #leitura #ésobrevocêsim #livros',
   '#dizaianne #booktok #leitura #ésobrevocêsim #livros',
   '#dizaianne #booktube #leitura #livros #identificação #literatura #booktok #conexão',
   'Gancho: [Situação que todo leitor já viveu]

Corpo: [Desenvolvimento da identificação]

CTA: [É sobre você sim / Marca quem precisa ver isso]',
   1),

  ('pilar-opiniao',
   'Opinião',
   'Inimigo comum, caixinha polêmica, posição forte',
   '#D44C47',
   '#dizaianne #booktok #opiniãoliterária #leitura #livros',
   '#dizaianne #booktok #opinião #leitura #livros',
   '#dizaianne #booktube #opinião #livros #leitura #literatura #booktok #literário',
   'Gancho: [Posição forte ou afirmação polêmica]

Corpo: [Argumento e desenvolvimento]

CTA: [Concorda? Me fala nos comentários]',
   1),

  ('pilar-indicacao',
   'Indicação',
   'Resenhas, recomendações, curadoria',
   '#448361',
   '#dizaianne #indicaçãodelivros #booktok #livros #leitura',
   '#dizaianne #indicação #booktok #livros #leitura',
   '#dizaianne #booktube #indicação #livros #leitura #resenha #literatura #booktok',
   'Gancho: [Por que esse livro é diferente]

Corpo: [O que você vai encontrar + para quem é]

CTA: [Já leu? Me conta / Link na bio]',
   1),

  ('pilar-culturapop',
   'Cultura Pop',
   'Guerra de Filmes, adaptações, séries, tendências',
   '#9065B0',
   '#dizaianne #culturapop #adaptação #booktok #filmes',
   '#dizaianne #culturapop #adaptação #booktok #filmes',
   '#dizaianne #booktube #culturapop #adaptação #filmes #livros #booktok #literário',
   'Gancho: [Polêmica ou comparação provocativa]

Corpo: [Análise e argumentos]

CTA: [Qual lado você escolhe? / Comenta aí]',
   1),

  ('pilar-ciencia',
   'Ciência',
   'Calma eu te explico com base científica, comportamento',
   '#2EAADC',
   '#dizaianne #calmaeudiza #ciência #booktok #leitura',
   '#dizaianne #calmaeudiza #ciência #booktok #leitura',
   '#dizaianne #booktube #ciência #comportamento #leitura #livros #booktok #literário',
   'Gancho: [Dado ou descoberta surpreendente]

Corpo: [Explicação científica acessível]

CTA: [Compartilha com quem precisa saber disso]',
   1);

-- ─── Séries ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS series (
  id                       TEXT    PRIMARY KEY,
  name                     TEXT    NOT NULL,
  template                 TEXT    NOT NULL DEFAULT '',
  notes                    TEXT    NOT NULL DEFAULT '',
  pilar_id                 TEXT    REFERENCES pilares(id) ON DELETE SET NULL,
  slot_padrao              TEXT,                        -- 'Curto' | 'Série' | 'Janela'
  plataformas_principais   TEXT    NOT NULL DEFAULT '[]', -- JSON Platform[]
  formato_visual_padrao    TEXT,                        -- VisualFormat
  estrutura_roteiro        TEXT,
  bordao                   TEXT,
  cor                      TEXT,
  ativa                    INTEGER NOT NULL DEFAULT 1,
  frequencia_recomendada   TEXT                         -- 'Semanal' | 'Quinzenal' | 'Mensal' | 'Sob demanda'
);

INSERT OR IGNORE INTO series
  (id, name, template, notes, pilar_id, slot_padrao, plataformas_principais, formato_visual_padrao, bordao, cor, ativa, frequencia_recomendada)
VALUES
  ('calma-explico',
   'Calma eu te explico',
   'Foco em autoridade e explicação clara. Começa com uma pergunta ou dado surpreendente.',
   'Melhor dia: Terça-feira.',
   'pilar-analise', 'Série',
   '["Instagram","TikTok"]',
   'Talking Head',
   'Calma, eu te explico.',
   '#4A90D9', 1, 'Semanal'),

  ('gsa',
   'GSA — Gestão de Sensatez Aplicada',
   'Humor inteligente. Situação absurda com lógica interna coerente.',
   '',
   'pilar-humor', 'Série',
   '["Instagram","TikTok"]',
   'Talking Head',
   'Gestão de Sensatez Aplicada.',
   '#F5C543', 1, 'Semanal'),

  ('sobre-voce',
   'É sobre você sim',
   'Profundidade e conexão. Começa como se fosse sobre o livro, revela que é sobre o leitor.',
   '',
   'pilar-identificacao', 'Série',
   '["Instagram","TikTok"]',
   'Talking Head',
   'É sobre você sim.',
   '#E8A0BF', 1, 'Semanal'),

  ('teoria-conspiracao',
   'Teoria da Conspiração',
   'Curiosidade e engajamento. Apresenta uma teoria sobre livros/leitura.',
   '',
   'pilar-analise', 'Série',
   '["Instagram","TikTok"]',
   'Talking Head',
   NULL,
   '#4A90D9', 1, 'Quinzenal'),

  ('guerra-filmes',
   'Guerra de Filmes',
   'Comparação provocativa entre adaptações e livros. Dois lados, uma vencedora.',
   '',
   'pilar-culturapop', 'Série',
   '["Instagram","TikTok","YouTube"]',
   'Talking Head',
   NULL,
   '#9065B0', 1, 'Quinzenal'),

  ('tipos-leitores',
   'Tipos de Leitores',
   'Comportamento e arquétipos. Humor de identificação.',
   '',
   'pilar-humor', 'Curto',
   '["Instagram","TikTok"]',
   'POV Texto',
   NULL,
   '#F5C543', 1, 'Semanal'),

  ('mudando-nome',
   'Mudando o nome dos livros',
   'Humor. Renomear livros famosos de forma cômica e certeira.',
   '',
   'pilar-humor', 'Curto',
   '["Instagram","TikTok"]',
   'POV Texto',
   NULL,
   '#F5C543', 1, 'Sob demanda');

-- ─── Looks ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS looks (
  id                   TEXT    PRIMARY KEY,
  numero               INTEGER NOT NULL,
  descricao            TEXT    NOT NULL DEFAULT '',
  cenario_associado_id TEXT    REFERENCES cenarios(id) ON DELETE SET NULL,
  ativo                INTEGER NOT NULL DEFAULT 1
);

-- ─── Cenários ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cenarios (
  id                    TEXT    PRIMARY KEY,
  nome                  TEXT    NOT NULL,
  descricao             TEXT    NOT NULL DEFAULT '',
  tempo_setup_minutos   INTEGER NOT NULL DEFAULT 0,
  ativo                 INTEGER NOT NULL DEFAULT 1
);

-- ─── Livros ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS books (
  id              TEXT    PRIMARY KEY,
  titulo          TEXT    NOT NULL,
  autor           TEXT    NOT NULL DEFAULT '',
  generos         TEXT    NOT NULL DEFAULT '[]',  -- JSON GeneroLivro[]
  capa_url        TEXT,
  status_leitura  TEXT    NOT NULL DEFAULT 'Quero ler',
  data_inicio     TEXT,
  data_fim        TEXT,
  avaliacao       INTEGER,                         -- 1-5
  notas_gerais    TEXT,
  created_at      TEXT    NOT NULL
);

-- ─── Anotações de Livro ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS book_annotations (
  id           TEXT    PRIMARY KEY,
  livro_id     TEXT    NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  texto        TEXT    NOT NULL,
  tipo         TEXT    NOT NULL,                   -- TipoAnotacao
  capitulo_ref TEXT,
  destilada    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_book_annotations_livro ON book_annotations(livro_id);

-- ─── Conteúdos ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contents (
  id                  TEXT    PRIMARY KEY,
  title               TEXT    NOT NULL,
  series_id           TEXT    REFERENCES series(id) ON DELETE SET NULL,
  pillar              TEXT    NOT NULL DEFAULT '',
  format              TEXT    NOT NULL DEFAULT '',   -- legado
  status              TEXT    NOT NULL DEFAULT 'Ideia',
  slot_type           TEXT,
  publish_date        TEXT,
  recording_date      TEXT,
  look_id             TEXT,
  scenario            TEXT,
  estimated_duration  INTEGER,
  link                TEXT,
  script              TEXT,
  caption             TEXT,                          -- legado
  tags                TEXT,
  notes               TEXT,
  references          TEXT,
  plataformas         TEXT    NOT NULL DEFAULT '[]', -- JSON Platform[]
  formato_visual      TEXT,
  livro_origem_id     TEXT    REFERENCES books(id) ON DELETE SET NULL,
  legendas            TEXT    NOT NULL DEFAULT '{}', -- JSON Record<Platform, string>
  created_at          TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contents_series      ON contents(series_id);
CREATE INDEX IF NOT EXISTS idx_contents_publish     ON contents(publish_date);
CREATE INDEX IF NOT EXISTS idx_contents_livro       ON contents(livro_origem_id);
CREATE INDEX IF NOT EXISTS idx_contents_status      ON contents(status);

-- ─── Ideias ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ideas (
  id                      TEXT    PRIMARY KEY,
  text                    TEXT    NOT NULL,
  created_at              TEXT    NOT NULL,
  pillar                  TEXT,
  series_id               TEXT    REFERENCES series(id) ON DELETE SET NULL,
  promoted_to_content_id  TEXT    REFERENCES contents(id) ON DELETE SET NULL,
  archived                INTEGER NOT NULL DEFAULT 0,
  livro_origem_id         TEXT    REFERENCES books(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ideas_livro    ON ideas(livro_origem_id);
CREATE INDEX IF NOT EXISTS idx_ideas_archived ON ideas(archived);

-- ─── Parcerias ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partnerships (
  id                    TEXT    PRIMARY KEY,
  brand                 TEXT    NOT NULL,
  brand_color           TEXT    NOT NULL DEFAULT '#888888',
  title                 TEXT    NOT NULL,
  status                TEXT    NOT NULL DEFAULT 'Leitura',
  deadline              TEXT,
  publish_date          TEXT,
  recording_date        TEXT,
  value                 REAL,
  notes                 TEXT,
  script                TEXT,
  link                  TEXT,
  created_at            TEXT    NOT NULL,
  delivered_on_time     INTEGER,                     -- 0 | 1 | NULL
  relationship_quality  INTEGER,                     -- 1-5
  would_do_again        INTEGER                      -- 0 | 1 | NULL
);

CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);

-- ─── Resultados ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS results (
  id                    TEXT    PRIMARY KEY,
  content_id            TEXT    REFERENCES contents(id) ON DELETE SET NULL,
  partnership_id        TEXT    REFERENCES partnerships(id) ON DELETE SET NULL,
  metrics               TEXT    NOT NULL DEFAULT '',
  qualitative_notes     TEXT    NOT NULL DEFAULT '',
  worth_it              TEXT    NOT NULL DEFAULT 'Mais ou menos', -- 'Sim' | 'Não' | 'Mais ou menos'
  engagement            TEXT,
  creative_satisfaction INTEGER,                     -- 1-5
  learning_by_series    TEXT,
  created_at            TEXT    NOT NULL
);

-- ─── Agenda ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agenda_items (
  id        TEXT    PRIMARY KEY,
  title     TEXT    NOT NULL,
  date      TEXT    NOT NULL,
  type      TEXT    NOT NULL,   -- 'Reunião' | 'Entrega' | 'Publicação'
  slot_type TEXT,
  external  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_agenda_date ON agenda_items(date);

-- ─── Energia ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS energy_logs (
  date  TEXT    PRIMARY KEY,    -- ISO date 'YYYY-MM-DD'
  level INTEGER NOT NULL        -- 1-5
);

-- ─── Regras de Ouro ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS golden_rules (
  id        TEXT    PRIMARY KEY,
  descricao TEXT    NOT NULL,
  tipo      TEXT    NOT NULL,   -- 'error' | 'warning' | 'info'
  ativa     INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO golden_rules (id, descricao, tipo, ativa) VALUES
  ('RG-01', 'Mesmo assunto/tema: máx. 2 conteúdos na mesma semana',           'warning', 1),
  ('RG-02', 'Mesma série: máx. 1 episódio por semana',                         'warning', 1),
  ('RG-03', 'Mesmo formato visual: máx. 1 por dia',                            'info',    1),
  ('RG-04', 'Publicidade: mín. 3 conteúdos orgânicos entre cada publi',        'warning', 1),
  ('RG-05', 'Instagram/TikTok: máx. 5 hashtags por legenda',                   'error',   1),
  ('RG-06', 'YouTube: recomendado 8–10 hashtags na descrição',                 'info',    1),
  ('RG-07', 'Pilar único dominando semana (>60% dos posts)',                   'warning', 1);

-- ─── Dados Mock Iniciais ─────────────────────────────────────────────────────

INSERT OR IGNORE INTO contents
  (id, title, series_id, pillar, format, status, slot_type, publish_date, plataformas, formato_visual, legendas, created_at)
VALUES
  ('mock-1',
   'Calma eu te explico: Por que lemos ficção?',
   'calma-explico', 'Análise', 'Reels', 'Postado', 'Série',
   '2026-03-25',
   '["Instagram"]', 'Talking Head', '{}',
   '2026-03-15T10:00:00Z'),

  ('mock-2',
   'POV: Leitor de suspense tentando dormir',
   'tipos-leitores', 'Humor', 'Reels', 'A Editar', 'Curto',
   '2026-03-27',
   '["Instagram","TikTok"]', 'POV Texto', '{}',
   '2026-03-18T14:30:00Z'),

  ('mock-3',
   'Minha leitura atual',
   '', 'Indicação', 'Stories', 'Pronto para Gravar', 'Janela',
   '2026-03-29',
   '["Instagram"]', NULL, '{}',
   '2026-03-20T09:00:00Z');
