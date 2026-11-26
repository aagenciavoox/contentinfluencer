import { useId, useMemo, useRef, type ReactNode } from 'react';
import { Check, CheckCircle2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { MoreMenu, type MoreMenuItem } from '../../../../components/ui/MoreMenu';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { PlatformIcons } from '../../../../components/ui/PlatformIcons';
import { rotuloDoFoco } from '../../../editorial/lib/focoTemporada';
import { etapaDoStatus } from '../../../editorial/lib/etapas';
import { normalizarRedesPostIt } from '../../../planejamento/lib/redesPostIt';
import { Text } from '../../../../components/ui/Text';
import type { Content, Platform, Serie, SerieTipoAgrupamento, Temporada } from '../../../../lib/database';
import { dia, hora } from '../../../../lib/dates';
import { cn, htmlToReadableText } from '../../../../lib/utils';
import { isPostedContent } from '../../../contents/lib/contentWorkflow';
import { ehIdeia } from '../../lib/serieAgrupamento';
import type { BlocoRede, GrupoConteudos } from '../../lib/seriesGrupos';
import { redesDoConteudo } from '../../lib/seriesGrupos';
import { contagemDoGrupo, episodioPostado, exibidosDoGrupo, ordenarParaExibir, podeReordenarEpisodio, type AgruparLista } from '../../lib/seriesLista';
import { contasDoCicloAtual, seloDoFluxo, textoDoFormatoDoEpisodio } from '../../lib/seriesSecoes';
import { estadoDaMarcacao, type EstadoMarcacao } from '../../lib/selecaoEpisodios';
import { CaixaMarcacao } from './SeriesAcoesEmMassa';

export type AcoesDosGrupos = {
  /** Endereço do conteúdo, com a volta para esta página. */
  rotaDoConteudo: (content: Content) => { to: string; state: unknown };
  onCopiarLink: (content: Content) => void;
  /** Manda o episódio para a lixeira. A confirmação fica na página. */
  onExcluir: (content: Content) => void;
  onNovo: (serieId: string, temporadaId: string | null) => void;
  onBulk: (serieId: string, temporadaId: string | null) => void;
  onConfigurar: (serieId: string) => void;
  onEditarTemporada: (temporada: Temporada) => void;
  onExcluirTemporada: (temporada: Temporada) => void;
  /** Setas de ordem. Ausente quando a lista não está na ordem dos episódios (filtro ou outra ordenação). */
  onMoverEpisodio?: (lista: readonly Content[], content: Content, direcao: 'subir' | 'descer') => void;
};

export type SelecaoDaLista = {
  ativa: boolean;
  ids: ReadonlySet<string>;
  alternar: (id: string) => void;
  /** Entra no modo seleção; com id, já marca o conteúdo. */
  entrar: (id?: string) => void;
  /** Marca todos os ids dados ou, se já estavam todos, desmarca só eles. */
  alternarVarios: (ids: readonly string[]) => void;
};

/** Segurar o dedo por este tempo entra no modo seleção. */
const TOQUE_LONGO_MS = 450;

function etapaVisualDoEpisodio(content: Content): { rotulo: string; corVar: string } {
  const etapa = etapaDoStatus(content.status);
  if (etapa === 'postado') return { rotulo: 'Publicado', corVar: 'var(--status-posted)' };
  if (etapa === 'ideia' || etapa === 'planejamento') return { rotulo: 'Em ideia', corVar: 'var(--status-idea)' };
  if (etapa === 'roteiro') return { rotulo: 'Roteiro', corVar: 'var(--status-writing)' };
  if (etapa === 'producao') return { rotulo: 'Produção', corVar: 'var(--status-production)' };
  if (content.edicaoConcluidaEm || content.edicaoDispensada) {
    return { rotulo: 'Pronto p/ publicar', corVar: 'var(--status-scheduled)' };
  }
  return { rotulo: 'Edição', corVar: 'var(--status-editing)' };
}

function trechoDoRoteiro(script: string | null | undefined): string | null {
  const legivel = htmlToReadableText(script);
  if (!legivel) return null;
  const primeiraLinha = legivel
    .split('\n')
    .map(linha => linha.trim())
    .find(Boolean);
  if (!primeiraLinha) return null;
  return primeiraLinha.length > 150 ? `${primeiraLinha.slice(0, 147).trimEnd()}…` : primeiraLinha;
}

function datasDoEpisodio(content: Content, publicado: boolean): {
  principal: string;
  secundario: string | null;
  destaquePronto?: boolean;
  semData?: boolean;
} {
  if (publicado) {
    const dataPub = content.postedAt || content.publishDate;
    return {
      principal: dataPub ? `Pub: ${dia(dataPub)}` : 'Publicado',
      secundario: null,
    };
  }
  if (content.recordedAt) {
    return {
      principal: 'Gravado',
      secundario: content.publishDate ? `Prog: ${dia(content.publishDate)}` : null,
    };
  }
  if (content.recordingDate) {
    return {
      principal: `Grav: ${dia(content.recordingDate)}`,
      secundario: content.publishDate
        ? `Previsto ${dia(content.publishDate)}`
        : content.recordingTime ? hora(content.recordingTime) : null,
    };
  }
  if (content.publishDate) {
    const pronto = Boolean(content.edicaoConcluidaEm || content.edicaoDispensada);
    return {
      principal: `Prog: ${dia(content.publishDate)}`,
      secundario: content.publishTime ? hora(content.publishTime) : null,
      destaquePronto: pronto,
    };
  }
  return { principal: 'Sem data', secundario: null, semData: true };
}

function CaixaSelecao({ marcada, titulo, onToggle }: { marcada: boolean; titulo: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      aria-label={`Selecionar ${titulo}`}
      onClick={onToggle}
      className="relative z-[2] -m-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-input)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:h-11 pointer-coarse:w-11"
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded-[calc(var(--radius-sm)/2)] border transition-colors',
          marcada
            ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
            : 'border-[var(--border-strong)] bg-[var(--bg-elevated)]',
        )}
      >
        {marcada ? <Check className="h-3 w-3 stroke-[3px]" /> : null}
      </span>
    </button>
  );
}

function BotaoRecolher({ aberta, controla, onToggle }: { aberta: boolean; controla: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={aberta}
      aria-controls={controla}
      aria-label={aberta ? 'Recolher' : 'Mostrar'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:h-11 pointer-coarse:w-11"
    >
      <ChevronDown className={cn('h-4 w-4 transition-transform', !aberta && '-rotate-90')} aria-hidden />
    </button>
  );
}

type PropsDaLinha = {
  grupo: GrupoConteudos;
  agruparPor: AgruparLista;
  serieDaPagina: string;
  temQuadros: boolean;
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  contas: readonly Platform[];
  celular: boolean;
  acoes: AcoesDosGrupos;
  selecao: SelecaoDaLista;
};

function LinhaConteudo({
  content,
  noBloco,
  grupo,
  agruparPor,
  serieDaPagina,
  temQuadros,
  series,
  temporadas,
  contas,
  celular,
  acoes,
  selecao,
  lista,
  indice,
  numero,
}: PropsDaLinha & { content: Content; noBloco: boolean; lista: readonly Content[]; indice: number; numero: number }) {
  const titulo = content.title?.trim() || 'Sem título';
  const selo = seloDoFluxo(content.status);
  const formato = textoDoFormatoDoEpisodio(content, contas);
  const dono = content.seriesId && content.seriesId !== serieDaPagina
    ? series.find(item => item.id === content.seriesId)?.name?.trim() ?? null
    : null;
  const temporada = agruparPor !== 'temporada' && content.temporadaId
    ? temporadas.find(item => item.id === content.temporadaId)?.nome ?? null
    : null;
  const marcada = selecao.ids.has(content.id);
  const publicado = isPostedContent(content);
  const rota = acoes.rotaDoConteudo(content);
  const navigate = useNavigate();

  // Segurar o dedo entra no modo seleção, sem abrir o conteúdo.
  const toqueLongo = useRef<{ timer: number; x: number; y: number } | null>(null);
  const ignorarClique = useRef(false);
  const cancelarToque = () => {
    if (toqueLongo.current) window.clearTimeout(toqueLongo.current.timer);
    toqueLongo.current = null;
  };

  const pontoEtapa = (
    <Badge
      variant={selo === 'Em Ideia' ? 'warning' : selo === 'Publicado' ? 'success' : 'neutral'}
      className="shrink-0"
    >
      {selo}
    </Badge>
  );
  const podeMover = Boolean(acoes.onMoverEpisodio) && !selecao.ativa && lista.length > 1;
  const sobe = podeReordenarEpisodio(lista, indice, 'subir');
  const desce = podeReordenarEpisodio(lista, indice, 'descer');
  const tituloDaSeta = (direcao: 'subir' | 'descer', permitido: boolean, padrao: string) => {
    if (permitido) return padrao;
    if (publicado) return 'A ordem ficou fixa quando este episódio foi postado';
    const vizinho = lista[direcao === 'subir' ? indice - 1 : indice + 1];
    if (vizinho && episodioPostado(vizinho)) return 'A ordem para antes dos episódios já postados';
    return padrao;
  };

  const itensMenu: MoreMenuItem[] = [
    ...(podeMover ? [
      { label: 'Subir', disabled: !sobe, onClick: () => acoes.onMoverEpisodio?.(lista, content, 'subir') },
      { label: 'Descer', disabled: !desce, onClick: () => acoes.onMoverEpisodio?.(lista, content, 'descer') },
    ] : []),
    ...(celular ? [{ label: 'Selecionar', onClick: () => selecao.entrar(content.id) }] : []),
    { label: 'Abrir no editor', onClick: () => navigate(rota.to, { state: rota.state }) },
    { label: 'Copiar link', onClick: () => acoes.onCopiarLink(content) },
    {
      label: ehIdeia(content) ? 'Excluir ideia' : 'Excluir roteiro',
      tone: 'danger' as const,
      onClick: () => acoes.onExcluir(content),
    },
  ];

  if (celular) {
    return (
      <li
        title={publicado ? 'Publicado' : undefined}
        className={cn(
          'relative flex min-h-12 items-center justify-between gap-3 border-t border-[var(--border-color)] px-4 py-3 select-none [-webkit-touch-callout:none]',
          noBloco && 'pl-8 sm:pl-16',
          publicado ? 'serie-episodio-postado' : 'hover:bg-[var(--bg-hover)]',
          marcada && publicado && 'serie-episodio-postado-selecionado',
          marcada && !publicado && 'bg-[var(--bg-hover)]',
        )}
        onPointerDown={event => {
          if (selecao.ativa || event.pointerType === 'mouse') return;
          const timer = window.setTimeout(() => {
            toqueLongo.current = null;
            ignorarClique.current = true;
            navigator.vibrate?.(10);
            selecao.entrar(content.id);
          }, TOQUE_LONGO_MS);
          toqueLongo.current = { timer, x: event.clientX, y: event.clientY };
        }}
        onPointerMove={event => {
          const inicio = toqueLongo.current;
          if (inicio && Math.hypot(event.clientX - inicio.x, event.clientY - inicio.y) > 10) cancelarToque();
        }}
        onPointerUp={cancelarToque}
        onPointerCancel={cancelarToque}
        onClickCapture={event => {
          if (!ignorarClique.current) return;
          ignorarClique.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onContextMenu={event => {
          event.preventDefault();
        }}
      >
        {selecao.ativa ? (
          <button
            type="button"
            onClick={() => selecao.alternar(content.id)}
            className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            aria-label={`${marcada ? 'Desmarcar' : 'Marcar'} ${titulo}`}
            tabIndex={-1}
          />
        ) : (
          <Link
            to={rota.to}
            state={rota.state}
            className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            aria-label={`Abrir ${titulo}`}
            draggable={false}
          />
        )}

        <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 items-center gap-3">
          {selecao.ativa ? (
            <span className="pointer-events-auto">
              <CaixaSelecao
                marcada={marcada}
                titulo={titulo}
                onToggle={() => selecao.alternar(content.id)}
              />
            </span>
          ) : null}

          <Text
            variant="meta"
            as="span"
            className={cn(
              'min-w-12 shrink-0 tabular-nums',
              publicado ? 'text-[var(--status-posted)]' : 'text-[var(--text-secondary)]',
            )}
          >
            {`Ep. ${String(numero).padStart(2, '0')}`}
          </Text>

          {pontoEtapa}

          <span className="min-w-0 flex-1">
            <Text variant="bodyStrong" as="span" className="block truncate text-[var(--text-primary)]">
              {titulo}
            </Text>
            {formato ? (
              <Text variant="meta" as="span" className="block truncate text-[var(--text-secondary)]">
                {formato}
              </Text>
            ) : null}
          </span>
        </div>

        <div className="relative z-[2] flex shrink-0 items-center gap-3">
          <MoreMenu
            size="sm"
            label={`Mais opções de ${titulo}`}
            items={itensMenu}
          />
        </div>
      </li>
    );
  }

  const etapaVisual = etapaVisualDoEpisodio(content);
  const previa = trechoDoRoteiro(content.script) ?? formato;
  const infoData = datasDoEpisodio(content, publicado);
  const redes = redesDoConteudo(content, contas);
  const contasAtivas = contasDoCicloAtual(content, contas);
  const mostrarSeloQuadro = agruparPor !== 'quadro' && (Boolean(dono) || temQuadros);
  const numeroFormatado = `#${String(numero).padStart(2, '0')}`;

  return (
    <li
      title={publicado ? 'Publicado' : undefined}
      className={cn(
        'group relative flex min-h-14 items-center gap-4 border-t border-[var(--border-color)] px-4 py-3 transition-colors',
        noBloco && 'pl-12',
        marcada
          ? 'bg-[var(--bg-hover)]'
          : publicado
            ? 'bg-[color-mix(in_srgb,var(--status-posted)_6%,var(--bg-elevated))] hover:bg-[color-mix(in_srgb,var(--status-posted)_11%,var(--bg-elevated))]'
            : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]',
      )}
    >
      {selecao.ativa ? (
        <button
          type="button"
          onClick={() => selecao.alternar(content.id)}
          className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          aria-label={`${marcada ? 'Desmarcar' : 'Marcar'} ${titulo}`}
          tabIndex={-1}
        />
      ) : (
        <Link
          to={rota.to}
          state={rota.state}
          className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          aria-label={`Abrir ${titulo}`}
          draggable={false}
        />
      )}

      {/* Seleção, ordem e número */}
      <div className="relative z-[2] flex shrink-0 items-center gap-2">
        <CaixaSelecao
          marcada={marcada}
          titulo={titulo}
          onToggle={() => (selecao.ativa ? selecao.alternar(content.id) : selecao.entrar(content.id))}
        />

        {podeMover ? (
          <div className="flex items-center">
            <AppButton
              variant="ghost"
              size="xs"
              iconOnly
              aria-label="Subir episódio"
              title={tituloDaSeta('subir', sobe, 'Subir episódio')}
              disabled={!sobe}
              onClick={() => acoes.onMoverEpisodio?.(lista, content, 'subir')}
              className="h-7 w-7"
            >
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            </AppButton>
            <AppButton
              variant="ghost"
              size="xs"
              iconOnly
              aria-label="Descer episódio"
              title={tituloDaSeta('descer', desce, 'Descer episódio')}
              disabled={!desce}
              onClick={() => acoes.onMoverEpisodio?.(lista, content, 'descer')}
              className="h-7 w-7"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </AppButton>
          </div>
        ) : null}

        <Text
          variant="meta"
          as="span"
          className={cn(
            'w-8 text-center tabular-nums',
            publicado ? 'text-[var(--status-posted)]' : 'text-[var(--text-tertiary)]',
          )}
        >
          {numeroFormatado}
        </Text>
      </div>

      {/* Título, origem (quadro/série mãe) e prévia do roteiro/formato */}
      <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <Text
            variant="bodyStrong"
            as="span"
            className="truncate text-[var(--text-primary)] transition-colors group-hover:text-[var(--brand-accent-text)]"
          >
            {titulo}
          </Text>
          {mostrarSeloQuadro ? (
            dono ? (
              <span className="t-meta inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--surface-subtle)] px-2 py-0.5 text-[var(--text-secondary)]">
                {`Quadro: ${dono}`}
              </span>
            ) : (
              <Text variant="meta" as="span" className="shrink-0 text-[var(--text-tertiary)]">
                — Série mãe
              </Text>
            )
          ) : null}
          {temporada ? (
            <span className="t-meta inline-flex shrink-0 items-center rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--surface-subtle)] px-2 py-0.5 text-[var(--text-secondary)]">
              {temporada}
            </span>
          ) : null}
        </div>

        {previa ? (
          <Text variant="meta" as="span" className="mt-0.5 truncate text-[var(--text-secondary)]">
            {previa}
          </Text>
        ) : null}
      </div>

      {/* Etapa no fluxo */}
      <div className="pointer-events-none relative z-[1] hidden w-36 shrink-0 md:block">
        <span
          className="t-label inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1"
          style={{
            backgroundColor: `color-mix(in srgb, ${etapaVisual.corVar} 12%, var(--bg-elevated))`,
            color: `color-mix(in srgb, ${etapaVisual.corVar} var(--tint-text-share), var(--text-primary))`,
          }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: etapaVisual.corVar }}
            aria-hidden
          />
          <span className="truncate">{etapaVisual.rotulo}</span>
        </span>
      </div>

      {/* Datas de gravação / publicação */}
      <div className="pointer-events-none relative z-[1] hidden w-28 shrink-0 flex-col text-right lg:flex">
        <Text
          variant={infoData.semData ? 'meta' : 'label'}
          as="span"
          className={cn(
            'truncate tabular-nums',
            infoData.semData ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]',
          )}
        >
          {infoData.principal}
        </Text>
        {infoData.secundario ? (
          <Text
            variant="meta"
            as="span"
            className={cn(
              'truncate tabular-nums',
              infoData.destaquePronto ? 'text-[var(--status-posted)]' : 'text-[var(--text-tertiary)]',
            )}
          >
            {infoData.secundario}
          </Text>
        ) : null}
      </div>

      {/* Ícones compactos das redes */}
      <div className="relative z-[2] hidden w-20 shrink-0 items-center justify-end gap-1 text-[var(--text-tertiary)] xl:flex">
        {redes.map(rede => {
          const contasDaRede = contasAtivas
            .filter(conta => conta.rede === rede || conta.nome.toLowerCase().includes(rede))
            .map(conta => conta.nome.trim())
            .filter(Boolean);
          const dica = contasDaRede.length > 0 ? contasDaRede.join(', ') : rede;
          return (
            <span
              key={rede}
              title={dica}
              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors hover:text-[var(--text-primary)]"
            >
              <PlatformIcon platform={rede} className="h-4 w-4" />
            </span>
          );
        })}
      </div>

      {/* Menu da linha */}
      <div className="relative z-[2] shrink-0">
        <MoreMenu
          size="sm"
          label={`Mais opções de ${titulo}`}
          items={itensMenu}
        />
      </div>
    </li>
  );
}

function Lista({
  contents,
  noBloco = false,
  posicoes,
  ...props
}: PropsDaLinha & { contents: readonly Content[]; noBloco?: boolean; posicoes: ReadonlyMap<string, number> }) {
  if (contents.length === 0) return null;
  return (
    <ul>
      {contents.map((content, indice) => (
        <LinhaConteudo
          key={content.id}
          content={content}
          noBloco={noBloco}
          lista={contents}
          indice={indice}
          numero={posicoes.get(content.id) ?? indice + 1}
          {...props}
        />
      ))}
    </ul>
  );
}

function BlocoSoRede({
  bloco,
  aberto,
  onToggle,
  filtrando,
  posicoes,
  ...props
}: PropsDaLinha & { bloco: BlocoRede; aberto: boolean; onToggle: () => void; filtrando: boolean; posicoes: ReadonlyMap<string, number> }) {
  const corpoId = useId();
  return (
    <div className="border-t border-dashed border-[var(--border-strong)]">
      <div className="flex min-h-11 items-center gap-2 pl-2 pr-2 sm:pl-6">
        <BotaoRecolher aberta={aberto} controla={corpoId} onToggle={onToggle} />
        <PlatformIcon platform={bloco.rede} className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
        <Text variant="bodyStrong" as="span" className="min-w-0 truncate">{bloco.rotulo}</Text>
        <Text variant="meta" as="span" className="shrink-0">
          {filtrando && bloco.contents.length !== bloco.total ? `${bloco.contents.length} de ${bloco.total}` : bloco.total}
        </Text>
      </div>
      {aberto ? (
        <div id={corpoId}>
          <Lista contents={bloco.contents} noBloco posicoes={posicoes} {...props} />
        </div>
      ) : null}
    </div>
  );
}

function CabecalhoDoGrupo({
  grupo,
  aberto,
  controla,
  onToggle,
  onNovo,
  filtrando,
  serieDaPagina,
  series,
  celular,
  menu,
  marcacao,
  postados,
  totalNoGrupo,
}: {
  grupo: GrupoConteudos;
  aberto: boolean;
  controla: string;
  onToggle: () => void;
  onNovo?: () => void;
  filtrando: boolean;
  serieDaPagina: string;
  series: readonly Serie[];
  celular: boolean;
  menu: MoreMenuItem[];
  marcacao?: { estado: EstadoMarcacao; onToggle: () => void };
  postados: number;
  totalNoGrupo: number;
}) {
  const linkDoTitulo = grupo.temporada
    ? `/series/${serieDaPagina}/temporadas/${grupo.temporada.id}`
    : grupo.filhoId ? `/series/${grupo.filhoId}` : null;
  const focoDaTemporada = normalizarRedesPostIt(grupo.temporada?.focoRedes ?? []);
  const focoDoQuadro = grupo.filhoId
    ? normalizarRedesPostIt(series.find(item => item.id === grupo.filhoId)?.focoRedes ?? [])
    : [];
  const foco = focoDaTemporada.length > 0 ? focoDaTemporada : focoDoQuadro;

  const contagemRotulo = contagemDoGrupo(grupo.visiveis, grupo.total, filtrando);

  if (celular) {
    const rotuloExibicao = grupo.id === 'temp:none'
      ? 'CONTEÚDOS DIRETOS DA SÉRIE (SEM TEMPORADA)'
      : grupo.rotulo.toUpperCase();

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {marcacao ? (
            <CaixaMarcacao estado={marcacao.estado} rotulo={`Selecionar os episódios exibidos de ${grupo.rotulo}`} onToggle={marcacao.onToggle} className="-ml-2" />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {linkDoTitulo ? (
                <Link
                  to={linkDoTitulo}
                  className="min-w-0 hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Text variant="itemTitle" as="span" className="text-[var(--text-primary)]">
                    {rotuloExibicao}
                  </Text>
                </Link>
              ) : (
                <Text variant="itemTitle" as="span" className="min-w-0 text-[var(--text-primary)]">
                  {rotuloExibicao}
                </Text>
              )}
              <Badge variant="neutral">
                {contagemRotulo}
              </Badge>
              {foco.length > 0 ? <PlatformIcons redes={foco} max={6} /> : null}
            </div>
            {foco.length > 0 ? (
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">{rotuloDoFoco(foco)}</Text>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNovo ? (
            <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={onNovo}>
              Novo episódio
            </AppButton>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={aberto}
            aria-controls={controla}
            aria-label={aberto ? 'Recolher' : 'Mostrar'}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {menu.length > 0 ? (
            <MoreMenu size="sm" items={menu} label={`Mais opções de ${grupo.rotulo}`} />
          ) : null}
        </div>
      </div>
    );
  }

  const arquivada = grupo.temporada?.status === 'arquivada';
  const concluida = totalNoGrupo > 0 && postados === totalNoGrupo;
  const percentual = totalNoGrupo > 0 ? Math.round((postados / totalNoGrupo) * 100) : 0;
  const tituloDesktop = grupo.id === 'temp:none'
    ? 'Conteúdos diretos da série (sem temporada)'
    : grupo.rotulo;
  const textoAcaoNovo = grupo.temporada
    ? 'Episódio nesta temporada'
    : grupo.filhoId
      ? 'Episódio neste quadro'
      : 'Novo episódio';

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface-subtle) 55%, var(--bg-elevated))',
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={aberto}
          aria-controls={controla}
          aria-label={aberto ? 'Recolher grupo' : 'Expandir grupo'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          {aberto ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        </button>

        {marcacao ? (
          <CaixaMarcacao
            estado={marcacao.estado}
            rotulo={`Selecionar os episódios exibidos de ${grupo.rotulo}`}
            onToggle={marcacao.onToggle}
            className="-ml-1"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {linkDoTitulo ? (
              <Link
                to={linkDoTitulo}
                className="min-w-0 hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Text variant="sectionTitle" as="h2" className="truncate text-[var(--text-primary)]">
                  {tituloDesktop}
                </Text>
              </Link>
            ) : (
              <Text variant="sectionTitle" as="h2" className="min-w-0 truncate text-[var(--text-primary)]">
                {tituloDesktop}
              </Text>
            )}

            {arquivada ? (
              <Badge variant="neutral">Arquivada</Badge>
            ) : concluida ? (
              <Badge variant="success">Concluída · 100%</Badge>
            ) : null}

            {filtrando ? (
              <Badge variant="neutral">{contagemRotulo}</Badge>
            ) : null}

            {foco.length > 0 ? <PlatformIcons redes={foco} max={6} /> : null}
          </div>

          {grupo.temporada?.descricao?.trim() ? (
            <Text variant="meta" as="p" className="mt-0.5 truncate text-[var(--text-secondary)]">
              {grupo.temporada.descricao.trim()}
            </Text>
          ) : foco.length > 0 ? (
            <Text variant="meta" as="p" className="mt-0.5 text-[var(--text-secondary)]">
              {rotuloDoFoco(foco)}
            </Text>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {totalNoGrupo > 0 ? (
          arquivada || concluida ? (
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--status-posted)]" aria-hidden />
              <Text variant="meta" as="span" className="tabular-nums text-[var(--text-secondary)]">
                {`${postados} de ${totalNoGrupo} publicados`}
              </Text>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Text variant="meta" as="span" className="tabular-nums text-[var(--text-secondary)]">
                {`Progresso: `}
                <strong className="t-label text-[var(--text-primary)]">{`${postados} de ${totalNoGrupo}`}</strong>
              </Text>
              <div
                className="h-1.5 w-24 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--border-color)]"
                aria-hidden
              >
                <div
                  className="h-full rounded-[var(--radius-pill)] bg-[var(--brand-accent-strong)] transition-all duration-300"
                  style={{ width: `${percentual}%` }}
                />
              </div>
            </div>
          )
        ) : (
          <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
            0 episódios
          </Text>
        )}

        {onNovo ? (
          <>
            <span className="hidden h-4 w-px bg-[var(--border-color)] sm:block" aria-hidden />
            <AppButton
              variant="secondary"
              size="xs"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={onNovo}
            >
              {textoAcaoNovo}
            </AppButton>
          </>
        ) : null}

        {menu.length > 0 ? (
          <MoreMenu size="sm" items={menu} label={`Mais opções de ${grupo.rotulo}`} />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Conteúdos da página em grupos que abrem e fecham (por temporada, quadro ou rede).
 * Quadros e temporadas são só a forma de organizar: criar, editar e excluir sai do menu do grupo.
 */
export function SeriesGruposLista({
  grupos,
  agruparPor,
  serieDaPagina,
  temQuadros = false,
  series,
  tipos,
  temporadas,
  contas,
  celular,
  filtrando,
  estaAberta,
  alternar,
  acoes,
  selecao,
  rodape,
}: {
  grupos: readonly GrupoConteudos[];
  agruparPor: AgruparLista;
  serieDaPagina: string;
  temQuadros?: boolean;
  series: readonly Serie[];
  tipos: ReadonlyMap<string, SerieTipoAgrupamento>;
  temporadas: readonly Temporada[];
  contas: readonly Platform[];
  celular: boolean;
  filtrando: boolean;
  estaAberta: (id: string, padrao: boolean) => boolean;
  alternar: (id: string, padrao: boolean) => void;
  acoes: AcoesDosGrupos;
  selecao: SelecaoDaLista;
  /** Na família, "+ Nova série" no fim da lista. */
  rodape?: ReactNode;
}) {
  const unico = grupos.length === 1 && (grupos[0].id === 'direto' || grupos[0].id === 'todos');

  return (
    <div className="stack-lg">
      {grupos.map((grupo) => {
        const padrao = grupo.temporada?.status !== 'arquivada';
        return (
          <Grupo
            key={grupo.id}
            grupo={grupo}
            semCabecalho={false}
            aberto={unico || filtrando || estaAberta(grupo.id, padrao)}
            onToggle={() => alternar(grupo.id, padrao)}
            tipoDoFilho={grupo.filhoId ? tipos.get(grupo.filhoId) ?? 'quadro' : null}
            serieDaPagina={serieDaPagina}
            filtrando={filtrando}
            estaAberta={estaAberta}
            alternar={alternar}
            linha={{ grupo, agruparPor, serieDaPagina, temQuadros, series, temporadas, contas, celular, acoes, selecao }}
          />
        );
      })}
      {rodape ? (
        <div className="flex flex-wrap items-center gap-2 pt-2">{rodape}</div>
      ) : null}
    </div>
  );
}

function Grupo({
  grupo,
  semCabecalho,
  aberto,
  onToggle,
  tipoDoFilho,
  serieDaPagina,
  filtrando,
  estaAberta,
  alternar,
  linha,
}: {
  grupo: GrupoConteudos;
  semCabecalho: boolean;
  aberto: boolean;
  onToggle: () => void;
  tipoDoFilho: SerieTipoAgrupamento | null;
  serieDaPagina: string;
  filtrando: boolean;
  estaAberta: (id: string, padrao: boolean) => boolean;
  alternar: (id: string, padrao: boolean) => void;
  linha: PropsDaLinha;
}) {
  const corpoId = useId();
  const { acoes, selecao, celular } = linha;
  const recebeConteudo = !grupo.foraDoEscopo;
  const menu: MoreMenuItem[] = [
    ...(recebeConteudo ? [
      { label: 'Novo episódio aqui', onClick: () => acoes.onNovo(grupo.serieId, grupo.temporadaId) },
      { label: 'Adicionar em massa aqui', onClick: () => acoes.onBulk(grupo.serieId, grupo.temporadaId) },
    ] : []),
    ...(celular && grupo.total > 0 && !selecao.ativa ? [{ label: 'Selecionar', onClick: () => selecao.entrar() }] : []),
    ...(grupo.filhoId ? [{ label: `Configurar ${tipoDoFilho === 'serie' ? 'série' : 'quadro'}`, onClick: () => acoes.onConfigurar(grupo.filhoId as string) }] : []),
    ...(grupo.temporada ? [
      { label: 'Editar temporada', onClick: () => acoes.onEditarTemporada(grupo.temporada as Temporada) },
      { label: 'Excluir temporada', tone: 'danger' as const, onClick: () => acoes.onExcluirTemporada(grupo.temporada as Temporada) },
    ] : []),
  ];
  const vazio = grupo.contents.length === 0 && grupo.blocos.length === 0;
  const exibidos = useMemo(() => exibidosDoGrupo(grupo), [grupo]);
  const postadosNoGrupo = useMemo(
    () => exibidos.filter(isPostedContent).length,
    [exibidos],
  );
  // O número é a posição na página: postados na sequência da postagem, depois a ordem ajustável. O bloco "YouTube longo" não renumera.
  const posicoes = useMemo(() => {
    const manual = ordenarParaExibir(exibidos, 'manual');
    return new Map(manual.map((item, indice) => [item.id, indice + 1]));
  }, [exibidos]);

  return (
    <section
      className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]"
      aria-label={grupo.rotulo}
    >
      {semCabecalho ? null : (
        <CabecalhoDoGrupo
          grupo={grupo}
          aberto={aberto}
          controla={corpoId}
          onToggle={onToggle}
          onNovo={recebeConteudo ? () => acoes.onNovo(grupo.serieId, grupo.temporadaId) : undefined}
          filtrando={filtrando}
          serieDaPagina={serieDaPagina}
          series={linha.series}
          celular={celular}
          menu={menu}
          postados={postadosNoGrupo}
          totalNoGrupo={exibidos.length}
          marcacao={(!celular || selecao.ativa) && exibidos.length > 0 ? {
            estado: estadoDaMarcacao(exibidos.map(content => content.id), selecao.ids),
            onToggle: () => selecao.alternarVarios(exibidos.map(content => content.id)),
          } : undefined}
        />
      )}
      {aberto ? (
        <div id={corpoId}>
          {grupo.foraDoEscopo ? (
            <Text variant="meta" as="p" className="border-t border-[var(--border-color)] py-2 pl-4 pr-3 sm:pl-6">
              Estes conteúdos estão numa temporada de outro agrupamento. Mova para uma temporada desta série.
            </Text>
          ) : null}
          {vazio ? (
            <div className="border-t border-[var(--border-color)] p-4 sm:p-6">
              <div className="rounded-[var(--radius-input)] bg-[var(--surface-subtle)] p-6 text-center">
                <Text variant="secondary" as="p" className="italic">
                  {filtrando ? 'Nenhum episódio encontrado aqui com o filtro ativo.' : 'Nenhum episódio ainda.'}
                </Text>
              </div>
            </div>
          ) : null}
          <Lista contents={grupo.contents} posicoes={posicoes} {...linha} />
          {grupo.blocos.map(bloco => (
            <BlocoSoRede
              key={bloco.id}
              bloco={bloco}
              posicoes={posicoes}
              aberto={filtrando || estaAberta(bloco.id, true)}
              onToggle={() => alternar(bloco.id, true)}
              filtrando={filtrando}
              {...linha}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
