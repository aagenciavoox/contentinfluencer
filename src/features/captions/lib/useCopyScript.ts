import { useCallback, useEffect, useRef, useState } from 'react';
import type { Content } from '../../../lib/database';
import { isContentBodyLoaded } from '../../contents/lib/contentBody';
import { contentReadableBody } from '../../contents/lib/carouselSlides';

interface UseCopyScriptOptions {
  content: Content;
  hasHydrationError?: boolean;
  onRetryHydration?: () => void;
}

export function useCopyScript({
  content,
  hasHydrationError = false,
  onRetryHydration,
}: UseCopyScriptOptions) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setCopied(false);
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [content.id]);

  useEffect(() => () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
    }
  }, []);

  const scriptText = contentReadableBody(content).trim();
  const bodyLoaded = isContentBodyLoaded(content);
  const isLoading = !bodyLoaded && !hasHydrationError;
  const isEmpty = bodyLoaded && scriptText.length === 0;
  const disabled = isLoading || isEmpty;

  const copyScript = useCallback(async () => {
    if (hasHydrationError) {
      onRetryHydration?.();
      return;
    }
    if (!scriptText) return;
    try {
      await navigator.clipboard.writeText(scriptText);
      setCopied(true);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  }, [hasHydrationError, onRetryHydration, scriptText]);

  const title = content.title.trim() || 'Sem título';

  const label = copied
    ? 'Roteiro copiado'
    : hasHydrationError
      ? 'Tentar novamente'
      : isLoading
        ? 'Carregando…'
        : isEmpty
          ? 'Sem roteiro'
          : 'Copiar roteiro';

  const shortLabel = copied
    ? 'Copiado'
    : hasHydrationError
      ? 'Tentar de novo'
      : isLoading
        ? 'Carregando…'
        : isEmpty
          ? 'Sem roteiro'
          : 'Copiar roteiro';

  const ariaLabel = copied
    ? `Roteiro de ${title} copiado para a área de transferência`
    : hasHydrationError
      ? `Tentar carregar novamente o roteiro de ${title}`
      : isLoading
        ? `Carregando roteiro de ${title}`
        : isEmpty
          ? `Roteiro de ${title} ainda não tem texto`
          : `Copiar roteiro de ${title} para a área de transferência`;

  return {
    copied,
    isLoading,
    isEmpty,
    disabled,
    hasHydrationError,
    label,
    shortLabel,
    ariaLabel,
    copyScript,
  };
}
