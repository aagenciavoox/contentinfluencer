import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link2, Lock, PenLine, Undo2 } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { Text } from '../../../../components/ui/Text';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { cn } from '../../../../lib/utils';
import type { EstadoLegenda } from '../../lib/captions';

const ROTULO_ESTADO: Record<EstadoLegenda, string> = {
  base: 'Usando legenda-base',
  propria: 'Versão própria',
  publicada: 'Publicada',
};

function dataCurta(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Legenda de uma publicação (ou da versão de uma conta, na série). Mostra a conta,
 * diz se o texto acompanha a base ou é uma versão própria, e oferece as duas ações.
 * Publicada só mostra o texto usado: ele fica preservado.
 */
export function LegendaVersaoField({
  id,
  icone,
  rotulo,
  detalhe,
  titulo = 'Legenda desta publicação',
  estado,
  texto,
  baseVazia,
  nomeDaBase = 'legenda-base',
  alcanceDaBase = 'Esta publicação passará a acompanhar a legenda-base atual e as próximas mudanças dela.',
  onCriarPropria,
  onEditar,
  onVoltarParaBase,
  disabled = false,
  limite = null,
  publicadaEm = null,
  compact = false,
  acoes,
}: {
  id: string;
  /** Valor para o `PlatformIcon`. */
  icone: string;
  /** Plataforma e @ da conta. */
  rotulo: string;
  detalhe?: string | null;
  titulo?: string;
  estado: EstadoLegenda;
  /** Texto efetivo. */
  texto: string;
  baseVazia: boolean;
  nomeDaBase?: string;
  alcanceDaBase?: string;
  onCriarPropria: () => void;
  onEditar: (texto: string) => void;
  onVoltarParaBase: () => void;
  disabled?: boolean;
  limite?: number | null;
  publicadaEm?: string | null;
  compact?: boolean;
  /** Copiar e afins, no rodapé. */
  acoes?: ReactNode;
}) {
  const [confirmarVolta, setConfirmarVolta] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const acima = limite != null && texto.length > limite;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [texto, estado]);

  const quando = dataCurta(publicadaEm);

  return (
    <div className={cn('stack-sm rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)]', compact ? 'p-3' : 'p-4')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <PlatformIcon platform={icone} className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
          <div className="min-w-0">
            <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">{titulo}</Text>
            <Text variant="bodyStrong" as="p" className="truncate text-sm">
              {rotulo}
              {detalhe ? <span className="font-normal text-[var(--text-secondary)]">{` · ${detalhe}`}</span> : null}
            </Text>
          </div>
        </div>
        <Badge
          variant="neutral"
          className={cn(
            'gap-1',
            estado === 'propria' && 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text-primary)]',
          )}
        >
          {estado === 'base' ? <Link2 className="h-3 w-3" aria-hidden /> : null}
          {estado === 'propria' ? <PenLine className="h-3 w-3" aria-hidden /> : null}
          {estado === 'publicada' ? <Lock className="h-3 w-3" aria-hidden /> : null}
          {ROTULO_ESTADO[estado]}
        </Badge>
      </div>

      {estado === 'propria' ? (
        <textarea
          id={id}
          ref={ref}
          value={texto}
          disabled={disabled}
          rows={compact ? 2 : 3}
          aria-label={`${titulo}: ${rotulo}`}
          onChange={event => onEditar(event.target.value)}
          className="block w-full resize-none overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
          placeholder={`Legenda só para ${rotulo}`}
        />
      ) : (
        <p
          id={id}
          className={cn(
            'whitespace-pre-wrap break-words rounded-[var(--radius-input)] bg-[var(--surface-subtle)] px-3 py-2 text-sm leading-6',
            texto.trim() ? 'text-[var(--text-secondary)]' : 'italic text-[var(--text-tertiary)]',
            compact && 'line-clamp-4',
          )}
        >
          {texto.trim()
            ? texto
            : estado === 'publicada'
              ? 'Publicada sem legenda registrada.'
              : baseVazia
                ? `A ${nomeDaBase} está vazia.`
                : 'Sem legenda.'}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text variant="meta" className={cn('tabular-nums', acima && 'text-[var(--danger)]')}>
          {estado === 'publicada'
            ? (quando ? `Publicada em ${quando}. O texto usado fica preservado.` : 'O texto usado fica preservado.')
            : limite != null ? `${texto.length} / ${limite}` : `${texto.length} caracteres`}
        </Text>
        <div className="flex flex-wrap items-center gap-2">
          {acoes}
          {estado === 'base' ? (
            <AppButton
              size="xs"
              variant="secondary"
              disabled={disabled}
              leftIcon={<PenLine className="h-3.5 w-3.5" />}
              onClick={onCriarPropria}
              aria-label={`Criar versão própria para ${rotulo}`}
            >
              Criar versão própria
            </AppButton>
          ) : null}
          {estado === 'propria' ? (
            <AppButton
              size="xs"
              variant="secondary"
              disabled={disabled}
              leftIcon={<Undo2 className="h-3.5 w-3.5" />}
              onClick={() => setConfirmarVolta(true)}
              aria-label={`Voltar a usar a ${nomeDaBase} em ${rotulo}`}
            >
              {`Voltar a usar a ${nomeDaBase}`}
            </AppButton>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        open={confirmarVolta}
        message={`${alcanceDaBase} O texto próprio de ${rotulo} será descartado.`}
        confirmLabel={`Usar a ${nomeDaBase}`}
        cancelLabel="Manter versão própria"
        onConfirm={() => {
          setConfirmarVolta(false);
          onVoltarParaBase();
        }}
        onCancel={() => setConfirmarVolta(false)}
      />
    </div>
  );
}
