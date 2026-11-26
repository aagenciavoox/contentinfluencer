import { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import type { Serie } from '../../../lib/database';
import { ordenarContas } from '../../contas/lib/contas';
import { EditorialDrawer } from '../../editorial/components/plano/EditorialDrawer';
import { nextFreeSerieColor, takenSerieColorKeys } from '../lib/serieColors';
import { SerieEditForm, type SerieEditChromeState } from './SerieEditForm';

export type SerieCreateModalTarget =
  | { tipo: 'serie'; seriePaiId?: string | null }
  | { tipo: 'familia'; seriePaiId?: null }
  | { tipo: 'quadro'; seriePaiId: string };

const TEXTOS_CRIACAO = {
  serie: {
    secao: 'Nova série',
    titulo: 'Criar série',
  },
  quadro: {
    secao: 'Novo quadro',
    titulo: 'Criar quadro',
  },
  familia: {
    secao: 'Nova família',
    titulo: 'Criar família',
  },
} as const;

export function SerieCreateModal({
  target,
  onClose,
  onCreated,
}: {
  target: SerieCreateModalTarget | null;
  onClose: () => void;
  onCreated?: (serie: Serie) => void;
}) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const [chrome, setChrome] = useState<SerieEditChromeState | null>(null);

  const open = Boolean(target);
  const tipo = target?.tipo ?? 'serie';
  const seriePaiId = target?.seriePaiId ?? null;
  const seriePai = useMemo(
    () => (seriePaiId ? state.series.find(item => item.id === seriePaiId) ?? null : null),
    [seriePaiId, state.series],
  );

  const contas = useMemo(
    () => ordenarContas(state.platforms.filter(platform => platform.ativo)),
    [state.platforms],
  );

  const handleChromeChange = useCallback((next: SerieEditChromeState) => {
    setChrome(next);
  }, []);

  const handleClose = useCallback(() => {
    setChrome(null);
    onClose();
  }, [onClose]);

  const handleSave = useCallback((serie: Serie) => {
    const payload: Serie = {
      ...serie,
      userId: serie.userId || user?.id || '',
    };
    void dispatch({ type: 'ADD_SERIE', payload });
    onCreated?.(payload);
    setChrome(null);
    onClose();
  }, [dispatch, onClose, onCreated, user?.id]);

  const { secao, titulo } = TEXTOS_CRIACAO[tipo];
  const subtitulo = tipo === 'familia'
    ? 'Agrupe séries relacionadas pelo mesmo conceito.'
    : tipo === 'quadro'
      ? seriePai
        ? `Dentro de ${seriePai.name}. Só o nome é necessário agora.`
        : 'Só o nome é necessário agora.'
      : seriePai
        ? `Dentro de ${seriePai.name}. Defina nome, cor e o que já souber agora.`
        : 'Defina nome, cor e o que já souber — o restante pode ficar para depois.';

  const formKey = open ? `drawer:${tipo}:${seriePaiId ?? ''}` : 'fechado';

  return (
    <EditorialDrawer
      open={open}
      escopoConta="Séries"
      secao={secao}
      title={titulo}
      subtitle={subtitulo}
      dirty={Boolean(chrome?.isDirty)}
      onClose={handleClose}
      onSave={() => chrome?.handleSave()}
      saveLabel={titulo}
      canSave={Boolean(chrome?.canSave)}
    >
      {open ? (
        <SerieEditForm
          key={formKey}
          inModal
          tipo={tipo}
          initial={{
            cor: tipo === 'quadro' && seriePai?.cor ? seriePai.cor : nextFreeSerieColor(state.series),
            tipoAgrupamento: tipo,
            parentId: seriePaiId,
            ...(tipo === 'quadro' ? { frequenciaRecomendada: 'Sob demanda' } : {}),
          }}
          takenColors={[...takenSerieColorKeys(state.series)]}
          contas={contas}
          pilares={state.pilares}
          series={state.series}
          contents={state.contents}
          usedFormatoValues={state.series.flatMap(serie => serie.formatoVisualPadrao ?? [])}
          showOpenInfoNotice={false}
          onSave={handleSave}
          onCancel={handleClose}
          onChromeChange={handleChromeChange}
        />
      ) : null}
    </EditorialDrawer>
  );
}
