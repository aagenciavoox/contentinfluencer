import { Archive, Trash2 } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { cn } from '../../../lib/utils';

export type CreationStorageTab = 'Arquivados' | 'Lixeira';

interface CreationStorageLinksProps {
  counts: Record<CreationStorageTab, number>;
  onOpen: (tab: CreationStorageTab) => void;
  /** No celular: só ícone e número, para caber ao lado dos ícones de rede. */
  compact?: boolean;
  className?: string;
}

/**
 * Arquivados e Lixeira fora das abas: não são etapas do vídeo, são onde ele fica guardado.
 * Ficam no canto, com o número à vista, e cada um abre uma tela à parte.
 */
export function CreationStorageLinks({ counts, onOpen, compact = false, className }: CreationStorageLinksProps) {
  const links = [
    { tab: 'Arquivados' as const, icon: <Archive className="h-4 w-4" /> },
    { tab: 'Lixeira' as const, icon: <Trash2 className="h-4 w-4" /> },
  ];

  return (
    <div className={cn('inline-flex shrink-0 items-center gap-2', className)}>
      {links.map(({ tab, icon }) => (
        <AppButton
          key={tab}
          variant="secondary"
          size={compact ? 'sm' : 'xs'}
          leftIcon={icon}
          count={counts[tab]}
          aria-label={`${tab}: ${counts[tab]}`}
          title={compact ? tab : undefined}
          className={compact ? 'px-3' : undefined}
          onClick={() => onOpen(tab)}
        >
          {compact ? null : tab}
        </AppButton>
      ))}
    </div>
  );
}
