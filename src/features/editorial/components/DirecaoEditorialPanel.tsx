import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Plus } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Section } from '../../../components/ui/Section';
import { useAppContext } from '../../../context/AppContext';
import type { Pilar } from '../../../lib/database';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { sortPilares } from '../../settings/lib/activePilares';
import { AjustesEditorialPanel } from './plano/AjustesEditorialPanel';

function linhaDeSeries(nomes: string[]) {
  if (nomes.length === 0) return 'Sem séries ligadas';
  const amostra = nomes.slice(0, 2).join(', ');
  return nomes.length > 2 ? `Séries: ${amostra} e mais ${nomes.length - 2}` : `Séries: ${amostra}`;
}

function nomeChave(nome: string): string {
  return nome.trim().toLocaleLowerCase('pt-BR');
}

/** Direção editorial: pilares com séries ligadas e ritmo. */
export function DirecaoEditorialPanel() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const pilares = useMemo(() => sortPilares(state.pilares), [state.pilares]);

  const nomesRepetidos = useMemo(() => {
    const result = new Map<string, number>();
    pilares.forEach(pilar => {
      const chave = nomeChave(pilar.nome);
      result.set(chave, (result.get(chave) ?? 0) + 1);
    });
    return result;
  }, [pilares]);

  const seriesPorPilar = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const serie of state.series) {
      const pilarId = serie.pilarPrincipalId || serie.pilarIds[0];
      if (!pilarId) continue;
      const lista = map.get(pilarId) ?? [];
      lista.push(serie.name);
      map.set(pilarId, lista);
    }
    return map;
  }, [state.series]);

  const remove = (pilar: Pilar) => {
    setConfirm({
      ...CONFIRM.excluirPilar,
      onConfirm: () => dispatch({ type: 'DELETE_PILAR', payload: pilar.id }),
    });
  };

  return (
    <div className="stack-lg">
      <Section
        title="Pilares"
        action={(
          <AppButton variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/editorial/pilares/nova')}>
            Novo pilar
          </AppButton>
        )}
      >
        {pilares.length === 0 ? (
          <EmptyState
            icon={<Palette className="h-8 w-8" />}
            title="Nenhum pilar cadastrado"
            description="Adicione o primeiro pilar para organizar os temas editoriais."
            action={(
              <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/editorial/pilares/nova')}>
                Novo pilar
              </AppButton>
            )}
          />
        ) : (
          <div className={SETTINGS_ENTITY_GRID_CLASS}>
            {pilares.map(pilar => {
              const nomeRepetido = (nomesRepetidos.get(nomeChave(pilar.nome)) ?? 0) > 1;
              const ligadas = seriesPorPilar.get(pilar.id) ?? [];
              return (
                <SettingsGridCard
                  key={pilar.id}
                  compact
                  title={pilar.nome}
                  color={pilar.cor}
                  active={pilar.ativo}
                  inactiveLabel="Inativo"
                  dimmed={!pilar.ativo}
                  onToggle={() => dispatch({ type: 'UPDATE_PILAR', payload: { ...pilar, ativo: !pilar.ativo } })}
                  onOpen={() => navigate(`/editorial/pilares/${pilar.id}`)}
                  onEdit={() => navigate(`/editorial/pilares/${pilar.id}`)}
                  editLabel="Editar definições"
                  onDelete={() => remove(pilar)}
                  meta={linhaDeSeries(ligadas)}
                  badges={nomeRepetido ? <Badge variant="warning">Nome repetido</Badge> : undefined}
                />
              );
            })}
          </div>
        )}
      </Section>

      <Section
        title="Ritmo e ajustes"
        description="Configurações gerais. Metas de um período ficam no Planejamento."
        action={(
          <AppButton variant="secondary" onClick={() => navigate('/planejamento')}>
            Prioridade e metas
          </AppButton>
        )}
      >
        <div id="ritmo-editorial">
          <AjustesEditorialPanel />
        </div>
      </Section>

      <ConfirmModal
        open={Boolean(confirm)}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
