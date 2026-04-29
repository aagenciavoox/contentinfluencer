-- =============================================================================
-- Core Creator — Schema PostgreSQL (Supabase)
-- =============================================================================
-- Engine   : PostgreSQL 15+ via Supabase
-- Auth     : Supabase Auth (auth.users)
-- Isolamento: user_id em todas as tabelas + RLS habilitado
-- Soft-delete: deleted_at TIMESTAMPTZ em entidades principais
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- HELPER: auto-atualiza updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 1. PLATAFORMAS
-- =============================================================================
-- user_id NULL  → plataforma padrão do sistema, visível a todos
-- user_id NOT NULL → plataforma customizada, visível só ao dono
-- =============================================================================

CREATE TABLE platforms (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  ativo      BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Padrões do sistema
INSERT INTO platforms (id, user_id, nome) VALUES
  ('00000000-0000-0000-0001-000000000001', NULL, 'Instagram'),
  ('00000000-0000-0000-0001-000000000002', NULL, 'TikTok'),
  ('00000000-0000-0000-0001-000000000003', NULL, 'YouTube'),
  ('00000000-0000-0000-0001-000000000004', NULL, 'Blog')
ON CONFLICT (id) DO NOTHING;

CREATE INDEX idx_platforms_user ON platforms(user_id);


-- =============================================================================
-- 2. PREFERÊNCIAS DO USUÁRIO
-- =============================================================================

CREATE TABLE user_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key     TEXT NOT NULL,
  value   TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);


-- =============================================================================
-- 3. DNA DA VOZ
-- =============================================================================

CREATE TABLE dna_voz (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  promessa_central TEXT        NOT NULL DEFAULT '',
  publico          TEXT        NOT NULL DEFAULT '',
  tom              TEXT        NOT NULL DEFAULT '',
  nao_faco         TEXT[]      NOT NULL DEFAULT '{}',
  alertas          TEXT[]      NOT NULL DEFAULT '{}',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_dna_voz_updated_at
  BEFORE UPDATE ON dna_voz
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 4. PILARES
-- =============================================================================

CREATE TABLE pilares (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  descricao  TEXT        NOT NULL DEFAULT '',
  cor        TEXT        NOT NULL DEFAULT '#888888',
  ativo      BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_pilares_updated_at
  BEFORE UPDATE ON pilares
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_pilares_user ON pilares(user_id);

-- Hashtags por pilar × plataforma
-- (substitui as colunas fixas hashtags_instagram / _tiktok / _youtube)
CREATE TABLE pilar_plataformas (
  pilar_id    UUID NOT NULL REFERENCES pilares(id)   ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  hashtags    TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (pilar_id, platform_id)
);


-- =============================================================================
-- 5. SÉRIES
-- =============================================================================

CREATE TABLE series (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  template              TEXT        NOT NULL DEFAULT '',
  notes                 TEXT        NOT NULL DEFAULT '',
  slot_padrao           TEXT,                   -- 'ÚNICO' | 'SÉRIE' | 'JANELA'
  formato_visual_padrao TEXT,                   -- ver enum em contents.formato_visual
  estrutura_roteiro     TEXT,
  bordao                TEXT,
  cor                   TEXT,
  ativa                 BOOLEAN     NOT NULL DEFAULT true,
  frequencia_recomendada TEXT,                  -- 'Semanal'|'Quinzenal'|'Mensal'|'Sob demanda'
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_series_updated_at
  BEFORE UPDATE ON series
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_series_user ON series(user_id);

-- Relação N:N série ↔ pilares
-- (substitui pilar_id único na tabela series)
CREATE TABLE serie_pilares (
  serie_id UUID NOT NULL REFERENCES series(id)  ON DELETE CASCADE,
  pilar_id UUID NOT NULL REFERENCES pilares(id) ON DELETE CASCADE,
  PRIMARY KEY (serie_id, pilar_id)
);

-- Hashtags por série × plataforma (somam às do pilar)
CREATE TABLE serie_plataformas (
  serie_id    UUID NOT NULL REFERENCES series(id)    ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  hashtags    TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (serie_id, platform_id)
);


-- =============================================================================
-- 6. CENÁRIOS E LOOKS
-- (usados como tags operacionais para agrupar gravações)
-- =============================================================================

CREATE TABLE cenarios (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome                TEXT        NOT NULL,
  descricao           TEXT        NOT NULL DEFAULT '',
  tempo_setup_minutos INTEGER     NOT NULL DEFAULT 0,
  ativo               BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cenarios_user ON cenarios(user_id);

CREATE TABLE looks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero      INTEGER     NOT NULL,
  descricao   TEXT        NOT NULL DEFAULT '',
  cenario_id  UUID        REFERENCES cenarios(id) ON DELETE SET NULL,
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_looks_user ON looks(user_id);


-- =============================================================================
-- 7. BIBLIOTECA
-- (livros, filmes, séries — qualquer fonte de repertório)
-- =============================================================================

-- Gêneros customizáveis por usuário
-- tipo NULL = universal (serve para qualquer tipo de item)
CREATE TABLE biblioteca_generos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  tipo       TEXT,                   -- 'livro' | 'filme' | 'série' | NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);

CREATE INDEX idx_biblioteca_generos_user ON biblioteca_generos(user_id);

-- Item da biblioteca
CREATE TABLE biblioteca_items (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo               TEXT        NOT NULL DEFAULT 'livro',
                                  -- 'livro' | 'filme' | 'série' | 'outro'
  titulo             TEXT        NOT NULL,
  autor_diretor      TEXT        NOT NULL DEFAULT '',
  capa_url           TEXT,
  status             TEXT        NOT NULL DEFAULT 'Quero consumir',
                                  -- 'Quero consumir' | 'Consumindo' | 'Pausado' | 'Concluído'
  data_inicio        DATE,
  data_fim           DATE,
  avaliacao          SMALLINT    CHECK (avaliacao BETWEEN 1 AND 5),
  notas_gerais       TEXT,
  potencial_conteudo SMALLINT    CHECK (potencial_conteudo BETWEEN 1 AND 3),
  total_paginas      INTEGER,     -- livros
  paginas_lidas      INTEGER,     -- livros
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

CREATE TRIGGER trg_biblioteca_items_updated_at
  BEFORE UPDATE ON biblioteca_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_biblioteca_items_user   ON biblioteca_items(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_biblioteca_items_tipo   ON biblioteca_items(user_id, tipo) WHERE deleted_at IS NULL;
CREATE INDEX idx_biblioteca_items_status ON biblioteca_items(user_id, status) WHERE deleted_at IS NULL;

-- Relação N:N item ↔ gêneros
CREATE TABLE item_generos (
  item_id   UUID NOT NULL REFERENCES biblioteca_items(id)   ON DELETE CASCADE,
  genero_id UUID NOT NULL REFERENCES biblioteca_generos(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, genero_id)
);

-- Anotações de itens da biblioteca
CREATE TABLE anotacoes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  item_id           UUID        NOT NULL REFERENCES biblioteca_items(id) ON DELETE CASCADE,
  texto             TEXT        NOT NULL,
  tipo              TEXT        NOT NULL DEFAULT 'Anotação',
                                -- 'Anotação' | 'Trecho' | 'Reação' | 'Análise'
                                -- | 'Ideia de conteúdo' | 'Pergunta'
  capitulo_ref      TEXT,
  content_potential BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_anotacoes_item ON anotacoes(item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_anotacoes_user ON anotacoes(user_id) WHERE deleted_at IS NULL;


-- =============================================================================
-- 8. CONTEÚDOS
-- =============================================================================

CREATE TABLE contents (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'Ideia',
                                 -- 'Ideia' | 'Pronto para Gravar' | 'Gravado'
                                 -- | 'A Editar' | 'Editado' | 'Programado' | 'Postado'
  slot_type          TEXT,       -- 'ÚNICO' | 'SÉRIE' | 'JANELA'
  series_id          UUID        REFERENCES series(id)           ON DELETE SET NULL,
  pilar_id           UUID        REFERENCES pilares(id)          ON DELETE SET NULL,
  look_id            UUID        REFERENCES looks(id)            ON DELETE SET NULL,
  cenario_id         UUID        REFERENCES cenarios(id)         ON DELETE SET NULL,
  biblioteca_item_id UUID        REFERENCES biblioteca_items(id) ON DELETE SET NULL,
  formato_visual     TEXT,
                                 -- 'Talking Head' | 'Tela Verde' | 'Voiceover'
                                 -- | 'POV Texto' | 'Reação' | 'Vlog' | 'Misto'
  energia_necessaria TEXT,       -- 'baixa' | 'média' | 'alta'
  publish_date       DATE,
  recording_date     DATE,
  link               TEXT,
  script             TEXT,
  script_notes       JSONB       NOT NULL DEFAULT '[]',
                                 -- [{id, text, selection:{from,to}, comment, color, createdAt}]
  tags               TEXT[]      NOT NULL DEFAULT '{}',
  notes              TEXT,
  referencias        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

CREATE TRIGGER trg_contents_updated_at
  BEFORE UPDATE ON contents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_contents_user       ON contents(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_status     ON contents(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_publish    ON contents(user_id, publish_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_recording  ON contents(user_id, recording_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_series     ON contents(series_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_pilar      ON contents(pilar_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_biblioteca ON contents(biblioteca_item_id) WHERE deleted_at IS NULL;

-- Publicação por plataforma
-- (substitui fields plataformas JSON + legendas JSON + caption)
CREATE TABLE content_plataformas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id   UUID NOT NULL REFERENCES contents(id)   ON DELETE CASCADE,
  platform_id  UUID NOT NULL REFERENCES platforms(id)  ON DELETE CASCADE,
  legenda      TEXT NOT NULL DEFAULT '',
  hashtags     TEXT NOT NULL DEFAULT '',
  publish_date DATE,
  UNIQUE (content_id, platform_id)
);

CREATE INDEX idx_content_plataformas_content  ON content_plataformas(content_id);
CREATE INDEX idx_content_plataformas_platform ON content_plataformas(platform_id);


-- =============================================================================
-- 9. IDEIAS
-- =============================================================================

CREATE TABLE ideas (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  text                   TEXT        NOT NULL,
  pilar_id               UUID        REFERENCES pilares(id)          ON DELETE SET NULL,
  series_id              UUID        REFERENCES series(id)           ON DELETE SET NULL,
  origem_id              UUID        REFERENCES biblioteca_items(id) ON DELETE SET NULL,
  promoted_to_content_id UUID        REFERENCES contents(id)         ON DELETE SET NULL,
  archived               BOOLEAN     NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ideas_user     ON ideas(user_id);
CREATE INDEX idx_ideas_active   ON ideas(user_id, archived) WHERE archived = false;


-- =============================================================================
-- 10. PROJETOS
-- (substitui campaigns + partnerships)
-- =============================================================================

CREATE TABLE projetos (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID         NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  nome               TEXT         NOT NULL,
  tipo               TEXT         NOT NULL DEFAULT 'outro',
                                  -- 'campanha' | 'publi' | 'producao' | 'outro'
  status             TEXT         NOT NULL DEFAULT 'Planejando',
                                  -- 'Planejando' | 'Em andamento' | 'Concluído' | 'Cancelado'
  data_inicio        DATE,
  data_fim           DATE,
  meta_conteudos     INTEGER,
  biblioteca_item_id UUID         REFERENCES biblioteca_items(id) ON DELETE SET NULL,
  -- campos para publis / parcerias
  brand              TEXT,
  brand_color        TEXT,        -- hex
  value              DECIMAL(10,2),
  currency           TEXT         NOT NULL DEFAULT 'BRL',
  notes              TEXT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

CREATE TRIGGER trg_projetos_updated_at
  BEFORE UPDATE ON projetos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_projetos_user    ON projetos(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projetos_tipo    ON projetos(user_id, tipo) WHERE deleted_at IS NULL;
CREATE INDEX idx_projetos_status  ON projetos(user_id, status) WHERE deleted_at IS NULL;

-- Etapas customizáveis por projeto
CREATE TABLE projeto_etapas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID        NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  ordem      SMALLINT    NOT NULL DEFAULT 0,
  status     TEXT        NOT NULL DEFAULT 'pendente',
                          -- 'pendente' | 'em_andamento' | 'concluída'
  data_prazo DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projeto_etapas_projeto ON projeto_etapas(projeto_id);

-- Relação N:N projetos ↔ conteúdos
CREATE TABLE projeto_conteudos (
  projeto_id UUID NOT NULL REFERENCES projetos(id)  ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES contents(id)  ON DELETE CASCADE,
  PRIMARY KEY (projeto_id, content_id)
);


-- =============================================================================
-- 11. BLOCOS DE GRAVAÇÃO
-- =============================================================================

CREATE TABLE recording_blocks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recording_blocks_user ON recording_blocks(user_id);

-- Relação N:N bloco ↔ conteúdos (substitui content_ids JSONB)
CREATE TABLE recording_block_contents (
  block_id   UUID     NOT NULL REFERENCES recording_blocks(id) ON DELETE CASCADE,
  content_id UUID     NOT NULL REFERENCES contents(id)         ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  gravado    BOOLEAN  NOT NULL DEFAULT false,
  PRIMARY KEY (block_id, content_id)
);

CREATE INDEX idx_rbc_block   ON recording_block_contents(block_id);
CREATE INDEX idx_rbc_content ON recording_block_contents(content_id);


-- =============================================================================
-- 12. TEMPLATES
-- =============================================================================

CREATE TABLE templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  platform_id UUID        REFERENCES platforms(id) ON DELETE SET NULL,
  series_id   UUID        REFERENCES series(id)    ON DELETE SET NULL,
  estrutura   JSONB       NOT NULL DEFAULT '[]',
                           -- [{id, tipo:'fixo'|'variavel', label, conteudo, placeholder}]
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_templates_user ON templates(user_id);


-- =============================================================================
-- 13. AGENDA
-- =============================================================================

CREATE TABLE agenda_items (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  date       DATE        NOT NULL,
  time       TIME,
  tipo       TEXT        NOT NULL DEFAULT 'Outro',
                          -- 'Reunião' | 'Entrega' | 'Publicação' | 'Outro'
  projeto_id UUID        REFERENCES projetos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agenda_items_user ON agenda_items(user_id);
CREATE INDEX idx_agenda_items_date ON agenda_items(user_id, date);


-- =============================================================================
-- 14. REGRAS DE OURO
-- =============================================================================

CREATE TABLE golden_rules (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao  TEXT        NOT NULL DEFAULT '',
  tipo       TEXT        NOT NULL,
              -- 'pilar' | 'série' | 'formato' | 'publi' | 'plataforma'
  condicao   TEXT        NOT NULL DEFAULT 'max',
              -- 'max' | 'min' | 'recomendado'
  periodo    TEXT        NOT NULL DEFAULT 'semana',
              -- 'dia' | 'semana' | 'mês'
  valor      INTEGER     NOT NULL DEFAULT 1,
  ativa      BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_golden_rules_user ON golden_rules(user_id);


-- =============================================================================
-- 15. MÉTRICAS DE CONTEÚDO
-- (substitui results)
-- =============================================================================

CREATE TABLE content_metrics (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id       UUID        NOT NULL REFERENCES contents(id)   ON DELETE CASCADE,
  platform_id      UUID        NOT NULL REFERENCES platforms(id)  ON DELETE CASCADE,
  -- comuns
  views            INTEGER,
  likes            INTEGER,
  comments         INTEGER,
  saves            INTEGER,
  shares           INTEGER,
  reposts          INTEGER,
  new_followers    INTEGER,
  accounts_reached INTEGER,
  -- YouTube
  watch_time       INTEGER,      -- minutos
  retention_rate   DECIMAL(5,2), -- %
  -- TikTok
  completion_rate  DECIMAL(5,2), -- %
  -- qualitativo
  qualitative_notes TEXT,
  registered_at    DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_id, platform_id)
);

CREATE INDEX idx_content_metrics_content  ON content_metrics(content_id);
CREATE INDEX idx_content_metrics_user     ON content_metrics(user_id);


-- =============================================================================
-- RLS — ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE platforms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dna_voz                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilares                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilar_plataformas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE series                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE serie_pilares            ENABLE ROW LEVEL SECURITY;
ALTER TABLE serie_plataformas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cenarios                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE looks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_generos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_generos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacoes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_plataformas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_etapas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projeto_conteudos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_blocks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_block_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates                ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE golden_rules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_metrics          ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Macro: tabelas com user_id direto
-- (USING para SELECT/UPDATE/DELETE, WITH CHECK para INSERT)
-- ---------------------------------------------------------------------------

-- user_preferences
CREATE POLICY rls_user_preferences ON user_preferences
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- dna_voz
CREATE POLICY rls_dna_voz ON dna_voz
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- pilares
CREATE POLICY rls_pilares ON pilares
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- series
CREATE POLICY rls_series ON series
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- cenarios
CREATE POLICY rls_cenarios ON cenarios
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- looks
CREATE POLICY rls_looks ON looks
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- biblioteca_generos
CREATE POLICY rls_biblioteca_generos ON biblioteca_generos
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- biblioteca_items
CREATE POLICY rls_biblioteca_items ON biblioteca_items
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- anotacoes
CREATE POLICY rls_anotacoes ON anotacoes
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- contents
CREATE POLICY rls_contents ON contents
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- ideas
CREATE POLICY rls_ideas ON ideas
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- projetos
CREATE POLICY rls_projetos ON projetos
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- recording_blocks
CREATE POLICY rls_recording_blocks ON recording_blocks
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- templates
CREATE POLICY rls_templates ON templates
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- agenda_items
CREATE POLICY rls_agenda_items ON agenda_items
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- golden_rules
CREATE POLICY rls_golden_rules ON golden_rules
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- content_metrics
CREATE POLICY rls_content_metrics ON content_metrics
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Tabelas de junção — herdam acesso via tabela pai
-- ---------------------------------------------------------------------------

-- pilar_plataformas → via pilares
CREATE POLICY rls_pilar_plataformas ON pilar_plataformas
  USING (EXISTS (
    SELECT 1 FROM pilares WHERE id = pilar_plataformas.pilar_id AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM pilares WHERE id = pilar_plataformas.pilar_id AND user_id = auth.uid()
  ));

-- serie_pilares → via series
CREATE POLICY rls_serie_pilares ON serie_pilares
  USING (EXISTS (
    SELECT 1 FROM series WHERE id = serie_pilares.serie_id AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM series WHERE id = serie_pilares.serie_id AND user_id = auth.uid()
  ));

-- serie_plataformas → via series
CREATE POLICY rls_serie_plataformas ON serie_plataformas
  USING (EXISTS (
    SELECT 1 FROM series WHERE id = serie_plataformas.serie_id AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM series WHERE id = serie_plataformas.serie_id AND user_id = auth.uid()
  ));

-- item_generos → via biblioteca_items
CREATE POLICY rls_item_generos ON item_generos
  USING (EXISTS (
    SELECT 1 FROM biblioteca_items WHERE id = item_generos.item_id AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM biblioteca_items WHERE id = item_generos.item_id AND user_id = auth.uid()
  ));

-- content_plataformas → via contents
CREATE POLICY rls_content_plataformas ON content_plataformas
  USING (EXISTS (
    SELECT 1 FROM contents WHERE id = content_plataformas.content_id AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM contents WHERE id = content_plataformas.content_id AND user_id = auth.uid()
  ));

-- projeto_etapas → via projetos
CREATE POLICY rls_projeto_etapas ON projeto_etapas
  USING (EXISTS (
    SELECT 1 FROM projetos WHERE id = projeto_etapas.projeto_id AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projetos WHERE id = projeto_etapas.projeto_id AND user_id = auth.uid()
  ));

-- projeto_conteudos → via projetos
CREATE POLICY rls_projeto_conteudos ON projeto_conteudos
  USING (EXISTS (
    SELECT 1 FROM projetos WHERE id = projeto_conteudos.projeto_id AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projetos WHERE id = projeto_conteudos.projeto_id AND user_id = auth.uid()
  ));

-- recording_block_contents → via recording_blocks
CREATE POLICY rls_recording_block_contents ON recording_block_contents
  USING (EXISTS (
    SELECT 1 FROM recording_blocks WHERE id = recording_block_contents.block_id AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM recording_blocks WHERE id = recording_block_contents.block_id AND user_id = auth.uid()
  ));

-- platforms — leitura: padrão (NULL) visível a todos; custom: só ao dono
--           — escrita: só o dono pode criar/editar as suas
CREATE POLICY rls_platforms_select ON platforms
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY rls_platforms_write ON platforms
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY rls_platforms_update ON platforms
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY rls_platforms_delete ON platforms
  FOR DELETE USING (user_id = auth.uid());


-- =============================================================================
-- ONBOARDING — trigger ao criar conta
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO user_preferences (user_id, key, value) VALUES
    (NEW.id, 'theme',                '"dark"'),
    (NEW.id, 'onboarding_completo',  'false');

  INSERT INTO dna_voz (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- RESUMO
-- =============================================================================
-- Tabelas    : 26
-- Índices    : 30
-- Políticas  : 27 (RLS)
-- Triggers   : 7 (updated_at) + 1 (onboarding)
--
-- Módulos:
--   Infraestrutura  → platforms, user_preferences, dna_voz
--   Editorial       → pilares, pilar_plataformas, series, serie_pilares, serie_plataformas
--   Produção        → cenarios, looks
--   Biblioteca      → biblioteca_generos, biblioteca_items, item_generos, anotacoes
--   Conteúdo        → contents, content_plataformas
--   Ideias          → ideas
--   Projetos        → projetos, projeto_etapas, projeto_conteudos
--   Gravação        → recording_blocks, recording_block_contents
--   Templates       → templates
--   Agenda          → agenda_items
--   Análise         → golden_rules, content_metrics
-- =============================================================================
