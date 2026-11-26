import { createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { CamposDaMeta } from '../../editorial/components/plano/CamposDaMeta';
import { EditorialDrawer } from '../../editorial/components/plano/EditorialDrawer';
import { useFrequenciaDaSerie } from '../../editorial/hooks/useFrequenciaDaSerie';
import { limiteRegraDeOuro } from '../../editorial/lib/avisosEditoriais';
import { rascunhoDaFrequencia, type RascunhoDaFrequencia } from '../../editorial/lib/frequenciaChip';

const SerieRitmoOpenerContext = createContext<((serieId: string) => void) | null>(null);

/** Disponibiliza o abridor do drawer de ritmo para os cards da lista de séries. */
export function SerieRitmoProvider({
  onOpen,
  children,
}: {
  onOpen: (serieId: string) => void;
  children: ReactNode;
}) {
  return (
    <SerieRitmoOpenerContext.Provider value={onOpen}>
      {children}
    </SerieRitmoOpenerContext.Provider>
  );
}

export function useAbrirRitmoDaSerie(): ((serieId: string) => void) | null {
  return useContext(SerieRitmoOpenerContext);
}

/**
 * Drawer lateral dedicado para editar o ritmo (frequência) de uma série
 * sem precisar abrir o formulário completo de edição.
 */
export function SerieRitmoDrawer({
  serieId,
  onClose,
}: {
  serieId: string | null;
  onClose: () => void;
}) {
  const { state } = useAppContext();
  const { serie, editavel, texto, salvar } = useFrequenciaDaSerie(serieId);
  const open = Boolean(serieId && serie && editavel);

  const rascunhoInicial = useMemo(
    () => rascunhoDaFrequencia(serie ?? {}),
    [serie],
  );

  const [rascunho, setRascunho] = useState<RascunhoDaFrequencia>(rascunhoInicial);
  const [erro, setErro] = useState<{ mensagem: string; campo: 'quantidade' | 'periodo' | 'inicio' } | null>(null);
  const [gravando, setGravando] = useState(false);
  const campoId = useId();

  useEffect(() => {
    if (open && serie) {
      setRascunho(rascunhoDaFrequencia(serie));
      setErro(null);
    }
  }, [open, serie?.id]);

  const dirty = open && (
    rascunho.vezes !== rascunhoInicial.vezes
    || rascunho.unidade !== rascunhoInicial.unidade
    || rascunho.aPartirDe !== rascunhoInicial.aPartirDe
  );

  const settings = state.editorial;
  const limiteSerie = limiteRegraDeOuro(settings.avisos);
  const limiteSemanal = settings.preferencias.limiteSemanal;

  const handleSave = async () => {
    if (gravando) return;
    setGravando(true);
    try {
      const resultado = await salvar(rascunho);
      if ('erro' in resultado) {
        setErro({ mensagem: resultado.erro, campo: resultado.campo });
        window.setTimeout(() => document.getElementById(`${campoId}-${resultado.campo}`)?.focus(), 0);
        return;
      }
      onClose();
    } finally {
      setGravando(false);
    }
  };

  return (
    <EditorialDrawer
      open={open}
      escopoConta={serie?.name.trim() || 'Série'}
      secao="Ritmo"
      title="Editar ritmo da série"
      subtitle={texto ? `Ritmo atual: ${texto}` : undefined}
      dirty={dirty}
      onClose={onClose}
      onSave={() => void handleSave()}
      saveLabel="Salvar ritmo"
      canSave={!gravando}
      saving={gravando}
    >
      {open ? (
        <div className="stack-lg">
          <div className="stack-xs rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-3.5">
            <Text variant="eyebrow" as="p" className="text-[var(--text-secondary)]">
              Regras ativas da rotina
            </Text>
            <div className="stack-xs">
              <Text variant="meta" as="p" className="text-[var(--text-primary)]">
                Limite por série: até {limiteSerie} por semana
              </Text>
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                Meta geral: {limiteSemanal != null ? `${limiteSemanal} por semana` : 'não definida'}
              </Text>
            </div>
          </div>

          <CamposDaMeta
            idPrefix={campoId}
            vezes={rascunho.vezes}
            unidade={rascunho.unidade}
            inicio={rascunho.aPartirDe}
            onVezes={vezes => {
              setErro(null);
              setRascunho(atual => ({ ...atual, vezes }));
            }}
            onUnidade={unidade => {
              setErro(null);
              setRascunho(atual => ({ ...atual, unidade }));
            }}
            onInicio={aPartirDe => {
              setErro(null);
              setRascunho(atual => ({ ...atual, aPartirDe }));
            }}
            mostrarLegenda
            linkDaRegraDeOuro
            erros={erro ? { [erro.campo]: erro.mensagem } : undefined}
          />

          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            Quantidade vazia tira a meta e mantém a série sob demanda. Acompanhamento e regras ficam na Continuidade, no Plano do período.
          </Text>
        </div>
      ) : null}
    </EditorialDrawer>
  );
}
