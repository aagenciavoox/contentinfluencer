import { useMemo, useState } from 'react';
import { AlertTriangle, Pencil } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import type { Platform, PostingTimeEntry } from '../../../lib/database';
import { Ajuda } from '../../../components/ui/Ajuda';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { SidePanel } from '../../../components/layout/SidePanel';
import { tintedTextColor } from '../../../lib/utils';
import { REDE_ROTULO, ordenarContas, redeDaConta } from '../../contas/lib/contas';
import { MAX_TIMES_PER_DAY, WEEKDAY_LABELS, WEEKDAYS_ORDERED, type Weekday } from '../lib/postingTimes';
import { PostingTimesEditor } from './PostingTimesEditor';

type Horarios = Map<string, string[]>;

const ALERTA_TEXTO = tintedTextColor('var(--warning)');
const MARCA_TEXTO = tintedTextColor('var(--brand-accent-strong)');

const EXTENSO: Record<number, string> = {
  1: 'uma',
  2: 'duas',
  3: 'três',
  4: 'quatro',
  5: 'cinco',
  6: 'seis',
  7: 'sete',
};

function chave(platformId: string | null, weekday: Weekday) {
  return `${platformId ?? 'global'}:${weekday}`;
}

function agruparHorarios(entries: PostingTimeEntry[]): Horarios {
  const mapa: Horarios = new Map();
  for (const entry of entries) {
    const key = chave(entry.platformId, entry.weekday);
    const time = entry.time.slice(0, 5);
    const lista = mapa.get(key) ?? [];
    if (!lista.includes(time)) lista.push(time);
    mapa.set(key, lista);
  }
  for (const lista of mapa.values()) lista.sort();
  return mapa;
}

function nomeDaConta(conta: Platform) {
  const rede = redeDaConta(conta);
  return rede && rede !== 'outra' ? REDE_ROTULO[rede] : conta.nome;
}

function juntarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? '';
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

function comArtigo(conta: Platform): string {
  const rede = redeDaConta(conta);
  const nome = nomeDaConta(conta);
  if (rede === 'instagram' || rede === 'tiktok' || rede === 'youtube') return `O ${nome}`;
  return nome;
}

function fraseDasExcecoes(contas: readonly Platform[], dias: (conta: Platform) => number): string {
  if (contas.length === 0) return 'Nenhuma conta ativa.';
  const com = contas.filter(conta => dias(conta) > 0);
  const sem = contas.filter(conta => dias(conta) === 0);
  if (com.length === 0) return 'Todas as contas seguem o padrão geral.';
  const seguem = sem.length === 0
    ? ''
    : `${juntarNomes(sem.map(nomeDaConta))} ${sem.length === 1 ? 'segue' : 'seguem'} o padrão geral.`;
  const excecoes = com.map(conta => {
    const total = dias(conta);
    const quantidade = EXTENSO[total] ?? String(total);
    const palavra = total === 1 ? 'exceção' : 'exceções';
    return `${comArtigo(conta)} tem ${quantidade} ${palavra}`;
  }).join('. ');
  return [seguem, `${excecoes}.`].filter(Boolean).join(' ');
}

function ChipsDeHorario({ times, proprio = false }: { times: string[]; proprio?: boolean }) {
  if (times.length === 0) {
    return <Text variant="secondary" as="span" className="text-[var(--text-tertiary)]">—</Text>;
  }
  const estourou = times.length > MAX_TIMES_PER_DAY;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul className="flex flex-wrap gap-2" aria-label={proprio ? 'Horários próprios' : 'Horários do padrão geral'}>
        {times.map(time => (
          <li
            key={time}
            className={proprio
              ? 'inline-flex h-8 min-w-[4.5rem] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-accent-soft)] px-3 t-body tabular-nums'
              : 'inline-flex h-8 min-w-[4.5rem] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 t-body tabular-nums text-[var(--text-primary)]'}
            style={proprio ? { color: MARCA_TEXTO } : undefined}
          >
            {time}
          </li>
        ))}
      </ul>
      {estourou ? (
        <Text variant="meta" as="span" className="inline-flex items-center gap-1 text-inherit" style={{ color: ALERTA_TEXTO }}>
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          Revisar limite
        </Text>
      ) : null}
    </div>
  );
}

/**
 * Horários de postagem: o padrão geral e, ao lado, só as contas com horário próprio.
 * "Editar horários" abre o editor completo.
 */
export function PostingTimesOverview() {
  const { state } = useAppContext();
  const [editorAberto, setEditorAberto] = useState(false);
  const salvos = useMemo(() => agruparHorarios(state.postingTimeEntries ?? []), [state.postingTimeEntries]);
  const contas = useMemo(() => ordenarContas(state.platforms).filter(conta => conta.ativo), [state.platforms]);

  const horarios = (platformId: string | null, weekday: Weekday) => salvos.get(chave(platformId, weekday)) ?? [];
  const diasProprios = (conta: Platform) => WEEKDAYS_ORDERED.filter(day => horarios(conta.id, day).length > 0).length;
  const comExcecao = contas.filter(conta => diasProprios(conta) > 0);

  return (
    <section className="stack-md" aria-labelledby="horarios-titulo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 stack-xs">
          <div className="inline-flex items-center">
            <Text variant="sectionTitle" as="h2"><span id="horarios-titulo">Horários sugeridos</span></Text>
            <Ajuda
              rotulo="Sobre horários sugeridos"
              texto="Quando você for programar um post nesta conta, estes horários já aparecem como sugestão."
            />
          </div>
          <Text variant="secondary" as="p">{fraseDasExcecoes(contas, diasProprios)}</Text>
        </div>
        <AppButton variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditorAberto(true)}>
          Editar horários
        </AppButton>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[var(--surface-subtle)]">
            <tr>
              <th scope="col" className="sticky left-0 z-[1] w-36 bg-[var(--surface-subtle)] px-4 py-3 align-middle font-normal">
                <Text variant="label" as="span" className="text-[var(--text-secondary)]">Dia</Text>
              </th>
              <th scope="col" className="min-w-[16rem] border-l border-[var(--border-color)] px-4 py-3 align-middle font-normal">
                <Text variant="bodyStrong" as="span">Padrão geral</Text>
              </th>
              {comExcecao.map(conta => (
                <th key={conta.id} scope="col" className="min-w-[12rem] border-l border-[var(--border-color)] px-4 py-3 align-middle font-normal">
                  <Text variant="bodyStrong" as="span" style={{ color: 'var(--brand-accent-strong)' }}>
                    {nomeDaConta(conta)} · horários próprios
                  </Text>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS_ORDERED.map(day => (
              <tr key={day} className="border-t border-[var(--border-color)]">
                <th scope="row" className="sticky left-0 z-[1] bg-[var(--bg-elevated)] px-4 py-3 align-middle font-normal">
                  <Text variant="bodyStrong" as="span">{WEEKDAY_LABELS[day]}</Text>
                </th>
                <td className="border-l border-[var(--border-color)] px-4 py-3 align-middle">
                  <ChipsDeHorario times={horarios(null, day)} />
                </td>
                {comExcecao.map(conta => (
                  <td key={conta.id} className="border-l border-[var(--border-color)] px-4 py-3 align-middle">
                    <ChipsDeHorario times={horarios(conta.id, day)} proprio />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SidePanel
        open={editorAberto}
        onClose={() => setEditorAberto(false)}
        title="Editar horários"
        subtitle="Escolha o padrão geral ou uma conta. Os dias sem horário próprio usam o padrão geral."
        widthClassName="max-w-3xl"
      >
        <PostingTimesEditor
          contaInicialId={null}
          comecarEditando
          aoSalvar={() => setEditorAberto(false)}
          aoCancelar={() => setEditorAberto(false)}
        />
      </SidePanel>
    </section>
  );
}
