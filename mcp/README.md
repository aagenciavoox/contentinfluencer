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

## Grok (grok.com, app e Grok Bot)

O Grok roda nos servidores da xAI e não enxerga o seu computador, então precisa de um endereço HTTPS público. O servidor tem um modo HTTP protegido por uma chave, e um túnel gratuito da Cloudflare cria o endereço. Deixe dois terminais abertos enquanto usa:

```bash
cd mcp
npm run http     # terminal 1: servidor; na primeira vez gera CONTENT_OS_MCP_TOKEN no mcp/.env
npm run tunnel   # terminal 2: mostra um endereço https://<nome>.trycloudflare.com
```

Em [grok.com/connectors](https://grok.com/connectors) → New Connector → Custom, use a URL `https://<nome>.trycloudflare.com/mcp`. O Grok exige OAuth, e o servidor tem um OAuth próprio. Se ele mostrar o formulário de credenciais, preencha:

| Campo | Valor |
| --- | --- |
| ID do Cliente | `grok` |
| Segredo do Cliente | vazio |
| Endpoint de Autorização | `https://<nome>.trycloudflare.com/authorize` |
| Endpoint do Token | `https://<nome>.trycloudflare.com/token` |
| Escopos | `content-os` |
| Método de autenticação do token | nenhum (somente PKCE) |

Depois de salvar, abre uma página "Conectar ao Content OS": cole ali o valor de `CONTENT_OS_MCP_TOKEN` do `mcp/.env` e clique em Autorizar. O Grok guarda o acesso por 30 dias e renova sozinho.

Clientes que aceitam só uma URL, sem OAuth, podem usar `https://<nome>.trycloudflare.com/mcp/<CONTENT_OS_MCP_TOKEN>`. Para testar um endereço: `npm run smoke:http -- <url>` e `npm run smoke:oauth -- <url>`.

O endereço do túnel muda toda vez que `npm run tunnel` reinicia; aí é preciso recriar o conector com o novo endereço. Não compartilhe a chave.

### Endereço fixo (ngrok)

Para não recriar o conector a cada reinício, use o domínio fixo gratuito do ngrok:

1. Crie uma conta em [ngrok.com](https://ngrok.com). Copie o authtoken em [Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) e o domínio em [Domains](https://dashboard.ngrok.com/domains).
2. Preencha `NGROK_AUTHTOKEN` e `NGROK_DOMAIN` (só o nome, ex. `algo.ngrok-free.app`) no `mcp/.env`.
3. Baixe o ngrok para `mcp/bin/ngrok.exe` (fica fora do git) e rode `npm run public`. Ele liga o servidor e o túnel e religa o que cair; o log fica em `mcp/logs/public.log`.
4. Para ligar sozinho no login do Windows, sem janela: `npm run autostart:install` (desfaz com `npm run autostart:uninstall`).

No conector do Grok, troque `<nome>.trycloudflare.com` pelo seu domínio do ngrok. Na primeira autorização o ngrok mostra uma página de aviso no navegador; clique em "Visit Site".

Para trocar a chave do servidor (o que também desconecta o Grok), apague a linha `CONTENT_OS_MCP_TOKEN` do `mcp/.env` e reinicie o servidor.

O Grok CLI (`grok` no terminal) não precisa disso: ele já lê o `.cursor/mcp.json` deste projeto.

## Ferramentas

| Área | Ferramentas |
| --- | --- |
| Visão geral | `resumo_do_momento`, `ver_estrutura_editorial` |
| Pilares e séries | `criar_pilar`, `atualizar_pilar`, `criar_serie`, `atualizar_serie` |
| Função editorial (antigo funil) | `funcao_padrao` na série; `funcao` em `criar_conteudo` / `atualizar_conteudo`; `definir_distribuicao_funcoes` |
| Ideias e conteúdos | `listar_conteudos`, `ver_conteudo`, `criar_ideia`, `criar_conteudo`, `atualizar_conteudo`, `mudar_status`, `arquivar_conteudos`, `enviar_para_lixeira` |
| Agenda | `ver_agenda`, `agendar_publicacao`, `criar_compromisso`, `remover_compromisso`, `salvar_evento`, `remover_evento` |
| Biblioteca | `buscar_biblioteca`, `ver_item_biblioteca`, `adicionar_item_biblioteca`, `atualizar_item_biblioteca`, `adicionar_anotacao` |

Pilares, séries e plataformas aceitam nome ou id. Nada é apagado de vez nos conteúdos: eles vão para a lixeira do app e podem ser restaurados. `remover_compromisso` e `remover_evento` apagam de verdade, igual ao app.

`ver_estrutura_editorial` traz a função padrão da série e, na seção `ajustes`, a rede de referência, os destinos padrão, a distribuição por função e o estoque desejado. `listar_conteudos` e `ver_conteudo` trazem a função efetiva, a origem, se conta na grade, a legenda compartilhada e a lista `livro_ids`. `agendar_publicacao` grava o status de cada destino (`agendada`, `publicada`, `nao_publicada`, `removida`), o link e o código do post. A primeira publicação congela a função. `salvar_evento` grava `aviso_dias` (0 a 120). `ver_item_biblioteca` acha roteiros pela origem antiga e por `livro_ids`.

Se o banco ainda não tiver uma coluna, a leitura segue sem ela e a gravação também: a resposta vem com `gravado_sem` ou `colunas_ausentes_no_banco`. O arquivo que criaria a coluna:

| Coluna | Arquivo |
| --- | --- |
| `funcao`, `funcao_origem`, `classificacao_congelada_em`, `conta_na_grade` do roteiro, `legenda_base`, `livro_ids`, `funcao_padrao` | `supabase/migrations/20261004100000_funcoes_editoriais.sql` |
| status da publicação, `post_url`, `post_codigo`, `legenda_propria`, `conta_na_grade` do destino, `aviso_dias` | `supabase/migrations/20261004110000_publicacoes.sql` |

A tela de vários livros e a tela do aviso de evento já estão no app. Estas ferramentas gravam o mesmo modelo.
