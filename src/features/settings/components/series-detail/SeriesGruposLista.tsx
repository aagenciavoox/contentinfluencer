import { useId, useRef, type ReactNode } from 'react';
import { Check, ChevronDown, FileText, Lightbulb, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { MoreMenu, type MoreMenuItem } from '../../../../components/ui/MoreMenu';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { Text } from '../../../../components/ui/Text';
import type { Content, Platform, Serie, SerieTipoAgrupamento, Temporada } from '../../../../lib/database';
import { getStatusColorVar } from '../../../../lib/statusClasses';
import { cn } from '../../../../lib/utils';
import { getDisplayStatus, getDisplayStatusLabel } from '../../../contents/lib/contentPipeline';
import { REDE_ROTULO } from '../../../contas/lib/contas';
import { TIPO_AGRUPAMENTO_LABEL, ehIdeia, textoConteudos } from '../../lib/serieAgrupamento';
import type { AgruparPor, BlocoRede, GrupoConteudos } from '../../lib/seriesGrupos';
import { destinoDoConteudo } from '../../lib/seriesSecoes';

export type AcoesDosGrupos = {
  /** Endereço do conteúdo, com a volta para esta página. */
  rotaDoConteudo: (content: Content) => { to: string; state: unknown };
  onCopiarLink: (content: Content) => void;
  onNovo: (serieId: string, temporadaId: string | null) => void;
  onBulk: (serieId: string, temporadaId: string | null) => void;
  onConfigurar: (serieId: string) => void;
  onEditarTemporada: (temporada: Temporada) => void;
  onExcluirTemporada: (temporada: Temporada) => void;
};

export type SelecaoDaLista = {
  ativa: boolean;
  ids: ReadonlySet<string>;
  alternar: (id: string) => void;
  /** Entra no modo seleção; com id, já marca o conteúdo. */
  entrar: (id?: string) => void;
};

/** Segurar o dedo por este tempo entra no modo seleção. */
const TOQUE_LONGO_MS = 450;

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
  agruparPor: AgruparPor;
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  contas: readonly Platform[];
  celular: boolean;
  acoes: AcoesDosGrupos;
  selecao: SelecaoDaLista;
  /** No celular as redes só aparecem quando fogem das de costume. */
  redesForaDoPadrao: (content: Content) => boolean;
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
  redesForaDoPadrao,
}: PropsDaLinha & { content: Content; noBloco: boolean }) {
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

  // Segurar o dedo entra no modo seleção, sem abrir o conteúdo.
  const toqueLongo = useRef<{ timer: number; x: number; y: number } | null>(null);
  const ignorarClique = useRef(false);
  const cancelarToque = () => {
    if (toqueLongo.current) window.clearTimeout(toqueLongo.current.timer);
    toqueLongo.current = null;
  };

  const pontoEtapa = (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: getStatusColorVar(getDisplayStatus(content)) }}
      />
      <Text variant="secondary" as="span" className="truncate text-[var(--text-primary)]">{etapa}</Text>
    </span>
  );
  const redesNoCelular = !noBloco && destino.rotulo && redesForaDoPadrao(content) ? `só ${destino.rotulo}` : null;

  return (
    <li
      className={cn(
        'relative flex min-h-12 items-center gap-3 border-t border-[var(--border-color)] py-2 pr-2 hover:bg-[var(--bg-hover)]',
        noBloco ? 'pl-8 sm:pl-16' : 'pl-4 sm:pl-6',
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
      {!celular || selecao.ativa ? (
        <CaixaSelecao marcada={marcada} titulo={titulo} onToggle={() => (selecao.ativa ? selecao.alternar(content.id) : selecao.entrar(content.id))} />
      ) : null}
      <Icone className="pointer-events-none relative z-[1] h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
      <span className="pointer-events-none relative z-[1] min-w-0 flex-1">
        <Text variant="body" as="span" className="block truncate">{titulo}</Text>
        {!celular && etiquetas ? <Text variant="meta" as="span" className="block truncate">{etiquetas}</Text> : null}
        {celular ? (
          <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2">
            {pontoEtapa}
            <Text variant="meta" as="span" className="min-w-0 truncate">
              {[etiquetas, redesNoCelular, destino.progresso].filter(Boolean).join(' · ')}
            </Text>
          </span>
        ) : null}
      </span>
      {celular ? null : (
        <>
          <span className="pointer-events-none relative z-[1] w-36 shrink-0">{pontoEtapa}</span>
          <span className="pointer-events-none relative z-[1] w-48 shrink-0 lg:w-56">
            <Text
              variant={noBloco ? 'meta' : 'secondary'}
              as="span"
              className="block truncate"
            >
              {destino.rotulo || '—'}
            </Text>
            {destino.progresso ? <Text variant="meta" as="span" className="block">{destino.progresso}</Text> : null}
          </span>
        </>
      )}
      {selecao.ativa ? <span aria-hidden className="w-8 shrink-0" /> : (
        <span className="relative z-[2] shrink-0">
          <MoreMenu
            size="sm"
            label={`Mais opções de ${titulo}`}
            items={[
              ...(celular ? [{ label: 'Selecionar', onClick: () => selecao.entrar(content.id) }] : []),
              { label: 'Copiar link', onClick: () => acoes.onCopiarLink(content) },
            ]}
          />
        </span>
      )}
    </li>
  );
}

function Lista({ contents, noBloco = false, ...props }: PropsDaLinha & { contents: readonly Content[]; noBloco?: boolean }) {
  if (contents.length === 0) return null;
  return (
    <ul>
      {contents.map(content => (
        <LinhaConteudo key={content.id} content={content} noBloco={noBloco} {...props} />
      ))}
    </ul>
  );
}

function BlocoSoRede({
  bloco,
  aberto,
  onToggle,
  filtrando,
  ...props
}: PropsDaLinha & { bloco: BlocoRede; aberto: boolean; onToggle: () => void; filtrando: boolean }) {
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
          <Lista contents={bloco.contents} noBloco {...props} />
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
  tipoDoFilho,
  filtrando,
  serieDaPagina,
  menu,
}: {
  grupo: GrupoConteudos;
  aberto: boolean;
  controla: string;
  onToggle: () => void;
  tipoDoFilho: SerieTipoAgrupamento | null;
  filtrando: boolean;
  serieDaPagina: string;
  menu: MoreMenuItem[];
}) {
  const linkDoTitulo = grupo.temporada
    ? `/series/${serieDaPagina}/temporadas/${grupo.temporada.id}`
    : grupo.filhoId ? `/series/${grupo.filhoId}` : null;
  const titulo = linkDoTitulo ? (
    <Link
      to={linkDoTitulo}
      className="min-w-0 rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <Text variant="itemTitle" as="span">{grupo.rotulo}</Text>
    </Link>
  ) : (
    <Text variant="itemTitle" as="span" className="min-w-0">{grupo.rotulo}</Text>
  );
  const contagem = filtrando && grupo.visiveis !== grupo.total
    ? `${grupo.visiveis} de ${textoConteudos(grupo.total)}`
    : textoConteudos(grupo.total);
  // Fechado, o grupo avisa o que está nos blocos para não ficar esquecido.
  const nosBlocos = aberto ? [] : grupo.blocos.map(bloco => `${bloco.total} só ${REDE_ROTULO[bloco.rede]}`);
  return (
    <div className="flex min-h-12 items-center gap-2 bg-[var(--bg-hover)]/40 pl-2 pr-2">
      <BotaoRecolher aberta={aberto} controla={controla} onToggle={onToggle} />
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
        {titulo}
        <Text variant="meta" as="span" className="shrink-0">
          {[tipoDoFilho ? TIPO_AGRUPAMENTO_LABEL[tipoDoFilho] : null, contagem, ...nosBlocos].filter(Boolean).join(' · ')}
        </Text>
      </span>
      {menu.length > 0 ? <MoreMenu size="sm" items={menu} label={`Mais opções de ${grupo.rotulo}`} /> : null}
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
  redesForaDoPadrao,
  rodape,
}: {
  grupos: readonly GrupoConteudos[];
  agruparPor: AgruparPor;
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
  redesForaDoPadrao: (content: Content) => boolean;
  /** "+ Nova temporada · + Novo quadro", no fim da lista. */
  rodape?: ReactNode;
}) {
  const primeiraComConteudo = grupos.findIndex(grupo => grupo.total > 0);
  const unico = grupos.length === 1 && grupos[0].id === 'direto';

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
      {celular ? null : (
        <div aria-hidden className="flex items-center gap-3 border-b border-[var(--border-color)] py-2 pl-6 pr-2">
          <span className="w-4 shrink-0" />
          <span className="w-4 shrink-0" />
          <Text variant="label" as="span" className="flex-1 text-[var(--text-tertiary)]">Título</Text>
          <Text variant="label" as="span" className="w-36 shrink-0 text-[var(--text-tertiary)]">Etapa</Text>
          <Text variant="label" as="span" className="w-48 shrink-0 text-[var(--text-tertiary)] lg:w-56">Redes</Text>
          <span className="w-8 shrink-0" />
        </div>
      )}
      {grupos.map((grupo, indice) => {
        const padrao = indice === primeiraComConteudo;
        return (
          <Grupo
            key={grupo.id}
            grupo={grupo}
            primeiro={indice === 0}
            semCabecalho={unico}
            aberto={unico || filtrando || estaAberta(grupo.id, padrao)}
            onToggle={() => alternar(grupo.id, padrao)}
            tipoDoFilho={grupo.filhoId ? tipos.get(grupo.filhoId) ?? 'quadro' : null}
            serieDaPagina={serieDaPagina}
            filtrando={filtrando}
            estaAberta={estaAberta}
            alternar={alternar}
            linha={{ grupo, agruparPor, series, temporadas, contas, celular, acoes, selecao, redesForaDoPadrao }}
          />
        );
      })}
      {rodape ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-color)] px-3 py-2">{rodape}</div>
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
  const { acoes, selecao, celular, agruparPor } = linha;
  // Por rede, conteúdo novo não cairia no grupo: o menu fica só com o que faz sentido.
  const recebeConteudo = agruparPor !== 'rede' && !grupo.foraDoEscopo;
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

  return (
    <section className={cn(!primeiro && 'border-t border-[var(--border-color)]')} aria-label={grupo.rotulo}>
      {semCabecalho ? null : (
        <CabecalhoDoGrupo
          grupo={grupo}
          aberto={aberto}
          controla={corpoId}
          onToggle={onToggle}
          tipoDoFilho={tipoDoFilho}
          filtrando={filtrando}
          serieDaPagina={serieDaPagina}
          menu={menu}
        />
      )}
      {aberto ? (
        <div id={corpoId} className={cn(semCabecalho && '[&>ul:first-child>li:first-child]:border-t-0')}>
          {grupo.foraDoEscopo ? (
            <Text variant="meta" as="p" className="border-t border-[var(--border-color)] py-2 pl-4 pr-3 sm:pl-6">
              Estes conteúdos estão numa temporada de outro agrupamento. Mova para uma temporada desta série.
            </Text>
          ) : null}
          {vazio ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border-color)] py-2 pl-4 pr-3 sm:pl-6">
              <Text variant="secondary" as="span">Nenhum conteúdo aqui ainda.</Text>
              {recebeConteudo ? (
                <AppButton
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => acoes.onNovo(grupo.serieId, grupo.temporadaId)}
                >
                  Novo conteúdo aqui
                </AppButton>
              ) : null}
            </div>
          ) : null}
          <Lista contents={grupo.contents} {...linha} />
          {grupo.blocos.map(bloco => (
            <BlocoSoRede
              key={bloco.id}
              bloco={bloco}
              // O bloco começa aberto; se a pessoa fechar, a página lembra.
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
