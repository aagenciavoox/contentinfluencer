import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, AtSign, Palette, Plus, SlidersHorizontal, Target } from 'lucide-react';
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
import { ContasHorariosPanel } from '../../contas/components/ContasHorariosPanel';
import { AjustesEditorialPanel } from './plano/AjustesEditorialPanel';
import { ContinuidadePanel } from './plano/ContinuidadePanel';
import { PeriodoPanel } from './plano/PeriodoPanel';
import { periodoInicial, type PeriodoSelecionado } from './plano/PeriodoEditorialControl';
import { lerPeriodoSalvo } from '../lib/periodoEditorial';
import { pilarHerdadoDaSerie } from '../lib/herancaSerie';
import { pilarPrincipalDaSerie } from '../lib/pilarDaSerie';

function linhaDeSeries(nomes: string[]) {
  if (nomes.length === 0) return 'Sem séries ligadas';
  const amostra = nomes.slice(0, 2).join(', ');
  return nomes.length > 2 ? `Séries: ${amostra} e mais ${nomes.length - 2}` : `Séries: ${amostra}`;
}

function nomeChave(nome: string): string {
  return nome.trim().toLocaleLowerCase('pt-BR');
}

export type EditorialAba = 'plano' | 'continuidade' | 'pilares' | 'ajustes' | 'contas';

const EDITORIAL_ABAS: readonly EditorialAba[] = ['plano', 'continuidade', 'pilares', 'ajustes', 'contas'];

/** Lê `?aba=` da URL; qualquer valor desconhecido cai em Plano Vigente. */
export function abaEditorialDaUrl(valor: string | null): EditorialAba {
  return (EDITORIAL_ABAS as readonly string[]).includes(valor ?? '') ? (valor as EditorialAba) : 'plano';
}

export function opcoesAbasEditorial(): SegmentTabOption<EditorialAba>[] {
  return [
    { id: 'plano', label: 'Plano Vigente', icon: <Target className="h-4 w-4" /> },
    { id: 'continuidade', label: 'Continuidade', icon: <Activity className="h-4 w-4" /> },
    { id: 'pilares', label: 'Pilares & Linhas', icon: <Palette className="h-4 w-4" /> },
    { id: 'ajustes', label: 'Ritmo & Regras Gerais', icon: <SlidersHorizontal className="h-4 w-4" /> },
    { id: 'contas', label: 'Contas & Horários', icon: <AtSign className="h-4 w-4" /> },
  ];
}

interface DirecaoEditorialPanelProps {
  abaAtiva?: EditorialAba;
}

/** Direção editorial: pilares com séries ligadas e ritmo. */
export function DirecaoEditorialPanel({ abaAtiva: abaAtivaProp }: DirecaoEditorialPanelProps = {}) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaParam = searchParams.get('aba');
  const abaAtiva: EditorialAba = abaAtivaProp ?? abaEditorialDaUrl(abaParam);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  // O mesmo período salvo que o Planejamento usa: as metas ficam presas ao início e fim exatos.
  const periodo = useMemo(
    () => (state.editorialVisao ? lerPeriodoSalvo(state.editorialVisao) : null) ?? periodoInicial(),
    [state.editorialVisao],
  );
  const salvarPeriodo = (next: PeriodoSelecionado) => {
    dispatch({ type: 'SET_EDITORIAL_VISAO', payload: next });
  };

  const pilares = useMemo(() => sortPilares(state.pilares), [state.pilares]);

  const abaOptions = opcoesAbasEditorial();

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
      if (serie.tipoAgrupamento === 'familia') continue;
      // O pilar que vale para a série: o próprio ou o herdado da série de cima.
      const pilarId = pilarHerdadoDaSerie(serie.id, state.series);
      if (!pilarId) continue;
      const propria = pilarPrincipalDaSerie(serie) === pilarId;
      // De quem veio: o primeiro acima que tem esse pilar escolhido (pode ser a família, não só o pai).
      let origem = serie.parentId ? state.series.find(item => item.id === serie.parentId) ?? null : null;
      for (let passo = 0; origem && pilarPrincipalDaSerie(origem) !== pilarId && passo < 6; passo += 1) {
        origem = origem.parentId ? state.series.find(item => item.id === origem!.parentId) ?? null : null;
      }
      const lista = map.get(pilarId) ?? [];
      lista.push(propria ? `${serie.name} (próprio)` : `${serie.name} (herdado${origem ? ` de ${origem.name}` : ''})`);
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

      {/* O mesmo painel do "Prioridade e metas" do Planejamento: mesmos campos, mesmo editor. */}
      {abaAtiva === 'plano' && (
        <PeriodoPanel
          periodo={periodo}
          onPeriodoChange={salvarPeriodo}
          onAbrirAjustes={() => handleAbaChange('ajustes')}
          planoRecolhivel={false}
        />
      )}

      {abaAtiva === 'continuidade' && <ContinuidadePanel />}

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

      {abaAtiva === 'contas' && <ContasHorariosPanel />}

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
