import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, FileText, Plus, Trash2 } from 'lucide-react';
import { RichTextEditor } from '../../../../components/editors/RichTextEditor';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import { useAuth } from '../../../../context/AuthContext';
import { cn } from '../../../../lib/utils';
import {
  atualizarBloco,
  anexarBlocos,
  blocoTemConteudo,
  moverBloco,
  removerBloco,
  type YoutubeBloco,
} from '../../lib/youtubeBlocos';
import { countSpokenWords, formatSpokenRange, YOUTUBE_SECTION_MODEL } from '../../lib/youtubeScript';
import { roteiroTypographyStyle } from '../../lib/roteiroTypography';
import { useRoteiroTypography } from '../../lib/useRoteiroTypography';

interface YoutubeColunasEditorProps {
  blocos: readonly YoutubeBloco[];
  onChange: (blocos: YoutubeBloco[]) => void;
  documentTitle: string;
  authorName: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
}

/** Visão em colunas do YouTube longo, só no computador: nome, roteiro e referências. */
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
  const listaId = useId();
  const modelos = state.templates.filter(
    template => template.ativo && (template.type ?? 'roteiro') === 'roteiro' && template.estrutura.length > 0,
  );
  const fala = formatSpokenRange(countSpokenWords(blocos.map(bloco => bloco.roteiro).join('')));
  const apagar = blocos.find(bloco => bloco.id === apagarId) ?? null;

  const aplicar = (secoes: { nome: string; texto?: string | null }[]) => {
    setModeloAberto(false);
    onChange(anexarBlocos(blocos, secoes));
  };

  return (
    <section className="stack-md" aria-labelledby={listaId}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Text id={listaId} variant="itemTitle" as="h2">Blocos</Text>
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            {`Fala estimada: ${fala}. As referências não entram nessa conta.`}
          </Text>
        </div>
      </div>

      <ol className="stack-md">
        {blocos.map((bloco, index) => (
          <li key={bloco.id}>
            <BlocoLinha
              bloco={bloco}
              index={index}
              total={blocos.length}
              documentTitle={documentTitle}
              authorName={authorName}
              saveState={saveState}
              typographyStyle={roteiroTypographyStyle(typography)}
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

      <div className="flex flex-wrap items-start gap-2">
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
                  onSelect={() => aplicar(modelo.estrutura.map(bloco => ({
                    nome: bloco.label,
                    texto: bloco.conteudo || bloco.placeholder || '',
                  })))}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        open={apagar !== null}
        message={apagar?.nome.trim()
          ? `Excluir o bloco “${apagar.nome.trim()}”? O roteiro e as referências dele saem.`
          : 'Excluir este bloco? O roteiro e as referências dele saem.'}
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
  documentTitle,
  authorName,
  saveState,
  typographyStyle,
  onChange,
  onMove,
  onDelete,
}: {
  bloco: YoutubeBloco;
  index: number;
  total: number;
  documentTitle: string;
  authorName: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  typographyStyle: ReturnType<typeof roteiroTypographyStyle>;
  onChange: (patch: Partial<Pick<YoutubeBloco, 'nome' | 'roteiro' | 'referencias'>>) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
}) {
  const nomeId = useId();
  const referenciasId = useId();
  const numero = index + 1;
  const rotulo = bloco.nome.trim() || `Bloco ${numero}`;

  return (
    <Surface as="article" variant="outlined" padding="none" className="overflow-visible" aria-label={rotulo}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] px-4 py-2">
        <Text variant="itemTitle" as="h3">{`Bloco ${numero}`}</Text>
        <div className="flex items-center gap-1">
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
          <AppButton
            type="button"
            variant="ghost"
            size="xs"
            iconOnly
            aria-label={`Excluir ${rotulo}`}
            title="Excluir bloco"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </AppButton>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-4">
        <div className="stack-xs min-w-0">
          <label htmlFor={nomeId}>
            <Text variant="label" as="span">Nome</Text>
          </label>
          <input
            id={nomeId}
            value={bloco.nome}
            onChange={event => onChange({ nome: event.target.value })}
            placeholder="Nome do bloco"
            className="input w-full"
          />
        </div>

        <div className="stack-xs min-w-0 lg:col-span-2">
          <Text variant="label" as="p" id={`${nomeId}-roteiro`}>Roteiro</Text>
          <div className="roteiro-typography overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-input)]" style={typographyStyle}>
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
              className="min-h-0 rounded-none border-0 bg-[var(--bg-elevated)] shadow-none"
              editorViewportClassName="px-3 py-2"
              editorCanvasClassName="min-h-[7rem]"
            />
          </div>
        </div>

        <div className="stack-xs min-w-0">
          <label htmlFor={referenciasId}>
            <Text variant="label" as="span">Referências</Text>
          </label>
          <textarea
            id={referenciasId}
            value={bloco.referencias}
            onChange={event => onChange({ referencias: event.target.value })}
            placeholder="Links de imagem, som, música, vídeo…"
            rows={6}
            className={cn('input min-h-[7rem] w-full resize-y leading-relaxed')}
          />
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
      <Text as="span" variant="body">{titulo}</Text>
      <Text as="span" variant="meta" className="line-clamp-2 text-[var(--text-tertiary)]">{detalhe}</Text>
    </button>
  );
}
