import { useAppContext } from '../context/AppContext';
import { resolveDomainStatus } from '../context/domainLoading';
import type { AppDataDomain } from '../lib/database';

/**
 * Verdadeiro quando a tela já pode trocar o skeleton pelo conteúdo ou pelo estado vazio.
 * Cache persistido mostrado na tela conta como pronto, mesmo durante a revalidação.
 * Uma busca que não concluiu também libera a tela; sem isso o skeleton ficaria para sempre.
 */
export function useDomainsReady(domains: readonly AppDataDomain[]): boolean {
  const { domainStatus, isDomainReady } = useAppContext();
  return domains.every(
    domain => isDomainReady(domain) || resolveDomainStatus(domainStatus, domain) === 'error',
  );
}
