import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, Clapperboard, Plus, SearchCheck, Sparkles } from 'lucide-react';
import type { Content, Pilar, Serie } from '../../../lib/database';
import { CONTENT_STATUS } from '../../../features/contents/lib/contentPipeline';
import { cn, getEntityTagStyle, htmlToReadableText } from '../../../lib/utils';
import { AppButton } from '../../../components/ui/AppButton';
import { scriptExcerpt } from '../../components/MobileScriptReader';
import { MobileEmptyState } from '../../components/MobileEmptyState';
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
  onPreview?: (content: Content) => void;
  onCreate: () => void;
}

const STATUS_ACCENTS: Record<string, string> = {
  [CONTENT_STATUS.IDEIA]: 'var(--accent-orange)',
  [CONTENT_STATUS.ROTEIRO]: 'var(--accent-blue)',
  [CONTENT_STATUS.PRONTO_PARA_GRAVAR]: 'var(--accent-green)',
  [CONTENT_STATUS.GRAVADO]: 'var(--accent-orange)',
  [CONTENT_STATUS.A_EDITAR]: 'var(--accent-purple)',
  [CONTENT_STATUS.EDITADO]: 'var(--accent-blue)',
  [CONTENT_STATUS.PROGRAMADO]: 'var(--accent-purple)',
  [CONTENT_STATUS.POSTADO]: 'var(--accent-green)',
};

function scriptWordCount(script: string | null | undefined) {
  const text = htmlToReadableText(script);
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ContentsMobileScreen({
  mode,
  contents,
  pageSize,
  allContents,
  series,
  pilares,
  onSelect,
  onCreate,
}: ContentsMobileScreenProps) {
  const [search, setSearch] = useState('');

  const tabs = useMemo(() => {
    if (mode === 'postagem') {
      return [
        { value: CONTENT_STATUS.GRAVADO, label: 'Gravado', count: allContents.filter((c) => c.status === CONTENT_STATUS.GRAVADO).length },
        { value: CONTENT_STATUS.A_EDITAR, label: 'Editar', count: allContents.filter((c) => c.status === CONTENT_STATUS.A_EDITAR).length },
        { value: CONTENT_STATUS.PROGRAMADO, label: 'Agendado', count: allContents.filter((c) => c.status === CONTENT_STATUS.PROGRAMADO).length },
      ] as const;
    }

    return [
      { value: CONTENT_STATUS.POSTADO, label: 'Postados', count: allContents.filter((c) => c.status === CONTENT_STATUS.POSTADO).length },
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
        return content.status === CONTENT_STATUS.POSTADO;
      })
      .filter((content) => {
        if (!normalizedSearch) return true;
        const seriesName = series.find((item) => item.id === content.seriesId)?.name || '';
        const pillarName = pilares.find((item) => item.id === content.pilarId)?.nome || '';
        const scriptText = htmlToReadableText(content.script);
        return [content.title, scriptText, content.notes || '', seriesName, pillarName]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--text-primary)]">
            {mode === 'editorial' ? 'Roteiros' : mode === 'postagem' ? 'Postagem' : 'Historico'}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">{filteredContents.length} itens</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-[11px] font-black uppercase tracking-[0.12em]"
        >
          <Plus className="h-4 w-4" />
          Novo
        </button>
      </div>

      <MobileSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar titulo ou trecho do roteiro"
        rounded="tight"
      />

      {mode !== 'editorial' ? (
        <MobileSegmentTabs rounded="tight" tabs={tabs} value={activeTab} onChange={setActiveTab} />
      ) : null}

      {filteredContents.length === 0 ? (
        <MobileEmptyState
          title="Nenhum conteudo nessa visao"
          description="Crie um roteiro ou ajuste a busca."
          action={focusAction}
          icon={<SearchCheck className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-2.5">
          {visibleContents.map((content) => {
            const seriesItem = series.find((item) => item.id === content.seriesId) || null;
            const pillarItem = pilares.find((item) => item.id === content.pilarId) || null;
            const accent = STATUS_ACCENTS[content.status] || 'var(--text-primary)';
            const excerpt = scriptExcerpt(content.script, 160);
            const words = scriptWordCount(content.script);

            return (
              <button
                key={content.id}
                type="button"
                onClick={() => onSelect(content)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 text-left shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[10px] font-black uppercase tracking-[0.12em]"
                      style={{ color: accent }}
                    >
                      {content.status}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-black leading-snug text-[var(--text-primary)]">
                      {content.title || 'Conteudo sem titulo'}
                    </p>
                  </div>
                  {words > 0 ? (
                    <span className="shrink-0 rounded-md bg-[var(--bg-hover)] px-2 py-1 text-[10px] font-semibold text-[var(--text-tertiary)]">
                      {words} pal.
                    </span>
                  ) : null}
                </div>

                <p
                  className={cn(
                    'mt-2 line-clamp-3 text-[13px] leading-relaxed',
                    excerpt ? 'text-[var(--text-secondary)]' : 'italic text-[var(--text-tertiary)]'
                  )}
                >
                  {excerpt || 'Sem roteiro escrito ainda.'}
                </p>

                <div className="mt-3 flex flex-wrap gap-1">
                  {seriesItem ? (
                    <span
                      className="rounded-md border px-2 py-0.5 text-[9px] font-semibold"
                      style={getEntityTagStyle(seriesItem.cor)}
                    >
                      {seriesItem.name}
                    </span>
                  ) : null}
                  {pillarItem ? (
                    <span
                      className="rounded-md border px-2 py-0.5 text-[9px] font-semibold"
                      style={getEntityTagStyle(pillarItem.cor)}
                    >
                      {pillarItem.nome}
                    </span>
                  ) : null}
                  {content.recordingDate ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-orange)]/10 px-2 py-0.5 text-[9px] font-semibold text-[var(--accent-orange)]">
                      <Clapperboard className="h-3 w-3" />
                      {new Date(content.recordingDate).toLocaleDateString('pt-BR')}
                    </span>
                  ) : null}
                  {content.publishDate ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-green)]/10 px-2 py-0.5 text-[9px] font-semibold text-[var(--accent-green)]">
                      <Calendar className="h-3 w-3" />
                      {new Date(content.publishDate).toLocaleDateString('pt-BR')}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}

          {hasMore ? (
            <AppButton
              variant="secondary"
              fullWidth
              leftIcon={<ChevronDown className="h-4 w-4" />}
              onClick={() => setVisibleCount((current) => current + pageSize)}
              className="mt-1"
            >
              Carregar mais
            </AppButton>
          ) : null}
        </div>
      )}
    </div>
  );
}
