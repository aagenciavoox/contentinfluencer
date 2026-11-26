import {useEffect, useId, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {SelectField} from '../../../components/ui/SelectField';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import {pontosParaRevisar, type AvisoOrientacao} from '../lib/orientacaoEditorial';
import {linhasDaRegua} from '../lib/reguaFrequencia';
import type {Continuidade} from '../lib/saudeIndicadores';
import {PlanejamentoSaudeDrawer, type AbaSaudeDrawer} from './PlanejamentoSaudeDrawer';

export interface PlanejamentoSaudeBarProps {
  avisos: readonly AvisoOrientacao[];
  avisoAtivoId?: string | null;
  onLocalizar: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onQueroFazerAMais?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
  continuidade: Continuidade<unknown> | null | undefined;
  vista: 'mes' | 'semana';
  trecho: 'calendario' | 'intervalo';
  onTrechoChange: (trecho: 'calendario' | 'intervalo') => void;
  intervalo: {inicio: string; fim: string};
  onIntervaloChange: (intervalo: {inicio: string; fim: string}) => void;
  onVerAnalise: () => void;
}

const triggerBaseClass =
  'inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-input)] px-2.5 py-1 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

/**
 * Faixa única de saúde do Planejamento (desktop): combina Ajustes, Ritmo das séries,
 * período da Saúde e Ver análise numa única linha; detalhes abrem em drawer lateral.
 */
export function PlanejamentoSaudeBar({
  avisos,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onQueroFazerAMais,
  onLimparDestaque,
  continuidade,
  vista,
  trecho,
  onTrechoChange,
  intervalo,
  onIntervaloChange,
  onVerAnalise,
}: PlanejamentoSaudeBarProps) {
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaSaudeDrawer>('ajustes');
  const baseId = useId();
  const inicioId = `${baseId}-inicio`;
  const fimId = `${baseId}-fim`;

  const revisar = pontosParaRevisar(avisos);
  const linhasRegua = linhasDaRegua(continuidade);
  const temRitmo = linhasRegua.length > 0;
  const totalAjustes = revisar > 0 ? revisar : avisos.length;

  useEffect(() => {
    const abrirRitmo = () => {
      setAbaAtiva('ritmo');
      setDrawerAberto(true);
    };
    window.addEventListener('criaki:abrir-ritmo', abrirRitmo);
    return () => window.removeEventListener('criaki:abrir-ritmo', abrirRitmo);
  }, []);

  const abrirAba = (alvo: AbaSaudeDrawer) => {
    setAbaAtiva(alvo);
    setDrawerAberto(true);
  };

  return (
    <>
      <Surface
        variant="outlined"
        padding="none"
        className="w-full overflow-hidden bg-[var(--bg-elevated)]"
        data-planejamento-avisos-faixa
        data-planejamento-regua-slot
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              aria-expanded={drawerAberto && abaAtiva === 'ajustes'}
              onClick={() => abrirAba('ajustes')}
              className={cn(
                triggerBaseClass,
                drawerAberto && abaAtiva === 'ajustes' && 'bg-[var(--bg-hover)]',
              )}
            >
              {revisar > 0 ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-orange)]" aria-hidden />
              ) : null}
              <Text variant="label" as="span" className="text-[var(--text-primary)]">
                {totalAjustes > 0 ? `Ajustes (${totalAjustes})` : 'Ajustes'}
              </Text>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            </button>

            {temRitmo ? (
              <>
                <span className="mx-1 h-4 w-px bg-[var(--border-color)]" aria-hidden />
                <button
                  type="button"
                  aria-expanded={drawerAberto && abaAtiva === 'ritmo'}
                  onClick={() => abrirAba('ritmo')}
                  className={cn(
                    triggerBaseClass,
                    drawerAberto && abaAtiva === 'ritmo' && 'bg-[var(--bg-hover)]',
                  )}
                >
                  <Text variant="label" as="span" className="text-[var(--text-primary)]">
                    {`Ritmo das séries (${linhasRegua.length})`}
                  </Text>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                </button>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SelectField
              ariaLabel="Trecho da Saúde"
              value={trecho}
              onChange={value => onTrechoChange(value === 'intervalo' ? 'intervalo' : 'calendario')}
              selected={trecho === 'intervalo'}
              className="min-h-8 md:min-h-8"
              options={[
                {value: 'calendario', label: vista === 'semana' ? 'Semana visível' : 'Mês visível'},
                {value: 'intervalo', label: 'Intervalo'},
              ]}
            />
            {trecho === 'intervalo' ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                <label htmlFor={inicioId} className="sr-only">Início do intervalo da Saúde</label>
                <input
                  id={inicioId}
                  type="date"
                  value={intervalo.inicio}
                  onChange={event => onIntervaloChange({...intervalo, inicio: event.target.value})}
                  className="input min-h-8 px-2 py-1 t-meta"
                />
                <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">a</Text>
                <label htmlFor={fimId} className="sr-only">Fim do intervalo da Saúde</label>
                <input
                  id={fimId}
                  type="date"
                  value={intervalo.fim}
                  onChange={event => onIntervaloChange({...intervalo, fim: event.target.value})}
                  className="input min-h-8 px-2 py-1 t-meta"
                />
              </span>
            ) : null}
            <AppButton variant="ghost" size="xs" onClick={onVerAnalise}>
              Ver análise
            </AppButton>
          </div>
        </div>
      </Surface>

      <PlanejamentoSaudeDrawer
        open={drawerAberto}
        abaAtiva={abaAtiva}
        onAbaChange={setAbaAtiva}
        onClose={() => setDrawerAberto(false)}
        avisos={avisos}
        avisoAtivoId={avisoAtivoId}
        onLocalizar={onLocalizar}
        onFoiDeProposito={onFoiDeProposito}
        onQueroFazerAMais={onQueroFazerAMais}
        onLimparDestaque={onLimparDestaque}
        continuidade={continuidade}
        onVerAnalise={onVerAnalise}
      />
    </>
  );
}
