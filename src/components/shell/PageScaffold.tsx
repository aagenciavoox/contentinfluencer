import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { PageGuide } from '../PageGuide';
import { cn } from '../../lib/utils';

interface PageGuideConfig {
  pageId: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface PageScaffoldProps {
  guide?: PageGuideConfig;
  header?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageScaffold({
  guide,
  header,
  toolbar,
  children,
  className,
  contentClassName,
}: PageScaffoldProps) {
  return (
    <div className={cn('h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-200 w-full overflow-x-hidden', className)}>
      {guide && (
        <PageGuide
          pageId={guide.pageId}
          title={guide.title}
          description={guide.description}
          icon={guide.icon}
        />
      )}

      {(header || toolbar) && (
        <header className="px-4 md:px-10 pt-6 md:pt-8 pb-3 md:pb-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-md sticky top-0 z-20 flex flex-col gap-3 md:gap-6">
          {header}
          {toolbar}
        </header>
      )}

      <main className={cn('flex-1 overflow-auto px-4 md:px-10 py-6 md:py-10', contentClassName)}>
        {children}
      </main>
    </div>
  );
}
