import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/utils';
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

function capaHttp(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return /^(https?:\/\/|data:image\/)/i.test(trimmed) ? trimmed : null;
}

/** Mesmo card da série, com a capa mais alta e a coluna um pouco mais larga. */
function ClubeCard({ clube, onOpen }: { clube: Clube; onOpen: () => void }) {
  const [imgError, setImgError] = useState(false);
  const nome = clube.nome.trim() || 'Sem nome';
  const capa = capaHttp(clube.capaUrl);
  const temCapa = Boolean(capa && !imgError);
  const cor = clube.cor || '#e11d48';
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir clube ${nome}`}
      style={{ '--card-accent': cor } as CSSProperties}
      className={cn(
        'ds-card ds-card-interactive group relative flex min-w-0 w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] text-left',
        'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        'hover:border-[color-mix(in_srgb,var(--card-accent)_40%,var(--border-color))]',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
      )}
    >
      {temCapa ? (
        <span className="relative h-40 w-full shrink-0 overflow-hidden bg-[var(--bg-subtle)] sm:h-44">
          <img
            src={capa!}
            alt=""
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: cor }} />
        </span>
      ) : (
        <span
          className="flex h-40 w-full shrink-0 items-center justify-center sm:h-44"
          style={{ backgroundColor: `${cor}18`, color: cor }}
          aria-hidden
        >
          <Text variant="sectionTitle" as="span">{nome.slice(0, 2).toUpperCase()}</Text>
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-2 p-4 text-left">
        <Badge
          variant="neutral"
          className="w-fit uppercase"
          style={{ backgroundColor: `${cor}18`, color: cor }}
        >
          Clube
        </Badge>
        <Text variant="itemTitle" as="span" className="line-clamp-2 leading-snug">{nome}</Text>
        <Text variant="meta" as="span">{ORIGEM_DO_CLUBE[clube.origem]}</Text>
      </span>
    </button>
  );
}

/** Clubes no inventário de séries e no cadastro de apoio. */
export function ClubesSecao({
  celular = false,
  grande = false,
  titulo = 'Clubes',
  descricao = 'Pastas para o clube de leitura. Puxam roteiros de séries e quadros e guardam peças só do clube.',
}: {
  celular?: boolean;
  /** No inventário de séries: capa e card um pouco maior que série e quadro. */
  grande?: boolean;
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
        <div
          className={grande ? (celular ? 'grid grid-cols-1 gap-3' : 'grid') : (celular ? 'grid grid-cols-1 gap-3' : 'grid-content')}
          style={grande && !celular ? { gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' } : undefined}
        >
          {clubes.map(clube => grande ? (
            <ClubeCard key={clube.id} clube={clube} onOpen={() => navigate(`/clubes/${clube.id}`)} />
          ) : (
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
