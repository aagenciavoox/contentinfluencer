import {CalendarDays, CheckCircle2, Clock3, History} from 'lucide-react';
import type {Content} from '../../../../../lib/database';

interface HistorySectionProps {
  content: Content;
  compact?: boolean;
}

function formatDateTime(value: string | null) {
  if (!value) return 'Nao registrado';
  return new Date(value).toLocaleString('pt-BR');
}

export function HistorySection({content, compact = false}: HistorySectionProps) {
  const items = [
    {
      id: 'created',
      title: 'Conteúdo criado',
      value: formatDateTime(content.createdAt),
      icon: <History className="h-4 w-4" />,
    },
    {
      id: 'recording',
      title: 'Gravação planejada',
      value: content.recordingDate ? new Date(content.recordingDate).toLocaleDateString('pt-BR') : 'Sem data',
      icon: <Clock3 className="h-4 w-4" />,
    },
    {
      id: 'posting',
      title: 'Postagem planejada',
      value: content.publishDate ? new Date(content.publishDate).toLocaleDateString('pt-BR') : 'Sem data',
      icon: <CalendarDays className="h-4 w-4" />,
    },
    {
      id: 'updated',
      title: 'Ultima atualizacao',
      value: formatDateTime(content.updatedAt),
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
  ];

  return (
    <section
      className={
        compact
          ? 'p-2'
          : 'rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7'
      }
    >
      {!compact ? (
        <>
          <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
            Historico
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Timeline do conteudo</h2>
        </>
      ) : null}

      <div className={compact ? 'space-y-2' : 'mt-6 space-y-4'}>
        {items.map(item => (
          <article
            key={item.id}
            className="flex items-start gap-3 rounded-[18px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-3"
          >
            <div className="mt-0.5 text-[var(--text-secondary)]">{item.icon}</div>
            <div>
              <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
                {item.title}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
