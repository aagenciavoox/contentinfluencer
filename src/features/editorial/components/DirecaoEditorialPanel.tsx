import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Plus, Settings2 } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { SidePanel } from '../../../components/layout/SidePanel';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import type { Pilar } from '../../../lib/database';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { sortPilares } from '../../settings/lib/activePilares';
import { AjustesEditorialPanel } from './plano/AjustesEditorialPanel';

function nomeChave(nome: string): string {
  return nome.trim().toLocaleLowerCase('pt-BR');
}

/** Direção editorial: pilares com séries ligadas e ritmo. Configurações abre conta/horários/hashtags. */
export function DirecaoEditorialPanel() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [configAberta, setConfigAberta] = useState(false);
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="stack-xs min-w-0">
          <Text variant="sectionTitle" as="h2">Pilares</Text>
          <Text variant="secondary" as="p">
            Os assuntos do perfil. Cada um mostra as séries ligadas.
          </Text>
        </div>
        <AppButton variant="secondary" size="sm" leftIcon={<Settings2 className="h-4 w-4" />} onClick={() => setConfigAberta(true)}>
          Configurações
        </AppButton>
      </div>

      {(state.dnaVoz?.publico?.trim() || state.editorial.preferencias.publicoLinguagem?.trim()) ? (
        <div className="stack-xs rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <Text variant="label" as="p">Público e linguagem</Text>
          <Text variant="body" as="p" className="mt-1 whitespace-pre-wrap">
            {state.editorial.preferencias.publicoLinguagem?.trim()
              || state.dnaVoz?.publico?.trim()
              || ''}
          </Text>
        </div>
      ) : null}

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
                title={pilar.nome}
                description={pilar.descricao || undefined}
                color={pilar.cor}
                active={pilar.ativo}
                dimmed={!pilar.ativo}
                onToggle={() => dispatch({ type: 'UPDATE_PILAR', payload: { ...pilar, ativo: !pilar.ativo } })}
                onOpen={() => navigate(`/editorial/pilares/${pilar.id}`)}
                onDelete={() => remove(pilar)}
                meta={[
                  ligadas.length === 0
                    ? 'Sem séries ligadas'
                    : ligadas.length <= 2
                      ? ligadas.join(' · ')
                      : `${ligadas.slice(0, 2).join(' · ')} e mais ${ligadas.length - 2}`,
                  nomeRepetido ? 'Outro pilar tem o mesmo nome.' : null,
                ].filter(Boolean).join(' · ')}
                badges={nomeRepetido ? <Badge variant="warning">Nome repetido</Badge> : undefined}
              />
            );
          })}
        </div>
      )}

      <AjustesEditorialPanel />

      <SidePanel open={configAberta} onClose={() => setConfigAberta(false)} title="Configurações" widthClassName="max-w-lg">
        <div className="stack-sm p-4">
          <Text variant="secondary" as="p">
            Conta de referência, horários e hashtags fora das séries ficam nos cartões abaixo. Role até eles no painel principal ou feche e use a seção Ritmo.
          </Text>
          <AppButton variant="secondary" size="sm" onClick={() => setConfigAberta(false)}>
            Fechar e ver ritmo
          </AppButton>
        </div>
      </SidePanel>

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
