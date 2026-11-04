import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import type { Content, ContentPlataforma } from '../../../lib/database';
import { contaDaRef, redeDaRef, rotuloConta, type ContaRef } from '../../contas/lib/contas';
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
  contas: readonly ContaRef[];
}

export function CaptionQueueItemCard({
  content,
  activePublicacoes,
  selected,
  onSelect,
  contas,
}: CaptionQueueItemCardProps) {
  // Preenchida logic:
  const temBase = Boolean((content.legendaBase ?? '').trim());
  const algumaComLegenda = activePublicacoes.some(p => temLegenda(content.legendaBase, p));
  const preenchida = temBase || (activePublicacoes.length > 0 && algumaComLegenda);

  // Best preview text:
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
  const preview = textoEfetivo.trim()
    ? textoEfetivo.replace(/\s+/g, ' ').slice(0, 120)
    : 'Sem texto de legenda configurado.';

  const formato = inferPlatformFormat(
    activePublicacoes[0]?.platformId || '',
    content.formatoVisual,
    contaDaRef(activePublicacoes[0]?.platformId || '', contas),
    activePublicacoes[0],
    content.writingMode,
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'group flex flex-col gap-2 rounded-[var(--radius-card)] border p-3.5 text-left transition-all cursor-pointer outline-none select-none shadow-xs',
        selected
          ? 'border-[var(--brand-accent)] bg-[color-mix(in_srgb,var(--brand-accent)_6%,var(--bg-elevated))] ring-2 ring-[var(--brand-accent)]'
          : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--border-input)] hover:bg-[var(--bg-hover)]',
      )}
      aria-current={selected ? 'true' : undefined}
    >
      {/* Top row: redes ativas e status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* Dots das redes configuradas */}
          {activePublicacoes.length > 0 ? (
            <div className="flex items-center -space-x-1 shrink-0">
              {activePublicacoes.slice(0, 4).map(pub => {
                const conta = contaDaRef(pub.platformId, contas);
                const rede = redeDaRef(pub.platformId, contas);
                const noYt = rede === 'youtube'
                  ? formatoNoYoutube({ formatoVisual: content.formatoVisual ?? null, writingMode: content.writingMode }, pub)
                  : null;
                const dotClass = getPlatformDotClass(pub.platformId, conta);
                const rotulo = conta
                  ? `${rotuloConta(conta)}${noYt ? (noYt.formato === 'short' ? ' · Shorts' : ' · Vídeo longo') : ''}`
                  : pub.platformId;
                return (
                  <span
                    key={pub.id}
                    className={cn('h-2.5 w-2.5 rounded-full ring-2 ring-[var(--bg-elevated)]', dotClass)}
                    title={rotulo}
                    aria-hidden
                  />
                );
              })}
            </div>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-tertiary)] shrink-0" aria-hidden />
          )}

          <Text variant="bodyStrong" as="span" className="truncate">
            {activePublicacoes.length > 0
              ? activePublicacoes
                  .map(p => {
                    const c = contaDaRef(p.platformId, contas);
                    const rede = redeDaRef(p.platformId, contas);
                    const noYt = rede === 'youtube'
                      ? formatoNoYoutube({ formatoVisual: content.formatoVisual ?? null, writingMode: content.writingMode }, p)
                      : null;
                    const baseNome = c ? rotuloConta(c) : p.platformId;
                    return noYt ? `${baseNome} (${noYt.formato === 'short' ? 'Shorts' : 'Vídeo longo'})` : baseNome;
                  })
                  .join(', ')
              : 'Sem redes ativas'}
          </Text>

          <Badge variant="neutral" className="lowercase">
            {formato}
          </Badge>
        </div>

        <div className="shrink-0">
          {preenchida ? (
            <Badge variant="status" status="Postado">
              Preenchida
            </Badge>
          ) : (
            <Badge variant="neutral">
              Em branco
            </Badge>
          )}
        </div>
      </div>

      {/* Script Title */}
      <Text variant="bodyStrong" as="h3" className="line-clamp-2 leading-snug">
        {content.title.trim() || 'Sem título'}
      </Text>

      {/* Copy preview quote */}
      <div className="rounded-[var(--radius-input)] bg-[var(--bg-primary)] px-2.5 py-1.5 border border-dashed border-[var(--border-color)]">
        <Text variant="secondary" as="p" className="line-clamp-2 font-mono italic leading-relaxed">
          &ldquo;{preview}&rdquo;
        </Text>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-color)]">
        <Text variant="meta" as="span">{dataPrevista ? `Previsto: ${dataPrevista}` : 'Sem data prevista'}</Text>
        <Text variant="meta" as="span" className="tabular-nums">
          {activePublicacoes.length} {activePublicacoes.length === 1 ? 'rede' : 'redes'} • {totalCarac} carac. • {totalTags} {totalTags === 1 ? 'tag' : 'tags'}
        </Text>
      </div>
    </div>
  );
}
