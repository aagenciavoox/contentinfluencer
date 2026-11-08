import { useNavigate } from 'react-router-dom';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import type { Serie } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { tipoDaSerie } from '../../lib/serieAgrupamento';

/** Escolhe a família de uma série. Os episódios continuam na série. */
export function MoverSerieDialog({
  serie,
  series,
  onClose,
  onMover,
}: {
  serie: Serie | null;
  series: readonly Serie[];
  onClose: () => void;
  onMover: (familiaId: string | null) => void;
}) {
  const navigate = useNavigate();
  const familias = series
    .filter(item => tipoDaSerie(item.id, series) === 'familia')
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const atual = serie?.parentId ?? null;
  const nome = serie?.name.trim() || 'Sem nome';

  const escolher = (familiaId: string | null) => {
    if (familiaId !== atual) onMover(familiaId);
    onClose();
  };

  return (
    <BottomSheetModal open={Boolean(serie)} onClose={onClose} desktopMaxW="max-w-md" ariaLabel="Mover para família">
      <OverlayHeader title="Mover para família" subtitle={nome} onClose={onClose} />
      <OverlayBody className="stack-sm">
        <Text variant="secondary">
          Os episódios continuam nesta série. Só muda o agrupamento.
        </Text>
        <button
          type="button"
          onClick={() => escolher(null)}
          className={cn(
            'flex min-h-11 w-full items-center justify-between rounded-[var(--radius-input)] border px-3 text-left',
            atual === null ? 'border-[var(--text-primary)]' : 'border-[var(--border-color)]',
          )}
        >
          <Text variant="body" as="span">Sem família</Text>
          {atual === null ? <Text variant="meta" as="span">Atual</Text> : null}
        </button>
        {familias.map(familia => (
          <button
            key={familia.id}
            type="button"
            onClick={() => escolher(familia.id)}
            className={cn(
              'flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-input)] border px-3 text-left',
              atual === familia.id ? 'border-[var(--text-primary)]' : 'border-[var(--border-color)]',
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="entity-color-dot h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: familia.cor || 'var(--text-tertiary)' }}
              />
              <Text variant="body" as="span" className="min-w-0 break-words">{familia.name.trim() || 'Sem nome'}</Text>
            </span>
            {atual === familia.id ? <Text variant="meta" as="span" className="shrink-0">Atual</Text> : null}
          </button>
        ))}
        {familias.length === 0 ? (
          <Text variant="secondary">Nenhuma família ainda. Crie uma para agrupar séries.</Text>
        ) : null}
      </OverlayBody>
      <OverlayFooter>
        <AppButton variant="secondary" onClick={onClose}>Cancelar</AppButton>
        {familias.length === 0 ? (
          <AppButton
            variant="primary"
            onClick={() => {
              onClose();
              navigate('/series/novo?tipo=familia');
            }}
          >
            Criar família
          </AppButton>
        ) : null}
      </OverlayFooter>
    </BottomSheetModal>
  );
}
