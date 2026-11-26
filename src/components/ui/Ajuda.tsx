import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as TeclaDoReact, type PointerEvent as PonteiroDoReact } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import { Text } from './Text';

/**
 * Explicação curta no “?”. Abre ao clique (ou toque) e fecha no Escape ou fora.
 * Com `abrirAoPassar`, abre também ao passar o mouse; o clique deixa aberto.
 * O painel vai num portal para não ser cortado por tabela ou card com rolagem
 * e leva `data-ajuda` para quem fecha ao clicar fora reconhecer o painel.
 */
export function Ajuda({
  texto,
  rotulo,
  alinhar = 'inicio',
  abrirAoPassar = false,
  acao,
}: {
  texto: string;
  /** Nome do controle para leitor de tela. Ex.: "Sobre Publicados". */
  rotulo: string;
  alinhar?: 'inicio' | 'fim';
  abrirAoPassar?: boolean;
  /** Link no fim do texto (ex.: abrir a tela onde o valor se ajusta). Tab no “?” aberto vai até ele. */
  acao?: { rotulo: string; para: string };
}) {
  const [aberto, setAberto] = useState(false);
  const [ponto, setPonto] = useState<{ top: number; left: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLSpanElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  // Aberto pelo clique fica; aberto só pelo mouse fecha quando o mouse sai.
  const fixo = useRef(false);
  const fechar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const cancelarFechar = () => {
    if (fechar.current) clearTimeout(fechar.current);
    fechar.current = null;
  };
  const entrar = (event: PonteiroDoReact) => {
    if (!abrirAoPassar || event.pointerType !== 'mouse') return;
    cancelarFechar();
    setAberto(true);
  };
  const sair = (event: PonteiroDoReact) => {
    if (!abrirAoPassar || event.pointerType !== 'mouse' || fixo.current) return;
    cancelarFechar();
    fechar.current = setTimeout(() => setAberto(false), 200);
  };
  useEffect(() => () => cancelarFechar(), []);
  useEffect(() => {
    if (!aberto) fixo.current = false;
  }, [aberto]);

  const teclaNoBotao = (event: TeclaDoReact<HTMLButtonElement>) => {
    if (event.key === 'Tab' && !event.shiftKey && aberto && link.current) {
      event.preventDefault();
      link.current.focus();
    }
  };
  const teclaNoLink = (event: TeclaDoReact<HTMLAnchorElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      if (!event.shiftKey) setAberto(false);
      botao.current?.focus();
    }
  };

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
        className="inline-flex h-11 w-11 -my-2.5 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={rotulo}
        onClick={() => {
          cancelarFechar();
          // Aberto só pelo mouse: o clique fixa em vez de fechar.
          if (aberto && !fixo.current) {
            fixo.current = true;
            return;
          }
          fixo.current = !aberto;
          setAberto(!aberto);
        }}
        onKeyDown={teclaNoBotao}
        onPointerEnter={entrar}
        onPointerLeave={sair}
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
      </button>
      {aberto && ponto
        ? createPortal(
            <span
              ref={painel}
              id={id}
              role="note"
              data-ajuda=""
              style={{ position: 'fixed', top: ponto.top, left: ponto.left, width: 288 }}
              className="z-[220] flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-left shadow-[var(--shadow-dropdown)]"
              onPointerEnter={entrar}
              onPointerLeave={sair}
            >
              <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">{texto}</Text>
              {acao ? (
                <Link
                  ref={link}
                  to={acao.para}
                  className="t-body-strong w-fit rounded-[var(--radius-input)] text-[var(--brand-accent-text)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  onClick={() => setAberto(false)}
                  onKeyDown={teclaNoLink}
                >
                  {acao.rotulo}
                </Link>
              ) : null}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
