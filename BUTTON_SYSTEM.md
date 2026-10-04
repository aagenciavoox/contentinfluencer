# Sistema de botões

## Tabela única

| Variante | Altura | Aparência | Uso | Regra |
| --- | --- | --- | --- | --- |
| Primário | 40px | Fundo `--brand-accent-strong` (#E0185A), texto `--brand-on-accent` | Ação principal da tela | Apenas 1 por tela |
| Secundário | 40px | Outline neutro | Ação de apoio direta | Pode coexistir com 1 primário |
| Ghost | 40px | Sem fundo, sem caixa pesada | Navegação leve e lista de acesso | Nunca competir com o primário |

## Cor de destaque

- Rosa (`--brand-accent-strong` #E0185A): ação principal, no máximo 1 por tela, só no botão primário.
- `--brand-accent` #FF2D6F: marca decorativa (menu, login, progresso).
- Preto/branco (`--accent`): seleção (aba ativa, toggle ligado, dia atual).
- Azul: só o anel de foco.

## Regras obrigatórias

- Apenas 1 botão primário por tela.
- Botões de ação principal sempre ficam no header ou no topo do conteúdo.
- Grupos de ações sempre ficam alinhados horizontalmente na direita.
- Não misturar alturas: CTA de tela usa sempre 40px.
- Botões utilitários pequenos, toggles e ícones continuam sendo controles locais, não CTA de tela.

## Texto dos botões

Regras completas em `PRODUCT_VOICE.md` (R2, R3 e R4).

- Verbo + objeto: "Criar template", não "Criar". O verbo sozinho só vale quando o objeto está no título do mesmo formulário e não há outro botão primário por perto.
- Só a primeira letra é maiúscula no código ("Novo roteiro", "Novo look"). Caixa alta, quando o design pedir, vem do CSS (`uppercase`).
- Uma ação tem um rótulo só em todo o app ("Transformar em roteiro", "Buscar", "Marcar como gravado").

## Aplicação prática

### Base do sistema

- `src/components/common/AppButton.tsx`
  - Reduzido para `primary`, `secondary` e `ghost`.
  - Altura padrão consolidada em `40px`.
  - Tipografia e espaçamento unificados para todos os CTA.

- `src/components/layout/DesktopPageHeader.tsx`
  - Barra de ações padronizada para alinhamento horizontal na direita.
  - Limite visual de até 2 ações por header.

### Telas aplicadas

| Tela | Primário | Secundário | Ghost |
| --- | --- | --- | --- |
| Criação | `Novo roteiro` | `Importar` | `-` |
| Calendário | `Novo projeto` | `Novo evento` | `-` |
| Biblioteca | `Adicionar item` | `-` | `-` |
| Projetos | `Novo projeto` | `-` | `-` |
| Configurações | `-` | `-` | Cards de navegação |
| DNA da voz | `Salvar` | `-` | `-` |
| Pilares editoriais | `Novo pilar`, `Salvar` em formulário | `Cancelar` em formulário | `-` |
| Séries | `Nova série`, `Salvar alterações` em formulário | `Cancelar` em formulário | `-` |
| Looks e cenários | `Novo look`, `Salvar` em formulário | `Novo cenário`, `Cancelar` em formulário | `-` |
| Plataformas | `Nova plataforma`, `Adicionar plataforma` em formulário | `Cancelar` em formulário | `-` |
| Templates | `Novo template`, `Criar template` em formulário | `Cancelar` em formulário | `-` |

## Inconsistências eliminadas

- Tamanhos aleatórios entre `h-7`, `h-8`, `h-12` para CTA de tela.
- Variantes extras que inflavam a hierarquia visual sem necessidade.
- Mais de um primário competindo em áreas de topo.
- Botões de formulário sem alinhamento padrão.
