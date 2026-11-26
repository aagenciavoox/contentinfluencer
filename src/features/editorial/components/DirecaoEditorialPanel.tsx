import { useEffect, useMemo, useState } from 'react';
import { Palette, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { SettingsGridCard } from '../../../components/settings/SettingsGridCard';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import type { Pilar, Platform } from '../../../lib/database';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { sortPilares } from '../../settings/lib/activePilares';
import { ContasHorariosPanel } from '../../contas/components/ContasHorariosPanel';
import {
  ANCORA_IDENTIDADE,
  ANCORA_PILARES,
  ANCORA_PLANEJAMENTO,
  ANCORA_REGRAS_E_AVISOS,
} from '../lib/abasEditorial';
import { pilarHerdadoDaSerie } from '../lib/herancaSerie';
import { pilarPrincipalDaSerie } from '../lib/pilarDaSerie';
import { ContaEditorialPanel } from './ContaEditorialPanel';
import { AvisosEditorialPanel } from './plano/AvisosEditorialPanel';
import { DistribuicaoObjetivosCard } from './plano/DistribuicaoObjetivosCard';
import { DnaDaVozCard } from './plano/DnaDaVozCard';
import { HashtagsGeraisCard } from './plano/HashtagsGeraisCard';
import { PilarEditDrawer } from './plano/PilarEditDrawer';
import { RegraDeOuroCard } from './plano/RegraDeOuroCard';
import { RitmoECapacidadeCard } from './plano/RitmoECapacidadeCard';
import { VariedadeConcentracaoCard } from './plano/VariedadeConcentracaoCard';

function nomeChave(nome: string): string {
  return nome.trim().toLocaleLowerCase('pt-BR');
}

function rolarAte(id: string) {
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
}

/** Linha única compacta de séries vinculadas sem esconder o indicador de "+N". */
function ResumoSeriesDoPilar({ nomes }: { nomes: string[] }) {
  if (nomes.length === 0) {
    return (
      <Text variant="meta" as="p" className="mt-2 text-[var(--text-tertiary)]">
        Sem séries ligadas
      </Text>
    );
  }
  const primeira = nomes[0];
  const extras = nomes.length - 1;
  return (
    <div className="mt-2 flex min-w-0 items-center gap-1 t-meta text-[var(--text-secondary)]">
      <span className="min-w-0 truncate">{primeira}</span>
      {extras > 0 ? (
        <span className="shrink-0 tabular-nums text-[var(--text-tertiary)]">· +{extras}</span>
      ) : null}
    </div>
  );
}

function CabecalhoSecao({ id, titulo, subtitulo }: { id: string; titulo: string; subtitulo: string }) {
  return (
    <div className="stack-xs">
      <Text variant="sectionTitle" as="h2">
        <span id={id}>{titulo}</span>
      </Text>
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
        {subtitulo}
      </Text>
    </div>
  );
}

interface DirecaoEditorialPanelProps {
  conta: Platform | null;
  formularioConta: Platform | 'nova' | null;
  onFormularioConta: (valor: Platform | 'nova' | null) => void;
  pilarAberto?: string | null;
  onPilarAbertoChange?: (id: string | null) => void;
}

/**
 * Geral (organizado em Identidade, Planejamento e Regras e avisos, somente leitura com edição em drawers)
 * ou a conta aberta em `?conta=`.
 */
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

  useEffect(() => {
    if (conta && !pilarControlado) setPilarInterno(null);
  }, [conta, pilarControlado]);

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
      lista.push(propria ? serie.name : `${serie.name} (herdado${origem ? ` de ${origem.name}` : ''})`);
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
    <div className="stack-xl">
      {conta ? (
        <ContaEditorialPanel conta={conta} onEditarConta={() => onFormularioConta(conta)} />
      ) : (
        <>
          {/* 1. Identidade */}
          <section id={ANCORA_IDENTIDADE} aria-labelledby="secao-identidade" className="scroll-mt-28 stack-md">
            <CabecalhoSecao
              id="secao-identidade"
              titulo="Identidade"
              subtitulo="Como você fala, o que defende e os temas que sustentam o conteúdo."
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
              <div className="min-w-0 lg:col-span-8">
                <DnaDaVozCard />
              </div>
              <div className="min-w-0 lg:col-span-4">
                <HashtagsGeraisCard />
              </div>
            </div>

            <div id={ANCORA_PILARES} className="scroll-mt-28">
              <Surface padding="lg" className="stack-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="stack-xs min-w-0">
                    <Text variant="itemTitle" as="h3">Pilares</Text>
                    <Text variant="meta" as="p" className="text-[var(--text-secondary)] tabular-nums">
                      {pilares.length === 1
                        ? '1 pilar · cada série aparece vinculada ao pilar correspondente'
                        : `${pilares.length} pilares · cada série aparece vinculada ao pilar correspondente`}
                    </Text>
                  </div>
                  {pilares.length > 0 ? (
                    <AppButton
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => setPilarAberto('nova')}
                    >
                      Adicionar pilar
                    </AppButton>
                  ) : null}
                </div>

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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {pilares.map(pilar => {
                      const nomeRepetido = (nomesRepetidos.get(nomeChave(pilar.nome)) ?? 0) > 1;
                      const ligadas = seriesPorPilar.get(pilar.id) ?? [];
                      return (
                        <SettingsGridCard
                          key={pilar.id}
                          compact
                          className="bg-[var(--bg-primary)]"
                          title={pilar.nome}
                          color={pilar.cor}
                          active={pilar.ativo}
                          inactiveLabel="Inativo"
                          dimmed={!pilar.ativo}
                          onToggle={() => dispatch({ type: 'UPDATE_PILAR', payload: { ...pilar, ativo: !pilar.ativo } })}
                          onOpen={() => setPilarAberto(pilar.id)}
                          onEdit={() => setPilarAberto(pilar.id)}
                          editLabel="Editar pilar"
                          onDelete={() => remove(pilar)}
                          badges={nomeRepetido ? <Badge variant="warning">Nome repetido</Badge> : undefined}
                        >
                          <ResumoSeriesDoPilar nomes={ligadas} />
                        </SettingsGridCard>
                      );
                    })}
                  </div>
                )}
              </Surface>
            </div>
          </section>

          {/* 2. Planejamento */}
          <section id={ANCORA_PLANEJAMENTO} aria-labelledby="secao-planejamento" className="scroll-mt-28 stack-md">
            <CabecalhoSecao
              id="secao-planejamento"
              titulo="Planejamento"
              subtitulo="Metas, capacidade e espaço reservado para publicar fora das séries."
            />

            <DistribuicaoObjetivosCard />
            <RitmoECapacidadeCard />
          </section>

          {/* 3. Regras e avisos */}
          <section id={ANCORA_REGRAS_E_AVISOS} aria-labelledby="secao-regras-e-avisos" className="scroll-mt-28 stack-md">
            <CabecalhoSecao
              id="secao-regras-e-avisos"
              titulo="Regras e avisos"
              subtitulo="Limites e alertas usados na análise do período."
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
              <div className="min-w-0">
                <RegraDeOuroCard />
              </div>
              <div className="min-w-0">
                <VariedadeConcentracaoCard />
              </div>
              <div className="min-w-0">
                <AvisosEditorialPanel />
              </div>
            </div>
          </section>
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
