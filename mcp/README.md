# Content OS MCP

Servidor MCP local que deixa Claude, Cursor (com qualquer modelo) e outros clientes MCP lerem e editarem o Content OS sem abrir o navegador.

Ele entra com a sua conta do app, então as regras de acesso do Supabase (RLS) valem igual: a IA só vê e altera o que é seu. Mudanças feitas por aqui aparecem no app (recarregue a página se ela já estiver aberta).

## Instalação

Precisa de Node 22.18 ou mais novo (roda TypeScript direto, sem build).

```bash
cd mcp
npm install
cp .env.example .env   # no Windows: copy .env.example .env
```

Preencha `CONTENT_OS_EMAIL` e `CONTENT_OS_PASSWORD` no `mcp/.env` com o mesmo login do app. URL e anon key já são lidas do `.env.local` da raiz.

Para testar o login e as ferramentas de leitura:

```bash
npm run smoke
```

## Conectar

**Cursor:** já está registrado em `.cursor/mcp.json` como `content-os`. Abra Settings → MCP e ative.

**Claude Desktop:** em `%APPDATA%\Claude\claude_desktop_config.json` (Windows) ou `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac):

```json
{
  "mcpServers": {
    "content-os": {
      "command": "node",
      "args": ["C:/Users/mente/Desktop/CODING/content-os/mcp/src/index.ts"]
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add content-os -- node C:/Users/mente/Desktop/CODING/content-os/mcp/src/index.ts
```

## Ferramentas

| Área | Ferramentas |
| --- | --- |
| Visão geral | `resumo_do_momento`, `ver_estrutura_editorial` |
| Ideias e conteúdos | `listar_conteudos`, `ver_conteudo`, `criar_ideia`, `criar_conteudo`, `atualizar_conteudo`, `mudar_status`, `arquivar_conteudos`, `enviar_para_lixeira` |
| Agenda | `ver_agenda`, `agendar_publicacao`, `criar_compromisso`, `remover_compromisso`, `salvar_evento`, `remover_evento` |
| Biblioteca | `buscar_biblioteca`, `ver_item_biblioteca`, `adicionar_item_biblioteca`, `atualizar_item_biblioteca`, `adicionar_anotacao` |

Pilares, séries e plataformas aceitam nome ou id. Nada é apagado de vez nos conteúdos: eles vão para a lixeira do app e podem ser restaurados. `remover_compromisso` e `remover_evento` apagam de verdade, igual ao app.

`ver_estrutura_editorial` traz a função padrão da série e, na seção `ajustes`, a rede de referência, os destinos padrão, a distribuição por função e o estoque desejado. `listar_conteudos` e `ver_conteudo` trazem função, origem, função efetiva, se conta na grade, a legenda compartilhada e a lista `livro_ids`. `agendar_publicacao` grava o status de cada destino (`agendada`, `publicada`, `nao_publicada`, `removida`), o link e o código do post. A primeira publicação congela a função. `salvar_evento` grava `aviso_dias` (0 a 120). `ver_item_biblioteca` acha roteiros pela origem antiga e por `livro_ids`.

Se o banco ainda não tiver uma coluna, a leitura segue sem ela e a gravação também: a resposta vem com `gravado_sem` ou `colunas_ausentes_no_banco`. O arquivo que criaria a coluna:

| Coluna | Arquivo |
| --- | --- |
| `funcao`, `funcao_origem`, `classificacao_congelada_em`, `conta_na_grade` do roteiro, `legenda_base`, `livro_ids`, `funcao_padrao` | `supabase/migrations/20261004100000_funcoes_editoriais.sql` |
| status da publicação, `post_url`, `post_codigo`, `legenda_propria`, `conta_na_grade` do destino, `aviso_dias` | `supabase/migrations/20261004110000_publicacoes.sql` |

A tela de vários livros e a tela do aviso de evento ficam em outros pull requests. Estas ferramentas gravam o mesmo modelo.
