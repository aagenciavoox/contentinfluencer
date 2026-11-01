import { useLocation, useNavigate } from 'react-router-dom';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { cn } from '../../../lib/utils';

type LibrarySection = 'collection' | 'analysis' | 'annotations';

interface LibrarySectionTabsProps {
  className?: string;
}

const OPTIONS = [
  { id: 'collection', label: 'Acervo' },
  { id: 'analysis', label: 'Panorama' },
  { id: 'annotations', label: 'Anotações' },
] satisfies Array<{ id: LibrarySection; label: string }>;

const SECTION_ROUTES: Record<LibrarySection, string> = {
  collection: '/biblioteca',
  analysis: '/biblioteca/analise',
  annotations: '/biblioteca/anotacoes',
};

export function LibrarySectionTabs({ className }: LibrarySectionTabsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection: LibrarySection = location.pathname === '/biblioteca/analise'
    ? 'analysis'
    : location.pathname === '/biblioteca/anotacoes'
      ? 'annotations'
      : 'collection';

  const handleChange = (section: LibrarySection) => {
    if (section === activeSection) return;
    navigate(SECTION_ROUTES[section]);
  };

  return (
    <div className={cn('mobile-h-scroll', className)}>
      <SegmentTabs
        options={OPTIONS}
        value={activeSection}
        onChange={handleChange}
        className="w-max min-w-max md:w-fit [&_.segment-tabs-item]:shrink-0 md:[&_.segment-tabs-item]:flex-none"
      />
    </div>
  );
}
