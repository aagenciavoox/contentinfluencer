import {useMemo, useState} from 'react';
import {AlertTriangle, Globe, Pencil, Plus, X} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {replacePostingTimesForPlatform} from '../../../lib/database';
import type {Platform, PostingTimeEntry} from '../../../lib/database';
import {AppButton} from '../../../components/ui/AppButton';
import {PlatformTile} from '../../../components/ui/PlatformIcon';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {SidePanel} from '../../../components/layout/SidePanel';
import {cn, tintedTextColor} from '../../../lib/utils';
import {getErrorDetail, notifySaveFeedback} from '../../../lib/saveFeedback';
import {broadcastDataSync} from '../../../lib/syncBroadcast';
import {REDE_ROTULO, exibirHandle, iconeDaConta, ordenarContas, redeDaConta, rotuloConta} from '../../contas/lib/contas';
import {MAX_TIMES_PER_DAY, WEEKDAY_FULL, WEEKDAYS_ORDERED, type Weekday} from '../lib/postingTimes';
import {PostingTimesEditor} from './PostingTimesEditor';

type Horarios = Map<string, string[]>;

/** Dia e conta que o lápis abriu. `platformId` null é o padrão geral. */
type Alvo = {
  platformId: string | null;
  rotulo: string;
  weekday: Weekday;
  proprios: string[];
  padrao: string[];
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

/** "na segunda-feira", "no sábado". */
function noDia(weekday: Weekday) {
  return `${weekday === 0 || weekday === 6 ? 'no' : 'na'} ${WEEKDAY_FULL[weekday].toLowerCase()}`;
}

function nomeDaConta(conta: Platform) {
  const rede = redeDaConta(conta);
  return rede && rede !== 'outra' ? REDE_ROTULO[rede] : conta.nome;
}

const MARCA_TEXTO = tintedTextColor('var(--brand-accent-strong)');
const ALERTA_TEXTO = tintedTextColor('var(--warning)');

/**
 * Horários de postagem lado a lado: o padrão geral e cada conta ativa, dia a dia.
 * O lápis de uma célula edita os horários próprios daquele dia; "Editar horários"
 * abre o editor completo, que começa no padrão geral.
 */
export function PostingTimesOverview() {
  const {state, ensureDataDomains} = useAppContext();
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [editorAberto, setEditorAberto] = useState(false);
  // O que já foi salvo e ainda não voltou do servidor aparece na hora.
  const [pendentes, setPendentes] = useState<Horarios>(() => new Map());

  const salvos = useMemo(() => agruparHorarios(state.postingTimeEntries ?? []), [state.postingTimeEntries]);
  const contas = useMemo(() => ordenarContas(state.platforms).filter(conta => conta.ativo), [state.platforms]);

  const horarios = (platformId: string | null, weekday: Weekday) => {
    const key = chave(platformId, weekday);
    return pendentes.get(key) ?? salvos.get(key) ?? [];
  };

  const gravar = (platformId: string | null, weekday: Weekday, times: string[], mensagem: string, onUndo?: () => void) => {
    const key = chave(platformId, weekday);
    const soltar = () => setPendentes(atual => {
      const proximo = new Map(atual);
      proximo.delete(key);
      return proximo;
    });
    setPendentes(atual => new Map(atual).set(key, times));
    notifySaveFeedback({status: 'saving', message: 'Salvando horários…'});
    return (async () => {
      try {
        await replacePostingTimesForPlatform(platformId, weekday, times);
        await ensureDataDomains(['schedule'], {force: true});
        broadcastDataSync();
        soltar();
        notifySaveFeedback({status: 'success', message: mensagem, onUndo});
        return true;
      } catch (err) {
        soltar();
        notifySaveFeedback({status: 'error', message: 'Não foi possível salvar os horários. Verifique sua conexão e tente novamente.', detail: getErrorDetail(err)});
        return false;
      }
    })();
  };

  const abrirDia = (conta: Platform, weekday: Weekday) => {
    setAlvo({
      platformId: conta.id,
      rotulo: rotuloConta(conta),
      weekday,
      proprios: horarios(conta.id, weekday),
      padrao: horarios(null, weekday),
    });
  };

  const usarPadrao = (conta: Platform, weekday: Weekday) => {
    const anteriores = horarios(conta.id, weekday);
    void gravar(conta.id, weekday, [], `${nomeDaConta(conta)} volta ao padrão ${noDia(weekday)}`, () => {
      void gravar(conta.id, weekday, anteriores, 'Horários restaurados');
    });
  };

  const celula = (conta: Platform, weekday: Weekday) => (
    <CelulaDaConta
      proprios={horarios(conta.id, weekday)}
      rotuloEdicao={`Editar horários de ${rotuloConta(conta)} ${noDia(weekday)}`}
      rotuloPadrao={`Usar o padrão em ${rotuloConta(conta)} ${noDia(weekday)}`}
      onEditar={() => abrirDia(conta, weekday)}
      onUsarPadrao={() => usarPadrao(conta, weekday)}
    />
  );

  const salvarDia = (atual: Alvo, times: string[]) => {
    setAlvo(null);
    if (times.join('|') === atual.proprios.join('|')) return;
    void gravar(atual.platformId, atual.weekday, times, 'Horários salvos').then(ok => {
      // Se não salvou, o diálogo volta com o que a pessoa tinha escolhido.
      if (!ok) setAlvo({...atual, proprios: times});
    });
  };

  return (
    <section className="stack-md" aria-labelledby="horarios-titulo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Text variant="sectionTitle" as="h2"><span id="horarios-titulo">Horários de postagem</span></Text>
        </div>
        <AppButton variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditorAberto(true)}>
          Editar horários
        </AppButton>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-hidden>
        <Text variant="secondary" as="span" className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
          <Globe className="h-4 w-4" />
          Usa o padrão geral
        </Text>
        <Text variant="secondary" as="span" className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-accent)]" />
          Horários próprios
        </Text>
      </div>

      {/* Desktop e tablet: uma coluna por conta. */}
      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] md:block">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[var(--surface-subtle)]">
            <tr>
              <th scope="col" className="sticky left-0 z-[1] w-36 font-normal bg-[var(--surface-subtle)] px-4 py-3 align-middle">
                <Text variant="label" as="span" className="text-[var(--text-secondary)]">Dia</Text>
              </th>
              <th scope="col" className="min-w-[14rem] font-normal border-l border-[var(--border-color)] px-4 py-3 align-middle">
                <span className="flex items-center gap-3">
                  <Globe className="h-5 w-5 shrink-0 text-[var(--text-primary)]" aria-hidden />
                  <Text variant="bodyStrong" as="span">Padrão geral</Text>
                </span>
              </th>
              {contas.map(conta => (
                <th key={conta.id} scope="col" className="min-w-[13rem] font-normal border-l border-[var(--border-color)] px-4 py-3 align-middle">
                  <CabecalhoConta conta={conta} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS_ORDERED.map(day => {
              const fimDeSemana = day === 0 || day === 6;
              const fundo = fimDeSemana ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-elevated)]';
              return (
                <tr key={day} className={cn('border-t border-[var(--border-color)]', fundo)}>
                  <th scope="row" className={cn('sticky left-0 z-[1] px-4 font-normal py-3 align-middle', fundo)}>
                    <Text variant="bodyStrong" as="span">{WEEKDAY_FULL[day]}</Text>
                  </th>
                  <td className="border-l border-[var(--border-color)] px-4 py-3 align-middle">
                    <HorariosDoPadrao times={horarios(null, day)} />
                  </td>
                  {contas.map(conta => (
                    <td key={conta.id} className="border-l border-[var(--border-color)] py-2 pl-4 pr-2 align-middle">
                      {celula(conta, day)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Celular: um cartão por dia, com o padrão em cima e as contas embaixo. */}
      <ul className="stack-sm md:hidden">
        {WEEKDAYS_ORDERED.map(day => (
          <li key={day} className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
            <div className="border-b border-[var(--border-color)] bg-[var(--surface-subtle)] px-4 py-2.5">
              <Text variant="bodyStrong" as="h3">{WEEKDAY_FULL[day]}</Text>
            </div>
            <div className="flex items-start gap-3 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden>
                <Globe className="h-5 w-5 text-[var(--text-primary)]" />
              </span>
              <div className="min-w-0 flex-1 stack-xs">
                <Text variant="secondary" as="span" className="block text-[var(--text-secondary)]">Padrão geral</Text>
                <HorariosDoPadrao times={horarios(null, day)} />
              </div>
            </div>
            {contas.map(conta => (
              <div key={conta.id} className="flex items-start gap-3 border-t border-[var(--border-color)] py-2.5 pl-4 pr-2">
                <PlatformTile platform={iconeDaConta(conta)} className="mt-0.5 h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <Text variant="secondary" as="span" className="block truncate text-[var(--text-secondary)]">
                    {exibirHandle(conta.handle) ? `${nomeDaConta(conta)} · ${exibirHandle(conta.handle)}` : nomeDaConta(conta)}
                  </Text>
                  {celula(conta, day)}
                </div>
              </div>
            ))}
          </li>
        ))}
      </ul>

      <Text variant="secondary" className="text-[var(--text-secondary)]">
        {`Até ${MAX_TIMES_PER_DAY} horários próprios por dia. Ao personalizar um dia, os horários próprios substituem o padrão.`}
      </Text>

      <Dialog open={alvo != null} onClose={() => setAlvo(null)} desktopMaxW="max-w-md">
        {alvo ? (
          <EditarDia
            key={`${chave(alvo.platformId, alvo.weekday)}:${alvo.proprios.join('|')}`}
            alvo={alvo}
            onCancelar={() => setAlvo(null)}
            onSalvar={times => salvarDia(alvo, times)}
          />
        ) : null}
      </Dialog>

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

function CabecalhoConta({conta}: {conta: Platform}) {
  const handle = exibirHandle(conta.handle);
  return (
    <span className="flex min-w-0 items-center gap-3">
      <PlatformTile platform={iconeDaConta(conta)} />
      <span className="min-w-0">
        <Text variant="bodyStrong" as="span" truncate className="block">{nomeDaConta(conta)}</Text>
        <Text variant="secondary" as="span" truncate className="block font-normal text-[var(--text-secondary)]">
          {handle ?? 'Sem @'}
        </Text>
      </span>
    </span>
  );
}

function AvisoDeLimite({total}: {total: number}) {
  if (total <= MAX_TIMES_PER_DAY) return null;
  return (
    <Text variant="meta" as="span" className="inline-flex items-center gap-1.5 text-inherit" style={{color: ALERTA_TEXTO}}>
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      {`${total} horários · revisar limite`}
    </Text>
  );
}

function HorariosDoPadrao({times}: {times: string[]}) {
  if (times.length === 0) {
    return <Text variant="secondary" as="span" className="text-[var(--text-secondary)]">Nenhum horário</Text>;
  }
  return (
    <div className="stack-xs">
      <ul className="flex flex-wrap gap-2" aria-label="Horários do padrão geral">
        {times.map(time => (
          <li
            key={time}
            className="inline-flex h-8 min-w-[4.5rem] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 t-body tabular-nums text-[var(--text-primary)]"
          >
            {time}
          </li>
        ))}
      </ul>
      <AvisoDeLimite total={times.length} />
    </div>
  );
}

function HorarioProprio({time}: {time: string}) {
  return (
    <Text variant="body" as="span"
      className="inline-flex h-8 min-w-[4.5rem] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-accent-soft)] px-3 tabular-nums text-inherit"
      style={{color: MARCA_TEXTO}}
    >
      {time}
    </Text>
  );
}

function CelulaDaConta({
  proprios,
  rotuloEdicao,
  rotuloPadrao,
  onEditar,
  onUsarPadrao,
}: {
  proprios: string[];
  rotuloEdicao: string;
  rotuloPadrao: string;
  onEditar: () => void;
  onUsarPadrao: () => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
        {proprios.length === 0 ? (
          // Só o ícone: a legenda acima da tabela já diz o que ele significa.
          <span className="inline-flex items-center text-[var(--text-tertiary)]" title="Usa o padrão geral">
            <Globe className="h-4 w-4 shrink-0" aria-hidden />
            <span className="sr-only">Usa o padrão geral</span>
          </span>
        ) : (
          <>
            <span className="flex flex-wrap gap-1.5">
              {proprios.map(time => <HorarioProprio key={time} time={time} />)}
            </span>
            <span className="flex flex-col items-start">
              <Text variant="meta" as="span" className="inline-flex items-center gap-1.5 text-inherit" style={{color: MARCA_TEXTO}}>
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand-accent)]" aria-hidden />
                Próprio
              </Text>
              <button
                type="button"
                onClick={onUsarPadrao}
                aria-label={rotuloPadrao}
                className="rounded-[var(--radius-sm)] t-meta text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
              >
                Usar padrão
              </button>
            </span>
            <AvisoDeLimite total={proprios.length} />
          </>
        )}
      </div>
      <AppButton variant="ghost" size="xs" iconOnly aria-label={rotuloEdicao} onClick={onEditar}>
        <Pencil className="h-4 w-4" aria-hidden />
      </AppButton>
    </div>
  );
}

function EditarDia({
  alvo,
  onCancelar,
  onSalvar,
}: {
  alvo: Alvo;
  onCancelar: () => void;
  onSalvar: (times: string[]) => void;
}) {
  const [times, setTimes] = useState(alvo.proprios);
  const [input, setInput] = useState('');
  const dia = WEEKDAY_FULL[alvo.weekday];
  const cabe = times.length < MAX_TIMES_PER_DAY;

  const incluir = (lista: string[], time: string) => {
    const normalizado = time.slice(0, 5);
    if (!normalizado || lista.length >= MAX_TIMES_PER_DAY || lista.includes(normalizado)) return lista;
    return [...lista, normalizado].sort();
  };

  const adicionar = () => {
    if (!input) return;
    setTimes(atual => incluir(atual, input));
    setInput('');
  };

  // O horário digitado e não adicionado também vale ao salvar.
  const salvar = () => onSalvar(input ? incluir(times, input) : times);

  return (
    <>
      <OverlayHeader title={`${dia} · ${alvo.rotulo}`} onClose={onCancelar} />
      <OverlayBody>
        <div className="stack-md">
          <Text variant="secondary" className="text-[var(--text-secondary)]">
            {times.length > 0
              ? 'Neste dia, os horários próprios substituem o padrão geral.'
              : alvo.padrao.length > 0
                ? `Sem horário próprio, este dia usa o padrão geral: ${alvo.padrao.join(', ')}.`
                : 'Sem horário próprio. O padrão geral também não tem horário neste dia.'}
          </Text>

          {times.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Horários próprios">
              {times.map(time => (
                <li
                  key={time}
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-[var(--brand-accent-soft)] pl-3 t-body tabular-nums"
                  style={{color: MARCA_TEXTO}}
                >
                  {time}
                  <button
                    type="button"
                    onClick={() => setTimes(atual => atual.filter(item => item !== time))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    aria-label={`Remover ${time}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {cabe ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    adicionar();
                  }
                }}
                aria-label={`Novo horário para ${dia}`}
                className="h-10 w-36 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 t-body tabular-nums text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:h-11"
              />
              <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} disabled={!input} onClick={adicionar}>
                Adicionar
              </AppButton>
              {times.length === 0 && alvo.padrao.length > 0 ? (
                <AppButton variant="secondary" size="sm" onClick={() => setTimes(alvo.padrao.slice(0, MAX_TIMES_PER_DAY))}>
                  Começar pelo padrão
                </AppButton>
              ) : null}
            </div>
          ) : null}

          <Text variant="meta" className="text-[var(--text-secondary)]">
            {`Até ${MAX_TIMES_PER_DAY} horários próprios. Sem nenhum, o dia volta a usar o padrão geral.`}
          </Text>

          <div className="flex justify-end gap-2 pt-2">
            <AppButton variant="secondary" onClick={onCancelar}>Cancelar</AppButton>
            <AppButton variant="primary" onClick={salvar}>Salvar</AppButton>
          </div>
        </div>
      </OverlayBody>
    </>
  );
}
