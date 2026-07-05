import { ExternalLink } from 'lucide-react';
import { BottomSheet } from '../../../../components/overlays/BottomSheet';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { AppButton } from '../../../../components/ui/AppButton';
import type { Content, Pilar, Serie } from '../../../../lib/database';
import { htmlToReadableText } from '../../../../lib/utils';
import { ContentEntityTags } from '../ContentEntityTags';
import {
  buildContentMetaLine,
  getDisplayTitle,
  getStatusChipClass,
  getUsefulExcerpt,
} from '../../lib/contentCardMeta';

interface ContentPreviewSheetProps {
  content: Content | null;
  pillar?: Pilar | null;
  series?: Serie | null;
  onClose: () => void;
  onOpen: (content: Content) => void;
}

export function ContentPreviewSheet({
  content,
  pillar,
  series,
  onClose,
  onOpen,
}: ContentPreviewSheetProps) {
  if (!content) return null;

  const excerpt = getUsefulExcerpt(content);
  const scriptPreview = htmlToReadableText(content.script || content.notes || '').trim();

  return (
    <BottomSheet open={!!content} onClose={onClose} desktopMaxW="max-w-lg">
      <OverlayHeader
        title={getDisplayTitle(content.title)}
        subtitle={buildContentMetaLine(content)}
        onClose={onClose}
      />
      <OverlayBody>
        <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusChipClass(content.status)}`}
          >
            {content.status}
          </span>
          <ContentEntityTags pillar={pillar} series={series} size="sm" />
        </div>

        {excerpt ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--text-tertiary)]">Resumo</p>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-4">{excerpt}</p>
          </div>
        ) : null}

        {scriptPreview ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--text-tertiary)]">Roteiro</p>
            <div className="max-h-[min(50vh,360px)] overflow-y-auto rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)]/40 p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
                {scriptPreview}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">Roteiro ainda vazio.</p>
        )}

        <AppButton
          variant="primary"
          leftIcon={<ExternalLink className="h-4 w-4" />}
          onClick={() => onOpen(content)}
          className="w-full justify-center"
        >
          Abrir roteiro
        </AppButton>
        </div>
      </OverlayBody>
    </BottomSheet>
  );
}
