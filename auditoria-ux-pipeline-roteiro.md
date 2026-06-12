# Auditoria UX — Pipeline & Roteiro

> Auditoria realizada em 11/06/2026 sobre os fluxos de criação de roteiro, envio para gravação, criação de bloco, modo explosão e histórico.

---

## 1. Mapeamento do fluxo atual

O usuário percorre este caminho para publicar um conteúdo:

```
Pipeline (/conteudos)
  └─ Criar conteúdo
       └─ ContentDetailPage
            ├─ [Tab: Escrever] Escrever roteiro + painel lateral de metadados
            │    └─ Ação primária: "Deixar disponível para gravação"
            │         └─ Avança status → "Pronto para Gravar"
            │         └─ Redireciona para Tab: Fluxo
            │
            └─ [Tab: Fluxo] RecordingSection + PublishingSection empilhadas
                 ├─ RecordingSection
                 │    └─ Se sem bloco: botão "Ir para Gravação" → /gravacao
                 │         └─ RecordingPage [Tab: Sem bloco]
                 │              └─ Selecionar conteúdos → "Criar bloco"
                 │                   └─ RecordingPage [Tab: Blocos]
                 │                        └─ Abrir bloco → /gravacao/:id
                 │                             └─ RecordingBlockPage
                 │                                  └─ Ler roteiro → Marcar gravado
                 │
                 └─ PublishingSection (visível em todos os estágios)
                      └─ Plataformas + copy + agendamento
                           └─ "Marcar como postado"
```

**Total de telas/passos para gravar um conteúdo depois do roteiro:** 6 ações em 3 páginas diferentes.

---

## 2. Problemas identificados

### P1 · Crítico — Tab "Fluxo" mistura dois contextos incompatíveis

**Arquivo:** `ContentDetailShell.tsx` (aba `fluxo`)  
**O que acontece:** A tab "Fluxo" sempre renderiza `RecordingSection` + `PublishingSection` empilhadas, independente do estágio do conteúdo. Um conteúdo recém-promovido para "Pronto para Gravar" já exibe toda a seção de publicação (plataformas, hashtags, agendamento) — informação irrelevante e prematura nesse momento.

**Impacto:** Carga cognitiva alta. O usuário não sabe onde focar.

**Recomendação:** Tornar o conteúdo da aba contextual ao estágio. A `PublishingSection` só deveria aparecer a partir de "Gravado". Usar o `ContentStage` para isso:

```tsx
// Em ContentDetailShell, dentro da tab 'fluxo':
{stage === ContentStage.PRONTO_PARA_GRAVAR || stage === ContentStage.EM_BLOCO ? (
  <RecordingSection ... />
) : stage === ContentStage.GRAVADO || stage === ContentStage.PRODUCAO || ... ? (
  <>
    <RecordingSection ... />  {/* compact, só mostra status */}
    <PublishingSection ... />
  </>
) : null}
```

---

### P2 · Crítico — Dois componentes de navegação empilhados fazendo a mesma coisa

**Arquivos:** `ContentPipelineStepper.tsx` + `ContentDetailTabs.tsx`  
**O que acontece:** O `ContentDetailShell` renderiza o `ContentPipelineStepper` logo abaixo do header, e a aba "Fluxo" do stepper faz exatamente o que a `ContentDetailTabs` já faz. Ambos existem em paralelo no código mas `ContentDetailTabs` foi removido do render desktop (só o `ContentPipelineStepper` aparece), enquanto mobile usa uma estrutura diferente.

**Resultado:** `ContentDetailTabs.tsx` existe no código mas não aparece no desktop. O `ContentPipelineStepper` não comunica progresso real — mapeia 8 estágios para apenas 2 botões ("Escrever" / "Fluxo"), perdendo totalmente a função de pipeline.

**Recomendação:** Unificar em um único componente. O stepper deveria mostrar o progresso real do pipeline (ao menos os estágios principais: Ideia → Roteiro → Pronto → Gravado → Postado) de forma visual, não como navegação por abas.

```
[● Roteiro] ──── [○ Gravação] ──── [○ Publicação]
```

---

### P3 · Alto — Duplo controle de status gera ambiguidade

**Onde:** Header (`ContentDetailHeader`) tem dropdown de status + `ContentOperationalPanel` (sidebar) também tem `<select>` de status.  
**Problema:** Dois controles para o mesmo campo na mesma tela. O usuário não sabe qual usar, e qualquer mudança num pode conflitar visualmente com o outro antes do save.

**Recomendação:** Manter o controle de status **apenas no header** (onde está naturalmente, junto ao nome). Remover o `<select>` de status do `ContentOperationalPanel`. O painel lateral deve conter apenas metadados editoriais (série, pilar, formato, slot, datas).

---

### P4 · Alto — Fluxo de criação de bloco está fragmentado e sem retorno claro

**Caminho atual para criar um bloco:**
1. Conteúdo detalhe → Tab "Fluxo" → ver RecordingSection
2. Clicar "Ir para Gravação" → sai da página do conteúdo
3. Em `/gravacao`, marcar checkbox do conteúdo
4. Clicar "Criar bloco" → preencher nome → confirmar
5. Tab muda para "Blocos" automaticamente
6. Clicar no bloco → abrir `/gravacao/:id`

**Problemas:**
- O clique na linha do conteúdo **abre o detalhe** (não seleciona). A seleção é feita apenas pelo checkbox pequeno. Isso contradiz a expectativa — na lista de gravação o propósito é selecionar, não navegar.
- Não há confirmação clara de que o conteúdo foi adicionado ao bloco quando o usuário volta para o detalhe do conteúdo.
- Clicar "Ir para Gravação" abandona o contexto sem salvar o rascunho atual.

**Recomendação:** 
- Inverter o comportamento da linha: clicar na linha seleciona, um ícone de "abrir" no canto navega para o detalhe.
- Adicionar um **sheet/modal de criação de bloco** diretamente no detalhe do conteúdo (já existe `SendToRecordingSheet` no mobile — estender para desktop).
- O botão "Guardar em um bloco" (ação primária do estágio `PRONTO_PARA_GRAVAR`) deveria abrir esse sheet inline, não navegar para outra página.

---

### P5 · Alto — Label "Fluxo" com ícone de claquete não comunica nada

**Arquivo:** `ContentDetailTabs.tsx`  
```tsx
fluxo: {label: 'Fluxo', icon: Clapperboard},
```

"Fluxo" é vago demais. O usuário não sabe o que encontrará ali (gravação? publicação? ambos?). O ícone de claquete sugere só gravação, mas a aba também tem toda a seção de publicação.

**Recomendação:** Renomear a aba baseado no estágio atual, ou dividir em duas abas distintas quando o conteúdo já foi gravado:

| Estágio | Tab label sugerida |
|---|---|
| Ideia / Roteiro / Pronto | "Gravação" (com ícone de claquete) |
| Gravado / Produção / Programado | "Publicação" (com ícone de envio) |
| Postado | "Arquivo" (mantém o atual) |

Alternativamente: duas tabs fixas "Gravação" e "Publicação", onde "Publicação" fica bloqueada (visual de cadeado) até o conteúdo ser gravado.

---

### P6 · Médio — Histórico é só 4 timestamps estáticos

**Arquivo:** `HistorySection.tsx`  
O histórico mostra: criado em, gravação planejada, postagem planejada, última atualização. Isso não é um histórico de atividade — é apenas um resumo de datas.

**Problemas:**
- Não há log de mudanças de status.
- Não há "quem fez o quê" mesmo em uso individual.
- A seção é chamada "Timeline do conteúdo" mas não tem linha do tempo visual.

**Recomendação a curto prazo:** Adicionar os campos `recordedAt` e `postedAt` ao banco, e mostrar as datas reais de quando cada evento ocorreu. Mesmo sem log full, seria: criado → roteiro finalizado → disponível para gravação → gravado em → postado em.

**Recomendação a longo prazo:** Implementar `content_events` table (eventType, createdAt, metadata) e renderizar uma timeline vertical real.

---

### P7 · Médio — `ContentOperationalPanel` duplicado nas duas abas

**Arquivo:** `ContentDetailShell.tsx`  
No desktop, o painel de metadados aparece:
- Na aba "Escrever": na coluna lateral direita do `RoteiroSection` (layout `workspace`)
- Na aba "Fluxo": na coluna lateral direita do layout da aba fluxo

São duas instâncias diferentes do mesmo componente, com o mesmo estado. O usuário que edita série na aba "Escrever" e troca para "Fluxo" vê o painel de novo, potencialmente com dados desatualizados antes do save.

**Recomendação:** Mover o painel operacional para um **drawer lateral persistente** que permanece visível independente da aba ativa, ou colocá-lo apenas no header expandido. Evitar renderizar em duas abas.

---

### P8 · Médio — Alertas de postagem duplicados

**Arquivo:** `ContentDetailShell.tsx`  
Os `postingAlerts` são renderizados **duas vezes**:
1. Na shell (`ContentDetailShell`) fora da aba, logo abaixo do stepper
2. Dentro de `PublishingSection`, que também renderiza `alerts.map(...)`

Para um conteúdo com data vencida, o usuário vê o mesmo aviso repetido.

**Recomendação:** Renderizar alertas apenas no local mais próximo da ação relevante — dentro de `PublishingSection`. Remover da shell.

---

### P9 · Baixo — "Modo explosão" é um nome criativo mas não comunicativo

O nome é único e memorável, mas para novos usuários não é óbvio que se trata de um teleprompter de gravação em tela cheia. Considerar adicionar um subtítulo descritivo na primeira vez que o usuário o encontra, ou renomear para "Modo gravação" com "explosão" como apelido interno.

---

### P10 · Baixo — Desktop e mobile têm experiências muito distintas no RecordingBlockPage

**Desktop:** Leitura de roteiro 1 a 1, com navegação prev/next, sem modo teleprompter.  
**Mobile:** Tela de visão geral do bloco → botão "Iniciar modo explosão" → overlay fullscreen com teleprompter.

O mobile tem a experiência mais rica (teleprompter, configurações de velocidade, fonte). O desktop tem uma UI básica de slideshow. Isso cria inconsistência — usuários que gravam no desktop ficam sem o teleprompter.

**Recomendação:** Trazer o `BurstModeExperience` (que já existe em `contents/components/burst-mode/`) para o desktop também, como opção de lançar a partir do `RecordingBlockPage`.

---

## 3. Resumo priorizado

| # | Problema | Impacto | Esforço | Prioridade |
|---|---|---|---|---|
| P1 | Tab "Fluxo" mistura gravação + publicação | Alto | Baixo | 🔴 Agora |
| P2 | Dois componentes de nav fazendo a mesma coisa | Alto | Médio | 🔴 Agora |
| P3 | Duplo controle de status | Médio | Baixo | 🔴 Agora |
| P4 | Criação de bloco fragmentada | Alto | Alto | 🟡 Próximo |
| P5 | Label "Fluxo" vaga | Médio | Baixo | 🔴 Agora |
| P6 | Histórico raso | Baixo | Alto | 🟢 Futuro |
| P7 | OperationalPanel duplicado | Médio | Médio | 🟡 Próximo |
| P8 | Alertas duplicados | Baixo | Baixo | 🔴 Agora |
| P9 | Nome "modo explosão" | Baixo | Baixo | 🟢 Futuro |
| P10 | Teleprompter só no mobile | Médio | Alto | 🟡 Próximo |

---

## 4. Visão do fluxo ideal (proposta)

```
Pipeline (/conteudos)
  └─ Conteúdo detalhe
       ├─ Header: título + stepper visual de estágio + status badge (1 lugar só)
       ├─ [Tab: Roteiro] Editor de script + sidebar de metadados
       ├─ [Tab: Gravação] — só visível até ser gravado
       │    └─ Sheet de "Adicionar ao bloco" inline (sem navegar para outra página)
       │    └─ Status do bloco atual
       │    └─ Link para abrir o bloco
       └─ [Tab: Publicação] — só fica ativa após status "Gravado"
            └─ Plataformas + copy + datas
            └─ "Marcar como postado"

Gravação (/gravacao)
  └─ Lista de blocos + conteúdos prontos
  └─ Clicar na linha = selecionar (ícone separado para abrir detalhe)
  └─ RecordingBlockPage = acessa BurstMode no desktop também
```

---

## 5. Quick wins (podem ser feitos hoje)

1. **Remover o `<select>` de status do `ContentOperationalPanel`** — 5 linhas de código removidas, zero confusão
2. **Remover alertas duplicados da shell** — remover o bloco `{postingAlerts.length > 0 ? ...}` fora da `PublishingSection` em `ContentDetailShell.tsx`
3. **Renomear a tab "Fluxo"** — trocar label para "Gravação" no `ContentDetailTabs`/`ContentPipelineStepper`
4. **Condicionar `PublishingSection`** — só renderizar quando `stage` for `GRAVADO` ou posterior, usando o `ContentStage` já existente
5. **Inverter click na fila de gravação** — em `RecordingPage`, trocar `onClick` da linha para `toggleSelect`, e adicionar botão "Abrir" separado
