import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Surface } from '../../../../components/ui/Surface';
import { TagSelect } from '../../../../components/ui/TagSelect';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import type { FuncaoEditorial, Platform, PostingTimeEntry } from '../../../../lib/database';
import { ToggleRow } from '../../../../components/ui/ToggleSwitch';
import {
  atualizarPreferencias,
  EDITORIAL_SETTINGS_PREFERENCE_KEY,
  getEditorialSettings,
  upsertDecisaoPeriodo,
  type DecisaoPeriodo,
  type EditorialSettings,
  type MetasPeriodo,
  type PreferenciasGerais,
} from '../../lib/editorialSettings';
import { FUNCAO_CURTA, FUNCOES } from '../../lib/funcoes';
import { decisaoDoPeriodo } from '../../lib/periodoEditorial';
import {
  PeriodoEditorialControl,
  rotuloSemanaAjustada,
  semanasParciais,
  type PeriodoSelecionado,
} from './PeriodoEditorialControl';

const CAMPO =
  'ds-input w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

const NUMERO = `${CAMPO} min-h-11 max-w-xs`;

function digitos(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

function inteiroOuNull(value: string): number | null {
  const bruto = digitos(value);
  if (!bruto) return null;
  return Number.parseInt(bruto, 10);
}

function metasCom(metas: MetasPeriodo, funcao: FuncaoEditorial, value: string): MetasPeriodo {
  const next = { ...metas };
  const quantidade = inteiroOuNull(value);
  if (quantidade == null) delete next[funcao];
  else next[funcao] = quantidade;
  return next;
}

function resumoHorarios(entries: readonly PostingTimeEntry[], platforms: readonly Platform[]): string {
  const ids = new Set(entries.flatMap(entry => (entry.platformId ? [entry.platformId] : [])));
  const nomes = platforms.filter(platform => ids.has(platform.id)).map(platform => platform.nome);
  const global = entries.some(entry => !entry.platformId);
  if (nomes.length === 0 && !global) return 'Nenhuma rede tem horário de postagem definido.';
  if (nomes.length === 0) return 'Há um horário geral, sem rede específica.';
  const amostra = nomes.slice(0, 3).join(', ');
  const resto = nomes.length > 3 ? ` e mais ${nomes.length - 3}` : '';
  const frase = nomes.length === 1
    ? `${amostra} tem horário definido`
    : `${amostra}${resto} têm horário definido`;
  return global ? `${frase}. Há também um horário geral.` : `${frase}.`;
}

function CampoNumero({
  id,
  label,
  hint,
  value,
  onChange,
  erro,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  erro?: string;
}) {
  return (
    <label className="stack-sm" htmlFor={id}>
      <Text variant="bodyStrong" as="span">{label}</Text>
      {hint ? <Text variant="secondary">{hint}</Text> : null}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={event => onChange(digitos(event.target.value))}
        className={NUMERO}
      />
      {erro ? <Text variant="meta" className="text-[var(--accent-red)]">{erro}</Text> : null}
    </label>
  );
}

function CampoTexto({
  id,
  label,
  nome,
  value,
  onSave,
  rows = 4,
  placeholder,
}: {
  id: string;
  label?: string;
  nome?: string;
  value: string;
  onSave: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const savedRef = useRef(value);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (draftRef.current === savedRef.current) {
      draftRef.current = value;
      savedRef.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => () => {
    if (draftRef.current !== savedRef.current) onSaveRef.current(draftRef.current);
  }, []);

  const commit = () => {
    if (draftRef.current === savedRef.current) return;
    savedRef.current = draftRef.current;
    onSaveRef.current(draftRef.current);
  };

  const campo = (
    <textarea
      id={id}
      rows={rows}
      value={draft}
      placeholder={placeholder}
      aria-label={label ? undefined : nome}
      onChange={event => {
        draftRef.current = event.target.value;
        setDraft(event.target.value);
      }}
      onBlur={commit}
      className={`${CAMPO} min-h-24 resize-y`}
    />
  );

  if (!label) return campo;

  return (
    <label className="stack-sm" htmlFor={id}>
      <Text variant="bodyStrong" as="span">{label}</Text>
      {campo}
    </label>
  );
}

function SecaoRecolhida({ titulo, children }: { titulo: string; children: ReactNode }) {
  // A faixa inteira abre e fecha, com a seta à direita, como as outras seções que recolhem.
  return (
    <Surface as="details" padding="none" className="group/secao">
      <summary className="flex min-h-11 list-none items-center justify-between gap-3 rounded-[inherit] p-4 transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] [&::-webkit-details-marker]:hidden">
        <Text variant="bodyStrong" as="span">{titulo}</Text>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-transform group-open/secao:rotate-180" aria-hidden />
      </summary>
      <div className="stack-md px-4 pb-4">{children}</div>
    </Surface>
  );
}

export function PlanoPeriodoPanel({
  periodo,
  onPeriodoChange,
}: {
  periodo: PeriodoSelecionado;
  onPeriodoChange: (periodo: PeriodoSelecionado) => void;
}) {
  const { state, dispatch } = useAppContext();
  const settings = getEditorialSettings(state.preferences);
  const [reservaDraft, setReservaDraft] = useState<string | null>(null);
  const decisao = decisaoDoPeriodo(settings.periodos, periodo.inicio, periodo.fim);
  const parciais = semanasParciais(periodo.inicio, periodo.fim);
  const preferencias = settings.preferencias;
  const limite = preferencias.limiteSemanal;
  const reservaSalva = preferencias.reservaForaSeriesSemanal;
  const reservaMostrada = reservaDraft ?? (reservaSalva == null ? '' : String(reservaSalva));

  const gravar = (value: EditorialSettings) => {
    dispatch({
      type: 'SET_PREFERENCE',
      payload: { key: EDITORIAL_SETTINGS_PREFERENCE_KEY, value },
    });
  };

  const salvarPreferencias = (patch: Partial<PreferenciasGerais>) => {
    gravar(atualizarPreferencias(settings, patch));
  };

  const salvarDecisao = (patch: Partial<Pick<DecisaoPeriodo, 'prioridade' | 'metas' | 'ajustesSemana'>>) => {
    if (periodo.inicio > periodo.fim) return;
    const atual: DecisaoPeriodo = decisao ?? {
      inicio: periodo.inicio,
      fim: periodo.fim,
      prioridade: '',
      metas: {},
      ajustesSemana: [],
    };
    gravar(upsertDecisaoPeriodo(settings, {
      ...atual,
      ...patch,
      inicio: periodo.inicio,
      fim: periodo.fim,
    }));
  };

  const aoMudarReserva = (value: string) => {
    const quantidade = inteiroOuNull(value);
    if (quantidade != null && limite != null && quantidade > limite) {
      setReservaDraft(digitos(value));
      return;
    }
    setReservaDraft(null);
    salvarPreferencias({ reservaForaSeriesSemanal: quantidade });
  };

  useEffect(() => {
    if (reservaDraft == null) return;
    const quantidade = inteiroOuNull(reservaDraft);
    if (quantidade != null && limite != null && quantidade > limite) return;
    setReservaDraft(null);
    if (quantidade === preferencias.reservaForaSeriesSemanal) return;
    salvarPreferencias({ reservaForaSeriesSemanal: quantidade });
  }, [limite, reservaDraft]);

  const aoMudarAjuste = (semana: { inicio: string; fim: string }, value: string) => {
    const quantidade = inteiroOuNull(value);
    const atuais = (decisao?.ajustesSemana ?? []).filter(
      ajuste => !(ajuste.inicio === semana.inicio && ajuste.fim === semana.fim),
    );
    salvarDecisao({
      ajustesSemana: quantidade == null ? atuais : [...atuais, { ...semana, limite: quantidade }],
    });
  };

  const ativas = state.platforms.filter(platform => platform.ativo);
  const referenciaAtual = state.platforms.find(platform => platform.id === preferencias.redeReferenciaId);
  const opcoesReferencia = referenciaAtual && !ativas.some(platform => platform.id === referenciaAtual.id)
    ? [referenciaAtual, ...ativas]
    : ativas;

  const linhas = [
    {
      key: 'quickSeriesCreate',
      title: 'Criação rápida de série',
      description: 'Na tela Séries, criar uma série só com nome e cor e completar aqui depois.',
      enabled: settings.quickSeriesCreate,
      toggle: () => gravar(atualizarPreferencias({ ...settings, quickSeriesCreate: !settings.quickSeriesCreate }, {})),
    },
    {
      key: 'openInfoNotices',
      title: 'Avisos de informações em aberto',
      description: 'Mostrar quando uma série ainda não tem pilar, função, recorrência, formato ou esforço.',
      enabled: settings.openInfoNotices,
      toggle: () => gravar(atualizarPreferencias({ ...settings, openInfoNotices: !settings.openInfoNotices }, {})),
    },
  ] as const;

  return (
    <div className="stack-lg">
      <PeriodoEditorialControl periodo={periodo} onChange={onPeriodoChange} />

      <Surface>
        <CampoTexto
          id="prioridade-periodo"
          label="O que queremos alcançar neste período?"
          rows={3}
          value={decisao?.prioridade ?? ''}
          onSave={prioridade => {
            if (prioridade === (decisao?.prioridade ?? '')) return;
            salvarDecisao({ prioridade });
          }}
        />
      </Surface>

      <Surface>
        <CampoNumero
          id="limite-semanal"
          label="Quantos conteúdos você consegue publicar por semana?"
          hint="Conte posts de feed, vídeos e lives. Stories e reposts ficam separados. É o limite, não uma obrigação de preenchê-lo."
          value={limite == null ? '' : String(limite)}
          onChange={value => salvarPreferencias({ limiteSemanal: inteiroOuNull(value) })}
        />
      </Surface>

      <Surface>
        <CampoNumero
          id="reserva-fora-series"
          label="Quantos conteúdos fora das séries reservar por semana?"
          hint="Parte do limite para publicidades, ideias e oportunidades. Já está incluída no total."
          value={reservaMostrada}
          onChange={aoMudarReserva}
          erro={reservaDraft != null ? 'A reserva precisa caber no limite semanal.' : undefined}
        />
      </Surface>

      {parciais.length > 0 ? (
        <Surface>
          <div className="stack-md">
            <Text variant="secondary">
              Vale para a semana inteira, de domingo a sábado.
            </Text>
            {parciais.map(semana => {
              const ajuste = decisao?.ajustesSemana.find(
                item => item.inicio === semana.inicio && item.fim === semana.fim,
              );
              return (
                <CampoNumero
                  key={`${semana.inicio}:${semana.fim}`}
                  id={`ajuste-${semana.inicio}`}
                  label={rotuloSemanaAjustada(semana.inicio, semana.fim)}
                  value={ajuste == null ? '' : String(ajuste.limite)}
                  onChange={value => aoMudarAjuste(semana, value)}
                />
              );
            })}
          </div>
        </Surface>
      ) : null}

      <Surface>
        <TagSelect
          id="rede-referencia"
          label="Qual rede usar como base para o calendário?"
          placeholder="Nenhuma"
          searchable
          maxSelections={1}
          values={preferencias.redeReferenciaId ? [preferencias.redeReferenciaId] : []}
          options={opcoesReferencia.map(platform => ({ value: platform.id, label: platform.nome }))}
          onChange={values => salvarPreferencias({ redeReferenciaId: values[0] ?? null })}
        />
      </Surface>

      <Surface>
        <CampoNumero
          id="reserva-prontos"
          label="Quantos conteúdos prontos você quer manter de reserva?"
          hint="Conteúdos finalizados e sem data de publicação. Gravados que precisam de edição e conteúdos já agendados ficam fora."
          value={preferencias.reservaProntos == null ? '' : String(preferencias.reservaProntos)}
          onChange={value => salvarPreferencias({ reservaProntos: inteiroOuNull(value) })}
        />
      </Surface>

      <Surface>
        <div className="stack-md">
          <div className="stack-sm">
            <Text variant="bodyStrong">Quantos conteúdos de cada objetivo?</Text>
            <Text variant="secondary">Opcional. Não cria espaços a mais.</Text>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCOES.map(funcao => (
              <CampoNumero
                key={funcao}
                id={`meta-${funcao}`}
                label={FUNCAO_CURTA[funcao]}
                value={decisao?.metas[funcao] == null ? '' : String(decisao.metas[funcao])}
                onChange={value => salvarDecisao({ metas: metasCom(decisao?.metas ?? {}, funcao, value) })}
              />
            ))}
          </div>
        </div>
      </Surface>

      <SecaoRecolhida titulo="Público, linguagem e assuntos do perfil">
        <CampoTexto
          id="publico-linguagem"
          nome="Público, linguagem e assuntos do perfil"
          value={preferencias.publicoLinguagem}
          onSave={publicoLinguagem => {
            if (publicoLinguagem === preferencias.publicoLinguagem) return;
            salvarPreferencias({ publicoLinguagem });
          }}
        />
      </SecaoRecolhida>

      <SecaoRecolhida titulo="Dias para produzir e compromissos do período">
        <CampoTexto
          id="disponibilidade"
          nome="Dias para produzir e compromissos do período"
          value={preferencias.disponibilidade}
          onSave={disponibilidade => {
            if (disponibilidade === preferencias.disponibilidade) return;
            salvarPreferencias({ disponibilidade });
          }}
        />
      </SecaoRecolhida>

      <SecaoRecolhida titulo="Preferências por rede">
        <Text variant="secondary">
          {resumoHorarios(state.postingTimeEntries ?? [], state.platforms)}
        </Text>
        <Link
          to="/configuracoes/plataformas"
          className="w-fit text-[var(--text-primary)] underline underline-offset-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          Horários de postagem
        </Link>
        <CampoTexto
          id="hashtags-fora-series"
          label="Hashtags fora das séries"
          rows={3}
          placeholder="#hashtag1 #hashtag2"
          value={preferencias.hashtagsForaSeries}
          onSave={hashtagsForaSeries => {
            if (hashtagsForaSeries === preferencias.hashtagsForaSeries) return;
            salvarPreferencias({ hashtagsForaSeries });
          }}
        />
      </SecaoRecolhida>

      <div className="stack-sm">
        <Text variant="secondary">Estas opções não entram na conta do período.</Text>
        <div className="grid gap-3 sm:grid-cols-2">
          {linhas.map(row => (
            <Surface key={row.key} padding="none">
              <ToggleRow
                id={`plano-${row.key}`}
                enabled={row.enabled}
                onToggle={row.toggle}
                title={row.title}
                className="gap-4 p-4"
              >
                <Text variant="bodyStrong" as="span" className="block">{row.title}</Text>
                <Text variant="secondary" as="span" className="mt-1 block">{row.description}</Text>
              </ToggleRow>
            </Surface>
          ))}
        </div>
      </div>
    </div>
  );
}
