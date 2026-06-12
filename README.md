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
