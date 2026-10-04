import type { AppDataDomain } from '../lib/database';

export type DomainLoadStatus = 'loading' | 'ready' | 'error';

export type DomainStatusMap = Partial<Record<AppDataDomain, DomainLoadStatus>>;

/** `content` e `content-schedule` são o mesmo select completo; ambos cobrem o summary limitado. */
export const FULL_CONTENT_LIST_DOMAINS: readonly AppDataDomain[] = ['content', 'content-schedule'];

/** Domínios cujo carregamento também atende `domain`. O próprio domínio vem primeiro. */
export function getCoveringDomains(domain: AppDataDomain): readonly AppDataDomain[] {
  if (domain === 'content' || domain === 'content-schedule') {
    return [domain, ...FULL_CONTENT_LIST_DOMAINS.filter(alias => alias !== domain)];
  }
  if (domain === 'content-summary') {
    return [domain, ...FULL_CONTENT_LIST_DOMAINS];
  }
  return [domain];
}

export function isDomainAlreadyLoaded(
  loaded: ReadonlySet<AppDataDomain>,
  domain: AppDataDomain,
): boolean {
  return getCoveringDomains(domain).some(covering => loaded.has(covering));
}

export function markDomainsLoaded(
  loaded: Set<AppDataDomain>,
  domains: readonly AppDataDomain[],
) {
  for (const domain of domains) {
    loaded.add(domain);
    if (FULL_CONTENT_LIST_DOMAINS.includes(domain)) {
      FULL_CONTENT_LIST_DOMAINS.forEach(alias => loaded.add(alias));
      loaded.add('content-summary');
    }
  }
}

/**
 * Separa o que precisa ir ao servidor do que já está em voo.
 * Um domínio em voo (ou um apelido que o cobre) não é buscado de novo:
 * quem pediu aguarda a promise que já existe. Cada promise aparece uma vez só.
 */
export function subtractInFlightDomains<P>(
  domains: readonly AppDataDomain[],
  inFlight: ReadonlyMap<AppDataDomain, P>,
): { toFetch: AppDataDomain[]; pending: P[] } {
  const toFetch: AppDataDomain[] = [];
  const pending = new Set<P>();

  for (const domain of domains) {
    const covering = getCoveringDomains(domain).find(candidate => inFlight.has(candidate));
    if (covering) {
      pending.add(inFlight.get(covering) as P);
    } else if (!toFetch.includes(domain)) {
      toFetch.push(domain);
    }
  }

  return { toFetch, pending: [...pending] };
}

/**
 * Aplica um status aos domínios e devolve o mesmo objeto quando nada muda,
 * para o `setState` não disparar render à toa.
 * Domínio `ready` continua `ready` durante a revalidação e depois de uma falha:
 * o dado já está na tela.
 */
export function applyDomainStatus(
  previous: DomainStatusMap,
  domains: readonly AppDataDomain[],
  status: DomainLoadStatus,
): DomainStatusMap {
  let next: DomainStatusMap | null = null;

  for (const domain of domains) {
    const current = (next ?? previous)[domain];
    if (current === status) continue;
    if (current === 'ready') continue;
    next = { ...(next ?? previous), [domain]: status };
  }

  return next ?? previous;
}

/** Remove o status dos domínios e devolve o mesmo objeto quando nenhum deles tinha status. */
export function clearDomainStatus(
  previous: DomainStatusMap,
  domains: readonly AppDataDomain[],
): DomainStatusMap {
  if (!domains.some(domain => domain in previous)) return previous;
  const next: DomainStatusMap = { ...previous };
  domains.forEach(domain => {
    delete next[domain];
  });
  return next;
}

/** Status de um domínio considerando os apelidos (`content` cobre `content-summary` etc.). */
export function resolveDomainStatus(
  statusMap: DomainStatusMap,
  domain: AppDataDomain,
): DomainLoadStatus | undefined {
  const statuses = getCoveringDomains(domain).map(covering => statusMap[covering]);
  if (statuses.includes('ready')) return 'ready';
  if (statuses.includes('loading')) return 'loading';
  if (statuses.includes('error')) return 'error';
  return undefined;
}
