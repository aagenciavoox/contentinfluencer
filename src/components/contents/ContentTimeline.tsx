import React from 'react';
import { Content } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { format } from 'date-fns';
import { Shirt, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ContentTimelineProps {
  contents: Content[];
  onSelect: (content: Content) => void;
}

export function ContentTimeline({ contents, onSelect }: ContentTimelineProps) {
  const { state } = useAppContext();

  const sortedByDate = [...contents]
    .filter(c => c.recordingDate || c.publishDate)
    .sort((a, b) => {
      const dateA = a.recordingDate || a.publishDate || '';
      const dateB = b.recordingDate || b.publishDate || '';
      return dateA.localeCompare(dateB);
    });

  if (sortedByDate.length === 0) {
    return (
      <div className="py-32 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl opacity-30">
        <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Defina datas de gravação ou postagem para ver a linha do tempo.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-16">
      <div className="flex items-center gap-6 mb-12 border-b border-[var(--border-color)] pb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[var(--accent-blue)] rounded-full shadow-[0_0_10px_var(--accent-blue)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Gravação</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[var(--accent-green)] rounded-full shadow-[0_0_10px_var(--accent-green)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Postagem</span>
        </div>
      </div>
      
      <div className="relative space-y-12">
        <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-[var(--border-color)]" />
        
        {sortedByDate.map((content) => (
          <div key={content.id} className="relative pl-14 group">
            <div className="absolute left-[13px] top-6 w-3 h-3 rounded-full border-4 border-[var(--bg-primary)] bg-[var(--text-primary)] z-10 transition-transform group-hover:scale-125" />
            
            <div 
              onClick={() => onSelect(content)}
              className="p-8 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl hover:shadow-2xl hover:-translate-x-1 transition-all cursor-pointer group shadow-sm overflow-hidden relative"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-black dark:group-hover:text-white transition-colors">{content.title}</h4>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)]">
                    {state.series.find(s => s.id === content.seriesId)?.name || 'Sem Série'}
                  </span>
                </div>
                <div className="flex gap-4">
                  {content.recordingDate && (
                    <div className="flex flex-col items-end px-4 py-2 bg-[var(--bg-hover)] rounded-2xl border border-[var(--border-color)] min-w-[100px]">
                      <span className="text-[8px] font-black text-[var(--accent-blue)] uppercase tracking-widest mb-1">Gravação</span>
                      <span className="text-xs font-black text-[var(--text-primary)]">{format(new Date(content.recordingDate), 'dd/MM/yy')}</span>
                    </div>
                  )}
                  {content.publishDate && (
                    <div className="flex flex-col items-end px-4 py-2 bg-[var(--bg-hover)] rounded-2xl border border-[var(--border-color)] min-w-[100px]">
                      <span className="text-[8px] font-black text-[var(--accent-green)] uppercase tracking-widest mb-1">Postagem</span>
                      <span className="text-xs font-black text-[var(--text-primary)]">{format(new Date(content.publishDate), 'dd/MM/yy')}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-8 border-t border-[var(--border-color)] pt-6">
                <div className="flex items-center gap-3">
                  <Shirt className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-xs font-bold text-[var(--text-secondary)]">{content.lookId || 'Sem Look'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-xs font-bold text-[var(--text-secondary)]">{content.scenario || 'Sem Cenário'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
