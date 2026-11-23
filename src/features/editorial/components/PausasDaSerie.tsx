import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Ajuda } from '../../../components/ui/Ajuda';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { generateUUID } from '../../../utils/uuid';
import {
  problemaDaPausa,
  removerPausa,
  salvarPausa,
  type PausaEditorial,
} from '../lib/pausas';
import { CAMPO } from './plano/campos';
import { useEditorialPlano } from './plano/useEditorialPlano';

function textoDaPausa(inicio: string, fim: string): string {
  const rotulo = (dia: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return dia;
    return format(parseISO(dia), 'dd/MM');
  };
  return inicio === fim ? rotulo(inicio) : `${rotulo(inicio)} a ${rotulo(fim)}`;
}

function EditorDaPausaDaSerie({
  serieId,
  inicial,
  existente,
  onSalvar,
  onRemover,
  onCancelar,
}: {
  serieId: string;
  inicial: PausaEditorial;
  existente: boolean;
  onSalvar: (pausa: PausaEditorial) => Promise<void>;
  onRemover: () => Promise<void>;
  onCancelar: () => void;
}) {
  const [rascunho, setRascunho] = useState(inicial);
  const [gravando, setGravando] = useState(false);
  const problema = problemaDaPausa({ ...rascunho, escopo: 'serie', serieId, platformId: null });
  const inicioId = `pausa-${serieId}-inicio`;
  const fimId = `pausa-${serieId}-fim`;
  const notaId = `pausa-${serieId}-nota`;

  const salvar = async () => {
    if (problema || gravando) return;
    setGravando(true);
    try {
      await onSalvar({ ...rascunho, escopo: 'serie', serieId, platformId: null });
    } catch {
      setGravando(false);
    }
  };

  const remover = async () => {
    if (gravando) return;
    setGravando(true);
    try {
      await onRemover();
    } catch {
      setGravando(false);
    }
  };

  return (
    <div className="stack-sm rounded-[var(--radius-input)] bg-[var(--surface-subtle)] p-4">
      <div className="grid-form">
        <label className="flex flex-col gap-1" htmlFor={inicioId}>
          <Text variant="label" as="span">Início</Text>
          <input
            id={inicioId}
            type="date"
            className={CAMPO}
            value={rascunho.inicio}
            onChange={event => setRascunho(atual => ({ ...atual, inicio: event.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor={fimId}>
          <Text variant="label" as="span">Fim</Text>
          <input
            id={fimId}
            type="date"
            className={CAMPO}
            min={rascunho.inicio}
            value={rascunho.fim}
            onChange={event => setRascunho(atual => ({ ...atual, fim: event.target.value }))}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1" htmlFor={notaId}>
        <Text variant="label" as="span">Nota</Text>
        <input
          id={notaId}
          type="text"
          className={CAMPO}
          placeholder="Ex.: Natal com a família"
          value={rascunho.nota}
          onChange={event => setRascunho(atual => ({ ...atual, nota: event.target.value }))}
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {existente ? (
          <AppButton variant="ghost" size="sm" onClick={() => { void remover(); }} disabled={gravando}>Remover pausa</AppButton>
        ) : <span />}
        <div className="flex flex-wrap gap-2">
          <AppButton variant="secondary" size="sm" onClick={onCancelar} disabled={gravando}>Cancelar</AppButton>
          <AppButton
            variant="primary"
            size="sm"
            disabled={problema != null || gravando}
            disabledReason={problema ?? undefined}
            onClick={() => { void salvar(); }}
          >
            {gravando ? 'Salvando…' : 'Salvar pausa'}
          </AppButton>
        </div>
      </div>
    </div>
  );
}

/** Pausas desta série (escopo `serie`). Publicação, gravação, produção e conta continuam no Plano. */
export function PausasDaSerie({ serieId }: { serieId: string }) {
  const { settings, gravar } = useEditorialPlano();
  const [editando, setEditando] = useState<{ pausa: PausaEditorial; existente: boolean } | null>(null);
  const pausas = (settings.pausas ?? [])
    .filter(pausa => pausa.escopo === 'serie' && pausa.serieId === serieId)
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.fim.localeCompare(b.fim));
  const hoje = format(new Date(), 'yyyy-MM-dd');

  const persistir = (lista: PausaEditorial[]) => gravar({ ...settings, pausas: lista });

  const nova = (): PausaEditorial => ({
    id: generateUUID(),
    inicio: hoje,
    fim: hoje,
    escopo: 'serie',
    platformId: null,
    serieId,
    nota: '',
  });

  return (
    <div className="stack-sm border-t border-[var(--border-subtle)] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center">
          <Text variant="bodyStrong" as="span">Pausas desta série</Text>
          <Ajuda
            rotulo="Sobre as pausas desta série"
            texto="Esses dias ficam fora do acompanhamento de ritmo desta série. A pausa é gravada na hora."
          />
        </span>
        <AppButton
          variant="secondary"
          size="sm"
          onClick={() => setEditando({ pausa: nova(), existente: false })}
        >
          Adicionar pausa
        </AppButton>
      </div>
      {pausas.length === 0 ? <Text variant="meta" as="p">Nenhuma pausa desta série.</Text> : (
        <ul className="stack-xs">
          {pausas.map(pausa => (
            <li key={pausa.id} className="flex flex-wrap items-center justify-between gap-2">
              <Text variant="body" as="span">
                {textoDaPausa(pausa.inicio, pausa.fim)}
                {pausa.nota ? ` · ${pausa.nota}` : ''}
              </Text>
              <AppButton variant="ghost" size="sm" onClick={() => setEditando({ pausa, existente: true })}>
                Editar
              </AppButton>
            </li>
          ))}
        </ul>
      )}
      {editando ? (
        <EditorDaPausaDaSerie
          key={editando.pausa.id}
          serieId={serieId}
          inicial={editando.pausa}
          existente={editando.existente}
          onCancelar={() => setEditando(null)}
          onRemover={async () => {
            await persistir(removerPausa(settings.pausas ?? [], editando.pausa.id));
            setEditando(null);
          }}
          onSalvar={async pausa => {
            await persistir(salvarPausa(settings.pausas ?? [], pausa));
            setEditando(null);
          }}
        />
      ) : null}
    </div>
  );
}
