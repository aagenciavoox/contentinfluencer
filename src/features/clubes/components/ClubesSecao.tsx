import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import type { Clube } from '../../../lib/database';
import { generateUUID } from '../../../utils/uuid';
import { nextFreeSerieColor, serieColorKey } from '../../settings/lib/serieColors';
import { ORIGEM_DO_CLUBE } from '../lib/clubeLista';
import { ClubeFormDialog, type RascunhoClube } from './ClubeFormDialog';

function coresOcupadas(series: { id: string; cor: string | null }[], clubes: Clube[], excetoId?: string) {
  return [
    ...series.map(serie => serie.cor),
    ...clubes.filter(clube => clube.id !== excetoId).map(clube => clube.cor),
  ].filter((cor): cor is string => Boolean(serieColorKey(cor)));
}

/** Clubes no inventário de séries e no cadastro de apoio. */
export function ClubesSecao({
  celular = false,
  titulo = 'Clubes',
  descricao = 'Pastas para o clube de leitura. Puxam roteiros de séries e quadros e guardam peças só do clube.',
}: {
  celular?: boolean;
  titulo?: string;
  descricao?: string;
}) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Clube | null>(null);
  const clubes = [...(state.clubes ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const ocupadas = [
    ...state.series.map(serie => ({ id: serie.id, cor: serie.cor })),
    ...clubes.map(clube => ({ id: clube.id, cor: clube.cor })),
  ];

  const abrirNovo = () => {
    setEditando(null);
    setFormAberto(true);
  };

  const salvar = (rascunho: RascunhoClube) => {
    if (!user?.id) return;
    const agora = new Date().toISOString();
    const clube: Clube = {
      id: editando?.id ?? generateUUID(),
      userId: user.id,
      nome: rascunho.nome.trim(),
      descricao: rascunho.descricao.trim(),
      cor: serieColorKey(rascunho.cor),
      capaUrl: rascunho.capaUrl.trim() || null,
      origem: rascunho.origem,
      url: rascunho.url.trim() || null,
      createdAt: editando?.createdAt ?? agora,
      updatedAt: agora,
    };
    void dispatch({ type: editando ? 'UPDATE_CLUBE' : 'ADD_CLUBE', payload: clube });
    setFormAberto(false);
    setEditando(null);
  };

  return (
    <section className="stack-sm" aria-labelledby="clubes-titulo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 stack-xs">
          <Text variant="sectionTitle" as="h2"><span id="clubes-titulo">{titulo}</span></Text>
          <Text variant="secondary">{descricao}</Text>
        </div>
        <AppButton variant="secondary" onClick={abrirNovo} leftIcon={<Plus className="h-4 w-4" />}>
          Novo clube
        </AppButton>
      </div>
      {clubes.length === 0 ? (
        <Text variant="secondary">Nenhum clube ainda. Crie um para reunir a pauta e os roteiros.</Text>
      ) : (
        <div className={celular ? 'grid grid-cols-1 gap-3' : 'grid-content'}>
          {clubes.map(clube => (
            <Surface
              key={clube.id}
              as="button"
              variant="interactive"
              padding="md"
              onClick={() => navigate(`/clubes/${clube.id}`)}
              aria-label={`Abrir clube ${clube.nome}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="h-8 w-8 shrink-0 rounded-full border border-[var(--border-color)]"
                  style={{ backgroundColor: clube.cor || 'var(--bg-secondary)' }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 text-left">
                  <Text variant="bodyStrong" as="span" className="block truncate">{clube.nome}</Text>
                  <Text variant="meta" as="span">{`Clube · ${ORIGEM_DO_CLUBE[clube.origem]}`}</Text>
                </span>
              </span>
            </Surface>
          ))}
        </div>
      )}
      {formAberto ? (
        <ClubeFormDialog
          open
          clube={editando}
          corInicial={nextFreeSerieColor(ocupadas, editando?.id)}
          coresOcupadas={coresOcupadas(state.series, clubes, editando?.id)}
          onClose={() => { setFormAberto(false); setEditando(null); }}
          onSave={salvar}
        />
      ) : null}
    </section>
  );
}
