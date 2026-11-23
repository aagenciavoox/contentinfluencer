/**
 * O Editorial abre em Geral. Cada conta ativa é uma aba própria, em `?conta=`,
 * para o id da plataforma não colidir com os ids antigos de `?aba=`.
 *
 * `?aba=` antigo continua abrindo o bloco certo: a direção rola até os pilares,
 * os ajustes até as faixas, as contas até a primeira conta ativa e a continuidade
 * até a conferência de séries na Saúde do Planejamento.
 */
export type EditorialAba = 'geral';

export const EDITORIAL_ABAS: readonly EditorialAba[] = ['geral'];

export const ABA_EDITORIAL_PADRAO: EditorialAba = 'geral';

export const ROTULO_DA_ABA: Record<EditorialAba, string> = {
  geral: 'Geral',
};

/** Frase da página, no “?” ao lado do título. */
export const APOIO_DA_PAGINA = 'A voz, o público e o ritmo da sua criação.';

/** Frase da aba Geral, no “?” ao lado da navegação. */
export const APOIO_DA_ABA: Record<EditorialAba, string> = {
  geral: 'Voz, pilares, ritmo e os limites que valem para todas as contas.',
};

/** Frase da aba de uma conta. */
export const APOIO_DA_CONTA = 'Formatos, horários e a pausa desta conta.';

/** Âncoras dos blocos que antes eram abas. */
export const ANCORA_DNA = 'dna-da-voz';
export const ANCORA_PILARES = 'pilares';
export const ANCORA_HASHTAGS = 'hashtags';
export const ANCORA_PROPORCAO = 'proporcao';
export const ANCORA_FAIXAS = 'faixas';
export const ANCORA_AVISOS = 'avisos';
/** Card Regra de Ouro, no Geral. */
export const ANCORA_REGRA_DE_OURO = 'regra-de-ouro';
/** Tabela de conferência das séries, na Saúde do Planejamento. */
export const ANCORA_CONFERENCIA = 'conferencia-series';

/** Link para o card Regra de Ouro (Geral, rolando até o card). */
export const ROTA_DA_REGRA_DE_OURO = `/editorial#${ANCORA_REGRA_DE_OURO}`;

/** Continuidade, waves e séries abrem a Saúde já na tabela de conferência. */
export const ROTA_DA_CONFERENCIA = `/planejamento?saude=1#${ANCORA_CONFERENCIA}`;

export type DestinoDeAba =
  | { tipo: 'geral'; ancora: string | null }
  | { tipo: 'conta' }
  | { tipo: 'planejamento' };

/**
 * Ids de `?aba=` que deixaram de ser abas. O valor desconhecido não entra:
 * a página continua no Geral sem reescrever a URL.
 */
const ABAS_ANTIGAS: Record<string, DestinoDeAba> = {
  geral: { tipo: 'geral', ancora: null },
  plano: { tipo: 'geral', ancora: null },
  direcao: { tipo: 'geral', ancora: ANCORA_PILARES },
  ajustes: { tipo: 'geral', ancora: ANCORA_FAIXAS },
  contas: { tipo: 'conta' },
  pilares: { tipo: 'geral', ancora: ANCORA_PILARES },
  proporcao: { tipo: 'geral', ancora: ANCORA_PROPORCAO },
  perfil: { tipo: 'geral', ancora: ANCORA_DNA },
  operacional: { tipo: 'geral', ancora: ANCORA_HASHTAGS },
  continuidade: { tipo: 'planejamento' },
  waves: { tipo: 'planejamento' },
  'series-e-waves': { tipo: 'planejamento' },
  avisos: { tipo: 'geral', ancora: ANCORA_AVISOS },
  capacidade: { tipo: 'geral', ancora: ANCORA_FAIXAS },
  regras: { tipo: 'geral', ancora: ANCORA_FAIXAS },
  rotina: { tipo: 'geral', ancora: ANCORA_FAIXAS },
};

/** Lê `?aba=`. Qualquer id conhecido ou desconhecido abre o Geral; a conta viva em `?conta=`. */
export function abaEditorialDaUrl(_valor: string | null): EditorialAba {
  return ABA_EDITORIAL_PADRAO;
}

/** Para onde um id antigo de `?aba=` leva. Desconhecido cai no Geral, sem âncora. */
export function resolverAbaEditorial(valor: string | null): DestinoDeAba {
  if (valor && ABAS_ANTIGAS[valor]) return ABAS_ANTIGAS[valor];
  return { tipo: 'geral', ancora: null };
}

/** Bloco do Geral para onde rolar. Conta e Planejamento não têm âncora aqui. */
export function ancoraDaAbaAntiga(valor: string | null): string | null {
  const destino = valor ? ABAS_ANTIGAS[valor] : undefined;
  return destino?.tipo === 'geral' ? destino.ancora : null;
}

/** Id antigo de aba que a página troca pela URL atual. */
export function ehAbaAntiga(valor: string | null): boolean {
  return Boolean(valor && ABAS_ANTIGAS[valor]);
}

/** Parâmetros ao voltar para o Geral: some `?aba=`, `?conta=` e o formulário de conta nova. */
export function paramsDaAba(atuais: URLSearchParams, aba: EditorialAba): URLSearchParams {
  const next = new URLSearchParams(atuais);
  next.delete('aba');
  next.delete('conta');
  next.delete('novaConta');
  if (aba !== ABA_EDITORIAL_PADRAO) next.set('aba', aba);
  return next;
}

/** Parâmetros ao abrir a aba de uma conta. O id fica em `?conta=`, nunca em `?aba=`. */
export function paramsDaConta(atuais: URLSearchParams, platformId: string): URLSearchParams {
  const next = new URLSearchParams(atuais);
  next.delete('aba');
  next.delete('novaConta');
  next.set('conta', platformId);
  return next;
}

/**
 * URL que substitui um `?aba=` antigo. Null quando a query já é a atual.
 * A âncora explícita (ex.: `#regra-de-ouro`) ganha da âncora da aba.
 * Sem conta ativa, `?aba=contas` abre o formulário de conta nova.
 */
export function urlDaAbaAntiga(
  params: URLSearchParams,
  hash: string,
  primeiraContaId: string | null,
): string | null {
  const valor = params.get('aba');
  if (!ehAbaAntiga(valor)) return null;
  const destino = ABAS_ANTIGAS[valor!]!;
  if (destino.tipo === 'planejamento') return ROTA_DA_CONFERENCIA;

  const next = new URLSearchParams(params);
  next.delete('aba');
  if (destino.tipo === 'conta') {
    next.delete('novaConta');
    if (primeiraContaId) {
      next.delete('conta');
      next.set('conta', primeiraContaId);
    } else {
      next.delete('conta');
      next.set('novaConta', '1');
    }
    const query = next.toString();
    return `/editorial${query ? `?${query}` : ''}`;
  }

  next.delete('conta');
  next.delete('novaConta');
  const query = next.toString();
  const ancora = hash.replace(/^#/, '') || destino.ancora;
  return `/editorial${query ? `?${query}` : ''}${ancora ? `#${ancora}` : ''}`;
}
