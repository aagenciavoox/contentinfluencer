import { useId, useMemo, useRef, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronUp, FileText, Lightbulb, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { MoreMenu, type MoreMenuItem } from '../../../../components/ui/MoreMenu';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { PlatformIcons } from '../../../../components/ui/PlatformIcons';
import { Text } from '../../../../components/ui/Text';
import type { Content, Platform, Serie, SerieTipoAgrupamento, Temporada } from '../../../../lib/database';
import { diaNumerico } from '../../../../lib/dates';
import { getStatusColorVar } from '../../../../lib/statusClasses';
import { cn } from '../../../../lib/utils';
import { getDisplayStatus, getDisplayStatusLabel } from '../../../contents/lib/contentPipeline';
import { redesDoItemDeCriacao } from '../../../creation/lib/creationRedeFilter';
import { cicloDaPublicacao } from '../../../editorial/lib/cicloPublicacao';
import { publicacaoAtiva } from '../../../editorial/lib/publicacaoSituacao';
import { TIPO_AGRUPAMENTO_LABEL, ehIdeia, textoConteudos } from '../../lib/serieAgrupamento';
import type { BlocoRede, GrupoConteudos } from '../../lib/seriesGrupos';
import { contagemDoGrupo, exibidosDoGrupo, ordenarLista, type AgruparLista } from '../../lib/seriesLista';
import { destinoDoConteudo } from '../../lib/seriesSecoes';
import { estadoDaMarcacao, type EstadoMarcacao } from '../../lib/selecaoEpisodios';
import { CaixaMarcacao } from './SeriesAcoesEmMassa';

export type AcoesDosGrupos = {
  /** Endereço do conteúdo, com a volta para esta página. */
  rotaDoConteudo: (content: Content) => { to: string; state: unknown };
  onCopiarLink: (content: Content) => void;
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

/** Redes marcadas no ciclo atual. YouTube longo e Shorts ficam com ícones diferentes. */
function redesSelecionadas(content: Content, contas: readonly Platform[]) {
  const ativas = (content.plataformas ?? []).filter(publicacaoAtiva);
  const ciclo = ativas.reduce((maior, item) => Math.max(maior, cicloDaPublicacao(item)), 1);
  const doCiclo = ativas.filter(item => cicloDaPublicacao(item) === ciclo);
  return redesDoItemDeCriacao({ ...content, plataformas: doCiclo }, contas);
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
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  contas: readonly Platform[];
  celular: boolean;
  acoes: AcoesDosGrupos;
  selecao: SelecaoDaLista;
  /** Número da posição na ordem manual. Some nas outras ordenações. */
  numerar: boolean;
};

function LinhaConteudo({
  content,
  noBloco,
  grupo,
  agruparPor,
  series,
  temporadas,
  contas,
  celular,
  acoes,
  selecao,
  numerar,
  lista,
  indice,
  numero,
}: PropsDaLinha & { content: Content; noBloco: boolean; lista: readonly Content[]; indice: number; numero: number }) {
  const titulo = content.title?.trim() || 'Sem título';
  const etapa = getDisplayStatusLabel(content);
  const destino = destinoDoConteudo(content, contas);
  const dono = content.seriesId && content.seriesId !== grupo.serieId
    ? series.find(item => item.id === content.seriesId)?.name?.trim()
    : null;
  const temporada = agruparPor !== 'temporada' && content.temporadaId
    ? temporadas.find(item => item.id === content.temporadaId)?.nome ?? null
    : null;
  const etiquetas = [dono, temporada].filter(Boolean).join(' · ');
  const marcada = selecao.ids.has(content.id);
  const Icone = ehIdeia(content) ? Lightbulb : FileText;
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
      variant={ehIdeia(content) ? 'warning' : 'success'}
      className="uppercase shrink-0"
    >
      {ehIdeia(content) ? 'IDEIA' : 'ROTEIRO'}
    </Badge>
  );
  const dataFormatada = diaNumerico(content.publishDate || content.createdAt);
  const redes = redesSelecionadas(content, contas);
  const podeMover = Boolean(acoes.onMoverEpisodio) && !selecao.ativa && lista.length > 1;

  return (
    <li
      className={cn(
        'relative flex min-h-12 items-center justify-between gap-3 border-t border-[var(--border-color)] px-4 py-3 hover:bg-[var(--bg-hover)]',
        noBloco && 'pl-8 sm:pl-16',
        marcada && 'bg-[var(--bg-hover)]',
        celular && 'select-none [-webkit-touch-callout:none]',
      )}
      onPointerDown={event => {
        if (!celular || selecao.ativa || event.pointerType === 'mouse') return;
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
        if (celular) event.preventDefault();
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

      {/* Lado Esquerdo: Badge + Título */}
      <div className="pointer-events-none relative z-[1] flex min-w-0 flex-1 items-center gap-3">
        {!celular || selecao.ativa ? (
          <span className="pointer-events-auto">
            <CaixaSelecao
              marcada={marcada}
              titulo={titulo}
              onToggle={() => (selecao.ativa ? selecao.alternar(content.id) : selecao.entrar(content.id))}
            />
          </span>
        ) : null}

        {numerar ? (
          <Text variant="meta" as="span" className="min-w-6 shrink-0 text-right tabular-nums text-[var(--text-secondary)]">
            {numero}.
          </Text>
        ) : null}

        {pontoEtapa}

        <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)] truncate">
          {titulo}
        </Text>
      </div>

      {/* Lado Direito: redes escolhidas, data e ações */}
      <div className="relative z-[2] flex shrink-0 items-center gap-3 sm:gap-4">
        {podeMover ? (
          <div className="hidden items-center gap-0.5 sm:flex">
            <AppButton
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Subir episódio"
              title="Subir episódio"
              disabled={indice === 0}
              onClick={() => acoes.onMoverEpisodio?.(lista, content, 'subir')}
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Descer episódio"
              title="Descer episódio"
              disabled={indice === lista.length - 1}
              onClick={() => acoes.onMoverEpisodio?.(lista, content, 'descer')}
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </AppButton>
          </div>
        ) : null}
        {redes.length > 0 ? <PlatformIcons redes={redes} max={5} size="md" className="shrink-0" /> : null}
        <Text variant="meta" as="span">{dataFormatada}</Text>
        <MoreMenu
          size="sm"
          label={`Mais opções de ${titulo}`}
          items={[
            ...(podeMover ? [
              { label: 'Subir', disabled: indice === 0, onClick: () => acoes.onMoverEpisodio?.(lista, content, 'subir') },
              { label: 'Descer', disabled: indice === lista.length - 1, onClick: () => acoes.onMoverEpisodio?.(lista, content, 'descer') },
            ] : []),
            ...(celular ? [{ label: 'Selecionar', onClick: () => selecao.entrar(content.id) }] : []),
            { label: 'Abrir no editor', onClick: () => navigate(rota.to, { state: rota.state }) },
            { label: 'Copiar link', onClick: () => acoes.onCopiarLink(content) },
          ]}
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
  tipoDoFilho,
  filtrando,
  serieDaPagina,
  menu,
  marcacao,
}: {
  grupo: GrupoConteudos;
  aberto: boolean;
  controla: string;
  onToggle: () => void;
  onNovo?: () => void;
  tipoDoFilho: SerieTipoAgrupamento | null;
  filtrando: boolean;
  serieDaPagina: string;
  menu: MoreMenuItem[];
  marcacao?: { estado: EstadoMarcacao; onToggle: () => void };
}) {
  const linkDoTitulo = grupo.temporada
    ? `/series/${serieDaPagina}/temporadas/${grupo.temporada.id}`
    : grupo.filhoId ? `/series/${grupo.filhoId}` : null;

  const rotuloExibicao = grupo.id === 'temp:none'
    ? 'CONTEÚDOS DIRETOS DA SÉRIE (SEM TEMPORADA)'
    : grupo.rotulo.toUpperCase();

  // Criar daqui já deixa o episódio nesta divisão (temporada, quadro ou direto na série).
  const textoAcaoNovo = 'Novo episódio';

  // Com filtro: "3 de 8 episódios".
  const contagemRotulo = contagemDoGrupo(grupo.visiveis, grupo.total, filtrando);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {marcacao ? (
          <CaixaMarcacao estado={marcacao.estado} rotulo={`Selecionar os episódios exibidos de ${grupo.rotulo}`} onToggle={marcacao.onToggle} className="-ml-2" />
        ) : null}
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
      </div>

      <div className="flex items-center gap-2">
        {onNovo ? (
          <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={onNovo}>
            {textoAcaoNovo}
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

/**
 * Conteúdos da página em grupos que abrem e fecham (por temporada, quadro ou rede).
 * Quadros e temporadas são só a forma de organizar: criar, editar e excluir sai do menu do grupo.
 */
export function SeriesGruposLista({
  grupos,
  agruparPor,
  serieDaPagina,
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
  numerar,
  rodape,
}: {
  grupos: readonly GrupoConteudos[];
  agruparPor: AgruparLista;
  serieDaPagina: string;
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
  /** Numera a posição quando a lista está na ordem manual — a mesma numeração do Puxar. */
  numerar: boolean;
  /** "+ Nova temporada · + Novo quadro", no fim da lista. */
  rodape?: ReactNode;
}) {
  const primeiraComConteudo = grupos.findIndex(grupo => grupo.total > 0);
  const unico = grupos.length === 1 && (grupos[0].id === 'direto' || grupos[0].id === 'todos');

  return (
    <div className="stack-md">
      {grupos.map((grupo, indice) => {
        const padrao = true;
        return (
          <Grupo
            key={grupo.id}
            grupo={grupo}
            primeiro={indice === 0}
            semCabecalho={false}
            aberto={unico || filtrando || estaAberta(grupo.id, padrao)}
            onToggle={() => alternar(grupo.id, padrao)}
            tipoDoFilho={grupo.filhoId ? tipos.get(grupo.filhoId) ?? 'quadro' : null}
            serieDaPagina={serieDaPagina}
            filtrando={filtrando}
            estaAberta={estaAberta}
            alternar={alternar}
            linha={{ grupo, agruparPor, series, temporadas, contas, celular, acoes, selecao, numerar }}
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
  primeiro,
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
  primeiro: boolean;
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
      { label: 'Novo conteúdo aqui', onClick: () => acoes.onNovo(grupo.serieId, grupo.temporadaId) },
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
  // O número é a posição na ordem manual do grupo, a mesma que o Puxar mostra. O bloco "YouTube longo" não renumera.
  const posicoes = useMemo(() => {
    const manual = ordenarLista(
      [...grupo.contents, ...grupo.blocos.flatMap(bloco => bloco.contents)],
      'manual',
    );
    return new Map(manual.map((item, indice) => [item.id, indice + 1]));
  }, [grupo]);

  return (
    <section
      className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-sm"
      aria-label={grupo.rotulo}
    >
      {semCabecalho ? null : (
        <CabecalhoDoGrupo
          grupo={grupo}
          aberto={aberto}
          controla={corpoId}
          onToggle={onToggle}
          onNovo={recebeConteudo ? () => acoes.onNovo(grupo.serieId, grupo.temporadaId) : undefined}
          tipoDoFilho={tipoDoFilho}
          filtrando={filtrando}
          serieDaPagina={serieDaPagina}
          menu={menu}
          marcacao={(!celular || selecao.ativa) && exibidosDoGrupo(grupo).length > 0 ? {
            estado: estadoDaMarcacao(exibidosDoGrupo(grupo).map(content => content.id), selecao.ids),
            onToggle: () => selecao.alternarVarios(exibidosDoGrupo(grupo).map(content => content.id)),
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
