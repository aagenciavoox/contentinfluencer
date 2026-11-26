import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import type { Platform, PostingTimeEntry } from '../../../lib/database';
import { AppButton } from '../../../components/ui/AppButton';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { tintedTextColor } from '../../../lib/utils';
import { iconeDaConta, REDE_ROTULO, ordenarContas, redeDaConta, rotuloConta } from '../../contas/lib/contas';
import { EditorialDrawer } from '../../editorial/components/plano/EditorialDrawer';
import { MAX_TIMES_PER_DAY, WEEKDAYS_ORDERED, type Weekday } from '../lib/postingTimes';
import { agruparDiasComMesmosHorarios, rotuloDosDias } from '../lib/agruparHorariosIguais';
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

function ListaDeGrupos({
  grupos,
  proprio = false,
  rotulo,
  className,
}: {
  grupos: { dias: Weekday[]; times: string[] }[];
  proprio?: boolean;
  rotulo: string;
  className?: string;
}) {
  if (grupos.length === 0) return null;
  return (
    <div className={['stack-xs', className].filter(Boolean).join(' ')}>
      <Text
        variant="bodyStrong"
        as="h3"
        style={proprio ? { color: MARCA_TEXTO } : undefined}
      >
        {rotulo}
      </Text>
      <ul aria-label={rotulo}>
        {grupos.map(grupo => (
          <li
            key={grupo.dias.join('-')}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[var(--border-subtle)] py-2 first:border-t-0"
          >
            <Text variant="bodyStrong" as="span">{rotuloDosDias(grupo.dias)}</Text>
            <ChipsDeHorario times={grupo.times} proprio={proprio} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Padrão geral e, abaixo, só os dias com horário próprio da conta, já agrupados. */
function ListaCompactaDeHorarios({
  horarios,
  contas,
  somenteContaId,
}: {
  horarios: (platformId: string | null, weekday: Weekday) => string[];
  contas: Platform[];
  somenteContaId?: string;
}) {
  const diasComExcecao = new Set(
    somenteContaId
      ? WEEKDAYS_ORDERED.filter(dia => contas.some(conta => horarios(conta.id, dia).length > 0))
      : [],
  );
  const diasDoPadrao = somenteContaId
    ? WEEKDAYS_ORDERED.filter(dia => !diasComExcecao.has(dia))
    : WEEKDAYS_ORDERED;
  const gruposPadrao = agruparDiasComMesmosHorarios(dia => horarios(null, dia), diasDoPadrao);
  const contasComExcecao = somenteContaId
    ? contas.filter(conta => WEEKDAYS_ORDERED.some(dia => horarios(conta.id, dia).length > 0))
    : contas;

  return (
    <div className="stack-sm rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3">
      <ListaDeGrupos rotulo="Padrão geral" grupos={gruposPadrao} />
      {contasComExcecao.map(conta => (
        <ListaDeGrupos
          key={conta.id}
          className={gruposPadrao.length > 0 ? 'border-t border-[var(--border-subtle)] pt-3' : undefined}
          rotulo={`${nomeDaConta(conta)} · horários próprios`}
          proprio
          grupos={agruparDiasComMesmosHorarios(
            dia => horarios(conta.id, dia),
            WEEKDAYS_ORDERED.filter(dia => horarios(conta.id, dia).length > 0),
          )}
        />
      ))}
    </div>
  );
}

/**
 * Horários de postagem: o padrão geral e os dias com horário próprio da conta, agrupados quando coincidem.
 * "Editar horários" abre o editor completo.
 */
export function PostingTimesOverview({ somenteContaId }: { somenteContaId?: string } = {}) {
  const { state } = useAppContext();
  const [editorAberto, setEditorAberto] = useState(false);
  const salvos = useMemo(() => agruparHorarios(state.postingTimeEntries ?? []), [state.postingTimeEntries]);
  const contas = useMemo(() => {
    const ativas = ordenarContas(state.platforms).filter(conta => conta.ativo);
    return somenteContaId ? ativas.filter(conta => conta.id === somenteContaId) : ativas;
  }, [somenteContaId, state.platforms]);

  const horarios = (platformId: string | null, weekday: Weekday) => salvos.get(chave(platformId, weekday)) ?? [];
  const diasProprios = (conta: Platform) => WEEKDAYS_ORDERED.filter(day => horarios(conta.id, day).length > 0).length;
  const colunasDaConta = somenteContaId ? contas : contas.filter(conta => diasProprios(conta) > 0);
  const contaFoco = somenteContaId ? contas[0] ?? null : null;

  return (
    <Surface padding="lg" className="stack-md" as="section" aria-labelledby="horarios-titulo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 stack-xs">
          <Text variant="itemTitle" as="h3">
            <span id="horarios-titulo">Horários sugeridos</span>
          </Text>
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            {fraseDasExcecoes(contas, diasProprios)}
          </Text>
        </div>
        <AppButton variant="secondary" size="sm" onClick={() => setEditorAberto(true)}>
          Editar
        </AppButton>
      </div>

      <ListaCompactaDeHorarios
        horarios={horarios}
        contas={colunasDaConta}
        somenteContaId={somenteContaId}
      />

      <EditorialDrawer
        open={editorAberto}
        onClose={() => setEditorAberto(false)}
        title="Editar horários"
        subtitle="Escolha o padrão geral ou uma conta. Os dias sem horário próprio usam o padrão geral."
        escopoConta={contaFoco ? rotuloConta(contaFoco) : 'Geral'}
        secao="Horários"
        escopoIcone={contaFoco ? <PlatformIcon platform={iconeDaConta(contaFoco)} colored className="h-3.5 w-3.5" /> : undefined}
        hideFooter
      >
        <PostingTimesEditor
          contaInicialId={somenteContaId ?? null}
          comecarEditando
          aoSalvar={() => setEditorAberto(false)}
          aoCancelar={() => setEditorAberto(false)}
        />
      </EditorialDrawer>
    </Surface>
  );
}
