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
| Agenda | `ver_agenda`, `agendar_publicacao`, `criar_compromisso`, `remover_compromisso` |
| Biblioteca | `buscar_biblioteca`, `ver_item_biblioteca`, `adicionar_item_biblioteca`, `atualizar_item_biblioteca`, `adicionar_anotacao` |

Pilares, séries e plataformas aceitam nome ou id. Nada é apagado de vez: conteúdos vão para a lixeira do app e podem ser restaurados. A única exclusão real é `remover_compromisso`, igual ao app.

Se o banco ainda não tiver colunas de migrations recentes (ex.: `funcao`, status por plataforma), o servidor grava sem elas em vez de falhar.
