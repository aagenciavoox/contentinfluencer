import { useState } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { AlertCircle, Pencil, Plus } from 'lucide-react';
import { SidePanel } from '../../../../components/layout/SidePanel';
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
  onSalvar,
  onRemover,
  onCancelar,
}: {
  inicial: PausaEditorial;
  existente: boolean;
  platforms: readonly Platform[];
  series: readonly Serie[];
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
        <ChoiceChips<EscopoDaPausa>
          label="O que pausa"
          layout="stacked"
          value={rascunho.escopo}
          onChange={escopo => { if (escopo) mudar({ escopo }); }}
          options={ESCOPOS_DA_PAUSA.map(escopo => ({ value: escopo, label: ROTULO_DO_ESCOPO[escopo], description: EFEITO_DO_ESCOPO[escopo] }))}
        />
      </div>

      {rascunho.escopo === 'conta' ? (
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
            Salvar
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
  periodo,
  decisao,
  pendencia,
}: {
  periodo: Intervalo;
  decisao: DecisaoPeriodo | null;
  /** O que a leitura da pausa escrita não conseguiu descontar. */
  pendencia: string | null;
}) {
  const { state, settings, gravar } = useEditorialPlano();
  // daEscrita: aberta a partir da pausa escrita, que sai do campo quando a pausa com data é salva.
  const [editando, setEditando] = useState<{ pausa: PausaEditorial; existente: boolean; daEscrita?: boolean } | null>(null);
  const pausas = settings.pausas ?? [];
  const doPeriodo = pausasNoIntervalo(pausas, periodo);
  const texto = decisao?.pausaEditorial?.trim() ?? '';
  const convertidas = texto ? pausasDoTexto(texto, periodo, generateUUID) : null;
  const hoje = format(new Date(), 'yyyy-MM-dd');

  const nova = (nota = ''): PausaEditorial => {
    const inicio = hoje >= periodo.inicio && hoje <= periodo.fim ? hoje : periodo.inicio;
    return { id: generateUUID(), inicio, fim: inicio, escopo: 'publicacao', platformId: null, serieId: null, nota };
  };

  // A pausa escrita sai do campo no mesmo passo em que as datas entram: o dia não é descontado duas vezes nem some.
  const converter = () => {
    if (!convertidas || !decisao) return;
    const comPausas = { ...settings, pausas: convertidas.reduce((lista, pausa) => salvarPausa(lista, pausa), pausas) };
    gravar(upsertDecisaoPeriodo(comPausas, { ...decisao, pausaEditorial: '' }));
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Text variant="bodyStrong" as="h3">Pausas</Text>
          <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
            Pausa de publicação tira os dias da meta. Gravação e produção não mudam a meta.
          </Text>
        </div>
        <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditando({ pausa: nova(), existente: false })}>
          Adicionar pausa
        </AppButton>
      </div>

      {doPeriodo.length > 0 ? (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {doPeriodo.map(pausa => {
            const dias = diasNoPeriodo(pausa, periodo);
            return (
              <li key={pausa.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <Text variant="body" as="p" className="tabular-nums">
                    {textoDoTrecho(pausa)} · {alvoDaPausa(pausa, state.platforms, state.series)}
                  </Text>
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    {dias === 1 ? '1 dia no período' : `${dias} dias no período`}
                    {pausa.nota ? ` · ${pausa.nota}` : ''}
                  </Text>
                </div>
                <AppButton variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditando({ pausa, existente: true })}>
                  Editar
                </AppButton>
              </li>
            );
          })}
        </ul>
      ) : !texto ? (
        <Text variant="secondary" as="p">Nenhuma pausa no período.</Text>
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
              <Text variant="meta" as="p" className="text-[#92400e] dark:text-[#fde68a]">{pendencia}</Text>
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
    </section>
  );
}
