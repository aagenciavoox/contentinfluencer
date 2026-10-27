import { useState, type ReactNode } from 'react';
import {
  BookOpen,
  Check,
  FileText,
  Pencil,
  Plus,
  Star,
} from 'lucide-react';
import type { Anotacao, BibliotecaItem } from '../../../lib/database';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { FilterChips } from '../../../components/ui/FilterChips';
import { SelectField } from '../../../components/ui/SelectField';
import { TagSelect } from '../../../components/ui/TagSelect';
import { Text } from '../../../components/ui/Text';
import { Surface } from '../../../components/ui/Surface';
import { cn } from '../../../lib/utils';
import { AnnotationNoteCard } from '../../../features/library/components/AnnotationNoteCard';
import { CoverFallback } from '../../../features/library/components/CoverFallback';
import { CoverUploadField } from '../../../features/library/components/CoverUploadField';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';
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
  roteirosCount: number;
  /** Aba Roteiros pronta, o mesmo bloco do computador. */
  roteirosContent: ReactNode;
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
  roteirosCount,
  roteirosContent,
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
    <div className="stack-md pb-24">
      <Surface variant="outlined" padding="sm" className="bg-[var(--bg-secondary)]">
        <div className="flex gap-3">
          <div className="h-16 w-11 shrink-0 overflow-hidden rounded-[var(--radius-input)] bg-[var(--bg-hover)]">
            {infoLocal.capaUrl ? (
              <img
                src={infoLocal.capaUrl}
                alt=""
                className="h-full w-full object-cover"
                onError={(event) => {
                  const target = event.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling;
                  if (fallback instanceof HTMLElement) fallback.hidden = false;
                }}
              />
            ) : null}
            <div hidden={Boolean(infoLocal.capaUrl)} className="h-full w-full">
              <CoverFallback title={infoLocal.titulo || livro.titulo} typeLabel={itemTypeLabel} compact />
            </div>
          </div>

          <div className="min-w-0 flex-1 stack-xs">
            {/* O título da obra já está no cabeçalho; aqui ficam autoria, tipo, status e nota. */}
            <p className="text-sm text-[var(--text-secondary)]">
              {livro.autorDiretor || 'Sem autoria'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="neutral">{itemTypeLabel}</Badge>
              <Badge variant="neutral">{livro.status}</Badge>
            </div>
            {livro.avaliacao ? (
              <div className="flex gap-0.5" role="img" aria-label={`Avaliação: ${livro.avaliacao} de 5`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={cn(
                      'h-3 w-3',
                      index < livro.avaliacao!
                        ? 'fill-[var(--warning)] text-[var(--warning)]'
                        : 'text-[var(--border-strong)]'
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Surface>

      <MobileSegmentTabs
        rounded="tight"
        fullWidth
        ariaLabel="Seções do item"
        tabs={[
          { value: 'info', label: 'Info' },
          { value: 'anotacoes', label: 'Anotações', count: livro.anotacoes.length },
          { value: 'conteudos', label: 'Roteiros', count: roteirosCount },
        ]}
        value={tab}
        onChange={onTabChange}
      />

      {tab === 'info' ? (
        <div className="stack-md">
          <Surface variant="outlined" padding="sm" className="bg-[var(--bg-secondary)]">
            <MobileSectionHeader
              icon={BookOpen}
              tone="neutral"
              title="Leitura"
              action={
                <AppButton
                  variant="secondary"
                  size="xs"
                  onClick={() => setEditInfoOpen(true)}
                  leftIcon={<Pencil className="h-3.5 w-3.5" aria-hidden />}
                >
                  Editar
                </AppButton>
              }
            />

            <dl className="stack-md text-sm">
              <div>
                <dt>
                  <Text variant="label" uppercase className="font-semibold">
                    Status
                  </Text>
                </dt>
                <dd className="mt-1 text-[var(--text-primary)]">{infoLocal.statusLeitura}</dd>
              </div>
              <div>
                <dt>
                  <Text variant="label" uppercase className="font-semibold">
                    Gêneros
                  </Text>
                </dt>
                <dd className="mt-1">
                  {infoLocal.generos.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {infoLocal.generos.map((genero) => (
                        <Badge key={genero} variant="neutral">{genero}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-secondary)]">Nenhum gênero</span>
                  )}
                </dd>
              </div>
              {progressPercent !== null ? (
                <div>
                  <dt>
                    <Text variant="label" uppercase className="font-semibold">
                      Progresso
                    </Text>
                  </dt>
                  <dd className="mt-1 space-y-1.5">
                    <p className="text-[var(--text-primary)]">
                      {typeof infoLocal.paginasLidas === 'number' ? infoLocal.paginasLidas : 0}/
                      {infoLocal.totalPaginas} {progressLabels.unit} · {progressPercent}%
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-hover)]">
                      <div
                        className="h-full rounded-full bg-[var(--text-primary)] transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Surface>

          <Surface variant="outlined" padding="md" className="bg-[var(--bg-secondary)]">
            <MobileSectionHeader icon={FileText} tone="neutral" title="Notas gerais" />
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
              {infoLocal.notasGerais.trim() || 'Sem notas ainda.'}
            </p>
          </Surface>

          {/* Ação destrutiva com moldura (antes era texto rosa a 70% de opacidade, quase invisível).
              A confirmação continua no ConfirmModal. */}
          <AppButton variant="secondary" fullWidth onClick={onRequestDelete} className="text-[var(--danger)]">
            Remover da biblioteca
          </AppButton>
        </div>
      ) : null}

      {tab === 'anotacoes' ? (
        <div className="stack-md">
          {/* Uma fileira só, rolando para o lado (antes quebrava em duas linhas). */}
          <FilterChips<AnotacaoFiltro>
            ariaLabel="Filtrar anotações"
            size="sm"
            layout="scroll"
            options={filterOptions.map(option => ({ id: option, label: option }))}
            value={filtroTipo}
            onChange={onFiltroTipoChange}
          />

          {anotacoesFiltradas.length === 0 && livro.anotacoes.length > 0 ? (
            <EmptyState compact
              title="Nenhuma anotação nesse filtro"
              description="Troque o filtro acima para ver as outras anotações."
              action={
                <AppButton variant="secondary" onClick={() => onFiltroTipoChange('Todos')}>
                  Ver todas
                </AppButton>
              }
              icon={<BookOpen className="h-8 w-8" />}
            />
          ) : anotacoesFiltradas.length === 0 ? (
            <EmptyState compact
              title="Nenhuma anotação ainda"
              description="Registre trechos, reações ou ideias de conteúdo."
              action={
                <AppButton variant="primary" fullWidth onClick={onOpenAnnotationComposer} leftIcon={<Plus className="h-4 w-4" />}>
                  Nova anotação
                </AppButton>
              }
              icon={<BookOpen className="h-8 w-8" />}
            />
          ) : (
            <div className="stack-sm">
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
              className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-20 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-[var(--shadow-dropdown)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              aria-label="Nova anotação"
            >
              <Plus className="h-6 w-6" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === 'conteudos' ? roteirosContent : null}

      <BottomSheetModal
        open={editInfoOpen}
        onClose={() => setEditInfoOpen(false)}
        desktopMaxW="max-w-md"
        zIndex="z-[110]"
        ariaLabel="Editar item"
      >
        <OverlayHeader title="Editar item" onClose={() => setEditInfoOpen(false)} />
        <OverlayBody className="stack-lg">

          <label className="block stack-sm">
            <span className="t-label text-[var(--text-tertiary)]">Título</span>
            <input
              type="text"
              value={infoLocal.titulo}
              onChange={(event) => onInfoLocalPatch({ titulo: event.target.value })}
              className="min-h-11 w-full"
            />
          </label>

          <label className="block stack-sm">
            <span className="t-label text-[var(--text-tertiary)]">{creatorLabel}</span>
            <input
              type="text"
              value={infoLocal.autor}
              onChange={(event) => onInfoLocalPatch({ autor: event.target.value })}
              className="min-h-11 w-full"
            />
          </label>

          <label className="block stack-sm">
            <span className="t-label text-[var(--text-tertiary)]">Status de leitura</span>
            <SelectField
              block
              ariaLabel="Status de leitura"
              value={infoLocal.statusLeitura}
              onChange={(value) => onInfoLocalPatch({ statusLeitura: value as StatusLeitura })}
              options={statusLeituraOptions.map((status) => ({ value: status, label: status }))}
            />
          </label>

          <CoverUploadField
            value={infoLocal.capaUrl}
            onChange={(capaUrl) => onInfoLocalPatch({ capaUrl })}
            itemId={livro.id}
            title={infoLocal.titulo || livro.titulo}
            typeLabel={itemTypeLabel}
            compact
          />

          <TagSelect
            label="Gêneros"
            values={infoLocal.generos}
            onChange={(generos) => onInfoLocalPatch({ generos })}
            options={generoOptions.map((genero) => ({ value: genero, label: genero }))}
            placeholder="Selecione gêneros"
          />

          <div className="stack-sm" role="group" aria-label="Avaliação">
            <span className="t-label text-[var(--text-tertiary)]" aria-hidden>Avaliação</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  aria-label={`${rating} de 5`}
                  aria-pressed={rating <= (infoLocal.avaliacao || 0)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  onClick={() => onInfoLocalPatch({ avaliacao: rating as 1 | 2 | 3 | 4 | 5 })}
                >
                  <Star
                    className={cn(
                      'h-6 w-6',
                      rating <= (infoLocal.avaliacao || 0)
                        ? 'fill-[var(--warning)] text-[var(--warning)]'
                        : 'text-[var(--border-strong)]'
                    )}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid-metrics">
            <label className="block stack-sm">
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
                className="min-h-11 w-full"
              />
            </label>
            <label className="block stack-sm">
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
                className="min-h-11 w-full"
              />
            </label>
          </div>

          <label className="block stack-sm">
            <span className="t-label text-[var(--text-tertiary)]">Notas gerais</span>
            <textarea
              value={infoLocal.notasGerais}
              onChange={(event) => onInfoLocalPatch({ notasGerais: event.target.value })}
              rows={4}
              className="w-full"
            />
          </label>
        </OverlayBody>
        <OverlayFooter className="pb-safe px-4">
          <AppButton variant="primary" fullWidth onClick={handleSaveInfo} leftIcon={<Check className="h-4 w-4" />}>
            {infoSalvo ? 'Salvo' : 'Salvar'}
          </AppButton>
        </OverlayFooter>
      </BottomSheetModal>
    </div>
  );
}
