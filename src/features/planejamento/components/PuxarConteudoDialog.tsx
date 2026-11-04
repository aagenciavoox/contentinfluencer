import {useLayoutEffect, useMemo, useRef, useState, type MouseEvent} from 'react';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Plus} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {PlatformIcons} from '../../../components/ui/PlatformIcons';
import {TagSelect} from '../../../components/ui/TagSelect';
import {Text} from '../../../components/ui/Text';
import {ToolbarSearchInput} from '../../../components/ui/ToolbarSearchInput';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {useAppContext} from '../../../context/AppContext';
import type {Content, RedeSocial} from '../../../lib/database';
import {CreationRedeQuickFilter} from '../../creation/components/CreationRedeQuickFilter';
import {
  mapaDeRedesDaCriacao,
  redesDoFiltroRapido,
} from '../../creation/lib/creationRedeFilter';
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
import {normalizarRedesDoFiltro} from '../../creation/lib/creationRedeFilter';
import {lerPreferenciaLista} from '../../settings/lib/preferenciaLista';
import {colunaDeOrdemDisponivel} from '../../settings/lib/seriesLista';
import {secoesDaSerie, type SecaoPuxar} from '../lib/secoesPuxar';
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

  const redesPorConteudo = useMemo(
    () => mapaDeRedesDaCriacao(candidatos, state.platforms, state.postIts ?? []),
    [candidatos, state.platforms, state.postIts],
  );

  const redesRapidas = useMemo(() => {
    const dasContas = redesDoFiltroRapido(state.platforms, filtro.redes);
    const dosCandidatos = candidatos.flatMap(c => redesPorConteudo.get(c.id) ?? []);
    return normalizarRedesDoFiltro([...dasContas, ...dosCandidatos, ...(filtro.redes ?? [])]);
  }, [state.platforms, filtro.redes, candidatos, redesPorConteudo]);

  const redeQuickFilter = redesRapidas.length > 0 ? (
    <CreationRedeQuickFilter
      redes={redesRapidas}
      value={filtro.redes ?? []}
      onChange={redes => setFiltro(atual => ({...atual, redes}))}
    />
  ) : null;

  // Com série escolhida, a lista é a da página da série, com o agrupamento e a ordem salvos lá.
  // Sem série, por título. A preferência é relida a cada abertura: pode ter mudado na outra tela.
  const porSerie = filtro.serieIds.length > 0;
  const secoes = useMemo<SecaoPuxar[]>(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const visiveis = candidatos
      .filter(content => passaNoFiltroPuxar(content, filtro, state.series, state.temas, redesPorConteudo.get(content.id)))
      .filter(content => !termo || `${content.title} ${content.status}`.toLocaleLowerCase('pt-BR').includes(termo));
    if (porSerie) {
      return secoesDaSerie(visiveis, filtro.serieIds, state.series, state.temporadas, {
        preferencia: lerPreferenciaLista,
        ordemDisponivel: colunaDeOrdemDisponivel(candidatos),
      });
    }
    return [{
      id: 'titulo',
      rotulo: null,
      numerar: false,
      contents: [...visiveis].sort((left, right) => (left.title || '').localeCompare(right.title || '', 'pt-BR')),
    }];
  }, [busca, candidatos, filtro, porSerie, redesPorConteudo, state.series, state.temas, state.temporadas]);
  const total = secoes.reduce((soma, secao) => soma + secao.contents.length, 0);

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
            A ideia ou o roteiro entra no planejamento sem mudar de etapa.
          </Text>
          <div className="flex items-center gap-2">
            <ToolbarSearchInput
              value={busca}
              onChange={setBusca}
              placeholder="Buscar pelo título"
              className="filter-bar-search--fluid min-w-0"
            />
            {redeQuickFilter}
          </div>
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
                {total === 1 ? '1 conteúdo' : `${total} conteúdos`}
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
            {total === 0 ? (
              <Text variant="meta" className="text-[var(--text-secondary)]">
                {candidatos.length === 0 ? 'Nada para puxar.' : 'Nada com esses filtros.'}
              </Text>
            ) : (
              <div className="stack-md">
                {secoes.map(secao => (
                  <section key={secao.id} className="stack-xs" aria-label={secao.rotulo ?? undefined}>
                    {secao.rotulo ? (
                      <Text variant="meta" as="h3" className="text-[var(--text-secondary)]">
                        {secao.rotulo}
                      </Text>
                    ) : null}
                    <ul className="stack-sm">
                      {secao.contents.map((content, indice) => {
                        const status = normalizeContentStatus(content.status);
                        const pilarId = pilarEfetivo(content, state.series);
                        const redesDoItem = redesPorConteudo.get(content.id) ?? [];
                        // Com série escolhida, o cabeçalho e o filtro já dizem onde o episódio está.
                        const classe = [
                          !porSerie && content.seriesId ? nomeDaSerie.get(content.seriesId) : null,
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
                                <span className="block whitespace-normal break-words t-body-strong text-[var(--text-primary)]">
                                  {secao.numerar ? (
                                    <span className="mr-2 tabular-nums text-[var(--text-secondary)]">{indice + 1}.</span>
                                  ) : null}
                                  {content.title || 'Sem título'}
                                </span>
                                {classe.length > 0 ? (
                                  <Text variant="meta" as="span" className="mt-0.5 block text-[var(--text-secondary)]">
                                    {classe.join(' · ')}
                                  </Text>
                                ) : null}
                                <PostItTemas temas={etiquetasVisiveis(content, state.temas)} />
                              </span>
                              <div className="flex shrink-0 flex-col items-end gap-1.5">
                                <Badge variant="status" status={status}>{status}</Badge>
                                {redesDoItem.length > 0 ? (
                                  <PlatformIcons redes={redesDoItem} max={4} className="shrink-0" />
                                ) : null}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </OverlayBody>
      </div>
    </Dialog>
  );
}
