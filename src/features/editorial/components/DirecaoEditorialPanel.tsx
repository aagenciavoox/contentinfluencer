import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AtSign, Compass, Palette, Plus, SlidersHorizontal, Target } from 'lucide-react';
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
import { AvisosEditorialPanel } from './plano/AvisosEditorialPanel';
import { MetodoCalculoCard } from './plano/MetodoCalculoCard';
import { ContinuidadePanel } from './plano/ContinuidadePanel';
import { PeriodoPanel } from './plano/PeriodoPanel';
import { PerfilEditorialCard } from './plano/PerfilEditorialCard';
import { IndicadoresDaRotinaCard } from './plano/IndicadoresDaRotinaCard';
import { PilarEditDrawer } from './plano/PilarEditDrawer';
import {
  abaEditorialDaUrl,
  ancoraDaAbaAntiga,
  ANCORA_AVISOS,
  ANCORA_CONTINUIDADE,
  ANCORA_HASHTAGS,
  paramsDaAba,
  ROTULO_DA_ABA,
  type EditorialAba,
} from '../lib/abasEditorial';
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

export { abaEditorialDaUrl, type EditorialAba };

/** Ordem em `EDITORIAL_ABAS` (lib/abasEditorial). */
export function opcoesAbasEditorial(): SegmentTabOption<EditorialAba>[] {
  return [
    { id: 'plano', label: ROTULO_DA_ABA.plano, icon: <Target className="h-4 w-4" /> },
    { id: 'direcao', label: ROTULO_DA_ABA.direcao, icon: <Compass className="h-4 w-4" /> },
    { id: 'ajustes', label: ROTULO_DA_ABA.ajustes, icon: <SlidersHorizontal className="h-4 w-4" /> },
    { id: 'contas', label: ROTULO_DA_ABA.contas, icon: <AtSign className="h-4 w-4" /> },
  ];
}

interface DirecaoEditorialPanelProps {
  abaAtiva?: EditorialAba;
}

function rolarAte(id: string) {
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
}

/**
 * Conteúdo das 4 abas do Editorial.
 * Plano do período inclui a Continuidade; Direção editorial inclui as hashtags fora das séries;
 * Rotina de criação inclui os Avisos.
 */
export function DirecaoEditorialPanel({ abaAtiva: abaAtivaProp }: DirecaoEditorialPanelProps = {}) {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaParam = searchParams.get('aba');
  const abaAtiva: EditorialAba = abaAtivaProp ?? abaEditorialDaUrl(abaParam);
  const location = useLocation();
  // Bloco que antes era aba própria (#continuidade, #avisos, #hashtags ou id antigo em ?aba=).
  const ancora = location.hash.replace(/^#/, '') || ancoraDaAbaAntiga(abaParam);
  useEffect(() => {
    if (ancora) rolarAte(ancora);
  }, [ancora, abaAtiva]);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  // Pilar aberto na gaveta (id, 'nova' para criar, null fechado).
  const [pilarAberto, setPilarAberto] = useState<string | null>(null);
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
    setSearchParams(prev => paramsDaAba(prev, novaAba), { replace: true });
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
      {/* Plano: respiro fixo de --space-2xl (32px no desktop) entre o bloco de cima e a Continuidade. */}
      {abaAtiva === 'plano' && (
        <div className="stack-2xl">
          <PeriodoPanel
            periodo={periodo}
            onPeriodoChange={salvarPeriodo}
            onAbrirAjustes={() => handleAbaChange('ajustes')}
            planoRecolhivel={false}
            semListasDoPeriodo
          />
          <div id={ANCORA_CONTINUIDADE} className="scroll-mt-24">
            <ContinuidadePanel periodo={periodo} />
          </div>
        </div>
      )}

      {/* Direção editorial: perfil, distribuição por objetivo, pilares e hashtags fora das séries. */}
      {abaAtiva === 'direcao' && <PerfilEditorialCard />}

      {abaAtiva === 'direcao' && <AjustesEditorialPanel secao="proporcao" />}

      {abaAtiva === 'direcao' && (
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
      )}

      {abaAtiva === 'direcao' && (
        <div id={ANCORA_HASHTAGS} className="scroll-mt-24">
          <AjustesEditorialPanel secao="operacional" />
        </div>
      )}

      {/* Rotina de criação: capacidade, método de cálculo e teto, e logo abaixo os avisos. */}
      {/* Duas colunas: capacidade e indicadores à esquerda, avisos à direita (uma coluna no celular). */}
      {abaAtiva === 'ajustes' && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div id="ritmo-editorial" className="min-w-0 stack-lg">
            <AjustesEditorialPanel />
            <MetodoCalculoCard periodo={periodo} />
            <IndicadoresDaRotinaCard />
          </div>
          <div id={ANCORA_AVISOS} className="min-w-0 scroll-mt-24">
            <AvisosEditorialPanel onAbrirCapacidade={() => rolarAte('dias-de-gravacao')} />
          </div>
        </div>
      )}

      {abaAtiva === 'contas' && <ContasHorariosPanel />}

      <PilarEditDrawer pilarId={pilarAberto} onClose={() => setPilarAberto(null)} />

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
