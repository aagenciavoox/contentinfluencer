# Briefing Dev — Configurações do Sistema
*A camada de informações fixas que alimenta toda a inteligência do Content OS*

---

## VISÃO GERAL

O sistema tem três camadas. As duas primeiras são configurações — definidas com pouca frequência, mas referenciadas por tudo. A terceira é o conteúdo dinâmico criado todo dia.

```
CAMADA 0 — IDENTIDADE       → define quem você é (muda raramente)
CAMADA 1 — PRODUÇÃO         → define seu setup físico (atualiza por temporada)
CAMADA 2 — CONTEÚDO         → cria constantemente (Livros, Ideias, Conteúdos, Parcerias)
```

Este documento cobre as Camadas 0 e 1.

---

## CAMADA 0 — IDENTIDADE

### 0.1 DNA DA VOZ
*Já existe no sistema como drawer lateral — manter e expandir*

O DNA da Voz é o documento de referência de marca. Fica acessível em qualquer página sem sair do fluxo atual.

**Estrutura recomendada:**

| Seção | Conteúdo |
|-------|----------|
| Promessa Central | O que a Dizaianne entrega que mais ninguém entrega |
| Tom e Voz | Como você fala — adjetivos, exemplos de frases certas e erradas |
| O que nunca fazer | Elitismo literário, polarização forçada, fingir que não é publicidade |
| Público | Quem é a pessoa que te assiste — 18–30 anos, curiosa, lê de tudo |
| Valores | Anti-elitismo, humor como veículo, perspectiva incomum, autenticidade |

**Comportamento:** disponível como drawer em todas as páginas, especialmente visível ao escrever roteiro ou legenda.

---

### 0.2 PILARES EDITORIAIS
*Lista configurável — você define e edita, o sistema referencia*

Pilares são a intenção por trás de cada conteúdo. Cada conteúdo criado precisa ter um pilar associado. O sistema usa o pilar para:
- Sugerir hashtag combos automaticamente
- Validar o mix editorial (alertar se uma semana ficou muito concentrada em um pilar)
- Pré-preencher templates de legenda

**Pilares sugeridos para a Dizaianne:**

| Pilar | Descrição | Cor sugerida |
|-------|-----------|-------------|
| Humor | GSA, POV, Tipos de Leitores, trends, exagero | Amarelo |
| Análise | Calma eu te explico, Teoria da Conspiração, profundidade | Azul |
| Identificação | É sobre você sim, frases, situações relacionáveis | Rosa |
| Opinião | Inimigo comum, caixinha polêmica, posição forte | Vermelho |
| Indicação | Resenhas, recomendações, curadoria | Verde |
| Cultura Pop | Guerra de Filmes, adaptações, séries, tendências | Roxo |
| Ciência | Calma eu te explico com base científica, comportamento | Ciano |

**Campos de cada Pilar:**

| Campo | Tipo | Notas |
|-------|------|-------|
| `nome` | texto | Ex: "Humor" |
| `descrição` | texto curto | Para o DNA da Voz |
| `cor` | color picker | Usada nos cards e calendário |
| `hashtag_combo_instagram` | texto | 5 hashtags separadas por espaço |
| `hashtag_combo_tiktok` | texto | 5 hashtags separadas por espaço |
| `hashtag_combo_youtube` | texto | 8–10 hashtags separadas por espaço |
| `template_legenda` | texto longo | Template com variáveis como `{{titulo}}` e `{{cta}}` |
| `ativo` | boolean | Para desativar sem deletar |

---

### 0.3 SÉRIES
*Já existe como página — expandir os campos*

Séries são os formatos recorrentes com nome próprio. São diferentes de pilares: um pilar é a intenção, uma série é o container com identidade visual e narrativa própria.

**Campos de cada Série:**

| Campo | Tipo | Notas |
|-------|------|-------|
| `nome` | texto | Ex: "Calma eu te explico" |
| `descrição` | texto curto | O que é, para o dev e para a criadora |
| `pilar_associado` | relation (Pilar) | Qual pilar essa série representa |
| `slot_padrão` | select | Curto / Série / Janela |
| `plataformas_principais` | select múltiplo | Instagram, TikTok, YouTube, Blog |
| `formato_visual_padrão` | select | Talking Head, Tela Verde, Voiceover, etc. |
| `estrutura_roteiro` | texto longo | Template da estrutura narrativa padrão |
| `bordão` | texto curto | Frase recorrente associada à série |
| `cor` | color picker | Identificação visual |
| `ativa` | boolean | Séries podem ser pausadas sem deletar |
| `frequência_recomendada` | select | Semanal / Quinzenal / Mensal / Sob demanda |

**Séries existentes da Dizaianne (pré-cadastrar):**

| Nome | Pilar | Slot | Plataformas |
|------|-------|------|-------------|
| Calma eu te explico | Análise / Ciência | Série | Instagram, TikTok |
| GSA — Gestão de Sensatez Aplicada | Humor | Série | Instagram, TikTok |
| É sobre você sim | Identificação | Série | Instagram, TikTok |
| Teoria da Conspiração | Análise | Série | Instagram, TikTok |
| Guerra de Filmes | Cultura Pop | Série | Instagram, TikTok, YouTube |
| Tipos de Leitores | Humor / Identificação | Curto | Instagram, TikTok |
| Mudando o nome dos livros | Humor | Curto | Instagram, TikTok |

---

### 0.4 REGRAS DE OURO
*Lógica editorial que o sistema valida automaticamente*

Regras que aparecem como alertas visuais quando violadas. Não bloqueiam — alertam.

**Regras a implementar:**

| ID | Regra | Tipo de alerta |
|----|-------|---------------|
| RG-01 | Mesmo assunto/tema: máx. 2 conteúdos na mesma semana | Warning amarelo |
| RG-02 | Mesma série: máx. 1 episódio por semana | Warning amarelo |
| RG-03 | Mesmo formato visual: máx. 1 por dia | Info azul |
| RG-04 | Publicidade: mín. 3 conteúdos orgânicos entre cada publi | Warning vermelho |
| RG-05 | Instagram/TikTok: máx. 5 hashtags por legenda | Erro bloqueante |
| RG-06 | YouTube: recomendado 8–10 hashtags na descrição | Info azul |
| RG-07 | Pilar único dominando semana (>60% dos posts) | Warning amarelo |

**Onde aparecem:**
- Na **Estratégia Editorial** (já existe): visão consolidada de todas as violações da semana
- No **ContentDetailModal**: alerta inline ao preencher os campos
- No **Crono-Colheita**: indicador visual nos dias com violação

---

### 0.5 HASHTAG COMBOS
*Gerenciados dentro de cada Pilar (0.2), mas visualizáveis em página própria*

Recomendado ter uma página de referência rápida de combos. Não precisa de fluxo complexo — é uma tabela consultável.

**Combos base sugeridos:**

| Combo | Plataforma | Hashtags |
|-------|-----------|----------|
| Literatura Geral | Instagram/TikTok | #dizaianne #booktok #livros #leitura #literatura |
| Humor/Identificação | Instagram/TikTok | #dizaianne #gsadiza #calmaeudiza #booktok #humor |
| Análise/Ciência | Instagram/TikTok | #dizaianne #calmaeudiza #ciência #booktok #leitura |
| Indicação | Instagram/TikTok | #dizaianne #indicaçãodelivros #booktok #livros #leitura |
| Opinião | Instagram/TikTok | #dizaianne #booktok #opiniãoliterária #leitura #livros |
| Cultura Pop | Instagram/TikTok | #dizaianne #culturapop #adaptação #booktok #filmes |
| YouTube Geral | YouTube | #dizaianne #booktube #livros #leitura #literatura #resenha #booktok #literário |

---

## CAMADA 1 — PRODUÇÃO

### 1.1 CATÁLOGO DE LOOKS
*Referenciado na Crono-Gravação para agrupar gravações por outfit*

**Campos de cada Look:**

| Campo | Tipo | Notas |
|-------|------|-------|
| `número` | inteiro | Look #1, Look #2... |
| `descrição` | texto curto | Ex: "Camiseta preta + calça jeans" |
| `foto` | imagem | Opcional — foto de referência |
| `cenário_associado` | relation (Cenário) | Looks costumam funcionar melhor em cenários específicos |
| `ativo` | boolean | Para arquivar looks antigos |

**Comportamento na Crono-Gravação:**
- Ao montar um bloco de gravação, o sistema ordena os conteúdos sugerindo minimizar trocas de look
- Conteúdos do mesmo look ficam agrupados automaticamente

---

### 1.2 CATÁLOGO DE CENÁRIOS
*Referenciado na Crono-Gravação junto com os Looks*

**Campos de cada Cenário:**

| Campo | Tipo | Notas |
|-------|------|-------|
| `nome` | texto | Ex: "Mesa branca", "Biblioteca", "Fundo neutro" |
| `descrição` | texto curto | Configuração, iluminação, equipamento |
| `foto_referência` | imagem | Opcional |
| `tempo_setup_minutos` | número | Para estimar duração de sessão de gravação |
| `ativo` | boolean | |

**Comportamento na Crono-Gravação:**
- Ao agrupar conteúdos para gravação, o sistema calcula o tempo total estimado somando os `tempo_setup` das trocas de cenário

---

### 1.3 PLATAFORMAS
*Lista fixa com configurações específicas de cada plataforma*

Não é editável pela usuária — é configuração do sistema. Mas deve ter uma página de visualização para consulta.

| Plataforma | Tipo de conteúdo | Máx. hashtags | Duração ideal (curto) | Duração ideal (longo) |
|-----------|-----------------|---------------|----------------------|----------------------|
| Instagram | Reels + Feed | 5 | 15–30s | 60–90s |
| TikTok | Vídeo | 3–5 | 15–60s | 3–5min |
| YouTube | Vídeo | 8–10 na descrição | N/A | 8–20min |
| Blog | Texto | N/A | N/A | 800–2000 palavras |

---

### 1.4 FORMATOS VISUAIS
*Lista fixa — referenciada no ContentDetailModal*

| Formato | Descrição |
|---------|-----------|
| Talking Head | Câmera frontal, você falando diretamente |
| Tela Verde | Green screen com imagem ou vídeo ao fundo |
| Voiceover | Narração em off sobre imagens/vídeos |
| POV Texto | Texto na tela, você não aparece ou aparece desfocada |
| Reação | Você reagindo a outro conteúdo |
| Vlog | Câmera no estilo de diário, mais informal |
| Misto | Combina mais de um formato no mesmo vídeo |

---

## ONDE ESSAS CONFIGURAÇÕES FICAM NO SISTEMA

### Recomendação de navegação

```
Sidebar
├── Dashboard
├── Biblioteca (Livros)           ← novo
├── Caixa de Ideias
├── Conteúdos
├── Séries
├── Crono-Gravação
├── Estratégia Editorial
├── Crono-Colheita
├── Parcerias
├── Resultados
└── ⚙️ Configurações              ← novo
        ├── DNA da Voz
        ├── Pilares
        ├── Séries (gestão)
        ├── Regras de Ouro
        ├── Hashtag Combos
        ├── Looks
        └── Cenários
```

A seção **Configurações** fica no final da sidebar, separada visualmente do fluxo operacional. É acessada raramente, mas quando acessada, é para decisões importantes.

---

## FLUXO DE CONFIGURAÇÃO INICIAL (onboarding)

Quando a usuária abre o sistema pela primeira vez, um fluxo guiado de 4 passos:

**Passo 1 — DNA da Voz:** preencher promessa central, tom e valores\
**Passo 2 — Pilares:** revisar os pilares pré-cadastrados, editar ou adicionar\
**Passo 3 — Séries:** revisar as séries pré-cadastradas, ativar as que usa\
**Passo 4 — Produção:** cadastrar Looks e Cenários do setup atual

Após completar, o sistema está calibrado e começa a fazer sugestões e validações inteligentes.

---

*Documento criado em 30/03/2026 — Complemento ao briefing principal (briefing dev — content os.md)*
