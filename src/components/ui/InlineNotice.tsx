import { AlertCircle, ArrowRight } from 'lucide-react';
import { AppButton } from './AppButton';
import { Text } from './Text';

export interface InlineNoticeAction {
  rotulo: string;
  onClick: () => void;
}

/**
 * Faixa de aviso com uma ação opcional. O texto fica em `--text-primary`;
 * a cor de alerta só tinge o fundo, a borda e o ícone.
 */
export function InlineNotice({ texto, acao }: { texto: string; acao?: InlineNoticeAction }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-input)] border border-[color-mix(in_srgb,var(--warning)_40%,var(--border-color))] bg-[color-mix(in_srgb,var(--warning)_12%,var(--bg-elevated))] px-3 py-2">
      <AlertCircle className="h-5 w-5 shrink-0 text-[var(--warning)]" aria-hidden />
      <Text variant="bodyStrong" as="p" className="min-w-[12rem] flex-1">{texto}</Text>
      {acao ? (
        <AppButton variant="secondary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={acao.onClick}>
          {acao.rotulo}
        </AppButton>
      ) : null}
    </div>
  );
}
