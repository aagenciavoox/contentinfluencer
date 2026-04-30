# Sistema de Botoes

## Tabela Unica

| Variante | Altura | Aparencia | Uso | Regra |
| --- | --- | --- | --- | --- |
| Primario | 40px | Fundo escuro, texto claro | Acao principal da tela | Apenas 1 por tela |
| Secundario | 40px | Outline neutro | Acao de apoio direta | Pode coexistir com 1 primario |
| Ghost | 40px | Sem fundo, sem caixa pesada | Navegacao leve e lista de acesso | Nunca competir com o primario |

## Regras Obrigatorias

- Apenas 1 botao primario por tela.
- Botoes de acao principal sempre ficam no header ou no topo do conteudo.
- Grupos de acoes sempre ficam alinhados horizontalmente na direita.
- Nao misturar alturas: CTA de tela usa sempre 40px.
- Botoes utilitarios pequenos, toggles e icones continuam sendo controles locais, nao CTA de tela.

## Aplicacao Pratica

### Base do sistema

- `src/components/common/AppButton.tsx`
  - Reduzido para `primary`, `secondary` e `ghost`.
  - Altura padrao consolidada em `40px`.
  - Tipografia e espacamento unificados para todos os CTA.

- `src/components/layout/DesktopPageHeader.tsx`
  - Barra de acoes padronizada para alinhamento horizontal na direita.
  - Limite visual de ate 2 acoes por header.

### Telas aplicadas

| Tela | Primario | Secundario | Ghost |
| --- | --- | --- | --- |
| Conteudos | `Novo Roteiro` | `Importar` | `-` |
| Calendario | `Novo projeto` | `Novo evento` | `-` |
| Biblioteca | `Adicionar item` | `-` | `-` |
| Projetos | `Novo projeto` | `-` | `-` |
| Configuracoes | `-` | `-` | Cards de navegacao |
| DNA da Voz | `Salvar` | `-` | `-` |
| Pilares Editoriais | `Novo`, `Salvar` em formulario | `Cancelar` em formulario | `-` |
| Looks | `Novo Look`, `Salvar` em formulario | `Novo Cenario`, `Cancelar` em formulario | `-` |
| Plataformas | `Adicionar`, `Criar` em formulario | `Cancelar` em formulario | `-` |

## Inconsistencias Eliminadas

- Tamanhos aleatorios entre `h-7`, `h-8`, `h-12` para CTA de tela.
- Variantes extras que inflavam a hierarquia visual sem necessidade.
- Mais de um primario competindo em areas de topo.
- Botoes de formulario sem alinhamento padrao.
