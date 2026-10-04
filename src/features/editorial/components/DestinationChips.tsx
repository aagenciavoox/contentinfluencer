import { Check } from 'lucide-react';
import type { ContentPlataforma } from '../../../lib/database';
import { platformDisplayName } from '../../../components/ui/platformName';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import {
  alternarDestino,
  destinoMarcado,
  mesmoDestino,
  publicacaoOriginal,
  publicacaoPublicada,
  type DestinoPlataforma,
} from '../lib/destinations';

export function DestinationChips({
  platforms,
  publications,
  contentId,
  disabled = false,
  activePlatformId = null,
  onActivate,
  onChange,
}: {
  platforms: DestinoPlataforma[];
  publications: ContentPlataforma[];
  contentId: string;
  disabled?: boolean;
  activePlatformId?: string | null;
  onActivate?: (platformId: string) => void;
  onChange: (publications: ContentPlataforma[]) => void;
}) {
  return (
    <div className="stack-sm">
      <Text variant="label" className="text-[var(--text-tertiary)]">
        Onde você pretende publicar?
      </Text>
      {platforms.length === 0 ? (
        <Text variant="secondary">
          Nenhuma rede ativa. Cadastre em Configurações, em Plataformas.
        </Text>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Onde você pretende publicar?">
          {platforms.map(platform => {
            const marcado = destinoMarcado(publications, platform);
            const publicada = publications.some(item =>
              publicacaoOriginal(item)
              && mesmoDestino(item.platformId, platform)
              && publicacaoPublicada(item),
            );
            const ativo = activePlatformId === platform.id;
            return (
              <button
                key={platform.id}
                type="button"
                aria-pressed={marcado}
                disabled={disabled}
                title={publicada ? 'Esta rede já foi publicada.' : undefined}
                onClick={() => {
                  if (disabled) return;
                  if (!marcado) {
                    onChange(alternarDestino({
                      publicacoes: publications,
                      plataforma: platform,
                      contentId,
                      marcar: true,
                    }));
                    onActivate?.(platform.id);
                    return;
                  }
                  if (onActivate && activePlatformId !== platform.id) {
                    onActivate(platform.id);
                    return;
                  }
                  if (publicada) return;
                  onChange(alternarDestino({
                    publicacoes: publications,
                    plataforma: platform,
                    contentId,
                    marcar: false,
                  }));
                }}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-input)] border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50',
                  marcado
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-primary)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                  marcado && ativo && 'shadow-[var(--shadow-focus)]',
                )}
              >
                <PlatformIcon platform={platform.nome} className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{platformDisplayName(platform.nome)}</span>
                {marcado ? <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}