import {useLayoutEffect, useMemo, useRef, useState, type MouseEvent} from 'react';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Plus} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {TagSelect} from '../../../components/ui/TagSelect';
import {Text} from '../../../components/ui/Text';
import {ToolbarSearchInput} from '../../../components/ui/ToolbarSearchInput';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {useAppContext} from '../../../context/AppContext';
import type {Content} from '../../../lib/database';
import {etiquetasVisiveis} from '../../creation/lib/creationItemPresentation';
import {normalizeContentStatus} from '../../contents/lib/contentPipeline';
import {sortPilares} from '../../settings/lib/activePilares';
import {
  FILTRO_PUXAR_VAZIO,
  filtroPuxarAtivo,
  opcoesDoFiltroPuxar,
  passaNoFiltroPuxar,
  pilarEfetivo,
  type FiltroPuxar,
} from '../lib/filtroPuxar';
import {PostItTemas} from './PostItNote';

/** Tempo em que um clique na lista ainda é o mesmo gesto que abriu o modal. */
const ESPERA_APOS_ABRIR_MS = 400;

/**
 * Lista o que pode entrar no planejamento e filtra por título, série, pilar e tag.
 * Escolher não muda o conteúdo: quem grava o vínculo é a página.
 */
export function PuxarConteudoDialog({
  open,
  date,
  candidatos,
  onClose,
  onPuxar,
}: {
  open: boolean;
  date: string | null;
  candidatos: readonly Content[];
  onClose: () => void;
  onPuxar: (content: Content) => void;
}) {
  const {state} = useAppContext();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroPuxar>(FILTRO_PUXAR_VAZIO);
  const abertoEm = useRef(0);

  useLayoutEffect(() => {
    if (!open) return;
    abertoEm.current = performance.now();
    setBusca('');
    setFiltro(FILTRO_PUXAR_VAZIO);
  }, [open]);

  // O modal abre com um item embaixo do cursor: o segundo clique de um duplo clique no "+"
  // cairia nele e puxaria um conteúdo que ninguém escolheu.
  const escolher = (content: Content, event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail > 1 || performance.now() - abertoEm.current < ESPERA_APOS_ABRIR_MS) return;
    onPuxar(content);
  };

  const pilaresOrdenados = useMemo(() => sortPilares(state.pilares), [state.pilares]);
  const opcoes = useMemo(
    () => opcoesDoFiltroPuxar(candidatos, state.series, pilaresOrdenados, state.temas),
    [candidatos, state.series, pilaresOrdenados, state.temas],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return candidatos
      .filter(content => passaNoFiltroPuxar(content, filtro, state.series, state.temas))
      .filter(content => !termo || `${content.title} ${content.status}`.toLocaleLowerCase('pt-BR').includes(termo))
      .sort((left, right) => (left.title || '').localeCompare(right.title || '', 'pt-BR'));
  }, [busca, candidatos, filtro, state.series, state.temas]);

  const nomeDaSerie = new Map(state.series.map(serie => [serie.id, serie.name.trim()]));
  const nomeDoPilar = new Map(state.pilares.map(pilar => [pilar.id, pilar.nome.trim()]));
  const filtrando = filtroPuxarAtivo(filtro) || Boolean(busca.trim());

  return (
    <Dialog
      open={open}
      onClose={onClose}
      desktopMaxW="md:max-w-3xl"
      desktopPanelClassName="h-[85dvh] md:h-[80dvh]"
      ariaLabel={date ? 'Puxar para o dia' : 'Puxar para fora do calendário'}
    >
      <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
        <OverlayHeader
          title={date ? 'Puxar para o dia' : 'Puxar para fora do calendário'}
          subtitle={date
            ? format(new Date(`${date}T12:00:00`), "EEEE, d 'de' MMMM", {locale: ptBR})
            : undefined}
          icon={<Plus className="h-6 w-6 text-[var(--brand-accent-text)]" />}
          onClose={onClose}
        />
        <div className="overlay-body stack-sm shrink-0 border-b border-[var(--border-color)]">
          <Text variant="meta" className="text-[var(--text-secondary)]">
            A ideia, o roteiro ou o conteúdo em produção entra no planejamento sem mudar de status.
          </Text>
          <ToolbarSearchInput value={busca} onChange={setBusca} placeholder="Buscar pelo título" size="compact" />
          <div className="grid gap-3 sm:grid-cols-3">
            <TagSelect
              id="puxar-serie"
              label="Série"
              placeholder="Todas as séries"
              searchable
              values={filtro.serieIds}
              options={opcoes.series}
              disabled={opcoes.series.length === 0}
              onChange={serieIds => setFiltro(atual => ({...atual, serieIds}))}
            />
            <TagSelect
              id="puxar-pilar"
              label="Pilar"
              placeholder="Todos os pilares"
              values={filtro.pilarIds}
              options={opcoes.pilares}
              disabled={opcoes.pilares.length === 0}
              onChange={pilarIds => setFiltro(atual => ({...atual, pilarIds}))}
            />
            <TagSelect
              id="puxar-tags"
              label="Tags"
              placeholder="Todas as tags"
              searchable
              values={filtro.tags}
              options={opcoes.tags}
              disabled={opcoes.tags.length === 0}
              onChange={tags => setFiltro(atual => ({...atual, tags}))}
            />
          </div>
        </div>
        <OverlayBody>
          <div className="stack-sm">
            <div className="flex min-h-8 items-center justify-between gap-3">
              <Text variant="meta" className="text-[var(--text-secondary)]">
                {lista.length === 1 ? '1 conteúdo' : `${lista.length} conteúdos`}
              </Text>
              {filtrando ? (
                <AppButton
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setBusca('');
                    setFiltro(FILTRO_PUXAR_VAZIO);
                  }}
                >
                  Limpar filtros
                </AppButton>
              ) : null}
            </div>
            {lista.length === 0 ? (
              <Text variant="meta" className="text-[var(--text-secondary)]">
                {candidatos.length === 0 ? 'Nada para puxar.' : 'Nada com esses filtros.'}
              </Text>
            ) : (
              <ul className="stack-sm">
                {lista.map(content => {
                  const status = normalizeContentStatus(content.status);
                  const pilarId = pilarEfetivo(content, state.series);
                  const classe = [
                    content.seriesId ? nomeDaSerie.get(content.seriesId) : null,
                    pilarId ? nomeDoPilar.get(pilarId) : null,
                  ].filter((parte): parte is string => Boolean(parte));
                  return (
                    <li key={content.id}>
                      <button
                        type="button"
                        onClick={event => escolher(content, event)}
                        className="flex w-full items-start justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block whitespace-normal break-words text-sm font-semibold text-[var(--text-primary)]">
                            {content.title || 'Sem título'}
                          </span>
                          {classe.length > 0 ? (
                            <Text variant="meta" as="span" className="mt-0.5 block text-[var(--text-secondary)]">
                              {classe.join(' · ')}
                            </Text>
                          ) : null}
                          <PostItTemas temas={etiquetasVisiveis(content, state.temas)} />
                        </span>
                        <Badge variant="status" status={status}>{status}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </OverlayBody>
      </div>
    </Dialog>
  );
}
