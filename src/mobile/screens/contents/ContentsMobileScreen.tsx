import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, Clapperboard, Eye, FileText, SearchCheck, Sparkles } from 'lucide-react';
import type { Content, Pilar, Serie } from '../../../lib/database';
import { getEntityTagStyle } from '../../../lib/utils';
import { AppButton } from '../../../components/ui/AppButton';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';

type ContentsMobileMode = 'editorial' | 'postagem' | 'historico';

interface ContentsMobileScreenProps {
  mode: ContentsMobileMode;
  contents: Content[];
  pageSize: number;
  allContents: Content[];
  series: Serie[];
  pilares: Pilar[];
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  onCreate: () => void;
}

const STATUS_ACCENTS: Record<string, string> = {
  Ideia: 'var(--accent-orange)',
  Roteiro: 'var(--accent-blue)',
  'Pronto para Gravar': 'var(--accent-green)',
  Gravado: 'var(--accent-orange)',
  'A Editar': 'var(--accent-purple)',
  Editado: 'var(--accent-blue)',
  Programado: 'var(--accent-purple)',
  Postado: 'var(--accent-green)',
};

export function ContentsMobileScreen({
  mode,
  contents,
  pageSize,
  allContents,
  series,
  pilares,
  onSelect,
  onPreview,
  onCreate,
}: ContentsMobileScreenProps) {
  const [search, setSearch] = useState('');

  const tabs = useMemo(() => {
    if (mode === 'postagem') {
      return [
        { value: 'Gravado', label: 'Gravado', count: allContents.filter((content) => content.status === 'Gravado').length },
        { value: 'A Editar', label: 'Editar', count: allContents.filter((content) => content.status === 'A Editar').length },
        { value: 'Programado', label: 'Agendado', count: allContents.filter((content) => content.status === 'Programado').length },
      ] as const;
    }

    return [
      { value: 'Postado', label: 'Postados', count: allContents.filter((content) => content.status === 'Postado').length },
      { value: 'recent', label: 'Recentes', count: contents.length },
    ] as const;
  }, [allContents, contents.length, mode]);

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.value || 'all');
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    if (!tabs.some((tab) => tab.value === activeTab)) {
      setActiveTab(tabs[0]?.value || 'all');
    }
  }, [activeTab, tabs]);

  const filteredContents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return contents
      .filter((content) => {
        if (mode === 'editorial') return true;
        if (mode === 'historico' && activeTab === 'recent') return true;
        if (mode !== 'historico') return content.status === activeTab;
        return content.status === 'Postado';
      })
      .filter((content) => {
        if (!normalizedSearch) return true;
        const seriesName = series.find((item) => item.id === content.seriesId)?.name || '';
        const pillarName = pilares.find((item) => item.id === content.pilarId)?.nome || '';
        return [content.title, content.notes || '', seriesName, pillarName].join(' ').toLowerCase().includes(normalizedSearch);
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [activeTab, contents, mode, pilares, search, series]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [activeTab, mode, pageSize, search, contents]);

  const visibleContents = useMemo(() => filteredContents.slice(0, visibleCount), [filteredContents, visibleCount]);
  const hasMore = visibleContents.length < filteredContents.length;

  const focusAction = (
    <button type="button" onClick={onCreate} className="button-primary w-full">
      <Sparkles className="h-4 w-4" />
      Novo conteudo
    </button>
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-blue)]/12 p-3 text-[var(--accent-blue)]">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">
              {mode === 'editorial' ? 'Roteiros' : mode === 'postagem' ? 'Fila de postagem' : 'Historico publicado'}
            </p>
            <p className="t-secondary">
              {mode === 'editorial'
                ? 'Aqui ficam so os roteiros em desenvolvimento. Ideias e fila de gravacao seguem em telas proprias.'
                : mode === 'postagem'
                  ? 'Acompanhe gravados, edicoes e agendamentos sem tabela.'
                  : 'Consulte rapidamente o que ja foi ao ar.'}
            </p>
          </div>
        </div>

        <button type="button" onClick={onCreate} className="button-primary w-full">
          <Sparkles className="h-4 w-4" />
          Criar conteudo
        </button>
      </section>

      <section className="space-y-4">
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por titulo, serie ou pilar"
        />

        {mode !== 'editorial' ? (
          <MobileSegmentTabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        ) : null}

        {filteredContents.length === 0 ? (
          <MobileEmptyState
            title="Nenhum conteudo nessa visao"
            description={mode === 'editorial'
              ? 'Nenhum roteiro por aqui ainda. Crie um novo item para alimentar essa etapa.'
              : 'Ajuste os filtros ou crie um novo item para alimentar esse fluxo mobile.'}
            action={focusAction}
            icon={<SearchCheck className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-3">
            {visibleContents.map((content) => {
              const seriesName = series.find((item) => item.id === content.seriesId)?.name;
              const pillarName = pilares.find((item) => item.id === content.pilarId)?.nome;
              const accent = STATUS_ACCENTS[content.status] || 'var(--text-primary)';
              const seriesItem = series.find((item) => item.id === content.seriesId) || null;
              const pillarItem = pilares.find((item) => item.id === content.pilarId) || null;

              return (
                <MobileListCard
                  key={content.id}
                  onClick={() => onSelect(content)}
                  eyebrow={content.status}
                  title={content.title || 'Conteudo sem titulo'}
                  description={content.notes || 'Sem anotacoes adicionais'}
                  meta={
                    <>
                      {seriesName ? (
                        <span
                          className="rounded-full border px-3 py-1 text-[11px] font-semibold"
                          style={getEntityTagStyle(seriesItem?.cor) || { backgroundColor: `${accent}14`, color: accent }}
                        >
                          {seriesName}
                        </span>
                      ) : null}
                      {pillarName ? (
                        <span
                          className="rounded-full border px-3 py-1 text-[11px] font-semibold"
                          style={getEntityTagStyle(pillarItem?.cor)}
                        >
                          {pillarName}
                        </span>
                      ) : null}
                      {content.recordingDate ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-orange)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--accent-orange)]">
                          <Clapperboard className="h-3 w-3" />
                          {new Date(content.recordingDate).toLocaleDateString('pt-BR')}
                        </span>
                      ) : null}
                      {content.publishDate ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-green)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--accent-green)]">
                          <Calendar className="h-3 w-3" />
                          {new Date(content.publishDate).toLocaleDateString('pt-BR')}
                        </span>
                      ) : null}
                    </>
                  }
                  trailing={
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onPreview(content);
                      }}
                      className="rounded-full bg-[var(--bg-hover)] p-2 text-[var(--text-secondary)]"
                      aria-label="Previsualizar roteiro"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  }
                />
              );
            })}

            {hasMore ? (
              <AppButton
                variant="secondary"
                fullWidth
                leftIcon={<ChevronDown className="h-4 w-4" />}
                onClick={() => setVisibleCount((current) => current + pageSize)}
                className="mt-2"
              >
                Carregar para ver mais
              </AppButton>
            ) : null}
          </div>
        )}
      </section>

    </div>
  );
}
