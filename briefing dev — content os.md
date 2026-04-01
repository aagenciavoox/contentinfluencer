# Briefing Dev — Content OS
*Alinhamento de funcionalidades com a estratégia de ecossistema*

> **Documentos relacionados:**
> - Este arquivo cobre as **novas funcionalidades** (Livro, Ecossistema, Anotações)
> - [`briefing dev — configurações do sistema.md`](./briefing%20dev%20—%20configurações%20do%20sistema.md) cobre a **camada de configuração** (Pilares, Séries, Looks, Cenários, Regras de Ouro, Hashtag Combos)

---

## CONTEXTO

O sistema atual cobre bem o ciclo de vida de um conteúdo individual (ideia → roteiro → gravação → publicação). O que precisa ser adicionado é a camada anterior a tudo isso: **o livro como objeto âncora**, de onde nascem múltiplos conteúdos em formatos e plataformas diferentes.

A lógica é: um livro lido com atenção gera anotações → anotações viram destilações → destilações viram roteiros → roteiros viram conteúdos vinculados ao mesmo livro. No final, dá para ver o "ecossistema" de tudo que foi criado a partir daquele livro.

---

## 1. NOVA ENTIDADE: LIVRO

### O que é
Um objeto âncora que representa um livro que está sendo lido ou foi lido, e que serve de fonte para múltiplos conteúdos.

### Campos

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| `título` | texto | sim | |
| `autor` | texto | sim | |
| `gênero` | select múltiplo | não | Fantasy, Dark Romance, Ficção Científica, Clássico, Não-ficção, etc. |
| `capa` | imagem (upload ou URL) | não | |
| `status_leitura` | select | sim | Quero ler / Lendo / Pausado / Lido |
| `data_inicio` | data | não | |
| `data_fim` | data | não | |
| `avaliação` | 1–5 estrelas | não | Preenchido após terminar |
| `notas_gerais` | texto longo | não | Campo livre para primeiras impressões |

---

## 2. SISTEMA DE ANOTAÇÕES DO LIVRO

### O que é
Dentro de cada Livro, um espaço para registrar insights, trechos, reações e observações durante a leitura. Essas anotações são a matéria-prima dos roteiros.

### Estrutura de uma anotação

| Campo | Tipo | Notas |
|-------|------|-------|
| `texto` | texto longo | A anotação em si |
| `tipo` | select | Trecho / Reação / Análise / Ideia de conteúdo / Pergunta |
| `capitulo_ref` | texto curto | Referência opcional ao capítulo/parte |
| `destilada` | boolean | Se já foi transformada em roteiro ou ideia de conteúdo |

### Comportamento
- Anotações ficam dentro da página do Livro, em ordem cronológica (ordem de criação)
- Filtro por `tipo` para encontrar só "Ideias de conteúdo" ou só "Análises"
- Botão **"Transformar em Ideia"** em cada anotação → cria uma nova entrada na Caixa de Ideias já com o livro vinculado e o texto da anotação como ponto de partida
- Quando uma anotação é transformada em ideia, o campo `destilada` muda para `true` e ela recebe uma marcação visual sutil (não some — fica para consulta)

---

## 3. VINCULAÇÃO: LIVRO ↔ CONTEÚDO

### O que muda no ContentDetailModal (existente)
Adicionar um campo opcional:

| Campo | Tipo | Notas |
|-------|------|-------|
| `livro_origem` | relation (Livro) | Busca pelo título. Campo opcional — nem todo conteúdo vem de um livro. |

### O que muda na Caixa de Ideias
Quando uma Ideia é criada via "Transformar em Ideia" (a partir de uma anotação), o campo `livro_origem` já vem preenchido automaticamente.

Quando uma Ideia é promovida para Conteúdo, o `livro_origem` é herdado automaticamente.

---

## 4. NOVA PÁGINA: BIBLIOTECA

### O que é
A listagem de todos os livros cadastrados. Ponto de entrada para o fluxo de leitura → conteúdo.

### Visualizações
- **Grid de capas** (visual, estilo estante) — padrão
- **Lista** (mais densa, útil para gerenciar muitos livros)

### Filtros
- Por `status_leitura` (Lendo / Lido / Quero ler)
- Por `gênero`
- Por "tem conteúdos vinculados" vs "ainda sem conteúdo"

### Card do livro na listagem
Mostra: capa + título + autor + status de leitura + contador de conteúdos vinculados (`3 conteúdos criados`)

---

## 5. NOVA VIEW DENTRO DO LIVRO: ECOSSISTEMA

### O que é
Dentro da página de um Livro específico, uma aba ou seção que mostra todos os conteúdos vinculados a ele — independente de formato, plataforma ou status.

### O que exibe
- Lista de todos os Conteúdos com `livro_origem = este livro`
- Agrupados por Slot (Curto / Série / Janela) ou por Plataforma (Instagram, TikTok, YouTube, Blog)
- Status de cada conteúdo (Pronto para Gravar / Gravado / Postado etc.)
- Botão **"+ Novo Conteúdo"** que abre o ContentDetailModal já com o `livro_origem` preenchido

### Lógica editorial (Regra de Ouro a adicionar)
Se o livro está com `status_leitura = Lido` mas não tem nenhum conteúdo com status `Postado`, exibir alerta visual: *"Ecossistema incompleto — nenhum conteúdo publicado ainda."*

---

## 6. CAMPO ADICIONAL NO CONTENTDETAILMODAL: FORMATO VISUAL

### Contexto
O sistema já tem `Slot` (Curto / Série / Janela), que indica a intenção do conteúdo. Mas falta o **formato de produção** — como o vídeo é filmado visualmente. São coisas diferentes:

- Slot = intenção editorial
- Formato Visual = container de produção

### Novo campo

| Campo | Tipo | Notas |
|-------|------|-------|
| `formato_visual` | select | Talking Head / Tela Verde / Voiceover / POV Texto / Reação / Vlog / Misto |

### Por que isso importa
Na Crono-Gravação, o sistema já agrupa por Look e Cenário. Com o Formato Visual, dá para adicionar um terceiro critério de agrupamento: você pode gravar todos os "Tela Verde" de uma vez, depois todos os "Talking Head". Reduz ainda mais o tempo de setup.

---

## 7. AJUSTE: LEGENDA POR PLATAFORMA

### Problema atual
O campo `legenda` no ContentDetailModal é único. Mas um mesmo conteúdo postado no Instagram e no TikTok precisa de legendas diferentes (hashtags diferentes, CTAs diferentes, tamanhos diferentes).

### Solução recomendada
Transformar `legenda` em um **componente de abas por plataforma**:

```
[ Instagram ]  [ TikTok ]  [ YouTube ]
[campo de texto da legenda para essa plataforma]
```

- Só aparecem as abas das plataformas que foram selecionadas no campo `plataforma` do conteúdo
- Se o conteúdo é só para Instagram, aparece só a aba Instagram
- Cada aba tem seu próprio campo de texto independente
- O template de auto-preenchimento (já existente) preenche a aba ativa

---

## 8. FLUXO COMPLETO COM AS NOVAS FUNCIONALIDADES

```
BIBLIOTECA (lista de livros)
    ↓ (abre livro)
PÁGINA DO LIVRO
    ├── Info básica + avaliação
    ├── ANOTAÇÕES (registra durante a leitura)
    │       ↓ [botão "Transformar em Ideia"]
    ├── CAIXA DE IDEIAS (já com livro_origem preenchido)
    │       ↓ [promover]
    └── ECOSSISTEMA (todos os conteúdos vinculados)
            ├── Conteúdo A (CURTO / Instagram / Gravado)
            ├── Conteúdo B (SÉRIE / Instagram + TikTok / Pronto para Gravar)
            ├── Conteúdo C (JANELA / YouTube / Ideia)
            └── + Novo Conteúdo
```

---

## 9. RESUMO DAS MUDANÇAS POR PRIORIDADE

### Prioridade Alta (core do ecossistema)
1. **Entidade Livro** com campos básicos e status de leitura
2. **Sistema de Anotações** dentro do livro com botão "Transformar em Ideia"
3. **Campo `livro_origem`** no ContentDetailModal e na Caixa de Ideias
4. **View Ecossistema** dentro da página do livro

### Prioridade Média (melhoria de produção)
5. **Página Biblioteca** com grid de capas e filtros
6. **Campo `formato_visual`** no ContentDetailModal
7. **Legenda por plataforma** (abas)

### Prioridade Baixa (refinamento)
8. **Alerta de ecossistema incompleto** (livro lido sem conteúdo publicado)
9. **Agrupamento por Formato Visual** na Crono-Gravação

---

## REFERÊNCIA VISUAL DO FLUXO

```
LIVRO
│
├── anotações enquanto lê
│       └── [Transformar em Ideia] ──→ CAIXA DE IDEIAS
│                                              └── [Promover] ──→ CONTEÚDO
│                                                                    ├── Slot: Curto
│                                                                    ├── Formato Visual: Tela Verde
│                                                                    ├── Plataforma: Instagram + TikTok
│                                                                    ├── Legenda Instagram: ...
│                                                                    ├── Legenda TikTok: ...
│                                                                    └── livro_origem: ← este livro
│
└── ECOSSISTEMA (view agregada de tudo que saiu deste livro)
        ├── 2 CURTOS publicados
        ├── 1 SÉRIE em gravação
        ├── 1 JANELA planejada
        └── 1 POST de blog rascunho
```

---

---

## 10. O QUE NÃO ESTÁ NESTE DOCUMENTO

A **camada de configuração do sistema** (Pilares Editoriais, DNA da Voz expandido, Séries com campos completos, Regras de Ouro, Hashtag Combos, Catálogo de Looks e Cenários, Onboarding guiado) está documentada separadamente em:

📄 [`briefing dev — configurações do sistema.md`](./briefing%20dev%20—%20configurações%20do%20sistema.md)

Ambos os documentos devem ser implementados em conjunto.

---

*Briefing gerado em 30/03/2026 — para implementação no Content OS*
