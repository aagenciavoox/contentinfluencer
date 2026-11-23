import { useEffect, useMemo, useState } from 'react';
import { Palette, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Section } from '../../../components/ui/Section';
import { useAppContext } from '../../../context/AppContext';
import type { Pilar, Platform } from '../../../lib/database';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { sortPilares } from '../../settings/lib/activePilares';
import { ContasHorariosPanel } from '../../contas/components/ContasHorariosPanel';
import {
  ANCORA_AVISOS,
  ANCORA_PILARES,
  ANCORA_REGRA_DE_OURO,
} from '../lib/abasEditorial';
import { pilarHerdadoDaSerie } from '../lib/herancaSerie';
import { pilarPrincipalDaSerie } from '../lib/pilarDaSerie';
import { ContaEditorialPanel } from './ContaEditorialPanel';
import { AjustesEditorialPanel } from './plano/AjustesEditorialPanel';
import { AvisosEditorialPanel } from './plano/AvisosEditorialPanel';
import { DnaDaVozCard } from './plano/DnaDaVozCard';
import { IndicadoresDaRotinaCard } from './plano/IndicadoresDaRotinaCard';
import { PausasDoPeriodo } from './plano/PausasDoPeriodo';
import { PilarEditDrawer } from './plano/PilarEditDrawer';
import { RegraDeOuroCard } from './plano/RegraDeOuroCard';
import { VariedadeConcentracaoCard } from './plano/VariedadeConcentracaoCard';

function linhaDeSeries(nomes: string[]) {
  if (nomes.length === 0) return 'Sem séries ligadas';
  const amostra = nomes.slice(0, 2).join(', ');
  return nomes.length > 2 ? `Séries: ${amostra} e mais ${nomes.length - 2}` : `Séries: ${amostra}`;
}

function nomeChave(nome: string): string {
  return nome.trim().toLocaleLowerCase('pt-BR');
}

function rolarAte(id: string) {
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
}

interface DirecaoEditorialPanelProps {
  conta: Platform | null;
  formularioConta: Platform | 'nova' | null;
  onFormularioConta: (valor: Platform | 'nova' | null) => void;
  pilarAberto?: string | null;
  onPilarAbertoChange?: (id: string | null) => void;
}

/** Geral, ou a conta aberta em `?conta=`. O Plano do período saiu daqui: a conferência mora na Saúde. */
export function DirecaoEditorialPanel({
  conta,
  formularioConta,
  onFormularioConta,
  pilarAberto: pilarAbertoProp,
  onPilarAbertoChange,
}: DirecaoEditorialPanelProps) {
  const { state, dispatch } = useAppContext();
  const location = useLocation();
  const ancora = location.hash.replace(/^#/, '');
  useEffect(() => {
    if (!conta && ancora) rolarAte(ancora);
  }, [ancora, conta]);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [pilarInterno, setPilarInterno] = useState<string | null>(null);
  const pilarControlado = pilarAbertoProp !== undefined;
  const pilarAberto = pilarControlado ? pilarAbertoProp : pilarInterno;
  const setPilarAberto = (id: string | null) => {
    if (!pilarControlado) setPilarInterno(id);
    onPilarAbertoChange?.(id);
  };

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
      if (serie.tipoAgrupamento === 'familia') continue;
      const pilarId = pilarHerdadoDaSerie(serie.id, state.series);
      if (!pilarId) continue;
      const propria = pilarPrincipalDaSerie(serie) === pilarId;
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
      {conta ? (
        <ContaEditorialPanel conta={conta} onEditarConta={() => onFormularioConta(conta)} />
      ) : (
        <>
          <DnaDaVozCard />

          <div id={ANCORA_PILARES} className="scroll-mt-24">
            <Section title="Pilares">
              {pilares.length === 0 ? (
                <EmptyState
                  icon={<Palette className="h-8 w-8" />}
                  title="Nenhum pilar ainda"
                  description="Um pilar junta as séries que falam do mesmo assunto."
                  action={(
                    <AppButton variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setPilarAberto('nova')}>
                      Adicionar pilar
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
                        onOpen={() => setPilarAberto(pilar.id)}
                        onEdit={() => setPilarAberto(pilar.id)}
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
          </div>

          <AjustesEditorialPanel secao="operacional" />
          <AjustesEditorialPanel secao="proporcao" />
          <AjustesEditorialPanel secao="gravacao" />
          <AjustesEditorialPanel secao="faixas" />
          <PausasDoPeriodo armazenadas escopos={['publicacao', 'gravacao', 'producao']} />
          <IndicadoresDaRotinaCard />
          <div id={ANCORA_AVISOS} className="scroll-mt-24">
            <AvisosEditorialPanel />
          </div>
          <div id={ANCORA_REGRA_DE_OURO} className="scroll-mt-24">
            <RegraDeOuroCard />
          </div>
          <VariedadeConcentracaoCard />
        </>
      )}

      <ContasHorariosPanel
        aberto={formularioConta != null}
        contaInicial={formularioConta && formularioConta !== 'nova' ? formularioConta : null}
        onFechar={() => onFormularioConta(null)}
        contaId={conta?.id ?? null}
      />

      <PilarEditDrawer pilarId={pilarAberto ?? null} onClose={() => setPilarAberto(null)} />

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
