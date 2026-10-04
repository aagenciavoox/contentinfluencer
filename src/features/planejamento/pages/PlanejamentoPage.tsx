import {useEffect, useMemo, useRef, useState, type DragEvent} from 'react';
import {useNavigate} from 'react-router-dom';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Plus, StickyNote} from 'lucide-react';
import {CalendarMonthGrid, CalendarPeriodNav} from '../../../components/calendar';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {ToolbarSearchInput} from '../../../components/ui/ToolbarSearchInput';
import {Dialog} from '../../../components/overlays/Dialog';
import {Drawer} from '../../../components/overlays/Drawer';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import type {Content} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {buildContentDetailRoute} from '../../contents/lib/contentDetailRoute';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';
import {POST_IT_MIME, PostItNote} from '../components/PostItNote';
import {
  canPullContent,
  createEmptyPostIt,
  movePostIt,
  postItKind,
  postItTitle,
  postItTransformOptions,
  pullExistingContent,
  transformPostIt,
  updatePostItText,
  type PlanejamentoPostIt,
} from '../lib/postIt';

function contentById(contents: Content[], id: string | null): Content | null {
  if (!id) return null;
  return contents.find(content => content.id === id) ?? null;
}

function changedPostIts(before: PlanejamentoPostIt[], after: PlanejamentoPostIt[]): {
  added: PlanejamentoPostIt[];
  updated: PlanejamentoPostIt[];
} {
  const beforeById = new Map(before.map(postIt => [postIt.id, postIt]));
  const added: PlanejamentoPostIt[] = [];
  const updated: PlanejamentoPostIt[] = [];
  for (const postIt of after) {
    const previous = beforeById.get(postIt.id);
    if (!previous) added.push(postIt);
    else if (previous.date !== postIt.date || previous.contentId !== postIt.contentId || previous.texto !== postIt.texto) {
      updated.push(postIt);
    }
  }
  return {added, updated};
}

export function PlanejamentoPage() {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const transformingRef = useRef(false);
  const [month, setMonth] = useState(new Date());
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [pileOver, setPileOver] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pullOpen, setPullOpen] = useState(false);
  const [pullDate, setPullDate] = useState<string | null>(null);
  const [pullQuery, setPullQuery] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  const contents = state.contents;
  const postIts = state.postIts ?? [];
  const openPostIt = postIts.find(postIt => postIt.id === openId) ?? null;
  const openContent = contentById(contents, openPostIt?.contentId ?? null);

  useEffect(() => {
    setNoteDraft(openPostIt?.texto ?? '');
  }, [openPostIt?.id, openPostIt?.texto]);

  const byDate = useMemo(() => {
    const map = new Map<string, PlanejamentoPostIt[]>();
    postIts.forEach(postIt => {
      if (!postIt.date) return;
      const list = map.get(postIt.date) ?? [];
      list.push(postIt);
      map.set(postIt.date, list);
    });
    return map;
  }, [postIts]);

  const undated = useMemo(
    () => postIts.filter(postIt => !postIt.date),
    [postIts],
  );

  const applyList = (next: PlanejamentoPostIt[]) => {
    const {added, updated} = changedPostIts(postIts, next);
    added.forEach(postIt => dispatch({type: 'ADD_POST_IT', payload: postIt}));
    updated.forEach(postIt => dispatch({type: 'UPDATE_POST_IT', payload: postIt}));
  };

  const addEmpty = (date: string | null) => {
    const postIt = createEmptyPostIt({date});
    dispatch({type: 'ADD_POST_IT', payload: postIt});
    setOpenId(postIt.id);
  };

  const moveTo = (postItId: string, date: string | null) => {
    const postIt = postIts.find(item => item.id === postItId);
    if (!postIt || postIt.date === date) return;
    dispatch({type: 'UPDATE_POST_IT', payload: movePostIt(postIt, date)});
  };

  const readDragId = (event: DragEvent) =>
    event.dataTransfer.getData(POST_IT_MIME) || event.dataTransfer.getData('text/plain');

  const pullOnto = (content: Content, date: string | null) => {
    const result = pullExistingContent({
      postIts,
      content,
      date,
    });
    if (!result.pulled) return;
    applyList(result.postIts);
    setPullOpen(false);
    setPullQuery('');
  };

  const commitTransform = (target: 'ideia' | 'roteiro') => {
    if (!openPostIt) return;
    transformingRef.current = true;
    const postIt = openPostIt.contentId ? openPostIt : updatePostItText(openPostIt, noteDraft);
    const result = transformPostIt({
      postIt,
      contents,
      target,
    });
    if (!result.ok) {
      transformingRef.current = false;
      return;
    }
    dispatch({
      type: result.mode === 'create' ? 'ADD_CONTENT' : 'UPDATE_CONTENT',
      payload: result.content,
    });
    dispatch({type: 'DELETE_POST_IT', payload: result.removePostItId});
    setOpenId(null);
    if (result.openScript) {
      navigate(
        buildContentDetailRoute(result.content.id, 'roteiro'),
        buildDetailBackState('/planejamento'),
      );
    }
  };

  const pullable = useMemo(() => {
    const query = pullQuery.trim().toLowerCase();
    return contents
      .filter(canPullContent)
      .filter(content => {
        if (!query) return true;
        return `${content.title} ${content.status}`.toLowerCase().includes(query);
      })
      .sort((left, right) => (left.title || '').localeCompare(right.title || '', 'pt-BR'));
  }, [contents, pullQuery]);

  const options = openPostIt ? postItTransformOptions(openPostIt, openContent) : {ideia: false, roteiro: false};

  return (
    <PageLayout
      contentWidth="full"
      contentStack="none"
      className="min-h-full"
      contentClassName="!py-0"
      header={(
        <DesktopPageHeader
          section="Produção"
          title="Planejamento"
          meta="Post-its antes da ideia. O calendário só recebe o que você transformar."
          actions={(
            <>
              <AppButton variant="secondary" leftIcon={<StickyNote className="h-4 w-4" />} onClick={() => addEmpty(null)}>
                Novo post-it
              </AppButton>
              <AppButton
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setPullDate(null);
                  setPullOpen(true);
                }}
              >
                Puxar conteúdo
              </AppButton>
            </>
          )}
        />
      )}
    >
        <div className="stack-md p-3 md:p-4">
        {isMobile ? (
          <div className="flex flex-wrap gap-2">
            <AppButton variant="secondary" size="sm" leftIcon={<StickyNote className="h-4 w-4" />} onClick={() => addEmpty(null)}>
              Novo post-it
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setPullDate(null);
                setPullOpen(true);
              }}
            >
              Puxar conteúdo
            </AppButton>
          </div>
        ) : null}
        <CalendarPeriodNav
          anchorDate={month}
          onAnchorDateChange={setMonth}
          viewMode="month"
          onViewModeChange={() => undefined}
          views={[]}
        />

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <CalendarMonthGrid
            anchorDate={month}
            weekStartsOn={0}
            minCellHeight={128}
            getDayClassName={day => cn(
              dragOverDay === day.dateKey && 'bg-[color-mix(in_srgb,var(--accent-orange)_12%,transparent)]',
            )}
            onDayDragOver={(day, event) => {
              event.preventDefault();
              setDragOverDay(day.dateKey);
              setPileOver(false);
            }}
            onDayDragLeave={() => setDragOverDay(null)}
            onDayDrop={(day, event) => {
              event.preventDefault();
              setDragOverDay(null);
              const id = readDragId(event);
              if (id) moveTo(id, day.dateKey);
            }}
            renderDayContent={day => {
              const dayPostIts = byDate.get(day.dateKey) ?? [];
              return (
                <div className="stack-sm">
                  {dayPostIts.map(postIt => (
                    <PostItNote
                      key={postIt.id}
                      postIt={postIt}
                      content={contentById(contents, postIt.contentId)}
                      compact
                      onOpen={() => setOpenId(postIt.id)}
                    />
                  ))}
                  <div className="flex gap-1">
                    <AppButton
                      variant="ghost"
                      size="xs"
                      className="min-w-0 flex-1"
                      onClick={event => {
                        event.stopPropagation();
                        addEmpty(day.dateKey);
                      }}
                    >
                      Post-it
                    </AppButton>
                    <AppButton
                      variant="ghost"
                      size="xs"
                      aria-label={`Puxar conteúdo para ${format(day.day, "d 'de' MMMM", {locale: ptBR})}`}
                      onClick={event => {
                        event.stopPropagation();
                        setPullDate(day.dateKey);
                        setPullOpen(true);
                      }}
                    >
                      Puxar
                    </AppButton>
                  </div>
                </div>
              );
            }}
          />

          <Surface
            variant="outlined"
            padding="sm"
            className={cn('stack-sm', pileOver && 'ring-2 ring-[var(--accent-orange)]')}
            onDragOver={event => {
              event.preventDefault();
              setPileOver(true);
              setDragOverDay(null);
            }}
            onDragLeave={() => setPileOver(false)}
            onDrop={event => {
              event.preventDefault();
              setPileOver(false);
              const id = readDragId(event);
              if (id) moveTo(id, null);
            }}
          >
            <div>
              <Text variant="sectionTitle">Sem data</Text>
              <Text variant="meta" className="mt-1 block text-[var(--text-secondary)]">
                Post-its que ainda não têm dia. Arraste para o mês quando fizer sentido.
              </Text>
            </div>
            {undated.length === 0 ? (
              <Text variant="meta" className="rounded-[var(--radius-input)] bg-[var(--surface-subtle)] px-3 py-3 text-[var(--text-secondary)]">
                A pilha está vazia.
              </Text>
            ) : (
              <ul className="stack-sm">
                {undated.map(postIt => (
                  <li key={postIt.id}>
                    <PostItNote
                      postIt={postIt}
                      content={contentById(contents, postIt.contentId)}
                      onOpen={() => setOpenId(postIt.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </div>
      </div>

      <Drawer open={Boolean(openPostIt)} onClose={() => setOpenId(null)} widthClassName="max-w-md">
        {openPostIt ? (
          <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
            <OverlayHeader title="Post-it" onClose={() => setOpenId(null)} />
            <OverlayBody>
              <div className="stack-md">
                <Badge
                  variant={postItKind(openPostIt, openContent) === 'vazio' ? 'neutral' : 'status'}
                  status={
                    postItKind(openPostIt, openContent) === 'roteiro'
                      ? CONTENT_STATUS.ROTEIRO
                      : postItKind(openPostIt, openContent) === 'ideia'
                        ? CONTENT_STATUS.IDEIA
                        : undefined
                  }
                >
                  {postItKind(openPostIt, openContent) === 'vazio'
                    ? 'Vazio'
                    : normalizeContentStatus(openContent?.status || '')}
                </Badge>
                <Text variant="meta" className="text-[var(--text-secondary)]">
                  {openPostIt.date
                    ? format(new Date(`${openPostIt.date}T12:00:00`), "d 'de' MMMM 'de' yyyy", {locale: ptBR})
                    : 'Sem data, na pilha ao lado do mês.'}
                </Text>
                {openPostIt.contentId && !openContent ? (
                  <Text variant="meta" className="text-[var(--text-secondary)]">
                    O conteúdo puxado não está mais aqui. Apague o post-it se ele não servir.
                  </Text>
                ) : openContent ? (
                  <Surface variant="outlined" padding="sm">
                    <Text variant="itemTitle">{postItTitle(openPostIt, openContent)}</Text>
                    <Text variant="meta" className="mt-1 block text-[var(--text-secondary)]">
                      Puxado para este dia. O status continua {normalizeContentStatus(openContent.status)} até você transformar.
                    </Text>
                  </Surface>
                ) : (
                  <label className="stack-sm">
                    <Text variant="label" as="span">Nota</Text>
                    <textarea
                      value={noteDraft}
                      onChange={event => setNoteDraft(event.target.value)}
                      onBlur={() => {
                        if (transformingRef.current || noteDraft === openPostIt.texto) return;
                        dispatch({
                          type: 'UPDATE_POST_IT',
                          payload: updatePostItText(openPostIt, noteDraft),
                        });
                      }}
                      rows={5}
                      placeholder="Pode ficar em branco."
                      className="w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    />
                  </label>
                )}
                <Text variant="meta" className="text-[var(--text-secondary)]">
                  Virar ideia ou roteiro grava a data deste post-it como publicação e passa a aparecer no calendário.
                </Text>
              </div>
            </OverlayBody>
            <OverlayFooter>
              <div className="stack-sm">
                {options.ideia ? (
                  <AppButton variant="secondary" fullWidth onClick={() => commitTransform('ideia')}>
                    Virar ideia
                  </AppButton>
                ) : null}
                {options.roteiro ? (
                  <AppButton variant="primary" fullWidth onClick={() => commitTransform('roteiro')}>
                    Virar roteiro
                  </AppButton>
                ) : null}
                {openPostIt.date ? (
                  <AppButton variant="ghost" fullWidth onClick={() => dispatch({type: 'UPDATE_POST_IT', payload: movePostIt(openPostIt, null)})}>
                    Tirar a data
                  </AppButton>
                ) : null}
                <AppButton
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    dispatch({type: 'DELETE_POST_IT', payload: openPostIt.id});
                    setOpenId(null);
                  }}
                >
                  Apagar post-it
                </AppButton>
              </div>
            </OverlayFooter>
          </div>
        ) : null}
      </Drawer>

      <Dialog open={pullOpen} onClose={() => setPullOpen(false)} desktopMaxW="max-w-md">
        <OverlayHeader
          title={pullDate ? 'Puxar para o dia' : 'Puxar para a pilha'}
          onClose={() => setPullOpen(false)}
        />
        <OverlayBody>
          <div className="stack-md">
            <Text variant="meta" className="text-[var(--text-secondary)]">
              A ideia ou o roteiro entra no planejamento sem mudar de status. Transformar é outro passo.
            </Text>
            <ToolbarSearchInput
              value={pullQuery}
              onChange={setPullQuery}
              placeholder="Buscar ideia ou roteiro"
              size="compact"
            />
            {pullable.length === 0 ? (
              <Text variant="meta" className="text-[var(--text-secondary)]">Nada para puxar com esse filtro.</Text>
            ) : (
              <ul className="stack-sm">
                {pullable.map(content => (
                  <li key={content.id}>
                    <button
                      type="button"
                      onClick={() => pullOnto(content, pullDate)}
                      className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                        {content.title || 'Sem título'}
                      </span>
                      <Badge variant="status" status={normalizeContentStatus(content.status)}>
                        {normalizeContentStatus(content.status)}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </OverlayBody>
      </Dialog>
    </PageLayout>
  );
}
