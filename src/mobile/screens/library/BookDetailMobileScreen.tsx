import { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  Film,
  Lightbulb,
  Pencil,
  Plus,
  Star,
} from 'lucide-react';
import type { Anotacao, BibliotecaItem, Content, Idea } from '../../../lib/database';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { TagSelect } from '../../../components/ui/TagSelect';
import { cn } from '../../../lib/utils';
import { AnnotationNoteCard } from '../../../features/library/components/AnnotationNoteCard';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';

export type BookDetailTab = 'info' | 'anotacoes' | 'conteudos';
type TipoAnotacao = Anotacao['tipo'];
type StatusLeitura = BibliotecaItem['status'];
type AnotacaoFiltro = TipoAnotacao | 'Todos' | 'Destaques';

export interface BookInfoLocal {
  titulo: string;
  autor: string;
  statusLeitura: StatusLeitura;
  capaUrl: string;
  notasGerais: string;
  generos: string[];
  avaliacao?: 1 | 2 | 3 | 4 | 5;
  paginasLidas: number | '';
  totalPaginas: number | '';
}

interface BookDetailMobileScreenProps {
  livro: BibliotecaItem;
  tab: BookDetailTab;
  onTabChange: (tab: BookDetailTab) => void;
  itemTypeLabel: string;
  creatorLabel: string;
  progressLabels: { current: string; total: string; unit: string };
  statusLeituraOptions: StatusLeitura[];
  generoOptions: string[];
  infoLocal: BookInfoLocal;
  onInfoLocalPatch: (patch: Partial<BookInfoLocal>) => void;
  onSaveInfo: () => void;
  infoSalvo: boolean;
  onRequestDelete: () => void;
  filtroTipo: AnotacaoFiltro;
  onFiltroTipoChange: (filtro: AnotacaoFiltro) => void;
  tipoAnotacaoOptions: TipoAnotacao[];
  anotacoesFiltradas: Anotacao[];
  onOpenAnnotationComposer: () => void;
  onToggleContentPotential: (anotacao: Anotacao) => void;
  onTransformIdea: (anotacao: Anotacao) => void;
  onTransformContent: (anotacao: Anotacao) => void;
  onDeleteAnotacao: (anotacaoId: string) => void;
  conteudosDoLivro: Content[];
  ideiasDeLivro: Idea[];
  statusCores: Record<string, string>;
  alertaEcossistema: boolean;
  anotacoesDestaqueCount: number;
  onCreateContent: () => void;
  onPromoteIdeia: (ideiaId: string, ideiaText: string) => void;
  onOpenContent: (contentId: string) => void;
  onStartBrainstorm: () => void;
}

function ItemTypeIcon({ tipo }: { tipo: BibliotecaItem['tipo'] }) {
  const Icon = tipo === 'livro' || tipo === 'manga' ? BookOpen : Film;
  return <Icon className="h-5 w-5" />;
}

function StatusBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-xs font-semibold leading-tight',
        className
      )}
    >
      {children}
    </span>
  );
}

export function BookDetailMobileScreen({
  livro,
  tab,
  onTabChange,
  itemTypeLabel,
  creatorLabel,
  progressLabels,
  statusLeituraOptions,
  generoOptions,
  infoLocal,
  onInfoLocalPatch,
  onSaveInfo,
  infoSalvo,
  onRequestDelete,
  filtroTipo,
  onFiltroTipoChange,
  tipoAnotacaoOptions,
  anotacoesFiltradas,
  onOpenAnnotationComposer,
  onToggleContentPotential,
  onTransformIdea,
  onTransformContent,
  onDeleteAnotacao,
  conteudosDoLivro,
  ideiasDeLivro,
  statusCores,
  alertaEcossistema,
  anotacoesDestaqueCount,
  onCreateContent,
  onPromoteIdeia,
  onOpenContent,
  onStartBrainstorm,
}: BookDetailMobileScreenProps) {
  const [editInfoOpen, setEditInfoOpen] = useState(false);

  const progressPercent =
    typeof infoLocal.totalPaginas === 'number' && infoLocal.totalPaginas > 0
      ? Math.min(
          100,
          Math.round(
            ((typeof infoLocal.paginasLidas === 'number' ? infoLocal.paginasLidas : 0) /
              infoLocal.totalPaginas) *
              100
          )
        )
      : null;

  const filterOptions: AnotacaoFiltro[] = ['Todos', 'Destaques', ...tipoAnotacaoOptions];

  const handleSaveInfo = () => {
    onSaveInfo();
    setEditInfoOpen(false);
  };

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="flex gap-3">
          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-hover)]">
            {livro.capaUrl ? (
              <img src={livro.capaUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--text-tertiary)]">
                <ItemTypeIcon tipo={livro.tipo} />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="t-section-title line-clamp-2 text-[var(--text-primary)]">{livro.titulo}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {livro.autorDiretor || 'Sem autoria'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge className="bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                {itemTypeLabel}
              </StatusBadge>
              <StatusBadge className="bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
                {livro.status}
              </StatusBadge>
            </div>
            {livro.avaliacao ? (
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={cn(
                      'h-3.5 w-3.5',
                      index < livro.avaliacao!
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-[var(--border-strong)]'
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <MobileSegmentTabs
        rounded="tight"
        tabs={[
          { value: 'info', label: 'Info' },
          { value: 'anotacoes', label: 'Anotações', count: livro.anotacoes.length },
          { value: 'conteudos', label: 'Conteúdos', count: conteudosDoLivro.length },
        ]}
        value={tab}
        onChange={onTabChange}
      />

      {tab === 'info' ? (
        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="t-section-title text-[var(--text-primary)]">Leitura</p>
              <button
                type="button"
                onClick={() => setEditInfoOpen(true)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 text-xs font-semibold text-[var(--text-primary)]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  Status
                </dt>
                <dd className="mt-1 text-[var(--text-primary)]">{infoLocal.statusLeitura}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  Gêneros
                </dt>
                <dd className="mt-1">
                  {infoLocal.generos.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {infoLocal.generos.map((genero) => (
                        <StatusBadge
                          key={genero}
                          className="bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]"
                        >
                          {genero}
                        </StatusBadge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-secondary)]">Nenhum gênero</span>
                  )}
                </dd>
              </div>
              {progressPercent !== null ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                    Progresso
                  </dt>
                  <dd className="mt-1 space-y-1.5">
                    <p className="text-[var(--text-primary)]">
                      {typeof infoLocal.paginasLidas === 'number' ? infoLocal.paginasLidas : 0}/
                      {infoLocal.totalPaginas} {progressLabels.unit} · {progressPercent}%
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-hover)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-purple)] transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
            <p className="t-section-title mb-3 text-[var(--text-primary)]">Notas gerais</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
              {infoLocal.notasGerais.trim() || 'Sem notas ainda.'}
            </p>
          </section>

          <button
            type="button"
            onClick={onRequestDelete}
            className="w-full py-2 text-center text-xs font-semibold text-[var(--accent-pink)] opacity-70"
          >
            Remover item da biblioteca
          </button>
        </div>
      ) : null}

      {tab === 'anotacoes' ? (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onFiltroTipoChange(option)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  filtroTipo === option
                    ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                )}
              >
                {option === 'Destaques' ? 'Destaques' : option}
              </button>
            ))}
          </div>

          {anotacoesFiltradas.length === 0 ? (
            <MobileEmptyState
              title="Nenhuma anotação ainda"
              description="Registre trechos, reações ou ideias de conteúdo."
              action={
                <button type="button" onClick={onOpenAnnotationComposer} className="button-primary w-full">
                  <Plus className="h-4 w-4" />
                  Nova anotação
                </button>
              }
              icon={<BookOpen className="h-8 w-8" />}
            />
          ) : (
            <div className="space-y-2">
              {anotacoesFiltradas.map((anotacao) => (
                <AnnotationNoteCard
                  key={anotacao.id}
                  anotacao={anotacao}
                  onToggleHighlight={() => onToggleContentPotential(anotacao)}
                  onTransformIdea={() => onTransformIdea(anotacao)}
                  onTransformContent={() => onTransformContent(anotacao)}
                  onDelete={() => onDeleteAnotacao(anotacao.id)}
                  actionsClassName="opacity-100"
                />
              ))}
            </div>
          )}

          {anotacoesFiltradas.length > 0 ? (
            <button
              type="button"
              onClick={onOpenAnnotationComposer}
              className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg"
              aria-label="Nova anotação"
            >
              <Plus className="h-6 w-6" />
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === 'conteudos' ? (
        <div className="space-y-4">
          {alertaEcossistema ? (
            <div className="flex items-start gap-3 rounded-[1.75rem] border border-orange-200 bg-orange-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <p className="text-sm text-orange-700">
                Este {itemTypeLabel.toLowerCase()} foi concluído e ainda pode render conteúdo.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'conteúdos', value: conteudosDoLivro.length },
              {
                label: 'postados',
                value: conteudosDoLivro.filter((content) => content.status === 'Postado').length,
              },
              {
                label: 'em produção',
                value: conteudosDoLivro.filter(
                  (content) => content.status !== 'Postado' && content.status !== 'Ideia'
                ).length,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5"
              >
                <span className="text-sm font-semibold text-[var(--text-primary)]">{stat.value}</span>
                <span className="text-xs text-[var(--text-secondary)]">{stat.label}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onCreateContent}
            className="button-primary w-full"
          >
            <Plus className="h-4 w-4" />
            Novo conteúdo
          </button>

          {anotacoesDestaqueCount > 0 ? (
            <section className="rounded-[1.75rem] border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                {anotacoesDestaqueCount} destaque{anotacoesDestaqueCount > 1 ? 's' : ''} prontos para
                virar conteúdo.
              </p>
              <button
                type="button"
                onClick={onStartBrainstorm}
                className="mt-2 text-xs font-semibold text-amber-700"
              >
                Brainstormar
              </button>
            </section>
          ) : null}

          {ideiasDeLivro.length > 0 ? (
            <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
              <p className="t-section-title mb-3 text-[var(--text-primary)]">
                Ideias ({ideiasDeLivro.length})
              </p>
              <div className="space-y-2">
                {ideiasDeLivro.map((ideia) => (
                  <div
                    key={ideia.id}
                    className="flex items-start gap-2 border-b border-[var(--border-color)] pb-2 last:border-0 last:pb-0"
                  >
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
                    <p className="min-w-0 flex-1 text-sm text-[var(--text-primary)]">{ideia.text}</p>
                    <button
                      type="button"
                      onClick={() => onPromoteIdeia(ideia.id, ideia.text)}
                      className="shrink-0 text-xs font-semibold text-[var(--accent-blue)]"
                    >
                      Conteúdo
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {conteudosDoLivro.length === 0 ? (
            <MobileEmptyState
              title="Nenhum conteúdo vinculado"
              description="Crie um roteiro a partir deste item da biblioteca."
              action={
                <button type="button" onClick={onCreateContent} className="button-primary w-full">
                  <Plus className="h-4 w-4" />
                  Novo conteúdo
                </button>
              }
              icon={<Film className="h-8 w-8" />}
            />
          ) : (
            <div className="space-y-2">
              {conteudosDoLivro.map((content) => (
                <MobileListCard
                  key={content.id}
                  title={content.title || 'Sem título'}
                  description={content.notes || undefined}
                  meta={
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        statusCores[content.status] || 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                      )}
                    >
                      {content.status}
                    </span>
                  }
                  onClick={() => onOpenContent(content.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <BottomSheetModal open={editInfoOpen} onClose={() => setEditInfoOpen(false)} desktopMaxW="max-w-md">
        <div className="space-y-4 p-1">
          <p className="t-section-title text-[var(--text-primary)]">Editar item</p>

          <label className="block space-y-2">
            <span className="t-label text-[var(--text-tertiary)]">Título</span>
            <input
              type="text"
              value={infoLocal.titulo}
              onChange={(event) => onInfoLocalPatch({ titulo: event.target.value })}
              className="min-h-11 w-full rounded-lg"
            />
          </label>

          <label className="block space-y-2">
            <span className="t-label text-[var(--text-tertiary)]">{creatorLabel}</span>
            <input
              type="text"
              value={infoLocal.autor}
              onChange={(event) => onInfoLocalPatch({ autor: event.target.value })}
              className="min-h-11 w-full rounded-lg"
            />
          </label>

          <label className="block space-y-2">
            <span className="t-label text-[var(--text-tertiary)]">Status de leitura</span>
            <select
              value={infoLocal.statusLeitura}
              onChange={(event) =>
                onInfoLocalPatch({ statusLeitura: event.target.value as StatusLeitura })
              }
              className="min-h-11 w-full rounded-lg"
            >
              {statusLeituraOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <TagSelect
            label="Gêneros"
            values={infoLocal.generos}
            onChange={(generos) => onInfoLocalPatch({ generos })}
            options={generoOptions.map((genero) => ({ value: genero, label: genero }))}
            placeholder="Selecione gêneros"
          />

          <label className="block space-y-2">
            <span className="t-label text-[var(--text-tertiary)]">Avaliação</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onInfoLocalPatch({ avaliacao: rating as 1 | 2 | 3 | 4 | 5 })}
                >
                  <Star
                    className={cn(
                      'h-6 w-6',
                      rating <= (infoLocal.avaliacao || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-[var(--border-strong)]'
                    )}
                  />
                </button>
              ))}
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="t-label text-[var(--text-tertiary)]">{progressLabels.current}</span>
              <input
                type="number"
                min={0}
                value={infoLocal.paginasLidas}
                onChange={(event) =>
                  onInfoLocalPatch({
                    paginasLidas: event.target.value === '' ? '' : Number(event.target.value),
                  })
                }
                className="min-h-11 w-full rounded-lg"
              />
            </label>
            <label className="block space-y-2">
              <span className="t-label text-[var(--text-tertiary)]">{progressLabels.total}</span>
              <input
                type="number"
                min={1}
                value={infoLocal.totalPaginas}
                onChange={(event) =>
                  onInfoLocalPatch({
                    totalPaginas: event.target.value === '' ? '' : Number(event.target.value),
                  })
                }
                className="min-h-11 w-full rounded-lg"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="t-label text-[var(--text-tertiary)]">Notas gerais</span>
            <textarea
              value={infoLocal.notasGerais}
              onChange={(event) => onInfoLocalPatch({ notasGerais: event.target.value })}
              rows={4}
              className="w-full rounded-lg"
            />
          </label>

          <button type="button" onClick={handleSaveInfo} className="button-primary w-full">
            <Check className="h-4 w-4" />
            {infoSalvo ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </BottomSheetModal>
    </div>
  );
}
