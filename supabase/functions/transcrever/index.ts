// Edge Function `transcrever`. Lógica em ./handler.ts.
// Configurar uma vez:
//   supabase secrets set GROQ_API_KEY=gsk_...
//   supabase functions deploy transcrever
import { handleTranscriptionRequest } from './handler.ts';

Deno.serve(req => handleTranscriptionRequest(req, name => Deno.env.get(name)));
