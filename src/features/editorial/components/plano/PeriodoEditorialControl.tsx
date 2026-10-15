import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { MoreMenu } from '../../../../components/ui/MoreMenu';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import { buildGradeEntries } from '../../lib/gradeEntries';
import { contarPeriodo, type GradeCounts } from '../../lib/gradeCounts';
import { getEditorialSettings } from '../../lib/editorialSettings';
import { semanaDe } from '../../lib/periodoEditorial';

export type ModoPeriodo = 'semana' | 'mes' | 'intervalo';

export type PeriodoSelecionado = {
  modo: ModoPeriodo;
  inicio: string;
  fim: string;
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;

const CAMPO_DATA =
  'ds-input min-h-11 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

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
    const settings = getEditorialSettings(state.preferences);
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
    state.preferences,
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

/**
 * Escolhe o período do Editorial. Aparece uma vez, no topo da aba Período, e não tem cara
 * de aba: setas para andar no tempo e um botão para trocar entre semana, mês e intervalo.
 */
export function PeriodoEditorialControl({
  periodo,
  onChange,
}: {
  periodo: PeriodoSelecionado;
  onChange: (periodo: PeriodoSelecionado) => void;
}) {
  const [rascunho, setRascunho] = useState(periodo);
  const intervaloInvalido = rascunho.modo === 'intervalo' && rascunho.inicio > rascunho.fim;
  const hoje = hojeIso();
  const contemHoje = periodo.inicio <= hoje && hoje <= periodo.fim;
  const modoAtual = MODOS.find(modo => modo.id === periodo.modo) ?? MODOS[0];

  useEffect(() => {
    setRascunho(periodo);
  }, [periodo]);

  const escolherModo = (modo: ModoPeriodo) => {
    if (modo === 'intervalo') {
      onChange({ ...periodo, modo: 'intervalo' });
      return;
    }
    onChange({ modo, ...intervaloDoModo(modo) });
  };

  const mudarData = (lado: 'inicio' | 'fim', valor: string) => {
    if (!DATA.test(valor)) return;
    const next: PeriodoSelecionado = { ...rascunho, modo: 'intervalo', [lado]: valor };
    setRascunho(next);
    if (next.inicio <= next.fim) onChange(next);
  };

  return (
    <div className="stack-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <AppButton
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Período anterior"
            leftIcon={<ChevronLeft className="h-4 w-4" />}
            onClick={() => onChange(periodoVizinho(periodo, -1))}
          />
          <Text variant="sectionTitle" as="h2" className="min-w-0 px-1">
            {rotuloDoPeriodo(periodo)}
          </Text>
          <AppButton
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Próximo período"
            leftIcon={<ChevronRight className="h-4 w-4" />}
            onClick={() => onChange(periodoVizinho(periodo, 1))}
          />
        </div>
        <div className="flex items-center gap-2">
          {!contemHoje && periodo.modo !== 'intervalo' ? (
            <AppButton variant="secondary" size="sm" onClick={() => escolherModo(periodo.modo)}>
              Hoje
            </AppButton>
          ) : null}
          <MoreMenu
            align="left"
            label={`Ver por: ${modoAtual.rotulo}`}
            items={MODOS.map(modo => ({
              id: modo.id,
              label: modo.id === periodo.modo ? `${modo.rotulo} ✓` : modo.rotulo,
              onClick: () => escolherModo(modo.id),
            }))}
            trigger={(
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
                {modoAtual.rotulo}
                <ChevronDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
              </span>
            )}
            triggerClassName="w-auto px-3 text-xs font-semibold text-[var(--text-primary)]"
          />
        </div>
      </div>
      {periodo.modo === 'intervalo' ? (
        <div className="flex flex-wrap gap-3">
          <label className="stack-sm" htmlFor="periodo-inicio">
            <Text variant="label" as="span">De</Text>
            <input
              id="periodo-inicio"
              type="date"
              value={rascunho.inicio}
              onChange={event => mudarData('inicio', event.target.value)}
              className={CAMPO_DATA}
            />
          </label>
          <label className="stack-sm" htmlFor="periodo-fim">
            <Text variant="label" as="span">Até</Text>
            <input
              id="periodo-fim"
              type="date"
              value={rascunho.fim}
              onChange={event => mudarData('fim', event.target.value)}
              className={CAMPO_DATA}
            />
          </label>
        </div>
      ) : null}
      {intervaloInvalido ? (
        <Text variant="meta" className="text-[var(--accent-red)]">
          A data inicial precisa vir antes da final.
        </Text>
      ) : null}
    </div>
  );
}
