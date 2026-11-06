import {ExternalLink} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import {pontosParaRevisar, type AvisoOrientacao} from '../lib/orientacaoEditorial';

/**
 * Faixa fina de avisos do Planejamento (Fase 3.1).
 * Só textos curtos + Localizar; métricas ficam no drawer "Ver análise".
 */
export function AvisosFaixa({
  avisos,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onLimparDestaque,
  onVerAnalise,
  onAbrirEditorial,
  className,
}: {
  avisos: readonly AvisoOrientacao[];
  avisoAtivoId?: string | null;
  onLocalizar: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
  onVerAnalise?: () => void;
  onAbrirEditorial?: () => void;
  className?: string;
}) {
  const revisar = pontosParaRevisar(avisos);
  const ordenados = [...avisos].sort((a, b) => {
    if (a.severidade !== b.severidade) return a.severidade === 'revisar' ? -1 : 1;
    return a.texto.localeCompare(b.texto, 'pt-BR');
  });

  return (
    <Surface
      variant="outlined"
      padding="sm"
      className={cn('w-full stack-sm', className)}
      data-planejamento-avisos-faixa
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text variant="label" as="h2" className="text-[var(--text-secondary)]">
          {revisar > 0
            ? (revisar === 1 ? '1 ponto para revisar' : `${revisar} pontos para revisar`)
            : avisos.length > 0
              ? (avisos.length === 1 ? '1 aviso neste trecho' : `${avisos.length} avisos neste trecho`)
              : 'Nada para revisar neste trecho'}
        </Text>
        <div className="flex flex-wrap items-center gap-2">
          {onVerAnalise ? (
            <AppButton variant="secondary" size="sm" onClick={onVerAnalise}>
              Ver análise
            </AppButton>
          ) : null}
          {onAbrirEditorial ? (
            <AppButton
              variant="ghost"
              size="sm"
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
              onClick={onAbrirEditorial}
            >
              Abrir Editorial
            </AppButton>
          ) : null}
        </div>
      </div>

      {ordenados.length > 0 ? (
        <ul className="stack-xs">
          {ordenados.map(aviso => {
            const ativo = avisoAtivoId === aviso.id;
            return (
              <li
                key={aviso.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5',
                  ativo && 'bg-[color-mix(in_srgb,var(--brand-accent)_10%,transparent)]',
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      aviso.severidade === 'revisar' ? 'bg-[var(--accent-orange)]' : 'bg-[var(--text-tertiary)]',
                    )}
                    aria-hidden
                  />
                  <Text variant="body" as="p" className="min-w-0 text-[var(--text-primary)]">
                    {aviso.texto}
                  </Text>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <AppButton
                    variant={ativo ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => onLocalizar(aviso)}
                  >
                    Localizar
                  </AppButton>
                  {onFoiDeProposito && (aviso.tipo === 'obra-repetida' || aviso.tipo === 'tema-concentrado') && aviso.alvoId && aviso.intervalo ? (
                    <AppButton variant="secondary" size="sm" onClick={() => onFoiDeProposito(aviso)}>
                      Foi de propósito
                    </AppButton>
                  ) : null}
                  {ativo && onLimparDestaque ? (
                    <AppButton variant="secondary" size="sm" onClick={onLimparDestaque}>
                      Limpar
                    </AppButton>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Surface>
  );
}
