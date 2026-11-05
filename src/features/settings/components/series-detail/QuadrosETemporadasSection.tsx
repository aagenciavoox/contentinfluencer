import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import { useAuth } from '../../../../context/AuthContext';
import type { Serie } from '../../../../lib/database';
import { generateUUID } from '../../../../utils/uuid';
import { filhosDaSerie } from '../../../editorial/lib/serieArvore';
import { rotuloDoFoco } from '../../../editorial/lib/focoTemporada';
import { temporadasDoEscopo } from '../../../editorial/lib/temporadas';
import { normalizarRedesPostIt } from '../../../planejamento/lib/redesPostIt';
import { SerieCreateModal, type SerieCreateModalTarget } from '../SerieCreateModal';
import { episodiosDaTemporada, episodiosDoQuadro, nomeDeQuadroRepetido } from '../../lib/estruturaSerie';
import { textoQuantidade } from '../../lib/selecaoEpisodios';
import { ExcluirEstruturaDialog, type AlvoExclusao } from './ExcluirEstruturaDialog';
import { TemporadaDialogs, type EdicaoTemporada } from './TemporadaDialogs';

const campoClass =
  'ds-input w-full min-w-0 rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-1.5 t-body text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

const episodios = (n: number) => textoQuantidade(n, 'episódio', 'episódios');

/** "Editar série": criar, renomear e excluir quadros e temporadas, com os fluxos que já existem. */
export function QuadrosETemporadasSection({
  serie,
  usaTemporadasMarcado = false,
}: {
  serie: Serie;
  /** Valor do formulário, ainda não salvo. Criar temporada olha o que já está gravado. */
  usaTemporadasMarcado?: boolean;
}) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const [criarQuadro, setCriarQuadro] = useState<SerieCreateModalTarget | null>(null);
  const [renomeando, setRenomeando] = useState<{ id: string; nome: string } | null>(null);
  const [edicaoTemporada, setEdicaoTemporada] = useState<EdicaoTemporada | null>(null);
  const [excluir, setExcluir] = useState<AlvoExclusao | null>(null);

  const quadros = filhosDaSerie(serie.id, state.series)
    .map(no => state.series.find(item => item.id === no.id))
    .filter((item): item is Serie => Boolean(item));
  const temporadas = temporadasDoEscopo(serie.id, state.temporadas);
  // Lido do que está salvo: assim salvar o formulário depois não desfaz nada feito aqui.
  const usaTemporadas = state.series.find(item => item.id === serie.id)?.usaTemporadas === true;

  const nomeLimpo = renomeando?.nome.trim() ?? '';
  const repetido = renomeando ? nomeDeQuadroRepetido(nomeLimpo, serie.id, state.series, renomeando.id) : false;
  const salvarNome = () => {
    if (!renomeando || !nomeLimpo || repetido) return;
    const quadro = state.series.find(item => item.id === renomeando.id);
    if (quadro && quadro.name !== nomeLimpo) {
      void dispatch({ type: 'UPDATE_SERIE', payload: { ...quadro, name: nomeLimpo, updatedAt: new Date().toISOString() } });
    }
    setRenomeando(null);
  };

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text variant="itemTitle" as="h4">Quadros</Text>
          <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCriarQuadro({ tipo: 'quadro', seriePaiId: serie.id })}>
            Novo quadro
          </AppButton>
        </div>
        {quadros.length === 0 ? <Text variant="meta" as="p">Nenhum quadro ainda.</Text> : (
          <ul className="divide-y divide-[var(--border-color)]">
            {quadros.map(quadro => {
              const editando = renomeando?.id === quadro.id;
              const n = episodiosDoQuadro(quadro.id, state.contents).length;
              return (
                <li key={quadro.id} className="flex flex-wrap items-center gap-2 py-2">
                  {editando ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <input
                        autoFocus
                        aria-label="Nome do quadro"
                        className={campoClass}
                        value={renomeando.nome}
                        onChange={event => setRenomeando({ id: quadro.id, nome: event.target.value })}
                        onKeyDown={event => {
                          if (event.key === 'Enter') { event.preventDefault(); salvarNome(); }
                          if (event.key === 'Escape') setRenomeando(null);
                        }}
                      />
                      {repetido ? <Text variant="meta" as="p" role="alert">Já existe um quadro com esse nome nesta série.</Text> : null}
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <Text variant="bodyStrong" as="p" className="truncate">{quadro.name?.trim() || 'Sem nome'}</Text>
                      <Text variant="meta" as="p">{`${episodios(n)}${quadro.ativa === false ? ' · arquivado' : ''}${normalizarRedesPostIt(quadro.focoRedes ?? []).length > 0 ? ` · ${rotuloDoFoco(quadro.focoRedes ?? [])}` : ''}`}</Text>
                    </div>
                  )}
                  {editando ? (
                    <>
                      <AppButton variant="secondary" size="sm" onClick={() => setRenomeando(null)}>Cancelar</AppButton>
                      <AppButton variant="primary" size="sm" onClick={salvarNome} disabled={!nomeLimpo || repetido}>Salvar</AppButton>
                    </>
                  ) : (
                    <>
                      <AppButton variant="ghost" size="sm" iconOnly aria-label={`Renomear ${quadro.name ?? ''}`} title="Renomear" onClick={() => setRenomeando({ id: quadro.id, nome: quadro.name ?? '' })}>
                        <Pencil className="h-4 w-4" />
                      </AppButton>
                      <AppButton variant="ghost" size="sm" iconOnly aria-label={`Excluir ${quadro.name ?? ''}`} title="Excluir" onClick={() => setExcluir({ tipo: 'quadro', quadro, serieId: serie.id })}>
                        <Trash2 className="h-4 w-4" />
                      </AppButton>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="stack-sm border-t border-[var(--border-color)] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text variant="itemTitle" as="h4">Temporadas</Text>
          {usaTemporadas ? (
            <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEdicaoTemporada({ modo: 'criar' })}>
              Nova temporada
            </AppButton>
          ) : null}
        </div>
        {!usaTemporadas && temporadas.length === 0 ? (
          <Text variant="meta" as="p">
            {usaTemporadasMarcado
              ? 'Salve a série para criar temporadas.'
              : 'Ligue “Usa temporadas” e salve a série para criar.'}
          </Text>
        ) : temporadas.length === 0 ? <Text variant="meta" as="p">Nenhuma temporada. Os quadros desta série usam as mesmas temporadas.</Text> : (
          <ul className="divide-y divide-[var(--border-color)]">
            {temporadas.map(temporada => (
              <li key={temporada.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <Text variant="bodyStrong" as="p" className="truncate">{temporada.nome}</Text>
                  <Text variant="meta" as="p">
                    {episodios(episodiosDaTemporada(temporada.id, state.contents).length)}
                    {normalizarRedesPostIt(temporada.focoRedes ?? []).length > 0
                      ? ` · ${rotuloDoFoco(temporada.focoRedes ?? [])}`
                      : ''}
                  </Text>
                </div>
                <AppButton variant="ghost" size="sm" iconOnly aria-label={`Editar ${temporada.nome}`} title="Editar" onClick={() => setEdicaoTemporada({ modo: 'renomear', temporada })}>
                  <Pencil className="h-4 w-4" />
                </AppButton>
                <AppButton variant="ghost" size="sm" iconOnly aria-label={`Excluir ${temporada.nome}`} title="Excluir" onClick={() => setExcluir({ tipo: 'temporada', temporada })}>
                  <Trash2 className="h-4 w-4" />
                </AppButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SerieCreateModal target={criarQuadro} onClose={() => setCriarQuadro(null)} />
      <TemporadaDialogs
        escopoId={serie.id}
        escopoNome={serie.name ?? ''}
        temporadas={temporadas}
        plataformas={state.platforms}
        edicao={edicaoTemporada}
        excluir={null}
        contagem={id => episodiosDaTemporada(id, state.contents).length}
        onFecharEdicao={() => setEdicaoTemporada(null)}
        onFecharExcluir={() => undefined}
        onCriar={(nome, descricao, focoRedes, status) => {
          void dispatch({
            type: 'ADD_TEMPORADA',
            payload: { id: generateUUID(), userId: user?.id || '', serieId: serie.id, nome, descricao, focoRedes, status, createdAt: new Date().toISOString() },
          });
        }}
        onRenomear={(item, nome, descricao, focoRedes, status) => void dispatch({ type: 'UPDATE_TEMPORADA', payload: { ...item, nome, descricao, focoRedes, status } })}
        onExcluir={() => undefined}
      />
      <ExcluirEstruturaDialog alvo={excluir} onClose={() => setExcluir(null)} />
    </div>
  );
}
