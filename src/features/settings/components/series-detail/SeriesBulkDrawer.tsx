import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { RichTextEditor } from '../../../../components/editors/RichTextEditor';
import { Drawer } from '../../../../components/overlays/Drawer';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { MoreMenu } from '../../../../components/ui/MoreMenu';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import type { Content, Platform, Serie, Temporada } from '../../../../lib/database';
import { notifySaveFeedback } from '../../../../lib/saveFeedback';
import { getStatusColorVar } from '../../../../lib/statusClasses';
import { cn } from '../../../../lib/utils';
import { generateUUID } from '../../../../utils/uuid';
import { CONTENT_STATUS } from '../../../contents/lib/contentPipeline';
import { destinosPadraoAtivos, publicacoesDosDestinos, type DestinoPlataforma } from '../../../editorial/lib/destinations';
import { filhosDaSerie } from '../../../editorial/lib/serieArvore';
import { plural } from '../../lib/serieAgrupamento';
import {
  adicionarBloco,
  alterarBloco,
  aplicarComum,
  aplicarContextoNoRascunho,
  apagarRascunhoMassa,
  blocosPendentes,
  blocosSemTitulo,
  comumPadrao,
  conteudoDoBloco,
  gravarRascunhoMassa,
  lerRascunhoMassa,
  marcarCriados,
  moverBloco,
  resumoDosPendentes,
  type BlocoMassa,
  type ModoBloco,
  type RascunhoMassa,
} from '../../lib/seriesBulkDraft';

export type PedidoMassa = {
  /** Muda a cada abertura (a chave da navegação). */
  nonce: string | number;
  origem: 'massa' | 'grupo';
  serieId: string;
  temporadaId: string | null;
};

const inputClass =
  'ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

function opcoesQuadro(serieId: string, series: readonly Serie[]) {
  const self = series.find(item => item.id === serieId);
  const opcoes = self ? [{ value: self.id, label: `Direto em ${self.name?.trim() || 'Série'}` }] : [];
  const caminhar = (id: string, prefixo: string) => {
    for (const filho of filhosDaSerie(id, series)) {
      const nome = filho.name?.trim() || 'Quadro';
      const label = prefixo ? `${prefixo} · ${nome}` : nome;
      opcoes.push({ value: filho.id, label });
      caminhar(filho.id, label);
    }
  };
  caminhar(serieId, '');
  return opcoes;
}

function catalogoDestinos(plataformas: readonly Platform[]): DestinoPlataforma[] {
  return plataformas
    .filter(plataforma => plataforma.ativo)
    .map(plataforma => ({ id: plataforma.id, nome: plataforma.nome }));
}

const ETAPAS_INICIAIS: Array<{ value: ModoBloco; label: string; status: string }> = [
  { value: 'roteiro', label: 'Roteiro', status: CONTENT_STATUS.ROTEIRO },
  { value: 'ideia', label: 'Ideia', status: CONTENT_STATUS.IDEIA },
];

function PontoEtapa({ modo }: { modo: ModoBloco }) {
  const etapa = ETAPAS_INICIAIS.find(item => item.value === modo) ?? ETAPAS_INICIAIS[0];
  return <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getStatusColorVar(etapa.status) }} />;
}

/**
 * Prepara vários conteúdos de uma vez para a série. Os valores comuns valem para o conjunto
 * e cada entrada pode ajustar os seus. Nada é gravado antes de confirmar; o rascunho fica
 * guardado nesta aba enquanto a pessoa prepara.
 */
export function SeriesBulkDrawer({
  open,
  onClose,
  seriePaginaId,
  serieNome,
  series,
  temporadas,
  plataformas,
  destinosPadrao,
  pedido,
  idsExistentes,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  seriePaginaId: string;
  serieNome: string;
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  plataformas: readonly Platform[];
  destinosPadrao: readonly string[];
  pedido: PedidoMassa | null;
  idsExistentes: ReadonlySet<string>;
  onCreate: (contents: Content[]) => Promise<void>;
}) {
  const [rascunho, setRascunho] = useState<RascunhoMassa>(() => lerRascunhoMassa(seriePaginaId));
  const [serieAtual, setSerieAtual] = useState(seriePaginaId);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [parcial, setParcial] = useState<string | null>(null);
  const [descartarAberto, setDescartarAberto] = useState(false);
  const [ajustando, setAjustando] = useState<ReadonlySet<string>>(() => new Set());
  const [arrastando, setArrastando] = useState<string | null>(null);
  const pedidoVisto = useRef<string | number | null>(null);
  const enviando = useRef(false);

  if (serieAtual !== seriePaginaId) {
    setSerieAtual(seriePaginaId);
    setRascunho(lerRascunhoMassa(seriePaginaId));
    setErro(null);
    setParcial(null);
  }

  const atualizar = (fn: (atual: RascunhoMassa) => RascunhoMassa) => {
    setRascunho(atual => {
      const next = fn(atual);
      gravarRascunhoMassa(seriePaginaId, next);
      return next;
    });
  };

  useEffect(() => {
    if (!open || !pedido || pedidoVisto.current === pedido.nonce) return;
    pedidoVisto.current = pedido.nonce;
    setErro(null);
    setParcial(null);
    setRascunho(atual => {
      const next = aplicarContextoNoRascunho(
        atual,
        { serieId: pedido.serieId, temporadaId: pedido.temporadaId },
        pedido.origem,
        generateUUID(),
      );
      gravarRascunhoMassa(seriePaginaId, next);
      return next;
    });
  }, [open, pedido, seriePaginaId]);

  const quadros = useMemo(() => opcoesQuadro(seriePaginaId, series), [seriePaginaId, series]);
  const pendentes = useMemo(
    () => blocosPendentes(rascunho.blocos, idsExistentes),
    [idsExistentes, rascunho.blocos],
  );
  const resumo = resumoDosPendentes(pendentes);
  const comum = comumPadrao(seriePaginaId, rascunho);
  const mostraQuadro = quadros.length > 1;
  const mostraTemporada = temporadas.length > 0;
  const opcoesTemporada = [
    ...temporadas.map(item => ({ value: item.id, label: item.nome })),
    { value: 'none', label: 'Sem temporada' },
  ];
  const valorQuadro = (serieId: string) =>
    (quadros.some(item => item.value === serieId) ? serieId : quadros[0]?.value || serieId);
  const opcoesTemporadaDo = (temporadaId: string | null) => (
    temporadaId && !opcoesTemporada.some(item => item.value === temporadaId)
      ? [{ value: temporadaId, label: 'Temporada de outro agrupamento' }, ...opcoesTemporada]
      : opcoesTemporada
  );

  const descartar = () => {
    apagarRascunhoMassa(seriePaginaId);
    setRascunho({ blocos: [] });
    setDescartarAberto(false);
    setErro(null);
    setParcial(null);
    onClose();
  };

  const criar = async () => {
    if (enviando.current) return;
    const semTitulo = blocosSemTitulo(rascunho.blocos);
    if (semTitulo.length > 0) {
      const numeros = semTitulo.map(bloco => rascunho.blocos.indexOf(bloco) + 1).join(', ');
      setErro(semTitulo.length === 1
        ? `Falta o título do conteúdo ${numeros}.`
        : `Faltam os títulos dos conteúdos ${numeros}.`);
      return;
    }
    if (pendentes.length === 0) {
      setErro('Dê um título a pelo menos um conteúdo.');
      return;
    }
    enviando.current = true;
    setBusy(true);
    setErro(null);
    setParcial(null);
    const feitos = new Set<string>();
    const destinos = destinosPadraoAtivos(destinosPadrao, catalogoDestinos(plataformas));
    try {
      for (const bloco of pendentes) {
        const destino = series.find(item => item.id === bloco.serieId);
        if (!destino) throw new Error('Agrupamento do conteúdo não encontrado');
        const base = conteudoDoBloco(bloco, destino, series);
        const content: Content = {
          ...base,
          plataformas: publicacoesDosDestinos({ destinos, contentId: base.id }),
        };
        await onCreate([content]);
        feitos.add(bloco.id);
      }
      apagarRascunhoMassa(seriePaginaId);
      setRascunho({ blocos: [] });
      notifySaveFeedback({
        status: 'success',
        message: pendentes.length === 1 ? 'Conteúdo criado' : `${pendentes.length} conteúdos criados`,
      });
      onClose();
    } catch (err) {
      console.error('[SeriesBulkDrawer]', err);
      atualizar(atual => ({ ...atual, blocos: marcarCriados(atual.blocos, feitos) }));
      const faltam = pendentes.length - feitos.size;
      if (feitos.size > 0) {
        setParcial(`${plural(feitos.size, 'conteúdo criado', 'conteúdos criados')}. ${plural(faltam, 'ficou de fora', 'ficaram de fora')}. Tentar de novo cria só ${faltam === 1 ? 'o que falta' : 'os que faltam'}, sem duplicar.`);
      }
      setErro('Não foi possível criar os conteúdos. Verifique a conexão e tente novamente.');
    } finally {
      enviando.current = false;
      setBusy(false);
    }
  };

  const soltarEm = (indice: number) => {
    if (!arrastando) return;
    atualizar(atual => moverBloco(atual, arrastando, indice));
    setArrastando(null);
  };

  const preparados = rascunho.blocos.filter(bloco => !bloco.criado).length;

  return (
    <>
      <Drawer open={open} onClose={onClose} widthClassName="max-w-none md:max-w-4xl">
        <OverlayHeader onClose={onClose} className="pt-safe px-4 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 pr-2">
            <div className="min-w-0">
              <Text variant="sectionTitle" as="h2">Adicionar em massa</Text>
              <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">{serieNome}</Text>
            </div>
            <span className="flex items-center gap-1">
              <Text variant="meta" as="span">{plural(preparados, 'conteúdo preparado', 'conteúdos preparados')}</Text>
              <MoreMenu
                size="sm"
                label="Mais opções do rascunho"
                items={[{
                  label: 'Descartar rascunho',
                  tone: 'danger',
                  disabled: busy || rascunho.blocos.length === 0,
                  onClick: () => setDescartarAberto(true),
                }]}
              />
            </span>
          </div>
        </OverlayHeader>

        <OverlayBody className="stack-lg px-4 md:px-6">
          <section className="stack-sm" aria-label="Aplicar aos novos conteúdos">
            <Text variant="itemTitle" as="h3">Aplicar aos novos conteúdos</Text>
            <div className={cn('grid grid-cols-1 gap-3', (mostraQuadro || mostraTemporada) && 'sm:grid-cols-3')}>
              {mostraQuadro ? (
                <label className="stack-xs">
                  <Text variant="label" as="span">Quadro</Text>
                  <SelectField
                    block
                    ariaLabel="Quadro para o conjunto"
                    value={valorQuadro(comum.serieId)}
                    onChange={serieId => atualizar(atual => aplicarComum(atual, seriePaginaId, { serieId }))}
                    options={quadros}
                    disabled={busy}
                  />
                </label>
              ) : null}
              {mostraTemporada ? (
                <label className="stack-xs">
                  <Text variant="label" as="span">Temporada</Text>
                  <SelectField
                    block
                    ariaLabel="Temporada para o conjunto"
                    value={comum.temporadaId || 'none'}
                    onChange={valor => atualizar(atual => aplicarComum(atual, seriePaginaId, { temporadaId: valor === 'none' ? null : valor }))}
                    options={opcoesTemporadaDo(comum.temporadaId)}
                    disabled={busy}
                  />
                </label>
              ) : null}
              <label className="stack-xs">
                <Text variant="label" as="span">Etapa inicial</Text>
                <SelectField
                  block
                  ariaLabel="Etapa inicial para o conjunto"
                  value={comum.modo}
                  leadingIcon={<PontoEtapa modo={comum.modo} />}
                  onChange={valor => atualizar(atual => aplicarComum(atual, seriePaginaId, { modo: valor as ModoBloco }))}
                  options={ETAPAS_INICIAIS}
                  disabled={busy}
                />
              </label>
            </div>
            <Text variant="meta" as="p">Você pode ajustar cada conteúdo antes de criar.</Text>
          </section>

          <ol className="stack-md">
            {rascunho.blocos.map((bloco, index) => (
              <EntradaMassa
                key={bloco.id}
                bloco={bloco}
                indice={index}
                total={rascunho.blocos.length}
                busy={busy}
                arrastando={arrastando}
                mostraQuadro={mostraQuadro}
                mostraTemporada={mostraTemporada}
                ajustando={ajustando.has(bloco.id)}
                quadros={quadros}
                valorQuadro={valorQuadro(bloco.serieId)}
                opcoesTemporada={opcoesTemporadaDo(bloco.temporadaId)}
                onChange={patch => atualizar(atual => alterarBloco(atual, seriePaginaId, bloco.id, patch))}
                onRecolher={() => atualizar(atual => ({
                  ...atual,
                  blocos: atual.blocos.map(item => (item.id === bloco.id ? { ...item, recolhido: !item.recolhido } : item)),
                }))}
                onMover={destino => atualizar(atual => moverBloco(atual, bloco.id, destino))}
                onRemover={() => atualizar(atual => ({ ...atual, blocos: atual.blocos.filter(item => item.id !== bloco.id) }))}
                onAjustar={() => setAjustando(atual => new Set([...atual, bloco.id]))}
                onArrastar={setArrastando}
                onSoltar={() => soltarEm(index)}
              />
            ))}
          </ol>

          <button
            type="button"
            onClick={() => atualizar(atual => adicionarBloco(atual, seriePaginaId, generateUUID()))}
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] px-4 t-button text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60 sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar conteúdo
          </button>
        </OverlayBody>

        <OverlayFooter className="pb-safe flex-wrap items-center justify-between gap-3 px-4 md:px-6">
          <div className="min-w-0 stack-xs" aria-live="polite">
            <Text variant="body" as="p">
              {resumo.conteudos === 0
                ? 'Nenhum conteúdo pronto para criar'
                : [
                  plural(resumo.conteudos, 'conteúdo', 'conteúdos'),
                  resumo.roteiros > 0 ? plural(resumo.roteiros, 'roteiro', 'roteiros') : null,
                  resumo.ideias > 0 ? plural(resumo.ideias, 'ideia', 'ideias') : null,
                ].filter(Boolean).join(' · ')}
            </Text>
            {erro ? (
              <Text variant="meta" as="p" className="text-[var(--danger)]">{erro}</Text>
            ) : parcial ? null : (
              <Text variant="meta" as="p">Os conteúdos serão criados ao confirmar.</Text>
            )}
            {parcial ? <Text variant="meta" as="p">{parcial}</Text> : null}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <AppButton variant="secondary" onClick={onClose} disabled={busy} className="flex-1 sm:flex-none">
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              onClick={() => void criar()}
              disabled={busy || resumo.conteudos === 0}
              className="flex-1 sm:flex-none"
            >
              {busy
                ? 'Criando…'
                : parcial
                  ? 'Tentar novamente'
                  : resumo.conteudos === 0
                    ? 'Criar conteúdos'
                    : resumo.conteudos === 1 ? 'Criar 1 conteúdo' : `Criar ${resumo.conteudos} conteúdos`}
            </AppButton>
          </div>
        </OverlayFooter>
      </Drawer>
      <ConfirmModal
        open={descartarAberto}
        message="Descartar este rascunho? Os conteúdos que ainda não foram criados saem desta lista. Os que já foram criados continuam na série."
        confirmLabel="Descartar rascunho"
        cancelLabel="Manter rascunho"
        onConfirm={descartar}
        onCancel={() => setDescartarAberto(false)}
      />
    </>
  );
}

function EntradaMassa({
  bloco,
  indice,
  total,
  busy,
  arrastando,
  mostraQuadro,
  mostraTemporada,
  ajustando,
  quadros,
  valorQuadro,
  opcoesTemporada,
  onChange,
  onRecolher,
  onMover,
  onRemover,
  onAjustar,
  onArrastar,
  onSoltar,
}: {
  bloco: BlocoMassa;
  indice: number;
  total: number;
  busy: boolean;
  arrastando: string | null;
  mostraQuadro: boolean;
  mostraTemporada: boolean;
  ajustando: boolean;
  quadros: Array<{ value: string; label: string }>;
  valorQuadro: string;
  opcoesTemporada: Array<{ value: string; label: string }>;
  onChange: (patch: Partial<Pick<BlocoMassa, 'modo' | 'serieId' | 'temporadaId' | 'titulo' | 'texto'>>) => void;
  onRecolher: () => void;
  onMover: (destino: number) => void;
  onRemover: () => void;
  onAjustar: () => void;
  onArrastar: (id: string | null) => void;
  onSoltar: () => void;
}) {
  const numero = indice + 1;
  const travado = busy || bloco.criado;
  const cardRef = useRef<HTMLLIElement>(null);
  const organizacaoPropria = Boolean(bloco.proprio?.serieId || bloco.proprio?.temporadaId);
  const mostraOrganizacao = (mostraQuadro || mostraTemporada) && (ajustando || organizacaoPropria);
  const resumoOrganizacao = [
    mostraQuadro ? quadros.find(item => item.value === valorQuadro)?.label : null,
    mostraTemporada ? opcoesTemporada.find(item => item.value === (bloco.temporadaId || 'none'))?.label : null,
  ].filter(Boolean).join(' · ');

  return (
    <li
      ref={cardRef}
      onDragOver={event => {
        if (arrastando && arrastando !== bloco.id) event.preventDefault();
      }}
      onDrop={event => {
        event.preventDefault();
        onSoltar();
      }}
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]',
        arrastando === bloco.id && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-2 py-2 sm:flex-nowrap sm:px-3">
        <button
          type="button"
          draggable={!travado}
          onDragStart={event => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', bloco.id);
            if (cardRef.current) event.dataTransfer.setDragImage(cardRef.current, 24, 24);
            onArrastar(bloco.id);
          }}
          onDragEnd={() => onArrastar(null)}
          tabIndex={-1}
          aria-hidden
          className="hidden h-9 w-6 shrink-0 cursor-grab items-center justify-center text-[var(--text-tertiary)] pointer-fine:flex"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRecolher}
          aria-expanded={!bloco.recolhido}
          className="flex min-h-11 min-w-[9rem] flex-1 items-center gap-2 overflow-hidden rounded-[var(--radius-input)] px-1 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Text variant="label" as="span" className="w-5 shrink-0 text-center text-[var(--text-secondary)]">{numero}</Text>
          {bloco.recolhido ? <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden /> : null}
          <Text variant="itemTitle" as="span" className="shrink-0">Conteúdo {numero}</Text>
          {bloco.recolhido && bloco.titulo.trim() ? (
            <Text variant="secondary" as="span" className="min-w-0 truncate">{bloco.titulo.trim()}</Text>
          ) : null}
          {bloco.criado ? <Badge variant="neutral">Criado</Badge> : null}
        </button>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <AppButton
            variant="secondary"
            size="sm"
            iconOnly
            aria-label={`Subir o conteúdo ${numero}`}
            disabled={busy || indice === 0}
            onClick={() => onMover(indice - 1)}
          >
            <ChevronUp className="h-4 w-4" />
          </AppButton>
          <AppButton
            variant="secondary"
            size="sm"
            iconOnly
            aria-label={`Descer o conteúdo ${numero}`}
            disabled={busy || indice === total - 1}
            onClick={() => onMover(indice + 1)}
          >
            <ChevronDown className="h-4 w-4" />
          </AppButton>
          <span className="flex flex-col items-end">
            <SelectField
              ariaLabel={`Etapa inicial do conteúdo ${numero}`}
              value={bloco.modo}
              leadingIcon={<PontoEtapa modo={bloco.modo} />}
              onChange={valor => onChange({ modo: valor as ModoBloco })}
              options={ETAPAS_INICIAIS}
              disabled={travado}
              className="min-w-[8.5rem]"
            />
          </span>
          <AppButton
            variant="secondary"
            size="sm"
            iconOnly
            aria-label={`Remover o conteúdo ${numero}`}
            onClick={onRemover}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" />
          </AppButton>
        </span>
      </div>
      {bloco.proprio?.modo && !bloco.criado ? (
        <Text variant="meta" as="p" className="-mt-1 px-3 pb-1 text-right">Etapa personalizada</Text>
      ) : null}

      {bloco.recolhido ? null : (
        <div className="stack-md border-t border-[var(--border-color)] px-3 py-3 sm:pl-12 sm:pr-4">
          {mostraOrganizacao ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {mostraQuadro ? (
                <label className="stack-xs">
                  <Text variant="label" as="span">Quadro</Text>
                  <SelectField
                    block
                    ariaLabel={`Quadro do conteúdo ${numero}`}
                    value={valorQuadro}
                    onChange={serieId => onChange({ serieId })}
                    options={quadros}
                    disabled={travado}
                  />
                </label>
              ) : null}
              {mostraTemporada ? (
                <label className="stack-xs">
                  <Text variant="label" as="span">Temporada</Text>
                  <SelectField
                    block
                    ariaLabel={`Temporada do conteúdo ${numero}`}
                    value={bloco.temporadaId || 'none'}
                    onChange={valor => onChange({ temporadaId: valor === 'none' ? null : valor })}
                    options={opcoesTemporada}
                    disabled={travado}
                  />
                </label>
              ) : null}
            </div>
          ) : (mostraQuadro || mostraTemporada) && !bloco.criado ? (
            <p className="flex flex-wrap items-center gap-x-2 t-meta text-[var(--text-secondary)]">
              <span>{resumoOrganizacao}</span>
              <button
                type="button"
                onClick={onAjustar}
                className="min-h-8 rounded-[var(--radius-sm)] t-button text-[var(--text-primary)] underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
              >
                Ajustar quadro e temporada
              </button>
            </p>
          ) : null}

          <label className="stack-xs">
            <Text variant="label" as="span">Título</Text>
            <input
              aria-label={`Título do conteúdo ${numero}`}
              value={bloco.titulo}
              disabled={travado}
              onChange={event => onChange({ titulo: event.target.value })}
              className={inputClass}
            />
          </label>

          <div className="stack-xs">
            <Text variant="label" as="p">Texto <span className="text-[var(--text-tertiary)]">· opcional</span></Text>
            {bloco.criado ? (
              <Text variant="secondary">{bloco.texto ? 'Texto já gravado neste conteúdo.' : 'Conteúdo já criado.'}</Text>
            ) : (
              <RichTextEditor
                documentId={bloco.id}
                content={bloco.texto}
                onChange={html => onChange({ texto: html })}
                formatBar="writing"
                meter="none"
                placeholder={bloco.modo === 'ideia' ? 'Anote a ideia…' : 'Escreva o roteiro…'}
                editorViewportClassName="max-h-72 min-h-28"
              />
            )}
          </div>
        </div>
      )}
    </li>
  );
}
