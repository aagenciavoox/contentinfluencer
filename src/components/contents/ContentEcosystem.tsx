import React from 'react';
import { Content } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { format } from 'date-fns';
import { Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ContentEcosystemProps {
  contents: Content[];
  onSelect: (content: Content) => void;
  lookAlerts: Record<string, string>;
  filterSeries: string;
}

export function ContentEcosystem({ contents, onSelect, lookAlerts, filterSeries }: ContentEcosystemProps) {
  const { state } = useAppContext();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {state.series.map(series => {
        const seriesContents = contents.filter(c => c.seriesId === series.id);
        if (seriesContents.length === 0 && filterSeries !== 'Todas') return null;
        
        return (
          <div key={series.id} className="flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-[var(--border-strong)] pb-3 px-1">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{series.name}</h3>
              <span className="text-[10px] font-black bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full border border-[var(--border-color)]">
                {seriesContents.length}
              </span>
            </div>
            <div className="space-y-4">
              {seriesContents.map(content => (
                <div 
                  key={content.id}
                  onClick={() => onSelect(content)}
                  className="p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden"
                >
                  {/* Decorative accent based on format */}
                  <div className={cn(
                    "absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 opacity-5 blur-2xl rounded-full",
                    content.format === 'Reels' && "bg-pink-500",
                    content.format === 'Stories' && "bg-orange-500",
                    content.format === 'YouTube' && "bg-red-500"
                  )} />

                  <div className="flex justify-between items-start mb-4">
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                      content.status === 'Postado' ? 'bg-green-100/50 text-green-700' : 'bg-orange-100/50 text-orange-700 font-black'
                    )}>
                      {content.status}
                    </span>
                    {content.lookId && (
                      <span className="text-[10px] font-mono text-[var(--text-tertiary)] tracking-tighter">#{content.lookId}</span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 leading-snug group-hover:text-black dark:group-hover:text-white transition-colors">{content.title}</h4>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex gap-2 items-center">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-transparent",
                        content.format === 'Reels' && "bg-pink-50 text-pink-700",
                        content.format === 'Stories' && "bg-orange-50 text-orange-700",
                        content.format === 'YouTube' && "bg-red-50 text-red-700",
                        content.format === 'Newsletter' && "bg-blue-50 text-blue-700",
                        content.format === 'Post' && "bg-indigo-50 text-indigo-700"
                      )}>
                        {content.format}
                      </span>
                      {content.scenario && (
                        <span className="text-[9px] text-[var(--text-tertiary)] font-medium">• {content.scenario}</span>
                      )}
                    </div>
                    {content.publishDate && (
                      <span className="text-[10px] font-bold text-[var(--text-tertiary)]">{format(new Date(content.publishDate), 'dd/MM')}</span>
                    )}
                  </div>
                  {lookAlerts[content.id] && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                      <span className="text-[9px] text-[var(--accent-orange)] font-bold flex items-center gap-1.5">
                        <Zap className="w-3 h-3" /> {lookAlerts[content.id]}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {seriesContents.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl opacity-40">
                  <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">Vazio</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
