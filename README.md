# Core Creator

Core Creator is a creator operations app for organizing ideas, content, recording, calendar, projects, library, and analytics.

The product voice is intentionally gentle: the system helps creators remember, organize, and choose without pressure. See [PRODUCT_VOICE.md](./PRODUCT_VOICE.md).

## Run Locally

Prerequisites:
- Node.js
- Supabase project credentials

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and set:

```bash
VITE_SUPABASE_URL="..."
VITE_SUPABASE_ANON_KEY="..."
```

3. Run the app:

```bash
npm run dev
```

The dev server uses port `3030`.

## Transcrição de vídeo

A tela `/criacao/transcricao` (menu Criação › Transcrição) transcreve um vídeo sem guardar nada:

1. O navegador separa só o áudio do vídeo e comprime (Opus mono, ~24 kbps) com `mediabunny`. O vídeo não sai do aparelho.
2. A Edge Function `supabase/functions/transcrever` confere o login e repassa o áudio para o Whisper do Groq (`whisper-large-v3-turbo`).
3. A tela mostra o texto, com opções de copiar e baixar `.txt` / `.srt`. Nada vai para o banco nem para o Storage.

Custo zero: o plano gratuito do Groq não pede cartão (limite aproximado de 2 h de áudio por hora e 8 h por dia; acima disso a tela pede para tentar mais tarde). Vídeos de até 2 horas.

Configurar uma vez:

1. Crie uma chave grátis em https://console.groq.com/keys.
2. Guarde a chave só no servidor (nunca como `VITE_`):

```bash
supabase secrets set GROQ_API_KEY="gsk_..."
supabase functions deploy transcrever
```

Sem a CLI: no painel do Supabase, Edge Functions › Secrets para a chave, e Edge Functions › Deploy a new function com o conteúdo de `supabase/functions/transcrever/`.

## Validation

Run the full local gate:

```bash
npm run check
```

This runs:
- `npm run voice:audit`
- `npm run lint`
- `npm test`
- `npm run build`

## Product Voice Guardrail

`npm run voice:audit` scans app source and core docs for pressure-oriented copy. The blocked phrase list lives in `PRODUCT_VOICE.md`.

When adding new proactive UI, prefer calm optional language:
- "Talvez util hoje"
- "Caminhos possiveis"
- "Data combinada"
- "Para lembrar"
- "Pode ser retomado"

The app also supports a "Modo pausa" preference for moments when the creator wants the system to hold context without suggesting next moves.
