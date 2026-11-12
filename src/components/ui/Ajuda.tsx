import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import { Text } from './Text';

/**
 * Explicação curta no “?”. Abre ao clique e fecha no Escape ou fora.
 * O painel vai num portal para não ser cortado por tabela ou card com rolagem.
 */
export function Ajuda({
  texto,
  rotulo,
  alinhar = 'inicio',
}: {
  texto: string;
  /** Nome do controle para leitor de tela. Ex.: "Sobre Publicados". */
  rotulo: string;
  alinhar?: 'inicio' | 'fim';
}) {
  const [aberto, setAberto] = useState(false);
  const [ponto, setPonto] = useState<{ top: number; left: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLSpanElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!aberto) return;
    const colocar = () => {
      const node = botao.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const largura = 288;
      const esquerda = alinhar === 'fim' ? rect.right - largura : rect.left;
      setPonto({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(esquerda, window.innerWidth - largura - 8)),
      });
    };
    colocar();
    window.addEventListener('resize', colocar);
    window.addEventListener('scroll', colocar, true);
    return () => {
      window.removeEventListener('resize', colocar);
      window.removeEventListener('scroll', colocar, true);
    };
  }, [aberto, alinhar]);

  useEffect(() => {
    if (!aberto) return;
    const clique = (event: MouseEvent) => {
      const alvo = event.target as Node;
      if (botao.current?.contains(alvo) || painel.current?.contains(alvo)) return;
      setAberto(false);
    };
    const tecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', clique);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', clique);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  return (
    <>
      <button
        ref={botao}
        type="button"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={rotulo}
        onClick={() => setAberto(atual => !atual)}
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
      </button>
      {aberto && ponto
        ? createPortal(
            <span
              ref={painel}
              id={id}
              role="note"
              style={{ position: 'fixed', top: ponto.top, left: ponto.left, width: 288 }}
              className="z-[220] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-left shadow-[var(--shadow-dropdown)]"
            >
              <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">{texto}</Text>
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
