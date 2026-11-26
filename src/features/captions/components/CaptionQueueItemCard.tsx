import { Calendar, Check } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import type { Content, ContentPlataforma } from '../../../lib/database';
import { contaDaRef, iconeDaConta, redeDaRef, rotuloConta, type ContaRef } from '../../contas/lib/contas';
import { temLegenda, legendaEfetiva, hashtagsNaLegenda } from '../../editorial/lib/captions';
import { parseHashtags } from '../../contents/lib/captionHashtags';
import { formatoNoYoutube } from '../../editorial/lib/publicacoes';

export function getPlatformDotClass(platformId: string, conta?: ContaRef | null): string {
  const p = (conta?.rede || conta?.nome || platformId).toLowerCase();
  if (p.includes('instagram')) return 'bg-[var(--platform-instagram)]';
  if (p.includes('tiktok')) return 'bg-[var(--platform-tiktok)]';
  if (p.includes('youtube')) return 'bg-[var(--platform-youtube)]';
  return 'bg-[var(--text-secondary)]';
}

export function inferPlatformFormat(
  platformId: string,
  visualFormat?: string | null,
  conta?: ContaRef | null,
  publicacao?: Partial<Pick<ContentPlataforma, 'formatoPublicacao'>> | null,
  writingMode?: Content['writingMode'] | null,
): string {
  const p = (conta?.rede || conta?.nome || platformId).toLowerCase();
  if (p.includes('youtube')) {
    const noYt = formatoNoYoutube({ formatoVisual: visualFormat ?? null, writingMode }, publicacao ?? undefined);
    return noYt.formato === 'short' ? 'shorts' : 'vídeo longo';
  }
  if (visualFormat?.trim()) {
    return visualFormat.toLowerCase();
  }
  if (p.includes('tiktok')) return 'tiktok';
  if (p.includes('instagram')) return 'reels';
  return 'post';
}

interface CaptionQueueItemCardProps {
  content: Content;
  activePublicacoes: ContentPlataforma[];
  selected: boolean;
  onSelect: () => void;
  onWriteNow?: () => void;
  contas: readonly ContaRef[];
  hasHydrationError?: boolean;
  onRetryHydration?: () => void;
}

/**
 * Cartão enxuto da fila de legendas (3 linhas):
 * 1. Título do roteiro + status (Pronta / Pendente)
 * 2. Prévia curta da legenda ou "Sem legenda ainda"
 * 3. Ícones das redes ativas + data prevista + contadores
 */
export function CaptionQueueItemCard({
  content,
  activePublicacoes,
  selected,
  onSelect,
  contas,
}: CaptionQueueItemCardProps) {
  const temBase = Boolean((content.legendaBase ?? '').trim());
  const algumaComLegenda = activePublicacoes.some(p => temLegenda(content.legendaBase, p));
  const preenchida = temBase || (activePublicacoes.length > 0 && algumaComLegenda);
  const pendente = !preenchida;

  const primeiraComTexto = activePublicacoes.find(p => p.legenda?.trim());
  const textoEfetivo =
    content.legendaBase?.trim() ||
    (primeiraComTexto ? legendaEfetiva(content.legendaBase, primeiraComTexto) : '') ||
    '';

  const hashtagsTexto = hashtagsNaLegenda(textoEfetivo);
  const todasTagsDasContas = activePublicacoes.flatMap(p => parseHashtags(p.hashtags || ''));
  const totalTags = Array.from(new Set([...hashtagsTexto, ...todasTagsDasContas])).length;
  const totalCarac = textoEfetivo.length;

  const dataPrevista = content.publishDate || activePublicacoes[0]?.publishDate || null;
  const preview = textoEfetivo.trim().replace(/\s+/g, ' ');
  const titulo = content.title.trim() || 'Sem título';

  const statusSrText = pendente
    ? `Legenda pendente para ${activePublicacoes.length} ${activePublicacoes.length === 1 ? 'rede social' : 'redes sociais'}`
    : `Legenda pronta com ${totalCarac} caracteres`;

  return (
    <article
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      aria-label={`${titulo}. ${statusSrText}`}
      className={cn(
        'group relative flex shrink-0 flex-col gap-2 overflow-hidden rounded-[var(--radius-card)] border px-4 py-3 text-left transition-all cursor-pointer select-none',
        selected
          ? 'border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_5%,var(--bg-elevated))] ring-1 ring-[var(--brand-accent)]'
          : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--border-input)] hover:bg-[var(--bg-hover)]',
      )}
    >
      {pendente ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--warning)]"
        />
      ) : null}

      {/* Linha 1: Título do roteiro + status */}
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onSelect();
          }}
          className="min-w-0 flex-1 rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Text variant="itemTitle" as="h3" className="line-clamp-2 leading-snug">
            {titulo}
          </Text>
        </button>

        <div className="shrink-0 pt-0.5">
          {preenchida ? (
            <Badge variant="success" className="inline-flex items-center gap-1">
              <Check className="h-3 w-3 shrink-0 text-[var(--success)]" aria-hidden />
              Pronta
            </Badge>
          ) : (
            <Badge variant="warning" className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" aria-hidden />
              Pendente
            </Badge>
          )}
        </div>
      </div>

      {/* Linha 2: Prévia curta da legenda */}
      {preview ? (
        <Text variant="meta" as="p" className="line-clamp-2 text-[var(--text-secondary)]">
          {preview}
        </Text>
      ) : (
        <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
          Sem legenda ainda
        </Text>
      )}

      {/* Linha 3: Redes ativas + data prevista + contadores */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex min-w-0 items-center gap-2">
          {activePublicacoes.length > 0 ? (
            <div className="flex shrink-0 items-center gap-1">
              {activePublicacoes.slice(0, 4).map(pub => {
                const conta = contaDaRef(pub.platformId, contas);
                const rede = redeDaRef(pub.platformId, contas);
                const noYt = rede === 'youtube'
                  ? formatoNoYoutube({ formatoVisual: content.formatoVisual ?? null, writingMode: content.writingMode }, pub)
                  : null;
                const icone = noYt && noYt.formato === 'short'
                  ? 'youtube-shorts'
                  : (conta ? iconeDaConta(conta) : pub.platformId);
                const rotulo = conta
                  ? `${rotuloConta(conta)}${noYt ? (noYt.formato === 'short' ? ' · Shorts' : ' · Vídeo longo') : ''}`
                  : pub.platformId;
                return (
                  <span
                    key={pub.id}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-subtle)]"
                    title={rotulo}
                  >
                    <PlatformIcon platform={icone} colored className="h-3 w-3" />
                  </span>
                );
              })}
              {activePublicacoes.length > 4 ? (
                <Text variant="meta" as="span" className="text-[var(--text-tertiary)] tabular-nums">
                  +{activePublicacoes.length - 4}
                </Text>
              ) : null}
            </div>
          ) : null}

          <span className="inline-flex min-w-0 items-center gap-1 text-[var(--text-secondary)]">
            <Calendar className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            <Text variant="meta" as="span" className="truncate tabular-nums">
              {dataPrevista ?? 'Sem data'}
            </Text>
          </span>
        </div>

        <Text variant="meta" as="span" className="shrink-0 tabular-nums text-[var(--text-tertiary)]">
          {totalCarac} carac.{totalTags > 0 ? ` · ${totalTags} ${totalTags === 1 ? 'tag' : 'tags'}` : ''}
        </Text>
      </div>
    </article>
  );
}
