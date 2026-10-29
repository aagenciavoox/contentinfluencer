const HTML_VAZIO = new Set(['', '<p></p>', '<p><br></p>', '<p><br/></p>']);
const POST_IT_SEM_PAUTA = new Set(['Sem título', 'Post-it vazio']);

function htmlEmBranco(script: string | null | undefined): boolean {
  if (script == null) return true;
  return HTML_VAZIO.has(script.trim());
}

/**
 * Texto vazio, "Sem título" ou "Post-it vazio" não é pauta. O resto, sim.
 * Com `pautaDefinida` explícita, ela manda.
 */
export function postItTemPauta(
  texto: string | null | undefined,
  pautaDefinida?: boolean | null,
): boolean {
  if (pautaDefinida === true) return true;
  if (pautaDefinida === false) return false;
  const limpo = (texto ?? '').trim();
  if (!limpo) return false;
  if (POST_IT_SEM_PAUTA.has(limpo)) return false;
  return true;
}

/**
 * Só `scriptOrigem === 'autor'` é pauta.
 * Modelo e HTML vazio não são. O título não entra na conta.
 * `pautaDefinida` explícita passa na frente.
 */
export function roteiroTemPauta(
  scriptOrigem: string | null | undefined,
  script?: string | null,
  pautaDefinida?: boolean | null,
): boolean {
  if (pautaDefinida === true) return true;
  if (pautaDefinida === false) return false;
  if (scriptOrigem === 'autor') return true;
  if (scriptOrigem === 'modelo' || htmlEmBranco(script)) return false;
  return false;
}

/**
 * Post-it ligado ao roteiro conta uma vez.
 * Tem pauta se a marcação explícita, o texto ou o roteiro do autor qualificam.
 * `title` existe para deixar explícito que não participa.
 */
export function temPautaLigada(input: {
  textoPostIt?: string | null;
  scriptOrigem?: string | null;
  script?: string | null;
  title?: string | null;
  pautaDefinidaPostIt?: boolean | null;
  pautaDefinidaConteudo?: boolean | null;
}): boolean {
  void input.title;
  return postItTemPauta(input.textoPostIt, input.pautaDefinidaPostIt)
    || roteiroTemPauta(input.scriptOrigem, input.script, input.pautaDefinidaConteudo);
}
