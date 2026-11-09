import { useEffect, useId, useRef, useState, type MouseEvent as CliqueDoMouse } from 'react';
import { Pencil, Repeat } from 'lucide-react';
import { createPortal } from 'react-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { FLOATING_MENU_HIDDEN_STYLE, FLOATING_MENU_Z_INDEX, useAnchoredPosition } from '../../../components/ui/anchoredPosition';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { useFrequenciaDaSerie } from '../hooks/useFrequenciaDaSerie';
import { cliqueDentroDoPainel, rascunhoDaFrequencia, type RascunhoDaFrequencia } from '../lib/frequenciaChip';
import type { FrequenciaGravada } from '../lib/metaDaOnda';
import { CamposDaMeta } from './plano/CamposDaMeta';

/**
 * Chip de frequência: mostra a meta da série e abre um popover para editar quantidade,
 * período e início. Grava na hora, no mesmo lugar da Continuidade.
 */
export function FrequenciaChip({
  serieId,
  id,
  className,
  onSalvo,
  aparencia = 'botao',
}: {
  serieId: string;
  /** Id do botão, para foco a partir de avisos. */
  id?: string;
  className?: string;
  /** Depois de gravar (ex.: o formulário da série acompanha o valor novo). */
  onSalvo?: (frequencia: FrequenciaGravada) => void;
  /** `linha`: texto e lápis, debaixo do nome no Ritmo do Planejamento. */
  aparencia?: 'botao' | 'linha';
}) {
  const { serie, editavel, texto, salvar } = useFrequenciaDaSerie(serieId);
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoDaFrequencia>(() => rascunhoDaFrequencia(serie ?? {}));
  const [erro, setErro] = useState<{ mensagem: string; campo: 'quantidade' | 'periodo' | 'inicio' } | null>(null);
  const [gravando, setGravando] = useState(false);
  const campoId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const painelId = useId();
  const position = useAnchoredPosition(aberto, triggerRef, painelRef, { align: 'start', matchWidth: false });

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (event: MouseEvent | TouchEvent) => {
      if (gravando) return;
      const alvo = event.target as Node | null;
      if (alvo && (triggerRef.current?.contains(alvo) || cliqueDentroDoPainel(alvo, painelRef.current))) return;
      setAberto(false);
    };
    const tecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('touchstart', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('touchstart', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto, gravando]);

  if (!serie || !editavel) {
    if (aparencia === 'linha' && texto) {
      return <span className={cn('t-meta truncate', className)}>{texto}</span>;
    }
    return null;
  }

  const linha = aparencia === 'linha';

  const abrir = () => {
    setRascunho(rascunhoDaFrequencia(serie));
    setErro(null);
    setAberto(atual => !atual);
  };
  const gravar = async () => {
    if (gravando) return;
    setGravando(true);
    try {
      const resultado = await salvar(rascunho);
      if ('erro' in resultado) {
        setErro({ mensagem: resultado.erro, campo: resultado.campo });
        window.setTimeout(() => document.getElementById(`${campoId}-${resultado.campo}`)?.focus(), 0);
        return;
      }
      onSalvo?.(resultado);
      setAberto(false);
    } finally {
      setGravando(false);
    }
  };

  const abrirComClique = (event: CliqueDoMouse) => {
    event.stopPropagation();
    abrir();
  };
  const rotulo = `Frequência: ${texto}. Editar`;

  return (
    <>
      {linha ? (
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={cn(
            't-meta inline-flex max-w-full items-center gap-1 rounded-[var(--radius-input)] py-1 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
            className,
          )}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          aria-controls={aberto ? painelId : undefined}
          aria-label={rotulo}
          onClick={abrirComClique}
        >
          <span className="truncate">{texto}</span>
          <Pencil className="h-3 w-3 shrink-0" aria-hidden />
        </button>
      ) : (
        <AppButton
          ref={triggerRef}
          id={id}
          type="button"
          variant="secondary"
          size="sm"
          className={className}
          leftIcon={<Repeat className="h-3.5 w-3.5" aria-hidden />}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          aria-controls={aberto ? painelId : undefined}
          aria-label={rotulo}
          onClick={abrirComClique}
        >
          {texto}
        </AppButton>
      )}
      {aberto && typeof document !== 'undefined' ? createPortal(
        <div
          ref={painelRef}
          id={painelId}
          role="dialog"
          aria-label={`Frequência de ${serie.name}`}
          style={position?.style ?? FLOATING_MENU_HIDDEN_STYLE}
          className={cn(
            'fixed w-[min(92vw,26rem)] stack-sm rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-[var(--shadow-dropdown)]',
            FLOATING_MENU_Z_INDEX,
          )}
        >
          <Text variant="bodyStrong" as="span">Frequência</Text>
          <CamposDaMeta
            idPrefix={campoId}
            vezes={rascunho.vezes}
            unidade={rascunho.unidade}
            inicio={rascunho.aPartirDe}
            onVezes={vezes => setRascunho(atual => ({ ...atual, vezes }))}
            onUnidade={unidade => setRascunho(atual => ({ ...atual, unidade }))}
            onInicio={aPartirDe => setRascunho(atual => ({ ...atual, aPartirDe }))}
            mostrarLegenda
            erros={erro ? { [erro.campo]: erro.mensagem } : undefined}
          />
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            Quantidade vazia tira a meta. Acompanhamento e regras ficam na Continuidade.
          </Text>
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="ghost" size="sm" onClick={() => setAberto(false)} disabled={gravando}>Cancelar</AppButton>
            <AppButton type="button" variant="primary" size="sm" onClick={() => void gravar()} disabled={gravando}>
              {gravando ? 'Salvando…' : 'Salvar'}
            </AppButton>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
