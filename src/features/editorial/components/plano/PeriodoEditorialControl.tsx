import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { ChoiceChips } from '../../../../components/ui/ChoiceChips';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import { buildGradeEntries } from '../../lib/gradeEntries';
import { contarPeriodo, type GradeCounts } from '../../lib/gradeCounts';
import { semanaDe, type ModoPeriodo, type PeriodoSelecionado } from '../../lib/periodoEditorial';

export type { ModoPeriodo, PeriodoSelecionado };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

const CAMPO_DATA =
  'ds-input min-h-11 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 t-body text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

export function hojeIso(agora = new Date()): string {
  return format(agora, 'yyyy-MM-dd');
}

export function periodoInicial(hoje = hojeIso()): PeriodoSelecionado {
  return { modo: 'semana', ...semanaDe(hoje) };
}

export function intervaloDoModo(modo: 'semana' | 'mes', hoje = hojeIso()): { inicio: string; fim: string } {
  if (modo === 'semana') return semanaDe(hoje);
  const dia = parseISO(hoje);
  return {
    inicio: format(startOfMonth(dia), 'yyyy-MM-dd'),
    fim: format(endOfMonth(dia), 'yyyy-MM-dd'),
  };
}

/** Semanas de domingo a sábado que o intervalo só cobre em parte. */
export function semanasParciais(inicio: string, fim: string): Array<{ inicio: string; fim: string }> {
  if (!DATA.test(inicio) || !DATA.test(fim) || fim < inicio) return [];

  const parciais: Array<{ inicio: string; fim: string }> = [];
  let cursor = inicio;

  while (cursor <= fim) {
    const semana = semanaDe(cursor);
    const trechoFim = semana.fim < fim ? semana.fim : fim;
    const dias = differenceInCalendarDays(parseISO(trechoFim), parseISO(cursor)) + 1;
    if (dias < 7) parciais.push({ inicio: semana.inicio, fim: semana.fim });
    const proximo = format(addDays(parseISO(semana.fim), 1), 'yyyy-MM-dd');
    if (proximo <= cursor) break;
    cursor = proximo;
  }

  return parciais;
}

export function rotuloSemanaAjustada(inicio: string, fim: string): string {
  const de = format(parseISO(inicio), "d 'de' MMM", { locale: ptBR });
  const ate = format(parseISO(fim), "d 'de' MMM", { locale: ptBR });
  return `Limite ajustado da semana de domingo a sábado, ${de} a ${ate}`;
}

function capitalizar(texto: string): string {
  if (!texto) return texto;
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1);
}

export function rotuloDoPeriodo(periodo: PeriodoSelecionado): string {
  const inicio = parseISO(periodo.inicio);
  const fim = parseISO(periodo.fim);
  if (periodo.modo === 'mes') {
    return capitalizar(format(inicio, "MMMM 'de' yyyy", { locale: ptBR }));
  }
  const mesmoMes = format(inicio, 'yyyy-MM') === format(fim, 'yyyy-MM');
  const texto = mesmoMes
    ? `${format(inicio, 'd', { locale: ptBR })} a ${format(fim, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
    : `${format(inicio, "d 'de' MMM", { locale: ptBR })} a ${format(fim, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
  return periodo.modo === 'semana' ? `Semana de ${texto}` : capitalizar(texto);
}

export function useContagemDoPeriodo(inicio: string, fim: string): GradeCounts {
  const { state } = useAppContext();

  return useMemo(() => {
    const settings = state.editorial;
    const entries = buildGradeEntries({
      contents: state.contents,
      series: state.series,
      settings: { redeReferenciaId: settings.preferencias.redeReferenciaId },
      platforms: state.platforms,
    });
    return contarPeriodo({
      entries,
      pilares: state.pilares,
      postIts: state.postIts,
      settings: {
        preferencias: settings.preferencias,
        proporcaoFuncoes: settings.proporcaoFuncoes,
        periodos: settings.periodos,
      },
      periodo: { inicio, fim },
    });
  }, [
    fim,
    inicio,
    state.contents,
    state.series,
    state.pilares,
    state.platforms,
    state.postIts,
    state.editorial,
  ]);
}

const MODOS: Array<{ id: ModoPeriodo; rotulo: string }> = [
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
  { id: 'intervalo', rotulo: 'Intervalo' },
];

/** Anda um período para trás ou para frente, no tamanho do modo atual. */
export function periodoVizinho(periodo: PeriodoSelecionado, direcao: -1 | 1): PeriodoSelecionado {
  const inicio = parseISO(periodo.inicio);
  if (periodo.modo === 'semana') {
    return { modo: 'semana', ...semanaDe(format(addDays(inicio, 7 * direcao), 'yyyy-MM-dd')) };
  }
  if (periodo.modo === 'mes') {
    const mes = addMonths(inicio, direcao);
    return {
      modo: 'mes',
      inicio: format(startOfMonth(mes), 'yyyy-MM-dd'),
      fim: format(endOfMonth(mes), 'yyyy-MM-dd'),
    };
  }
  const dias = differenceInCalendarDays(parseISO(periodo.fim), inicio) + 1;
  return {
    modo: 'intervalo',
    inicio: format(addDays(inicio, dias * direcao), 'yyyy-MM-dd'),
    fim: format(addDays(parseISO(periodo.fim), dias * direcao), 'yyyy-MM-dd'),
  };
}

function periodosIguais(a: PeriodoSelecionado, b: PeriodoSelecionado): boolean {
  return a.modo === b.modo && a.inicio === b.inicio && a.fim === b.fim;
}

/**
 * Período do Editorial. A análise e os dados são calculados a partir do intervalo salvo:
 * a pessoa vê o período atual e só troca depois de editar e confirmar, porque os cálculos mudam.
 */
export function PeriodoEditorialControl({
  periodo,
  onChange,
}: {
  periodo: PeriodoSelecionado;
  onChange: (periodo: PeriodoSelecionado) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(periodo);
  const [confirmarTroca, setConfirmarTroca] = useState(false);
  const intervaloInvalido = rascunho.modo === 'intervalo' && rascunho.inicio > rascunho.fim;
  const hoje = hojeIso();
  const contemHoje = rascunho.inicio <= hoje && hoje <= rascunho.fim;

  useEffect(() => {
    if (!editando) setRascunho(periodo);
  }, [editando, periodo]);

  const escolherModo = (modo: ModoPeriodo) => {
    if (modo === 'intervalo') {
      setRascunho(atual => ({ ...atual, modo: 'intervalo' }));
      return;
    }
    setRascunho({ modo, ...intervaloDoModo(modo) });
  };

  const mudarData = (lado: 'inicio' | 'fim', valor: string) => {
    if (!DATA.test(valor)) return;
    setRascunho(atual => ({ ...atual, modo: 'intervalo', [lado]: valor }));
  };

  const pedirSalvar = () => {
    if (intervaloInvalido) return;
    if (periodosIguais(rascunho, periodo)) {
      setEditando(false);
      return;
    }
    setConfirmarTroca(true);
  };

  const aplicarTroca = () => {
    onChange(rascunho);
    setConfirmarTroca(false);
    setEditando(false);
  };

  const cancelar = () => {
    setRascunho(periodo);
    setConfirmarTroca(false);
    setEditando(false);
  };

  const navClass =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:h-11 pointer-coarse:w-11';

  return (
    <Surface padding="none" className="stack-sm px-4 py-3">
      {editando ? (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <ChoiceChips<ModoPeriodo>
              label="Período"
              value={rascunho.modo}
              onChange={modo => { if (modo) escolherModo(modo); }}
              options={MODOS.map(modo => ({ value: modo.id, label: modo.rotulo }))}
            />

            <div className="flex min-w-0 items-center gap-3">
              <button type="button" className={navClass} aria-label="Período anterior" onClick={() => setRascunho(periodoVizinho(rascunho, -1))}>
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <Text variant="sectionTitle" as="h2" className="min-w-0 tabular-nums">{rotuloDoPeriodo(rascunho)}</Text>
              <button type="button" className={navClass} aria-label="Próximo período" onClick={() => setRascunho(periodoVizinho(rascunho, 1))}>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              {!contemHoje && rascunho.modo !== 'intervalo' ? (
                <AppButton variant="secondary" size="sm" onClick={() => escolherModo(rascunho.modo)}>
                  Hoje
                </AppButton>
              ) : null}
            </div>

            <div className="flex flex-wrap items-end gap-3 lg:ml-auto">
              <label className="flex flex-col gap-1" htmlFor="periodo-inicio">
                <Text variant="meta" as="span" className="text-[var(--text-secondary)]">De</Text>
                <input
                  id="periodo-inicio"
                  type="date"
                  value={rascunho.inicio}
                  onChange={event => mudarData('inicio', event.target.value)}
                  className={CAMPO_DATA}
                />
              </label>
              <label className="flex flex-col gap-1" htmlFor="periodo-fim">
                <Text variant="meta" as="span" className="text-[var(--text-secondary)]">Até</Text>
                <input
                  id="periodo-fim"
                  type="date"
                  value={rascunho.fim}
                  onChange={event => mudarData('fim', event.target.value)}
                  className={CAMPO_DATA}
                />
              </label>
            </div>
          </div>
          {intervaloInvalido ? (
            <Text variant="meta" className="text-[var(--accent-red)]">
              A data inicial precisa vir antes da final.
            </Text>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Text variant="secondary" as="p" className="mr-auto max-w-xl">
              Escolha semana, mês ou intervalo e salve. Os dados e a análise são calculados a partir deste intervalo.
            </Text>
            <AppButton variant="secondary" size="sm" onClick={cancelar}>
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              onClick={pedirSalvar}
              disabled={intervaloInvalido}
              disabledReason={intervaloInvalido ? 'A data inicial precisa vir antes da final.' : undefined}
            >
              Salvar
            </AppButton>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 stack-xs">
            <Text variant="label" as="p">{MODOS.find(modo => modo.id === periodo.modo)?.rotulo}</Text>
            <Text variant="sectionTitle" as="h2" className="tabular-nums">{rotuloDoPeriodo(periodo)}</Text>
            <Text variant="secondary">
              Os dados e a análise são calculados a partir deste intervalo.
            </Text>
          </div>
          <AppButton
            variant="secondary"
            size="sm"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={() => {
              setRascunho(periodo);
              setEditando(true);
            }}
          >
            Editar período
          </AppButton>
        </div>
      )}
      <ConfirmModal
        open={confirmarTroca}
        message="Trocar o período muda os cálculos. Os dados e a análise passam a ser criados a partir do novo intervalo."
        confirmLabel="Trocar período"
        cancelLabel="Manter este período"
        onConfirm={aplicarTroca}
        onCancel={() => setConfirmarTroca(false)}
      />
    </Surface>
  );
}
