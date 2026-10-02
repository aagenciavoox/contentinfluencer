import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, FileText, X } from 'lucide-react';
import { Drawer } from '../../../../components/overlays/Drawer';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import { CONTENT_STATUS } from '../../../contents/lib/contentPipeline';
import type { Platform, Serie } from '../../../../lib/database';
import { htmlToReadableText } from '../../../../lib/utils';
import { buildDetailBackState } from '../../../../lib/navigation/detailBack';
import {
  seriesListItemPreviewText,
  seriesListItemTitle,
  seriesListItemWordCount,
  type SeriesListItem,
} from '../../lib/seriesContentListUtils';

interface SeriesContentPreviewModalProps {
  item: SeriesListItem | null;
  serie: Serie;
  platforms: Platform[];
  onClose: () => void;
}

export function SeriesContentPreviewModal({
  item,
  serie,
  platforms,
  onClose,
}: SeriesContentPreviewModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isOpen = item !== null;

  const previewText = item ? seriesListItemPreviewText(item) : '';
  const words = item ? seriesListItemWordCount(item) : 0;
  const isInboxIdea = item?.kind === 'inbox-idea';
  const captionItems = item?.kind === 'content'
    ? item.data.plataformas.filter(platformItem => platformItem.legenda?.trim())
    : [];

  const handleOpen = () => {
    if (!item) return;
    if (isInboxIdea) {
      navigate('/criacao?tab=ideias');
      return;
    }
    navigate(
      `/conteudos/${item.data.id}`,
      buildDetailBackState(`${location.pathname}${location.search}`),
    );
  };

  return (
    <Drawer open={isOpen} onClose={onClose} widthClassName="max-w-2xl">
      {item ? (
        <>
          <div
            className="h-1 w-full shrink-0"
            style={{ backgroundColor: serie.cor || 'var(--accent-green)' }}
          />

          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-4">
            <div className="min-w-0" id="series-content-preview-title">
              <Text variant="itemTitle" truncate>
                {seriesListItemTitle(item)}
              </Text>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                  {isInboxIdea ? 'Caixa de ideias' : item.data.status}
                </span>
                <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--text-tertiary)]">
                  {words} palavras
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 stack-xl overflow-y-auto px-6 py-6">
            <div>
              <div className="mb-2 flex items-center gap-2 t-label t-label-uppercase font-semibold text-[var(--text-tertiary)]">
                <FileText className="h-3.5 w-3.5" />
                {isInboxIdea || (item.kind === 'content' && item.data.status === CONTENT_STATUS.IDEIA)
                  ? 'Ideia'
                  : 'Roteiro'}
              </div>
              {previewText ? (
                <Text variant="body" className="whitespace-pre-wrap text-[var(--text-secondary)]">
                  {previewText}
                </Text>
              ) : (
                <Text variant="body" className="italic text-[var(--text-tertiary)]">
                  {isInboxIdea || (item.kind === 'content' && item.data.status === CONTENT_STATUS.IDEIA)
                    ? 'Esta ideia ainda não tem descrição.'
                    : 'Este roteiro ainda não tem texto.'}
                </Text>
              )}
            </div>

            {captionItems.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-2 t-label t-label-uppercase font-semibold text-[var(--text-tertiary)]">
                  Legenda
                </div>
                {captionItems.map(platformItem => (
                  <div
                    key={platformItem.platformId}
                    className="mb-2 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                  >
                    <Text variant="meta" className="mb-1 block font-semibold text-[var(--text-tertiary)]">
                      {platforms.find(platform => platform.id === platformItem.platformId)?.nome ?? platformItem.platformId}
                    </Text>
                    <Text variant="body" className="whitespace-pre-wrap text-[var(--text-secondary)]">
                      {htmlToReadableText(platformItem.legenda)}
                    </Text>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 justify-end border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-4">
            <AppButton onClick={handleOpen}>
              <ArrowUpRight className="h-4 w-4" />
              {isInboxIdea ? 'Abrir na caixa de ideias' : 'Abrir'}
            </AppButton>
          </div>
        </>
      ) : null}
    </Drawer>
  );
}
