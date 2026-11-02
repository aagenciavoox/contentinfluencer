import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Palette, Plus, SlidersHorizontal, Target } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Section } from '../../../components/ui/Section';
import { SegmentTabs, type SegmentTabOption } from '../../../components/ui/SegmentTabs';
import { useAppContext } from '../../../context/AppContext';
import type { Pilar } from '../../../lib/database';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { sortPilares } from '../../settings/lib/activePilares';
import { AjustesEditorialPanel } from './plano/AjustesEditorialPanel';
import { PlanoVigenteView } from './plano/PlanoVigenteView';
import { intervaloDoModo, periodoInicial, useContagemDoPeriodo, type PeriodoSelecionado } from './plano/PeriodoEditorialControl';
import { useEditorialPlano } from './plano/useEditorialPlano';
import { decisaoDoPeriodo, semanaDe } from '../lib/periodoEditorial';
import { limiteSemanalNaSemana } from '../lib/vigencias';

function linhaDeSeries(nomes: string[]) {
  if (nomes.length === 0) return 'Sem séries ligadas';
  const amostra = nomes.slice(0, 2).join(', ');
  return nomes.length > 2 ? `Séries: ${amostra} e mais ${nomes.length - 2}` : `Séries: ${amostra}`;
}

function nomeChave(nome: string): string {
  return nome.trim().toLocaleLowerCase('pt-BR');
}

export type EditorialAba = 'plano' | 'pilares' | 'ajustes';

interface DirecaoEditorialPanelProps {
  abaAtiva?: EditorialAba;
}

/** Direção editorial: pilares com séries ligadas e ritmo. */
export function DirecaoEditorialPanel({ abaAtiva: abaAtivaProp }: DirecaoEditorialPanelProps = {}) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaParam = searchParams.get('aba');
  const abaAtiva: EditorialAba = abaAtivaProp ?? (abaParam === 'pilares' || abaParam === 'ajustes' ? abaParam : 'plano');

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [periodo, setPeriodo] = useState<PeriodoSelecionado>(() => ({
    modo: 'mes',
    ...intervaloDoModo('mes'),
  }));

  const pilares = useMemo(() => sortPilares(state.pilares), [state.pilares]);
  const { settings, salvarDecisao } = useEditorialPlano();
  const contagem = useContagemDoPeriodo(periodo.inicio, periodo.fim);
  const decisao = decisaoDoPeriodo(settings.periodos, periodo.inicio, periodo.fim);
  const limiteSemanal = limiteSemanalNaSemana(
    { limiteSemanal: settings.preferencias.limiteSemanal, vigencias: settings.vigencias },
    semanaDe(periodo.inicio).inicio,
  );

  const abaOptions: SegmentTabOption<EditorialAba>[] = [
    { id: 'plano', label: 'Plano Vigente', icon: <Target className="h-4 w-4" /> },
    { id: 'pilares', label: 'Pilares & Linhas', icon: <Palette className="h-4 w-4" /> },
    { id: 'ajustes', label: 'Ritmo & Regras Gerais', icon: <SlidersHorizontal className="h-4 w-4" /> },
  ];

  const handleAbaChange = (novaAba: EditorialAba) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (novaAba === 'plano') next.delete('aba');
      else next.set('aba', novaAba);
      return next;
    });
  };

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
      {!abaAtivaProp ? (
        <SegmentTabs<EditorialAba>
          options={abaOptions}
          value={abaAtiva}
          onChange={handleAbaChange}
          ariaLabel="Abas do Editorial"
        />
      ) : null}

      {abaAtiva === 'plano' && (
        <PlanoVigenteView
          periodo={periodo}
          decisao={decisao}
          platforms={state.platforms}
          series={state.series}
          pilares={state.pilares}
          limiteSemanal={limiteSemanal}
          totalPrevistos={contagem.previsto}
          onSalvarDecisao={patch => salvarDecisao(periodo, patch)}
          onPeriodoChange={novo => setPeriodo(prev => ({ ...prev, ...novo }))}
        />
      )}

      {abaAtiva === 'pilares' && (
        <Section title="Pilares">
          {pilares.length === 0 ? (
            <EmptyState
              icon={<Palette className="h-8 w-8" />}
              title="Nenhum pilar cadastrado"
              description="Adicione o primeiro pilar para organizar os temas editoriais."
              action={(
                <AppButton variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/editorial/pilares/nova')}>
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
      )}

      {abaAtiva === 'ajustes' && (
        <div id="ritmo-editorial" className="stack-lg">
          <AjustesEditorialPanel />
        </div>
      )}

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
