import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { MoreMenu } from '../../../../components/ui/MoreMenu';
import { Text } from '../../../../components/ui/Text';
import type { Serie, Temporada } from '../../../../lib/database';
import { acharTemporadaPorNome } from '../../../editorial/lib/temporadas';
import { textoConteudos } from '../../lib/serieAgrupamento';

type Edicao = { modo: 'criar' } | { modo: 'renomear'; temporada: Temporada };

/**
 * Temporadas moram na série. Os quadros dela usam as mesmas; excluir uma temporada
 * deixa os conteúdos dela na série, sem temporada.
 */
export function SeriesTemporadasPanel({
  serie,
  temporadas,
  contagem,
  onCriar,
  onRenomear,
  onExcluir,
}: {
  serie: Serie;
  temporadas: readonly Temporada[];
  /** Conteúdos ativos por temporada. */
  contagem: (temporadaId: string) => number;
  onCriar: (nome: string) => void;
  onRenomear: (temporada: Temporada, nome: string) => void;
  onExcluir: (temporada: Temporada) => void;
}) {
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [nome, setNome] = useState('');
  const [excluir, setExcluir] = useState<Temporada | null>(null);

  const abrir = (proxima: Edicao) => {
    setNome(proxima.modo === 'renomear' ? proxima.temporada.nome : '');
    setEdicao(proxima);
  };
  const fechar = () => setEdicao(null);

  const limpo = nome.trim();
  const repetida = limpo ? acharTemporadaPorNome(serie.id, limpo, temporadas) : null;
  const conflito = repetida && (edicao?.modo !== 'renomear' || repetida.id !== edicao.temporada.id);
  const podeSalvar = Boolean(limpo) && !conflito;

  const salvar = () => {
    if (!edicao || !podeSalvar) return;
    if (edicao.modo === 'criar') onCriar(limpo);
    else onRenomear(edicao.temporada, limpo);
    fechar();
  };

  const quantos = excluir ? contagem(excluir.id) : 0;

  return (
    <div className="stack-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="meta" as="p">
          {temporadas.length === 0
            ? 'Esta série não usa temporadas.'
            : temporadas.length === 1 ? '1 temporada' : `${temporadas.length} temporadas`}
        </Text>
        <AppButton variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => abrir({ modo: 'criar' })}>
          Criar temporada
        </AppButton>
      </div>

      {temporadas.length === 0 ? (
        <EmptyState
          compact
          title="Nenhuma temporada"
          description="Temporadas organizam ciclos da série. Os quadros dela usam as mesmas temporadas."
        />
      ) : (
        <ul className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
          {temporadas.map(temporada => (
            <li
              key={temporada.id}
              className="relative flex min-h-14 items-center gap-3 border-t border-[var(--border-color)] px-4 py-2 first:border-t-0 hover:bg-[var(--bg-hover)]"
            >
              <Link
                to={`/series/${serie.id}/temporadas/${temporada.id}`}
                className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                aria-label={`Abrir ${temporada.nome}`}
              />
              <Text variant="itemTitle" as="span" className="pointer-events-none relative z-[1] min-w-0 flex-1 truncate">
                {temporada.nome}
              </Text>
              <Text variant="meta" as="span" className="pointer-events-none relative z-[1] shrink-0">
                {textoConteudos(contagem(temporada.id))}
              </Text>
              <span className="relative z-[2] shrink-0">
                <MoreMenu
                  size="sm"
                  label={`Mais opções de ${temporada.nome}`}
                  items={[
                    { label: 'Renomear', onClick: () => abrir({ modo: 'renomear', temporada }) },
                    { label: 'Excluir', tone: 'danger', onClick: () => setExcluir(temporada) },
                  ]}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <BottomSheetModal open={Boolean(edicao)} onClose={fechar} desktopMaxW="max-w-md">
        <OverlayHeader
          title={edicao?.modo === 'renomear' ? 'Renomear temporada' : 'Criar temporada'}
          subtitle={serie.name}
          onClose={fechar}
        />
        <OverlayBody className="stack-sm">
          <label htmlFor="temporada-nome">
            <Text variant="label" as="span">Nome</Text>
          </label>
          <input
            id="temporada-nome"
            autoFocus
            value={nome}
            onChange={event => setNome(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                salvar();
              }
            }}
            placeholder="Ex.: Temporada 1 — Portas de entrada"
            aria-invalid={conflito ? true : undefined}
            className="ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          />
          {conflito ? (
            <p className="t-meta" style={{ color: 'var(--danger)' }}>Já existe uma temporada com esse nome nesta série.</p>
          ) : null}
        </OverlayBody>
        <OverlayFooter>
          <AppButton variant="secondary" onClick={fechar}>Cancelar</AppButton>
          <AppButton variant="primary" onClick={salvar} disabled={!podeSalvar}>
            {edicao?.modo === 'renomear' ? 'Salvar nome' : 'Criar temporada'}
          </AppButton>
        </OverlayFooter>
      </BottomSheetModal>

      <ConfirmModal
        open={Boolean(excluir)}
        message={excluir
          ? `Excluir a temporada “${excluir.nome}”? ${quantos === 0 ? 'Ela não tem conteúdos.' : `${textoConteudos(quantos)} ${quantos === 1 ? 'continua' : 'continuam'} na série, sem temporada.`}`
          : ''}
        confirmLabel="Excluir temporada"
        cancelLabel="Manter"
        onConfirm={() => {
          if (excluir) onExcluir(excluir);
          setExcluir(null);
        }}
        onCancel={() => setExcluir(null)}
      />
    </div>
  );
}
