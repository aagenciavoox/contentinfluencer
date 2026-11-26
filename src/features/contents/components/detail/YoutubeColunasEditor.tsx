import { useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Clock, FileText, Film, GripVertical, Plus, Trash2 } from 'lucide-react';
import { RichTextEditor } from '../../../../components/editors/RichTextEditor';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import { useAuth } from '../../../../context/AuthContext';
import { cn } from '../../../../lib/utils';
import {
  anexarBlocos,
  atualizarBloco,
  blocoTemConteudo,
  metricasDosBlocos,
  moverBloco,
  removerBloco,
  reordenarBloco,
  type MetricaBloco,
  type YoutubeBloco,
} from '../../lib/youtubeBlocos';
import { formatSpokenRange, YOUTUBE_SECTION_MODEL } from '../../lib/youtubeScript';
import { roteiroTypographyStyle } from '../../lib/roteiroTypography';
import { useRoteiroTypography } from '../../lib/useRoteiroTypography';

interface YoutubeColunasEditorProps {
  blocos: readonly YoutubeBloco[];
  onChange: (blocos: YoutubeBloco[]) => void;
  documentTitle: string;
  authorName: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
}

/** Visão em colunas do YouTube longo, só no computador: cartões de bloco em largura total. */
export function YoutubeColunasEditor({
  blocos,
  onChange,
  documentTitle,
  authorName,
  saveState,
}: YoutubeColunasEditorProps) {
  const { state } = useAppContext();
  const { user } = useAuth();
  const { typography } = useRoteiroTypography(user?.id);
  const [apagarId, setApagarId] = useState<string | null>(null);
  const [modeloAberto, setModeloAberto] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const listaId = useId();

  const modelos = state.templates.filter(
    template => template.ativo && (template.type ?? 'roteiro') === 'roteiro' && template.estrutura.length > 0,
  );
  const metricas = useMemo(() => metricasDosBlocos(blocos), [blocos]);
  const fala = formatSpokenRange(metricas.totalPalavras);
  const apagar = blocos.find(bloco => bloco.id === apagarId) ?? null;

  const aplicar = (secoes: { nome: string; texto?: string | null }[]) => {
    setModeloAberto(false);
    onChange(anexarBlocos(blocos, secoes));
  };

  const finalizarDrag = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const soltarSobre = (destinoId: string) => {
    if (draggingId && draggingId !== destinoId) {
      onChange(reordenarBloco(blocos, draggingId, destinoId));
    }
    finalizarDrag();
  };

  return (
    <section className="stack-md" aria-labelledby={listaId}>
      {/* Cabeçalho da seção Blocos */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <Text id={listaId} variant="sectionTitle" as="h2">
            Blocos
          </Text>
          <Text variant="meta" as="span" className="text-[var(--text-tertiary)] tabular-nums">
            {blocos.length} {blocos.length === 1 ? 'unidade estruturada' : 'unidades estruturadas'}
          </Text>
        </div>

        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            Fala estimada: <strong className="text-[var(--text-primary)]">{fala}</strong>. As referências não entram nessa conta.
          </Text>
        </div>
      </div>

      {/* Guia das 3 colunas no desktop (1/4, 2/4, 1/4) */}
      <div className="hidden px-4 lg:grid lg:grid-cols-12 lg:gap-4" aria-hidden>
        <div className="lg:col-span-3">
          <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
            Nome do bloco
          </Text>
        </div>
        <div className="lg:col-span-6">
          <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
            Roteiro / Narração
          </Text>
        </div>
        <div className="lg:col-span-3">
          <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
            Referências e notas
          </Text>
        </div>
      </div>

      {/* Lista de cartões de bloco */}
      <ol className="stack-md">
        {blocos.map((bloco, index) => (
          <li key={bloco.id}>
            <BlocoLinha
              bloco={bloco}
              index={index}
              total={blocos.length}
              metrica={metricas.porId[bloco.id]}
              documentTitle={documentTitle}
              authorName={authorName}
              saveState={saveState}
              typographyStyle={roteiroTypographyStyle(typography)}
              isDragging={draggingId === bloco.id}
              isDragOver={dragOverId === bloco.id && draggingId !== bloco.id}
              onDragStart={() => setDraggingId(bloco.id)}
              onDragOver={() => setDragOverId(bloco.id)}
              onDragLeave={() => setDragOverId(atual => (atual === bloco.id ? null : atual))}
              onDrop={() => soltarSobre(bloco.id)}
              onDragEnd={finalizarDrag}
              onChange={patch => onChange(atualizarBloco(blocos, bloco.id, patch))}
              onMove={delta => onChange(moverBloco(blocos, bloco.id, delta))}
              onDelete={() => {
                if (blocoTemConteudo(bloco)) setApagarId(bloco.id);
                else onChange(removerBloco(blocos, bloco.id));
              }}
            />
          </li>
        ))}
      </ol>

      {/* Barra inferior: ações + total de palavras */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => onChange(anexarBlocos(blocos, [{ nome: '' }]))}
          >
            Adicionar bloco
          </AppButton>

          <div className="relative">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              aria-expanded={modeloAberto}
              aria-haspopup="menu"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => setModeloAberto(aberto => !aberto)}
            >
              Usar modelo
            </AppButton>
            {modeloAberto ? (
              <div
                role="menu"
                aria-label="Modelos de estrutura"
                className="absolute left-0 z-30 mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-dropdown)]"
              >
                <Text variant="meta" as="p" className="px-2.5 pb-1 pt-1.5 text-[var(--text-tertiary)]">
                  Entra no fim
                </Text>
                <ModeloOpcao
                  titulo="Vídeo do YouTube"
                  detalhe={YOUTUBE_SECTION_MODEL.join(' · ')}
                  onSelect={() => aplicar(YOUTUBE_SECTION_MODEL.map(nome => ({ nome })))}
                />
                {modelos.map(modelo => (
                  <ModeloOpcao
                    key={modelo.id}
                    titulo={modelo.nome}
                    detalhe={modelo.estrutura.map(bloco => bloco.label).join(' · ')}
                    onSelect={() =>
                      aplicar(
                        modelo.estrutura.map(bloco => ({
                          nome: bloco.label,
                          texto: bloco.conteudo || bloco.placeholder || '',
                        })),
                      )
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <Text variant="meta" as="p" className="tabular-nums text-[var(--text-tertiary)]">
          Total de palavras:{' '}
          <strong className="text-[var(--text-secondary)]">
            {metricas.totalPalavras} {metricas.totalPalavras === 1 ? 'palavra' : 'palavras'}
          </strong>
          {metricas.totalDuracaoCurta ? ` (${metricas.totalDuracaoCurta} de fala estimada)` : ''}
        </Text>
      </div>

      <ConfirmModal
        open={apagar !== null}
        message={
          apagar?.nome.trim()
            ? `Excluir o bloco “${apagar.nome.trim()}”? O roteiro e as referências dele saem.`
            : 'Excluir este bloco? O roteiro e as referências dele saem.'
        }
        confirmLabel="Excluir bloco"
        cancelLabel="Manter"
        onConfirm={() => {
          if (apagarId) onChange(removerBloco(blocos, apagarId));
          setApagarId(null);
        }}
        onCancel={() => setApagarId(null)}
      />
    </section>
  );
}

function BlocoLinha({
  bloco,
  index,
  total,
  metrica,
  documentTitle,
  authorName,
  saveState,
  typographyStyle,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onChange,
  onMove,
  onDelete,
}: {
  bloco: YoutubeBloco;
  index: number;
  total: number;
  metrica?: MetricaBloco;
  documentTitle: string;
  authorName: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  typographyStyle: ReturnType<typeof roteiroTypographyStyle>;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onChange: (patch: Partial<Pick<YoutubeBloco, 'nome' | 'roteiro' | 'referencias'>>) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
}) {
  const nomeId = useId();
  const referenciasId = useId();
  const roteiroWrapRef = useRef<HTMLDivElement | null>(null);
  const [dragArmado, setDragArmado] = useState(false);

  const numero = index + 1;
  const nomeLimpo = bloco.nome.trim();
  const rotulo = nomeLimpo || `Bloco ${numero}`;
  const tituloCabecalho = nomeLimpo ? `Bloco ${numero}: ${nomeLimpo}` : `Bloco ${numero}`;
  const palavras = metrica?.palavras ?? 0;

  const focarRoteiro = () => {
    roteiroWrapRef.current?.querySelector<HTMLElement>('.ProseMirror[contenteditable="true"]')?.focus();
  };

  return (
    <Surface
      as="article"
      variant="outlined"
      padding="none"
      draggable={dragArmado}
      onDragStart={event => {
        if (!dragArmado) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', bloco.id);
        onDragStart();
      }}
      onDragOver={event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        onDragOver();
      }}
      onDragLeave={event => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        onDragLeave();
      }}
      onDrop={event => {
        event.preventDefault();
        setDragArmado(false);
        onDrop();
      }}
      onDragEnd={() => {
        setDragArmado(false);
        onDragEnd();
      }}
      className={cn(
        'w-full overflow-visible bg-[var(--bg-elevated)] transition-colors',
        isDragging && 'opacity-50',
        isDragOver && 'border-[var(--brand-accent-strong)]',
      )}
      aria-label={rotulo}
    >
      {/* Barra superior do cartão */}
      <div className="flex items-center justify-between gap-2 rounded-t-[var(--radius-card)] border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            role="presentation"
            title="Arraste para reordenar"
            onPointerDown={() => setDragArmado(true)}
            onPointerUp={() => setDragArmado(false)}
            onPointerCancel={() => setDragArmado(false)}
            className="inline-flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </span>
          <Text variant="itemTitle" as="h3" className="truncate text-[var(--text-primary)]">
            {tituloCabecalho}
          </Text>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <AppButton
            type="button"
            variant="ghost"
            size="xs"
            iconOnly
            aria-label={`Mover ${rotulo} para cima`}
            title="Mover para cima"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="h-4 w-4" />
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            size="xs"
            iconOnly
            aria-label={`Mover ${rotulo} para baixo`}
            title="Mover para baixo"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="h-4 w-4" />
          </AppButton>
          <span className="mx-1 h-4 w-px bg-[var(--border-color)]" aria-hidden />
          <AppButton
            type="button"
            variant="ghost"
            size="xs"
            iconOnly
            aria-label={`Excluir ${rotulo}`}
            title="Excluir bloco"
            onClick={onDelete}
            className="hover:text-[var(--danger)]"
          >
            <Trash2 className="h-4 w-4" />
          </AppButton>
        </div>
      </div>

      {/* Corpo em 3 colunas (1/4 · 2/4 · 1/4) */}
      <div className="grid grid-cols-1 items-start gap-4 p-4 lg:grid-cols-12">
        {/* 1/4: Nome do bloco + janela acumulada */}
        <div className="min-w-0 stack-xs lg:col-span-3">
          <label htmlFor={nomeId} className="lg:sr-only">
            <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
              Nome do bloco
            </Text>
          </label>
          <textarea
            id={nomeId}
            value={bloco.nome}
            onChange={event => onChange({ nome: event.target.value.replace(/\r?\n/g, ' ') })}
            onKeyDown={event => {
              if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
              event.preventDefault();
              focarRoteiro();
            }}
            placeholder="Nome ou intenção do bloco..."
            rows={4}
            className="w-full resize-none rounded-[var(--radius-input)] border border-transparent bg-[var(--bg-primary)] px-3 py-2.5 t-body text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] focus:bg-[var(--bg-elevated)]"
          />
          {metrica?.janelaTempo ? (
            <Text variant="meta" as="span" className="px-1 font-mono tabular-nums text-[var(--text-tertiary)]">
              {metrica.janelaTempo}
            </Text>
          ) : null}
        </div>

        {/* 2/4: Roteiro / Narração (RichTextEditor real) */}
        <div ref={roteiroWrapRef} className="min-w-0 stack-xs lg:col-span-6">
          <Text variant="eyebrow" as="p" id={`${nomeId}-roteiro`} className="text-[var(--text-tertiary)] lg:sr-only">
            Roteiro / Narração
          </Text>
          <div
            className="roteiro-typography overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] transition-colors focus-within:border-[var(--border-strong)] focus-within:bg-[var(--bg-elevated)]"
            style={typographyStyle}
          >
            <RichTextEditor
              documentId={bloco.id}
              variant="workspace"
              formatBar="writing"
              meter="none"
              content={bloco.roteiro}
              onChange={roteiro => onChange({ roteiro })}
              placeholder="Tópicos ou o que vai ser falado…"
              authorName={authorName}
              documentTitle={`${documentTitle} · ${rotulo}`}
              saveState={saveState}
              className="min-h-0 rounded-none border-0 bg-transparent shadow-none"
              editorViewportClassName="px-3 py-2.5"
              editorCanvasClassName="min-h-[8rem]"
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-1">
            <Text variant="meta" as="span" className="tabular-nums text-[var(--text-tertiary)]">
              {palavras > 0
                ? `${palavras} ${palavras === 1 ? 'palavra' : 'palavras'} · ${metrica?.duracaoCurta ?? ''} de fala`
                : 'Sem fala escrita ainda'}
            </Text>
          </div>
        </div>

        {/* 1/4: Referências e notas */}
        <div className="min-w-0 stack-xs lg:col-span-3">
          <label htmlFor={referenciasId} className="lg:sr-only">
            <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
              Referências e notas
            </Text>
          </label>
          <div className="rounded-[var(--radius-input)] border border-transparent bg-[var(--bg-primary)] p-3 transition-colors focus-within:border-[var(--border-strong)] focus-within:bg-[var(--bg-elevated)] stack-xs">
            <div className="flex items-center gap-1.5">
              <Film className="h-3.5 w-3.5 shrink-0 text-[var(--brand-accent-text)]" aria-hidden />
              <Text variant="label" as="span" className="text-[var(--text-secondary)]">
                Referências e notas
              </Text>
            </div>
            <textarea
              id={referenciasId}
              value={bloco.referencias}
              onChange={event => onChange({ referencias: event.target.value })}
              placeholder="Links de imagem, som, música, b-roll…"
              rows={5}
              className="min-h-[6.5rem] w-full resize-y bg-transparent t-secondary leading-relaxed text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-tertiary)] focus:text-[var(--text-primary)]"
            />
          </div>
        </div>
      </div>
    </Surface>
  );
}

function ModeloOpcao({ titulo, detalhe, onSelect }: { titulo: string; detalhe: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:bg-[var(--bg-hover)] focus-visible:outline-none"
    >
      <Text as="span" variant="body">
        {titulo}
      </Text>
      <Text as="span" variant="meta" className="line-clamp-2 text-[var(--text-tertiary)]">
        {detalhe}
      </Text>
    </button>
  );
}
