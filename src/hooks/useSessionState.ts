import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

function ler<T>(key: string, inicial: T, validar?: (valor: unknown) => T | null): T {
  if (typeof sessionStorage === 'undefined') return inicial;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return inicial;
    const parsed: unknown = JSON.parse(raw);
    if (validar) return validar(parsed) ?? inicial;
    return parsed as T;
  } catch {
    return inicial;
  }
}

/**
 * Estado que sobrevive à ida e volta entre telas na mesma aba (busca, filtros, seções abertas).
 * Sem armazenamento disponível, vale só em memória.
 */
export function useSessionState<T>(
  key: string,
  inicial: T,
  validar?: (valor: unknown) => T | null,
): [T, (next: SetStateAction<T>) => void] {
  const [valor, setValor] = useState<T>(() => ler(key, inicial, validar));
  const chaveAtual = useRef(key);

  if (chaveAtual.current !== key) {
    chaveAtual.current = key;
    setValor(ler(key, inicial, validar));
  }

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(key, JSON.stringify(valor));
    } catch {
      // Armazenamento cheio ou bloqueado: o estado segue em memória.
    }
  }, [key, valor]);

  const atualizar = useCallback((next: SetStateAction<T>) => setValor(next), []);
  return [valor, atualizar];
}

function areaQueRola(el: HTMLElement | null): HTMLElement | null {
  let atual = el?.parentElement ?? null;
  while (atual) {
    const overflow = getComputedStyle(atual).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && atual.scrollHeight > atual.clientHeight) return atual;
    atual = atual.parentElement;
  }
  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
}

/**
 * Guarda a posição da rolagem da tela e devolve quando ela volta a abrir.
 * Coloque o ref num elemento dentro da área que rola; `pronto` espera os dados chegarem.
 */
export function useScrollMemory<E extends HTMLElement = HTMLDivElement>(key: string, pronto: boolean) {
  const ref = useRef<E>(null);
  useEffect(() => {
    if (!pronto) return;
    const area = areaQueRola(ref.current);
    if (!area) return;
    // A área que rola é do app inteiro: sem posição guardada, a tela começa do topo,
    // e não onde a tela anterior parou.
    const salvo = ler<number>(`${key}:rolagem`, 0);
    const quadro = requestAnimationFrame(() => {
      area.scrollTop = salvo > 0 ? salvo : 0;
    });
    let pendente = 0;
    const aoRolar = () => {
      if (pendente) return;
      pendente = requestAnimationFrame(() => {
        pendente = 0;
        try {
          sessionStorage.setItem(`${key}:rolagem`, JSON.stringify(Math.round(area.scrollTop)));
        } catch {
          // Sem armazenamento, a posição não volta.
        }
      });
    };
    area.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      cancelAnimationFrame(quadro);
      cancelAnimationFrame(pendente);
      area.removeEventListener('scroll', aoRolar);
    };
  }, [key, pronto]);
  return ref;
}
