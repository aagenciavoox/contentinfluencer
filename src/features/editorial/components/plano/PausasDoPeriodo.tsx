import { useState } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { AlertCircle, Pencil, Plus } from 'lucide-react';
import { SidePanel } from '../../../../components/layout/SidePanel';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { ChoiceChips } from '../../../../components/ui/ChoiceChips';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import type { Platform, Serie } from '../../../../lib/database';
import { generateUUID } from '../../../../utils/uuid';
import { rotuloConta } from '../../../contas/lib/contas';
import { upsertDecisaoPeriodo, type DecisaoPeriodo } from '../../lib/editorialSettings';
import {
  EFEITO_DO_ESCOPO,
  ESCOPOS_DA_PAUSA,
  pausasDoTexto,
  pausasNoIntervalo,
  problemaDaPausa,
  removerPausa,
  ROTULO_DO_ESCOPO,
  salvarPausa,
  type EscopoDaPausa,
  type PausaEditorial,
} from '../../lib/pausas';
import { CAMPO, CAMPO_BASE } from './campos';
import { useEditorialPlano } from './useEditorialPlano';
import { diaMes } from './ValeAPartirDe';

type Intervalo = { inicio: string; fim: string };

function textoDoTrecho(trecho: Intervalo): string {
  return trecho.inicio === trecho.fim ? diaMes(trecho.inicio) : `${diaMes(trecho.inicio)} a ${diaMes(trecho.fim)}`;
}

function diasNoPeriodo(pausa: Intervalo, periodo: Intervalo): number {
  const inicio = pausa.inicio > periodo.inicio ? pausa.inicio : periodo.inicio;
  const fim = pausa.fim < periodo.fim ? pausa.fim : periodo.fim;
  return inicio > fim ? 0 : differenceInCalendarDays(parseISO(fim), parseISO(inicio)) + 1;
}

function alvoDaPausa(pausa: PausaEditorial, platforms: readonly Platform[], series: readonly Serie[]): string {
  if (pausa.escopo === 'conta') {
    const conta = platforms.find(item => item.id === pausa.platformId);
    return conta ? `Conta: ${rotuloConta(conta)}` : 'Conta removida';
  }
  if (pausa.escopo === 'serie') {
    return `Série: ${series.find(item => item.id === pausa.serieId)?.name ?? 'removida'}`;
  }
  return ROTULO_DO_ESCOPO[pausa.escopo];
}

/** Formulário de uma pausa: datas, o que pausa e o alvo quando é uma conta ou uma série. */
function EditorDaPausa({
  inicial,
  existente,
  platforms,
  series,
  escopos = ESCOPOS_DA_PAUSA,
  platformFixo = null,
  onSalvar,
  onRemover,
  onCancelar,
}: {
  inicial: PausaEditorial;
  existente: boolean;
  platforms: readonly Platform[];
  series: readonly Serie[];
  escopos?: readonly EscopoDaPausa[];
  platformFixo?: string | null;
  onSalvar: (pausa: PausaEditorial) => void;
  onRemover: () => void;
  onCancelar: () => void;
}) {
  const [rascunho, setRascunho] = useState<PausaEditorial>(inicial);
  const problema = problemaDaPausa(rascunho);
  const mudar = (patch: Partial<PausaEditorial>) => setRascunho(atual => ({ ...atual, ...patch }));
  const contas = platforms.filter(conta => conta.ativo || conta.id === rascunho.platformId);
  const seriesAtivas = series
    .filter(serie => serie.ativa || serie.id === rascunho.serieId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="stack-lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="stack-xs" htmlFor="pausa-inicio">
          <Text variant="bodyStrong" as="span">Início</Text>
          <input id="pausa-inicio" type="date" className={`${CAMPO_BASE} min-h-11`} value={rascunho.inicio} onChange={event => mudar({ inicio: event.target.value })} />
        </label>
        <label className="stack-xs" htmlFor="pausa-fim">
          <Text variant="bodyStrong" as="span">Fim</Text>
          <input id="pausa-fim" type="date" className={`${CAMPO_BASE} min-h-11`} min={rascunho.inicio} value={rascunho.fim} onChange={event => mudar({ fim: event.target.value })} />
        </label>
      </div>

      <div className="stack-sm">
        <Text variant="bodyStrong" as="span">O que pausa</Text>
        {escopos.length > 1 ? (
          <ChoiceChips<EscopoDaPausa>
            label="O que pausa"
            layout="stacked"
            value={rascunho.escopo}
            onChange={escopo => { if (escopo) mudar({ escopo }); }}
            options={escopos.map(escopo => ({ value: escopo, label: ROTULO_DO_ESCOPO[escopo], description: EFEITO_DO_ESCOPO[escopo] }))}
          />
        ) : (
          <Text variant="body" as="p">{EFEITO_DO_ESCOPO[rascunho.escopo]}</Text>
        )}
      </div>

      {rascunho.escopo === 'conta' && !platformFixo ? (
        <div className="stack-xs">
          <Text variant="bodyStrong" as="span">
            Conta
            <span className="text-[var(--brand-accent-text)]"> *</span>
          </Text>
          <SelectField
            ariaLabel="Conta pausada"
            block
            value={rascunho.platformId ?? ''}
            onChange={platformId => mudar({ platformId: platformId || null })}
            options={[{ value: '', label: 'Escolha a conta' }, ...contas.map(conta => ({ value: conta.id, label: rotuloConta(conta) }))]}
          />
        </div>
      ) : null}

      {rascunho.escopo === 'serie' ? (
        <div className="stack-xs">
          <Text variant="bodyStrong" as="span">Série</Text>
          <SelectField
            ariaLabel="Série pausada"
            block
            value={rascunho.serieId ?? ''}
            onChange={serieId => mudar({ serieId: serieId || null })}
            options={[{ value: '', label: 'Escolha a série' }, ...seriesAtivas.map(serie => ({ value: serie.id, label: serie.name }))]}
          />
        </div>
      ) : null}

      <label className="stack-xs" htmlFor="pausa-nota">
        <Text variant="bodyStrong" as="span">Nota</Text>
        <input
          id="pausa-nota"
          type="text"
          className={CAMPO}
          placeholder="Ex.: Natal com a família"
          value={rascunho.nota}
          onChange={event => mudar({ nota: event.target.value })}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-4">
        {existente ? (
          <AppButton variant="ghost" size="sm" onClick={onRemover}>Remover pausa</AppButton>
        ) : <span />}
        <div className="flex flex-wrap gap-2">
          <AppButton variant="secondary" size="sm" onClick={onCancelar}>Cancelar</AppButton>
          <AppButton
            variant="primary"
            size="sm"
            disabled={problema != null}
            disabledReason={problema ?? undefined}
            onClick={() => onSalvar(rascunho)}
          >
            Salvar pausa
          </AppButton>
        </div>
      </div>
    </div>
  );
}

/**
 * Pausas com data que cruzam o período, e a pausa escrita do período (o campo antigo).
 * Pausa de publicação tira os dias da meta; gravação e produção não mexem nela.
 */
export function PausasDoPeriodo({
  periodo = null,
  decisao = null,
  pendencia = null,
  escopos = ESCOPOS_DA_PAUSA,
  armazenadas = false,
  platformId = null,
}: {
  periodo?: Intervalo | null;
  decisao?: DecisaoPeriodo | null;
  /** O que a leitura da pausa escrita não conseguiu descontar. */
  pendencia?: string | null;
  /** Quais escopos esta lista mostra e deixa criar. */
  escopos?: readonly EscopoDaPausa[];
  /** Lista o que está gravado, sem cortar pelo período nem pela pausa escrita. */
  armazenadas?: boolean;
  /** Na aba da conta, a pausa já nasce nessa plataforma. */
  platformId?: string | null;
}) {
  const { state, settings, gravar } = useEditorialPlano();
  // daEscrita: aberta a partir da pausa escrita, que sai do campo quando a pausa com data é salva.
  const [editando, setEditando] = useState<{ pausa: PausaEditorial; existente: boolean; daEscrita?: boolean } | null>(null);
  const pausas = settings.pausas ?? [];
  const doPeriodo = (armazenadas || !periodo ? pausas : pausasNoIntervalo(pausas, periodo))
    .filter(pausa => escopos.includes(pausa.escopo))
    .filter(pausa => pausa.escopo !== 'conta' || !platformId || pausa.platformId === platformId);
  const texto = armazenadas ? '' : (decisao?.pausaEditorial?.trim() ?? '');
  const convertidas = texto ? pausasDoTexto(texto, periodo, generateUUID) : null;
  const hoje = format(new Date(), 'yyyy-MM-dd');

  const nova = (nota = ''): PausaEditorial => {
    const inicio = periodo && hoje >= periodo.inicio && hoje <= periodo.fim ? hoje : (periodo?.inicio ?? hoje);
    const escopo = escopos[0] ?? 'publicacao';
    return {
      id: generateUUID(),
      inicio,
      fim: inicio,
      escopo,
      platformId: escopo === 'conta' ? platformId : null,
      serieId: null,
      nota,
    };
  };

  // A pausa escrita sai do campo no mesmo passo em que as datas entram: o dia não é descontado duas vezes nem some.
  const converter = () => {
    if (!convertidas || !decisao) return;
    const comPausas = { ...settings, pausas: convertidas.reduce((lista, pausa) => salvarPausa(lista, pausa), pausas) };
    gravar(upsertDecisaoPeriodo(comPausas, { ...decisao, pausaEditorial: '' }));
  };

  const semPausas = doPeriodo.length === 0 && !texto;

  return (
    <>
      {semPausas ? (
        <section className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <div className="inline-flex items-center">
              <Text variant="label" as="span" className="text-[var(--text-secondary)]">Pausas</Text>
              <Ajuda
                rotulo="Sobre pausas"
                texto="Vai dar uma pausa? Escolha o que você quer pausar e por quanto tempo. Gravação e produção mantêm as publicações no calendário."
              />
            </div>
            <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
              {armazenadas ? 'Nenhuma pausa' : 'Nenhuma pausa no período'}
            </Text>
          </div>
          <button
            type="button"
            onClick={() => setEditando({ pausa: nova(), existente: false })}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-input)] px-2 py-1 t-button text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Adicionar pausa
          </button>
        </section>
      ) : (
        <section className="border-t border-[var(--border-subtle)] pt-3 stack-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center">
              <Text variant="label" as="h3" className="text-[var(--text-secondary)]">Pausas</Text>
              <Ajuda
                rotulo="Sobre pausas"
                texto="Vai dar uma pausa? Escolha o que você quer pausar e por quanto tempo. Gravação e produção mantêm as publicações no calendário."
              />
            </div>
            <button
              type="button"
              onClick={() => setEditando({ pausa: nova(), existente: false })}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-input)] px-2 py-1 t-button text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Adicionar pausa
            </button>
          </div>

          {doPeriodo.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {doPeriodo.map(pausa => {
                const dias = periodo ? diasNoPeriodo(pausa, periodo) : differenceInCalendarDays(parseISO(pausa.fim), parseISO(pausa.inicio)) + 1;
                return (
                  <li key={pausa.id}>
                    <button
                      type="button"
                      onClick={() => setEditando({ pausa, existente: true })}
                      className="inline-flex max-w-full items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-1.5 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <span className="min-w-0 truncate t-meta tabular-nums text-[var(--text-primary)]">
                        {textoDoTrecho(pausa)} · {alvoDaPausa(pausa, state.platforms, state.series)}
                        <span className="text-[var(--text-tertiary)]">
                          {' '}({dias === 1 ? '1 dia' : `${dias} dias`}{pausa.nota ? ` · ${pausa.nota}` : ''})
                        </span>
                      </span>
                      <Pencil className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {texto ? (
            <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-orange)]" aria-hidden />
              <div className="min-w-0 flex-1 stack-xs">
                <Text variant="body" as="p">
                  <strong>Pausa escrita:</strong> {texto}
                </Text>
                {convertidas ? (
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    Lida como {convertidas.map(textoDoTrecho).join(', ')}, já descontada da meta. Converter guarda as datas e tira o texto do campo; a meta não muda.
                  </Text>
                ) : pendencia ? (
                  <Text variant="meta" as="p" className="text-[color-mix(in_srgb,var(--warning)_60%,var(--text-primary))]">{pendencia}</Text>
                ) : (
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">Nenhum dia dela cai neste período.</Text>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {convertidas ? (
                    <AppButton variant="secondary" size="sm" onClick={converter}>Converter em pausa com data</AppButton>
                  ) : (
                    <AppButton variant="secondary" size="sm" onClick={() => setEditando({ pausa: nova(texto), existente: false, daEscrita: true })}>
                      Criar pausa com data
                    </AppButton>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <SidePanel
        open={editando != null}
        onClose={() => setEditando(null)}
        title={editando?.existente ? 'Editar pausa' : 'Nova pausa'}
        subtitle={editando?.daEscrita
          ? 'Escreva as datas da pausa. Ao salvar, o texto antigo sai do campo e fica na nota.'
          : 'Vale nas datas escolhidas, em qualquer período que elas cruzarem.'}
        widthClassName="max-w-2xl"
      >
        {editando ? (
          <EditorDaPausa
            key={editando.pausa.id}
            inicial={editando.pausa}
            existente={editando.existente}
            platforms={state.platforms}
            series={state.series}
            escopos={escopos}
            platformFixo={platformId}
            onCancelar={() => setEditando(null)}
            onRemover={() => {
              gravar({ ...settings, pausas: removerPausa(pausas, editando.pausa.id) });
              setEditando(null);
            }}
            onSalvar={pausa => {
              const comPausa = { ...settings, pausas: salvarPausa(pausas, pausa) };
              gravar(editando.daEscrita && decisao ? upsertDecisaoPeriodo(comPausa, { ...decisao, pausaEditorial: '' }) : comPausa);
              setEditando(null);
            }}
          />
        ) : null}
      </SidePanel>
    </>
  );
}
