# Série, pilar, funil e hashtags

O que cada campo grava e o que ele muda no app.

**Como se encaixam**

- **Pilar** = tema + ritmo da semana/ciclo + janela de postagem por rede.
- **Série** = formato recorrente. Herda pilares, define funil/energia/formato padrão e hashtags da peça.
- **Funil** = estágio da peça (topo / meio / fundo). A série sugere; o conteúdo pode sobrescrever.
- **Hashtags** = presets por rede no pilar e na série. Só entram na peça quando o conteúdo puxa ou a fila de legendas preenche.

Nada disso apaga o outro. Desligar um pilar ou série só tira das regras e dos seletores.

---

## 1. Pilar

Tabelas: `pilares` + `pilar_plataformas`.

### Identidade (`pilares`)

| Campo na tela | Nome salvo | Efeito |
|---|---|---|
| **Nome** | `nome` | Rótulo em listas, filtros, seletor do conteúdo, recomendações e alertas. Sem nome não salva. O “ID: humor” da tela é slug visual — **não é gravado**. |
| **Descrição** | `descricao` | Texto de apoio na lista. **Não entra** em ritmo, calendário, hashtags nem funil. |
| **Cor** | `cor` | Badge do pilar e faixa de ritmo. Cosmético. |
| **Ativo** | `ativo` | Inativo some dos seletores e **sai das regras** (frequência, dia, janela, recomendações). Conteúdos já ligados continuam. |

### Ritmo (`pilares`)

| Campo | Nome salvo | Efeito |
|---|---|---|
| **Frequência semanal** | `frequenciaSemanal` | Meta de posts **nesta semana** com esse `pilarId`. Abaixo: déficit. Acima: aviso. Vazio: “Sem ritmo”, a regra não roda. Se a meta do ciclo não foi editada à mão, preenche `metaCiclo = frequência × 4`. |
| **Meta por ciclo** | `metaCiclo` | Volume alvo nas **últimas 4 semanas** (estoque postável). `gap = meta − o que já está pronto`. Alimenta a recomendação do dia. Sem meta em nenhum pilar ativo, o sistema pede para configurar. |

### Por plataforma (`pilar_plataformas`)

Só grava a linha se tiver hashtag, dia ou janela.

| Campo | Nome salvo | Efeito |
|---|---|---|
| **Plataforma** | `platformId` | Amarra as regras à rede. Não cria a plataforma. |
| **Hashtags** | `hashtags` | Preset do pilar naquela rede. Ver [Hashtags](#4-hashtags). |
| **Melhores dias** | `melhoresDias` | `0–6` (dom–sáb). Filtra os dias em que esse pilar “pode” postar. Vazio = todos os dias com horário. Post fora: aviso. |
| **Janela início / fim** | `janelaHorarioInicio` / `janelaHorarioFim` | Faixa de hora. Cruza com os horários da plataforma. Post fora: aviso. Sem janela = qualquer horário do dia vale. |

O **relógio** (terça 18:00) não fica no pilar. Mora em `posting_time_entries`. O pilar só filtra.

### Vínculo com série

Não é coluna do pilar. Salva em `serie_pilares` (`series.pilarIds`). Serve para filtrar séries do pilar e ranquear o que gravar/postar quando há gap.

---

## 2. Série

Tabelas: `series` + `serie_pilares` + `serie_plataformas`. Templates de roteiro vão em `templates` (outra entidade, ligada por `seriesId`).

### Identidade (`series`)

| Campo na tela | Nome salvo | Efeito |
|---|---|---|
| **Nome** | `name` | Rótulo em listas, filtros, cards, recomendações e alertas de ritmo. Sem nome não salva. O “ID: destrinchando” é slug visual — **não é gravado**. |
| **Bordão** | `bordao` | Frase de identidade na ficha da série. **Não é copiado** para o roteiro. |
| **Cor** | `cor` | Avatar da série quando não tem capa. Cosmético. |
| **Capa** | `capaUrl` | Imagem da ficha/lista. Cosmético. |
| **Ativa** | `ativa` | Inativa some das regras de frequência e da tela editorial de hashtags. Conteúdos já ligados continuam. |

### Estratégia (`series`)

| Campo | Nome salvo | Efeito |
|---|---|---|
| **Pilares** | `pilarIds` → `serie_pilares` | Liga a série a um ou mais temas. Sem pilar, a série aparece como “em aberto”. Na criação de roteiro, o primeiro pilar vira `content.pilarId` se você não escolher outro. |
| **Funil padrão** | `funilPadrao` | `topo` \| `meio` \| `fundo`. Herdado pelo conteúdo que **não** define funil próprio. Agrupa a série na aba Funil. Ver [Funil](#3-funil). |
| **Frequência** | `frequenciaRecomendada` | `Semanal` / `Quinzenal` / `Mensal` / `Sob demanda`. Semanal = 1 post na semana. Quinzenal = 1 nos últimos 14 dias. Mensal = 1 nos últimos 28. “Sob demanda” ou vazio: **não cobra** ritmo. |
| **Formato visual padrão** | `formatoVisualPadrao` | Copiado para `content.formatoVisual` ao criar roteiro pela série. Depois o conteúdo tem o próprio valor (Reels, carrossel, etc.). |
| **Energia padrão** | `energiaPadrao` | `baixa` \| `média` \| `alta`. Copiada para `content.energiaNecessaria` ao criar pela série. Filtra e ordena a fila de gravação. |

Faltando pilar, funil, frequência, formato ou energia, a série fica “em aberto” (aviso na ficha, se a preferência `openInfoNotices` estiver ligada).

### Escrita (`series`)

| Campo | Nome salvo | Efeito |
|---|---|---|
| **Estrutura do roteiro** | `estruturaRoteiro` | Texto de apoio na ficha. **Não é colado** no script do conteúdo. |
| **Templates de roteiro** | tabela `templates` | Blocos reutilizáveis. No editor, “Aplicar template” **acrescenta** a estrutura no final do roteiro. Exige série já salva. |

Campos que ainda existem no banco e quase não aparecem na tela: `notes` (texto antigo da ficha), `template` (legado), `slotPadrao` (ao criar pela série, vira `content.slotType`).

---

## 3. Funil

Três lugares, com precedência.

### Na série — `series.funil_padrao`

| Valor | Significado | Efeito |
|---|---|---|
| `topo` | Atrair gente nova | Série entra no card Topo. Conteúdos sem funil próprio contam como topo. |
| `meio` | Conectar / confiança | Idem para Meio. |
| `fundo` | Converter / ação | Idem para Fundo. |
| vazio | Sem estágio | Série vai para “Sem funil”. Conteúdos só com essa série e sem ajuste manual **não entram** na contagem dos estágios. |

Não muda o texto do roteiro. Não muda hashtags. Não muda o calendário.

### No conteúdo — `contents.funil`

| Campo | Nome salvo | Efeito |
|---|---|---|
| **Funil** (painel do roteiro) | `funil` | Ajuste **desta peça**. Preenchido: vale o do conteúdo. Vazio: herda `serie.funilPadrao`. Sem série e sem valor: sem funil. |

Ao criar roteiro pela série, o conteúdo nasce com `funil: null` de propósito — para herdar. Se você mudar o funil da série depois, as peças sem ajuste acompanham.

Funil efetivo:

```
content.funil  →  senão  serie.funilPadrao  →  senão  nenhum
```

### Na aba Editorial → Funil — `user_preferences.editorial_settings`

| Campo na tela | Nome salvo | Efeito |
|---|---|---|
| **Proporção desejada** | `funnelTargets` `{ topo, meio, fundo }` | % que devem somar 100. Na leitura dos últimos 28 dias, calcula `meta proporcional` de cada estágio. Vazio: só mostra contagem, sem meta. |
| **Avisar estágio quieto** | `funnelQuietDays` | Dias sem publicação daquele estágio para marcar “Mais quieto”. Vazio: desligado. |

Essa leitura **não gera alerta** em dashboard, calendário ou programação. Fica só na aba Funil.

Conta publicação (ou data de post) no ciclo de 28 dias. Peça sem funil efetivo incrementa “Sem funil”.

---

## 4. Hashtags

Três camadas. Nenhuma substitui a outra automaticamente no post — o conteúdo tem o valor final.

### Preset do pilar — `pilar_plataformas.hashtags`

Por rede. Editável no pilar **e** em Editorial → Hashtags.

- Aparece no editor de legenda como “Puxar do pilar”.
- Se a **legenda** do conteúdo tiver **mais** `#` do que esse padrão, o ritmo avisa (info, não bloqueia).
- Na fila de legendas, se a peça ainda não tem tags naquela rede, o sistema **puxa sozinho** série + pilar (série primeiro, depois pilar, no máximo 10).

### Preset da série — `serie_plataformas.hashtags`

Por rede. Só grava a linha se tiver texto. Editável na série **e** em Editorial → Hashtags.

- Aparece como “Puxar da série”.
- Tem prioridade visual no editor (série acima do pilar).
- Na fila automática, entra **antes** das tags do pilar.

A série **não** tem dia, janela nem frequência de hashtag. Só a lista.

### Valor da peça — `content_plataformas.hashtags`

| Campo | Nome salvo | Efeito |
|---|---|---|
| **Hashtags da plataforma** | `hashtags` | O que de fato vai no post. Copiar legenda, exportar, programação e fila usam **este** campo. Limite de 10 no editor. |

A **legenda** (`content_plataformas.legenda`) é texto separado. Hashtags no meio da legenda só entram na regra de “acima do padrão do pilar”.

### Fluxo

1. Você define presets no pilar e/ou na série, por rede.
2. Editorial → Hashtags é o mesmo dado, visto por plataforma.
3. No roteiro (desktop), o editor **não cola sozinho** — tem que “Puxar da série/pilar”.
4. Na fila de legendas, se estiver vazio, **cola sozinho** série + pilar.
5. Depois disso, o valor é da peça. Mudar o preset **não atualiza** posts já preenchidos.

---

## Herança ao criar um roteiro pela série

| Sai da série | Vai para o conteúdo | Depois |
|---|---|---|
| primeiro `pilarId` | `pilarId` | editável |
| `formatoVisualPadrao` | `formatoVisual` | editável |
| `energiaPadrao` | `energiaNecessaria` | editável |
| `slotPadrao` | `slotType` | pouco usado na UI |
| `funilPadrao` | **não copia** (`funil` fica vazio) | herda até você ajustar |
| hashtags da série/pilar | **não copia** no create | puxa no editor ou na fila |
| `estruturaRoteiro` / `bordao` | **não copia** | só consulta |

---

## O que cada um *não* faz

| | Não faz |
|---|---|
| **Descrição do pilar** | Não alimenta IA, ritmo nem hashtags. |
| **Bordão / estrutura da série** | Não entra no script. |
| **Funil** | Não escolhe horário, plataforma nem tags. |
| **Hashtag de pilar/série** | Não substitui a da peça depois de preenchida. |
| **Proporção do funil** | Não cobra produção em outras telas. |
| **Frequência da série “Sob demanda”** | Não gera déficit. |
