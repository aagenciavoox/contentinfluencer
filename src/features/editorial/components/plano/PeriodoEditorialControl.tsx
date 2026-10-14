import { useEffect, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SegmentTabs } from '../../../../components/ui/SegmentTabs';
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
  return periodo.modo === 'semana' ? `Semana de domingo a sábado, ${texto}` : capitalizar(texto);
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

export function PeriodoEditorialControl({
  periodo,
  onChange,
}: {
  periodo: PeriodoSelecionado;
  onChange: (periodo: PeriodoSelecionado) => void;
}) {
  const [rascunho, setRascunho] = useState(periodo);
  const intervaloInvalido = rascunho.modo === 'intervalo' && rascunho.inicio > rascunho.fim;

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
      <div className="max-w-full overflow-x-auto">
        <SegmentTabs<ModoPeriodo>
          value={periodo.modo}
          onChange={escolherModo}
          className="w-max min-w-full"
          options={[
            { id: 'semana', label: 'Semana' },
            { id: 'mes', label: 'Mês' },
            { id: 'intervalo', label: 'Intervalo' },
          ]}
        />
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
      ) : (
        <Text variant="secondary">{rotuloDoPeriodo(periodo)}</Text>
      )}
    </div>
  );
}
