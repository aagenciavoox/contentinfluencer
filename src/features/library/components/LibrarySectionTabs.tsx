import { useLocation, useNavigate } from 'react-router-dom';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { cn } from '../../../lib/utils';

type LibrarySection = 'collection' | 'analysis';

interface LibrarySectionTabsProps {
  className?: string;
}

const OPTIONS = [
  { id: 'collection', label: 'Acervo' },
  { id: 'analysis', label: 'Análise' },
] satisfies Array<{ id: LibrarySection; label: string }>;

export function LibrarySectionTabs({ className }: LibrarySectionTabsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection: LibrarySection = location.pathname === '/biblioteca/analise'
    ? 'analysis'
    : 'collection';

  const handleChange = (section: LibrarySection) => {
    if (section === activeSection) return;
    navigate(section === 'analysis' ? '/biblioteca/analise' : '/biblioteca');
  };

  return (
    <SegmentTabs
      options={OPTIONS}
      value={activeSection}
      onChange={handleChange}
      className={cn(
        'w-full md:w-fit [&_.segment-tabs-item]:flex-1 md:[&_.segment-tabs-item]:flex-none',
        className,
      )}
    />
  );
}
