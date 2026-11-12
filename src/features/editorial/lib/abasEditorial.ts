/**
 * Abas do Editorial, na ordem da tela:
 * Plano do período → Direção editorial → Rotina de criação → Contas e formatos.
 * Sem `?aba=`, abre no Plano do período.
 *
 * A Continuidade fica dentro do Plano do período, os Avisos dentro da Rotina de criação
 * e as hashtags fora das séries dentro da Direção editorial.
 */
export type EditorialAba = 'plano' | 'direcao' | 'ajustes' | 'contas';

export const EDITORIAL_ABAS: readonly EditorialAba[] = ['plano', 'direcao', 'ajustes', 'contas'];

export const ABA_EDITORIAL_PADRAO: EditorialAba = 'plano';

export const ROTULO_DA_ABA: Record<EditorialAba, string> = {
  plano: 'Plano do período',
  direcao: 'Direção editorial',
  ajustes: 'Rotina de criação',
  contas: 'Contas e formatos',
};

/** Frase da página, no “?” ao lado do título. */
export const APOIO_DA_PAGINA = 'O plano, o público e o ritmo da sua criação.';

/** Frase da aba aberta, no “?” ao lado da navegação. */
export const APOIO_DA_ABA: Record<EditorialAba, string> = {
  plano: 'Veja o que já saiu, o que tem data e como está o plano neste período.',
  direcao: 'Público, assuntos, pilares e o que você quer repetir nas legendas.',
  ajustes: 'Escolha um ritmo de revisão, gravação e publicação que caiba na sua semana.',
  contas: 'Cada conta pode ter os próprios horários, formatos e metas.',
};

/** Âncoras dos blocos que antes eram abas próprias. */
export const ANCORA_CONTINUIDADE = 'continuidade';
export const ANCORA_AVISOS = 'avisos';
export const ANCORA_HASHTAGS = 'hashtags';

/** Ids antigos de `?aba=` que continuam abrindo a aba certa (e o bloco, quando houver). */
const ABAS_ANTIGAS: Record<string, { aba: EditorialAba; ancora?: string }> = {
  pilares: { aba: 'direcao' },
  proporcao: { aba: 'direcao' },
  perfil: { aba: 'direcao' },
  operacional: { aba: 'direcao', ancora: ANCORA_HASHTAGS },
  continuidade: { aba: 'plano', ancora: ANCORA_CONTINUIDADE },
  waves: { aba: 'plano', ancora: ANCORA_CONTINUIDADE },
  'series-e-waves': { aba: 'plano', ancora: ANCORA_CONTINUIDADE },
  avisos: { aba: 'ajustes', ancora: ANCORA_AVISOS },
  capacidade: { aba: 'ajustes' },
  regras: { aba: 'ajustes' },
  rotina: { aba: 'ajustes' },
};

/** Lê `?aba=`; ids antigos viram a aba nova e qualquer valor desconhecido cai no Plano do período. */
export function abaEditorialDaUrl(valor: string | null): EditorialAba {
  if (valor && (EDITORIAL_ABAS as readonly string[]).includes(valor)) return valor as EditorialAba;
  if (valor && ABAS_ANTIGAS[valor]) return ABAS_ANTIGAS[valor].aba;
  return ABA_EDITORIAL_PADRAO;
}

/** Bloco para onde rolar quando a URL usa um id antigo de aba (ex.: `continuidade`). */
export function ancoraDaAbaAntiga(valor: string | null): string | null {
  if (!valor || (EDITORIAL_ABAS as readonly string[]).includes(valor)) return null;
  return ABAS_ANTIGAS[valor]?.ancora ?? null;
}

/** Id antigo de aba que precisa ser trocado na URL pelo id atual. */
export function ehAbaAntiga(valor: string | null): boolean {
  return Boolean(valor && !(EDITORIAL_ABAS as readonly string[]).includes(valor) && ABAS_ANTIGAS[valor]);
}

/** Parâmetros da URL ao trocar de aba: a aba padrão não leva `?aba=`. */
export function paramsDaAba(atuais: URLSearchParams, aba: EditorialAba): URLSearchParams {
  const next = new URLSearchParams(atuais);
  if (aba === ABA_EDITORIAL_PADRAO) next.delete('aba');
  else next.set('aba', aba);
  return next;
}