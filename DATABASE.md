# DATABASE.md

Baseado no schema atual em `schema.sql`. Este documento descreve as tabelas reais do banco em singular e `snake_case`, mesmo quando o nome fisico no SQL esta no plural.

## Convencoes gerais

- Multi-tenant: quase todas as entidades usam `user_id` e RLS por `auth.uid()`
- Soft delete: usado em `biblioteca_item`, `anotacao`, `conteudo` e `projeto` via `deleted_at`
- Datas automaticas: `created_at` com `default now()` e `updated_at` com trigger `set_updated_at()` nas entidades principais
- Dono dos dados: tabelas de juncao herdam permissao da tabela pai

## plataforma

- Nome: `platform`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid opcional -> referencia: `auth.users.id`
  - `nome` text obrigatorio
  - `ativo` boolean obrigatorio -> default: `true`
  - `created_at` timestamptz automatico
- Relacionamentos:
  - `platform` tem muitos `pilar_plataforma`
  - `platform` tem muitos `serie_plataforma`
  - `platform` tem muitos `content_plataforma`
  - `platform` tem muitos `content_metric`
  - `template` pertence opcionalmente a uma `platform`
- Regras de negocio:
  - plataformas padrao do sistema usam `user_id = null`
  - plataformas customizadas pertencem a um unico usuario
  - leitura via RLS: usuario ve plataformas globais e as suas
  - escrita/edicao/exclusao: usuario so mexe nas suas plataformas
- O que nao salvar:
  - `❌ plataformas_principais` em serie -> substituido por relacao `serie_plataforma`
  - `❌ plataformas` JSON em conteudo -> substituido por `content_plataforma`

## user_preference

- Nome: `user_preference`
- Campos:
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `key` text obrigatorio
  - `value` text obrigatorio
- Relacionamentos:
  - `user_preference` pertence a um usuario
- Regras de negocio:
  - chave primaria composta: (`user_id`, `key`)
  - preferencia sempre isolada por usuario via RLS
  - trigger de onboarding cria `theme` e `onboarding_completo`
- O que nao salvar:
  - `❌ app_config` global sem `user_id` -> substituido por preferencia por usuario

## dna_voz

- Nome: `dna_voz`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `promessa_central` text obrigatorio -> default: `''`
  - `publico` text obrigatorio -> default: `''`
  - `tom` text obrigatorio -> default: `''`
  - `nao_faco` text[] obrigatorio -> default: `{}`
  - `alertas` text[] obrigatorio -> default: `{}`
  - `updated_at` timestamptz automatico
- Relacionamentos:
  - `dna_voz` pertence a um usuario
- Regras de negocio:
  - `user_id` e `unique`: um DNA da voz por usuario
  - onboarding cria um registro vazio automaticamente
  - leitura e escrita protegidas por RLS
- O que nao salvar:
  - `❌ pilares` JSON dentro de `dna_voz` -> removido para evitar duplicacao com `pilar`

## pilar

- Nome: `pilar`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `nome` text obrigatorio
  - `descricao` text obrigatorio -> default: `''`
  - `cor` text obrigatorio -> default: `#888888`
  - `ativo` boolean obrigatorio -> default: `true`
  - `created_at` timestamptz automatico
  - `updated_at` timestamptz automatico
- Relacionamentos:
  - `pilar` tem muitos `pilar_plataforma`
  - `pilar` tem muitos `conteudo`
  - `pilar` tem muitas `idea`
  - `pilar` tem muitos `serie_pilar`
- Regras de negocio:
  - pertence sempre a um usuario
  - delete em `pilar` remove hashtags por plataforma em cascata
  - conteudos e ideias ligados usam `on delete set null`
  - edicao atualiza `updated_at` automaticamente
- O que nao salvar:
  - `❌ hashtags_instagram`, `❌ hashtags_tiktok`, `❌ hashtags_youtube` -> substituidos por `pilar_plataforma`
  - `❌ template_legenda` no proprio pilar -> sem uso no schema atual

## pilar_plataforma

- Nome: `pilar_plataforma`
- Campos:
  - `pilar_id` uuid obrigatorio -> referencia: `pilares.id`
  - `platform_id` uuid obrigatorio -> referencia: `platforms.id`
  - `hashtags` text obrigatorio -> default: `''`
- Relacionamentos:
  - `pilar_plataforma` pertence a um `pilar`
  - `pilar_plataforma` pertence a uma `platform`
- Regras de negocio:
  - chave primaria composta: (`pilar_id`, `platform_id`)
  - exclusao do pilar ou da plataforma remove o vinculo em cascata
  - acesso controlado a partir do dono do pilar
- O que nao salvar:
  - `❌ colunas fixas por rede social` -> modelo N:N por plataforma

## serie

- Nome: `serie`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `name` text obrigatorio
  - `template` text obrigatorio -> default: `''`
  - `notes` text obrigatorio -> default: `''`
  - `slot_padrao` text opcional -> valores esperados: `UNICO | SERIE | JANELA`
  - `formato_visual_padrao` text opcional
  - `estrutura_roteiro` text opcional
  - `bordao` text opcional
  - `cor` text opcional
  - `ativa` boolean obrigatorio -> default: `true`
  - `frequencia_recomendada` text opcional -> valores esperados: `Semanal | Quinzenal | Mensal | Sob demanda`
  - `created_at` timestamptz automatico
  - `updated_at` timestamptz automatico
- Relacionamentos:
  - `serie` tem muitos `conteudo`
  - `serie` tem muitas `idea`
  - `serie` tem muitos `serie_pilar`
  - `serie` tem muitos `serie_plataforma`
  - `template` pertence opcionalmente a uma `serie`
- Regras de negocio:
  - pertence sempre a um usuario
  - delete em `serie` remove relacoes auxiliares em cascata
  - conteudos e ideias ligados usam `on delete set null`
- O que nao salvar:
  - `❌ pilar_id` unico em serie -> substituido por `serie_pilar` para N:N
  - `❌ plataformas_principais` JSON -> substituido por `serie_plataforma`

## serie_pilar

- Nome: `serie_pilar`
- Campos:
  - `serie_id` uuid obrigatorio -> referencia: `series.id`
  - `pilar_id` uuid obrigatorio -> referencia: `pilares.id`
- Relacionamentos:
  - `serie_pilar` pertence a uma `serie`
  - `serie_pilar` pertence a um `pilar`
- Regras de negocio:
  - chave primaria composta: (`serie_id`, `pilar_id`)
  - exclusao da serie ou do pilar remove o vinculo
- O que nao salvar:
  - `❌ um unico pilar por serie` -> removido porque a serie pode cobrir varios pilares

## serie_plataforma

- Nome: `serie_plataforma`
- Campos:
  - `serie_id` uuid obrigatorio -> referencia: `series.id`
  - `platform_id` uuid obrigatorio -> referencia: `platforms.id`
  - `hashtags` text obrigatorio -> default: `''`
- Relacionamentos:
  - `serie_plataforma` pertence a uma `serie`
  - `serie_plataforma` pertence a uma `platform`
- Regras de negocio:
  - chave primaria composta: (`serie_id`, `platform_id`)
  - relacao segue o dono da serie
- O que nao salvar:
  - `❌ hashtags/plataformas em JSON dentro da serie` -> substituido por tabela de juncao

## cenario

- Nome: `cenario`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `nome` text obrigatorio
  - `descricao` text obrigatorio -> default: `''`
  - `tempo_setup_minutos` integer obrigatorio -> default: `0`
  - `ativo` boolean obrigatorio -> default: `true`
  - `created_at` timestamptz automatico
- Relacionamentos:
  - `cenario` tem muitos `look`
  - `conteudo` pertence opcionalmente a um `cenario`
- Regras de negocio:
  - pertence sempre a um usuario
  - se um `cenario` for apagado, `look.cenario_id` e `conteudo.cenario_id` viram `null`
- O que nao salvar:
  - `❌ scenario` string solta em conteudo -> substituida por FK `cenario_id`

## look

- Nome: `look`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `numero` integer obrigatorio
  - `descricao` text obrigatorio -> default: `''`
  - `cenario_id` uuid opcional -> referencia: `cenarios.id`
  - `ativo` boolean obrigatorio -> default: `true`
  - `created_at` timestamptz automatico
- Relacionamentos:
  - `look` pertence opcionalmente a um `cenario`
  - `conteudo` pertence opcionalmente a um `look`
- Regras de negocio:
  - pertence sempre a um usuario
  - apagar o look nao apaga conteudos; `look_id` vira `null`
- O que nao salvar:
  - `❌ look` embutido como texto em conteudo -> substituido por FK `look_id`

## biblioteca_genero

- Nome: `biblioteca_genero`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `nome` text obrigatorio
  - `tipo` text opcional -> valores esperados: `livro | filme | serie | null`
  - `created_at` timestamptz automatico
- Relacionamentos:
  - `biblioteca_genero` tem muitos `item_genero`
- Regras de negocio:
  - `unique (user_id, nome)`
  - pertence sempre a um usuario
- O que nao salvar:
  - `❌ generos` JSON direto no item da biblioteca -> substituido por `item_genero`

## biblioteca_item

- Nome: `biblioteca_item`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `tipo` text obrigatorio -> valores: `livro | filme | serie | outro`
  - `titulo` text obrigatorio
  - `autor_diretor` text obrigatorio -> default: `''`
  - `capa_url` text opcional
  - `status` text obrigatorio -> valores: `Quero consumir | Consumindo | Pausado | Concluido`
  - `data_inicio` date opcional
  - `data_fim` date opcional
  - `avaliacao` smallint opcional -> check: `1..5`
  - `notas_gerais` text opcional
  - `potencial_conteudo` smallint opcional -> check: `1..3`
  - `total_paginas` integer opcional
  - `paginas_lidas` integer opcional
  - `created_at` timestamptz automatico
  - `updated_at` timestamptz automatico
  - `deleted_at` timestamptz opcional
- Relacionamentos:
  - `biblioteca_item` tem muitos `item_genero`
  - `biblioteca_item` tem muitas `anotacao`
  - `conteudo` pertence opcionalmente a um `biblioteca_item`
  - `idea` pertence opcionalmente a um `biblioteca_item` como origem
  - `projeto` pertence opcionalmente a um `biblioteca_item`
- Regras de negocio:
  - soft delete: item excluido nao some fisicamente
  - avaliacao e potencial de conteudo possuem `check constraint`
  - indexes focam em itens nao deletados
  - RLS esconde registros soft deleted nas queries principais
- O que nao salvar:
  - `❌ books` como tabela separada de nomenclatura antiga -> consolidado em `biblioteca_item`

## item_genero

- Nome: `item_genero`
- Campos:
  - `item_id` uuid obrigatorio -> referencia: `biblioteca_items.id`
  - `genero_id` uuid obrigatorio -> referencia: `biblioteca_generos.id`
- Relacionamentos:
  - `item_genero` pertence a um `biblioteca_item`
  - `item_genero` pertence a um `biblioteca_genero`
- Regras de negocio:
  - chave primaria composta: (`item_id`, `genero_id`)
  - exclusao do item ou genero remove o vinculo
- O que nao salvar:
  - `❌ generoIds` como lista isolada sem tabela de apoio

## anotacao

- Nome: `anotacao`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `item_id` uuid obrigatorio -> referencia: `biblioteca_items.id`
  - `texto` text obrigatorio
  - `tipo` text obrigatorio -> valores: `Anotacao | Trecho | Reacao | Analise | Ideia de conteudo | Pergunta`
  - `capitulo_ref` text opcional
  - `content_potential` boolean obrigatorio -> default: `false`
  - `created_at` timestamptz automatico
  - `deleted_at` timestamptz opcional
- Relacionamentos:
  - `anotacao` pertence a um `biblioteca_item`
  - `anotacao` pertence a um usuario
- Regras de negocio:
  - soft delete para preservar historico
  - item apagado remove anotacoes em cascata
  - indexes consideram apenas anotacoes nao deletadas
- O que nao salvar:
  - `❌ destilada` -> removido do schema; era duplicado de estado derivavel pela acao do usuario
  - `❌ book_annotation` como nome legado -> consolidado em `anotacao`

## conteudo

- Nome: `content`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `title` text obrigatorio
  - `status` text obrigatorio -> valores: `Ideia | Pronto para Gravar | Gravado | A Editar | Editado | Programado | Postado`
  - `slot_type` text opcional -> valores esperados: `UNICO | SERIE | JANELA`
  - `series_id` uuid opcional -> referencia: `series.id`
  - `pilar_id` uuid opcional -> referencia: `pilares.id`
  - `look_id` uuid opcional -> referencia: `looks.id`
  - `cenario_id` uuid opcional -> referencia: `cenarios.id`
  - `biblioteca_item_id` uuid opcional -> referencia: `biblioteca_items.id`
  - `formato_visual` text opcional
  - `energia_necessaria` text opcional -> valores esperados: `baixa | media | alta`
  - `publish_date` date opcional
  - `recording_date` date opcional
  - `link` text opcional
  - `script` text opcional
  - `script_notes` jsonb obrigatorio -> default: `[]`
  - `tags` text[] obrigatorio -> default: `{}`
  - `notes` text opcional
  - `referencias` text opcional
  - `created_at` timestamptz automatico
  - `updated_at` timestamptz automatico
  - `deleted_at` timestamptz opcional
- Relacionamentos:
  - `conteudo` pertence opcionalmente a `serie`, `pilar`, `look`, `cenario` e `biblioteca_item`
  - `conteudo` tem muitos `content_plataforma`
  - `conteudo` tem muitas `idea` promovidas
  - `conteudo` tem muitos `projeto_conteudo`
  - `conteudo` tem muitos `recording_block_content`
  - `conteudo` tem muitos `content_metric`
- Regras de negocio:
  - soft delete: excluir nao remove fisicamente
  - exclusao de serie/pilar/look/cenario/item de origem nao exclui conteudo; campo vira `null`
  - indices dedicados a status, datas, serie, pilar e item de origem
  - script notes ficam em JSONB com estrutura livre
- O que nao salvar:
  - `❌ caption` -> substituido por `content_plataforma.legenda`
  - `❌ legendas` JSON por plataforma -> substituido por `content_plataforma`
  - `❌ plataformas` JSON -> substituido por `content_plataforma`
  - `❌ pillar` string -> substituido por FK `pilar_id`
  - `❌ scenario` string -> substituido por FK `cenario_id`
  - `❌ livro_origem_id` -> substituido por `biblioteca_item_id`
  - `❌ format` -> consolidado em `formato_visual`

## content_plataforma

- Nome: `content_plataforma`
- Campos:
  - `id` uuid obrigatorio
  - `content_id` uuid obrigatorio -> referencia: `contents.id`
  - `platform_id` uuid obrigatorio -> referencia: `platforms.id`
  - `legenda` text obrigatorio -> default: `''`
  - `hashtags` text obrigatorio -> default: `''`
  - `publish_date` date opcional
- Relacionamentos:
  - `content_plataforma` pertence a um `conteudo`
  - `content_plataforma` pertence a uma `platform`
- Regras de negocio:
  - `unique (content_id, platform_id)`: um registro por plataforma dentro do mesmo conteudo
  - exclusao do conteudo remove todas as publicacoes por plataforma
  - acesso segue o dono do conteudo
- O que nao salvar:
  - `❌ caption` unico no conteudo -> nao atende multiplas plataformas
  - `❌ legendas` em JSON -> perde integridade e dificulta consulta

## idea

- Nome: `idea`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `text` text obrigatorio
  - `pilar_id` uuid opcional -> referencia: `pilares.id`
  - `series_id` uuid opcional -> referencia: `series.id`
  - `origem_id` uuid opcional -> referencia: `biblioteca_items.id`
  - `promoted_to_content_id` uuid opcional -> referencia: `contents.id`
  - `archived` boolean obrigatorio -> default: `false`
  - `created_at` timestamptz automatico
- Relacionamentos:
  - `idea` pertence opcionalmente a um `pilar`, `serie`, `biblioteca_item` e `conteudo`
- Regras de negocio:
  - uma ideia pode existir sem vinculos
  - promocao para conteudo nao exige exclusao da ideia
  - indice dedicado para ideias ativas (`archived = false`)
- O que nao salvar:
  - `❌ pillar` string em ideia -> substituido por FK `pilar_id`

## projeto

- Nome: `projeto`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `nome` text obrigatorio
  - `tipo` text obrigatorio -> valores: `campanha | publi | producao | outro`
  - `status` text obrigatorio -> valores: `Planejando | Em andamento | Concluido | Cancelado`
  - `data_inicio` date opcional
  - `data_fim` date opcional
  - `meta_conteudos` integer opcional
  - `biblioteca_item_id` uuid opcional -> referencia: `biblioteca_items.id`
  - `brand` text opcional
  - `brand_color` text opcional
  - `value` decimal(10,2) opcional
  - `currency` text obrigatorio -> default: `BRL`
  - `notes` text opcional
  - `created_at` timestamptz automatico
  - `updated_at` timestamptz automatico
  - `deleted_at` timestamptz opcional
- Relacionamentos:
  - `projeto` tem muitos `projeto_etapa`
  - `projeto` tem muitos `projeto_conteudo`
  - `projeto` tem muitos `agenda_item`
  - `projeto` pertence opcionalmente a um `biblioteca_item`
- Regras de negocio:
  - substitui campanhas e partnerships em uma unica entidade
  - soft delete para historico
  - exclusao do projeto remove etapas e vinculos de conteudo em cascata
  - agenda ligada ao projeto usa `on delete set null`
- O que nao salvar:
  - `❌ campaign` como modulo separado -> consolidado em `projeto`
  - `❌ partnership` como modulo separado -> consolidado em `projeto`
  - `❌ partnership_id` em metricas/resultados -> modelo atual mede por conteudo/plataforma

## projeto_etapa

- Nome: `projeto_etapa`
- Campos:
  - `id` uuid obrigatorio
  - `projeto_id` uuid obrigatorio -> referencia: `projetos.id`
  - `nome` text obrigatorio
  - `ordem` smallint obrigatorio -> default: `0`
  - `status` text obrigatorio -> valores: `pendente | em_andamento | concluida`
  - `data_prazo` date opcional
  - `created_at` timestamptz automatico
- Relacionamentos:
  - `projeto_etapa` pertence a um `projeto`
- Regras de negocio:
  - exclusao do projeto remove etapas em cascata
  - ordenacao das etapas e responsabilidade do campo `ordem`
- O que nao salvar:
  - `❌ status agregado calculado sem etapas` como unica fonte -> modelo atual guarda etapas explicitas

## projeto_conteudo

- Nome: `projeto_conteudo`
- Campos:
  - `projeto_id` uuid obrigatorio -> referencia: `projetos.id`
  - `content_id` uuid obrigatorio -> referencia: `contents.id`
- Relacionamentos:
  - `projeto_conteudo` pertence a um `projeto`
  - `projeto_conteudo` pertence a um `conteudo`
- Regras de negocio:
  - chave primaria composta: (`projeto_id`, `content_id`)
  - exclusao do projeto ou conteudo remove o vinculo
- O que nao salvar:
  - `❌ content_ids` direto no projeto -> substituido por tabela de juncao

## recording_block

- Nome: `recording_block`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `name` text obrigatorio -> default: `''`
  - `created_at` timestamptz automatico
- Relacionamentos:
  - `recording_block` tem muitos `recording_block_content`
- Regras de negocio:
  - pertence sempre a um usuario
  - exclusao do bloco remove seus itens em cascata
- O que nao salvar:
  - `❌ content_ids` JSON dentro do bloco -> substituido por `recording_block_content`

## recording_block_content

- Nome: `recording_block_content`
- Campos:
  - `block_id` uuid obrigatorio -> referencia: `recording_blocks.id`
  - `content_id` uuid obrigatorio -> referencia: `contents.id`
  - `ordem` smallint obrigatorio -> default: `0`
  - `gravado` boolean obrigatorio -> default: `false`
- Relacionamentos:
  - `recording_block_content` pertence a um `recording_block`
  - `recording_block_content` pertence a um `conteudo`
- Regras de negocio:
  - chave primaria composta: (`block_id`, `content_id`)
  - grava o progresso do roteiro dentro do bloco sem alterar obrigatoriamente o conteudo principal
- O que nao salvar:
  - `❌ array de ids sem ordem/granularidade` -> removido em favor da juncao com `ordem` e `gravado`

## template

- Nome: `template`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `nome` text obrigatorio
  - `platform_id` uuid opcional -> referencia: `platforms.id`
  - `series_id` uuid opcional -> referencia: `series.id`
  - `estrutura` jsonb obrigatorio -> default: `[]`
  - `ativo` boolean obrigatorio -> default: `true`
  - `created_at` timestamptz automatico
  - `updated_at` timestamptz automatico
- Relacionamentos:
  - `template` pertence opcionalmente a uma `platform`
  - `template` pertence opcionalmente a uma `serie`
- Regras de negocio:
  - estrutura fica em JSONB de blocos `{id, tipo, label, conteudo, placeholder}`
  - delete da serie ou plataforma associada nao deleta o template; a FK vira `null`
- O que nao salvar:
  - `❌ estrutura espalhada em varias colunas` -> consolidada em `estrutura` JSONB

## agenda_item

- Nome: `agenda_item`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `title` text obrigatorio
  - `date` date obrigatorio
  - `time` time opcional
  - `tipo` text obrigatorio -> valores: `Reuniao | Entrega | Publicacao | Outro`
  - `projeto_id` uuid opcional -> referencia: `projetos.id`
  - `created_at` timestamptz automatico
- Relacionamentos:
  - `agenda_item` pertence opcionalmente a um `projeto`
- Regras de negocio:
  - agenda e sempre do usuario autenticado
  - apagar projeto nao apaga agenda historica; `projeto_id` vira `null`
- O que nao salvar:
  - `❌ external` boolean como origem -> removido por ser pouco expressivo
  - `❌ date` como texto livre -> substituido por `date` real e `time` separado

## golden_rule

- Nome: `golden_rule`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `descricao` text obrigatorio -> default: `''`
  - `tipo` text obrigatorio -> valores: `pilar | serie | formato | publi | plataforma`
  - `condicao` text obrigatorio -> valores: `max | min | recomendado`
  - `periodo` text obrigatorio -> valores: `dia | semana | mes`
  - `valor` integer obrigatorio -> default: `1`
  - `ativa` boolean obrigatorio -> default: `true`
  - `created_at` timestamptz automatico
- Relacionamentos:
  - `golden_rule` pertence a um usuario
- Regras de negocio:
  - regras sao personalizaveis por usuario
  - banco guarda configuracao; avaliacao da regra hoje acontece na aplicacao
- O que nao salvar:
  - `❌ regra somente com severidade visual (error/warning/info)` -> substituida por regra parametrica de negocio

## content_metric

- Nome: `content_metric`
- Campos:
  - `id` uuid obrigatorio
  - `user_id` uuid obrigatorio -> referencia: `auth.users.id`
  - `content_id` uuid obrigatorio -> referencia: `contents.id`
  - `platform_id` uuid obrigatorio -> referencia: `platforms.id`
  - `views` integer opcional
  - `likes` integer opcional
  - `comments` integer opcional
  - `saves` integer opcional
  - `shares` integer opcional
  - `reposts` integer opcional
  - `new_followers` integer opcional
  - `accounts_reached` integer opcional
  - `watch_time` integer opcional
  - `retention_rate` decimal(5,2) opcional
  - `completion_rate` decimal(5,2) opcional
  - `qualitative_notes` text opcional
  - `registered_at` date obrigatorio -> default: `current_date`
  - `created_at` timestamptz automatico
- Relacionamentos:
  - `content_metric` pertence a um `conteudo`
  - `content_metric` pertence a uma `platform`
- Regras de negocio:
  - `unique (content_id, platform_id)`: uma linha por conteudo/plataforma
  - metricas ficam consultaveis em colunas tipadas, sem depender de JSON textual
- O que nao salvar:
  - `❌ results` como tabela generica de pos-mortem -> substituida por `content_metric`
  - `❌ metrics` em TEXT/JSON solto -> substituido por colunas dedicadas
  - `❌ worth_it`, `❌ engagement`, `❌ creative_satisfaction`, `❌ learning_by_series` -> removidos do schema atual; se voltarem, precisam de modelagem explicita

## Regras transversais que o banco precisa garantir

- Todo usuario so le e escreve os proprios dados, com excecao de `platform` global do sistema
- Deletes em entidades principais preservam historico quando a regra e soft delete
- Tabelas de juncao nao podem ter duplicatas por causa de chaves primarias compostas
- Relacoes auxiliares devem cair em cascata ao apagar o pai quando fazem parte estrutural dele
- Relacoes de contexto (`serie`, `pilar`, `look`, `cenario`, `biblioteca_item`, `projeto`) usam `set null` quando apagar o pai nao deve apagar o filho

## Regras que hoje estao mais na aplicacao do que no banco

- Sequencia valida de status de `conteudo`
- Sequencia valida de status de `projeto`
- Validacoes semanticas como "pedido sem itens" equivalente aqui seria "bloco sem conteudos" ou "projeto sem etapas", que o banco ainda nao bloqueia por constraint
- Coerencia entre `paginas_lidas` e `total_paginas`
- Padronizacao fechada de enums textuais, que hoje estao documentados em comentarios e tipagem TS, nao em `CHECK` para todos os campos

## Alias e nomes legados que nao sao tabelas reais hoje

- `books` -> alias de app para `biblioteca_item`
- `partnerships` -> alias de app para `projeto`
- `results` -> alias de app para `content_metric`
- `agenda` -> alias de app para `agenda_item`
- `campaigns` -> conceito absorvido por `projeto`
