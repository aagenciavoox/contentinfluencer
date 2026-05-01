import { BarChart3, BookOpen, Lightbulb, Sparkles } from 'lucide-react';
import { BibliotecaItem, Content } from '../../../lib/database';
import { buildLibraryAnalytics } from '../lib/libraryAnalytics';

interface LibraryAnalyticsTabProps {
  items: BibliotecaItem[];
  contents: Content[];
}

export function LibraryAnalyticsTab({ items, contents }: LibraryAnalyticsTabProps) {
  const analytics = buildLibraryAnalytics(items, contents);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {analytics.statCards.map(card => (
          <div
            key={card.label}
            className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">{card.value}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--accent-blue)]" />
            <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[var(--text-primary)]">
              Distribuicao do acervo
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                Por tipo
              </p>
              <div className="space-y-3">
                {analytics.byType.map(entry => (
                  <div key={entry.key}>
                    <div className="mb-1 flex items-center justify-between text-sm text-[var(--text-primary)]">
                      <span>{entry.label}</span>
                      <span className="font-bold">{entry.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-hover)]">
                      <div
                        className="h-2 rounded-full bg-[var(--accent-blue)]"
                        style={{ width: `${entry.share}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                Por status
              </p>
              <div className="space-y-3">
                {analytics.byStatus.map(entry => (
                  <div key={entry.key}>
                    <div className="mb-1 flex items-center justify-between text-sm text-[var(--text-primary)]">
                      <span>{entry.label}</span>
                      <span className="font-bold">{entry.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-hover)]">
                      <div
                        className="h-2 rounded-full bg-[var(--accent-green)]"
                        style={{ width: `${entry.share}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent-orange)]" />
            <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[var(--text-primary)]">
              Oportunidades
            </h3>
          </div>
          {analytics.opportunities.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Todo item do acervo ja tem algum desdobramento editorial.
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.opportunities.map(item => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3"
                >
                  <p className="text-sm font-bold text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.reason}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
        <div className="mb-5 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[var(--accent-purple)]" />
          <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[var(--text-primary)]">
            Itens que mais renderam
          </h3>
        </div>
        {analytics.topItems.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Ainda nao existem conteudos conectados ao acervo.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analytics.topItems.map(item => (
              <div
                key={item.id}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.subtitle}</p>
                  </div>
                  <span className="rounded-full bg-[var(--bg-hover)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                    {item.typeLabel}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span>{item.contentCount} conteudos</span>
                  <span>{item.postedCount} postados</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
        <div className="mb-5 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[var(--accent-pink)]" />
          <h3 className="text-sm font-black uppercase tracking-[0.24em] text-[var(--text-primary)]">
            Leitura rapida
          </h3>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
          A home da biblioteca agora fica focada em navegacao e cadastro. Esta aba concentra a visao agregada para mostrar onde o acervo esta crescendo, quais itens ja geraram conteudo e onde ainda existe material com potencial parado.
        </p>
      </section>
    </div>
  );
}
