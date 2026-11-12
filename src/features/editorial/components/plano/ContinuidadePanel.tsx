import { useMemo, useState } from 'react';
import { Activity, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Dialog } from '../../../../components/overlays/Dialog';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Section } from '../../../../components/ui/Section';
import { SelectField } from '../../../../components/ui/SelectField';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import type { Platform, Serie, Temporada as TemporadaDb } from '../../../../lib/database';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { cn } from '../../../../lib/utils';
import { isReadyToPublish } from '../../../contents/lib/contentPipeline';
import { normalizePublicacaoStatus } from '../../lib/publicacaoSituacao';
import { decisaoDoPeriodo, semanasNoIntervalo } from '../../lib/periodoEditorial';
import { metasDasContas } from '../../lib/metasPorConta';
import { readProporcao } from '../../lib/proporcaoObjetivos';
import {
  contarEpisodios,
  contarNaConta,
  episodiosDaLinha,
  filtrarLinhas,
  metaDoRitmo,
  type ContagemDoPlano,
  type EpisodioDoPlano,
  type FiltroDoPlano,
  type PublicacaoDoPlano,
  type TipoDaLinha,
} from '../../lib/planoDoPeriodo';
import { FrequenciaChip } from '../FrequenciaChip';
import { useEditorialPlano } from './useEditorialPlano';
import { inteiroNaoNegativo } from '../../../../lib/inteiro';
import type { Temporada } from '../../lib/temporadas';
import { ondaComRitmoProprio, ritmoProprioMarcado } from '../../lib/metaPropria';
import { Badge } from '../../../../components/ui/Badge';
import { generateUUID } from '../../../../utils/uuid';
import { tipoDaSerie } from '../../../settings/lib/serieAgrupamento';
import { iconeDaConta, rotuloConta } from '../../../contas/lib/contas';
import {
  acompanhamentoGeral,
  acompanhamentosPorEscopo,
  acompanhaNoGeral,
  comAcompanhamentoGeral,
  metaDoEscopo,
  novoAcompanhamento,
} from '../../lib/acompanhamento';
import type { AcompanhamentoSerie, MetaDaSerieNoEscopo } from '../../lib/continuidadeEscopo';
import { errosDaMeta, idDaJanela, idDoEscopo, ID_META, type ErroDaMeta } from '../../lib/errosDaMeta';
import { frequenciaParaGravar, unidadeDaMeta, type UnidadeDaMeta } from '../../lib/metaDaOnda';
import { FORMATOS_DA_REDE, publicacoesDaAgenda, rotuloDoFormato } from '../../lib/publicacoes';
import { CAMPO } from './campos';
import { CamposDaMeta, UNIDADES } from './CamposDaMeta';
import { textoDoChip } from '../../lib/frequenciaChip';
import { unidadesDaRegraDeOuro } from '../../lib/regraDeOuro';

const FORMATOS = [...new Set(Object.values(FORMATOS_DA_REDE).flatMap(lista => [...(lista ?? [])]))];

type Linha = AcompanhamentoSerie & {
  metaVezes: string;
  metaUnidade: MetaDaSerieNoEscopo['unidade'];
  metaAPartirDe: string;
};


function numeroDeDias(texto: string): number | null {
  const n = inteiroNaoNegativo(texto);
  return n != null && n > 0 ? n : null;
}

function rotuloDoEscopo(linha: Pick<AcompanhamentoSerie, 'escopo' | 'platformId' | 'formato'>, contas: readonly Platform[]): string {
  const conta = contas.find(item => item.id === linha.platformId);
  const nomeConta = conta ? rotuloConta(conta) : null;
  if (linha.escopo === 'conta') return nomeConta ?? 'Conta removida';
  const formato = linha.formato ? rotuloDoFormato(linha.formato, conta?.rede ?? null) : 'Formato';
  return nomeConta ? `${formato} em ${nomeConta}` : `${formato} em todas as contas`;
}

function linhasDaSerie(serie: Serie): Linha[] {
  return acompanhamentosPorEscopo(serie).map(item => {
    const meta = metaDoEscopo(serie.metasPorEscopo, item);
    return {
      ...item,
      metaVezes: meta ? String(meta.vezes) : '',
      metaUnidade: meta?.unidade ?? 'semana',
      metaAPartirDe: meta?.aPartirDe ?? '',
    };
  });
}

function TextoErro({ id, children }: { id: string; children: string }) {
  return <Text id={id} variant="meta" as="span" className="texto-erro">{children}</Text>;
}

function RegrasDoAcompanhamento({
  item,
  onChange,
  idPrefix,
  erroTermino,
}: {
  item: Pick<AcompanhamentoSerie, 'inicio' | 'termino' | 'distanciaMaxDias' | 'evitarDiasSeguidos'>;
  onChange: (patch: Partial<AcompanhamentoSerie>) => void;
  idPrefix: string;
  erroTermino?: string;
}) {
  const terminoId = idDaJanela(idPrefix, 'termino');
  return (
    <>
      <div className="grid-form">
        <label className="flex flex-col gap-1" htmlFor={idDaJanela(idPrefix, 'inicio')}>
          <Text variant="meta" as="span">Início do acompanhamento (opcional)</Text>
          <input id={idDaJanela(idPrefix, 'inicio')} type="date" className={CAMPO} value={item.inicio ?? ''} onChange={event => onChange({ inicio: event.target.value || null })} />
        </label>
        <label className="flex flex-col gap-1" htmlFor={terminoId}>
          <Text variant="meta" as="span">Término (opcional)</Text>
          <input
            id={terminoId}
            type="date"
            aria-invalid={erroTermino ? true : undefined}
            aria-describedby={erroTermino ? `${terminoId}-erro` : undefined}
            className={CAMPO}
            style={erroTermino ? { borderColor: 'var(--danger)' } : undefined}
            value={item.termino ?? ''}
            onChange={event => onChange({ termino: event.target.value || null })}
          />
          {erroTermino ? <TextoErro id={`${terminoId}-erro`}>{erroTermino}</TextoErro> : null}
        </label>
        <label className="flex flex-col gap-1">
          <Text variant="meta" as="span">Distância máxima sem episódio (dias)</Text>
          <input
            type="text"
            inputMode="numeric"
            className={CAMPO}
            value={item.distanciaMaxDias ?? ''}
            onChange={event => onChange({ distanciaMaxDias: numeroDeDias(event.target.value) })}
          />
        </label>
      </div>
      <label className="flex w-fit items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={item.evitarDiasSeguidos}
          onChange={event => onChange({ evitarDiasSeguidos: event.target.checked })}
          className="h-4 w-4 accent-[var(--brand-accent)]"
        />
        <Text variant="body" as="span">Avisar episódios em dias seguidos</Text>
      </label>
    </>
  );
}


/** Quadro é sob demanda: não tem meta, então não abre este modal. */
type AlvoSerie = { tipo: 'serie'; serie: Serie; familia?: boolean };
type AlvoTemporada = { tipo: 'temporada'; temporada: Temporada; serie: Serie };
type Alvo = AlvoSerie | AlvoTemporada;

function ModalDaMeta({ alvo, contas, onClose }: { alvo: Alvo; contas: readonly Platform[]; onClose: () => void }) {
  const { state, dispatch } = useAppContext();
  // Regra de Ouro: série e wave, até 1 por semana.
  const unidadesDaRegra = alvo.tipo === 'temporada' ? 1 : unidadesDaRegraDeOuro(alvo.serie.id, state.series);
  const base = alvo.tipo === 'temporada' ? alvo.temporada : alvo.serie;
  const [acompanhar, setAcompanhar] = useState(alvo.tipo === 'temporada' ? alvo.temporada.acompanhar === true : acompanhaNoGeral(alvo.serie));
  const [vezes, setVezes] = useState(base.frequenciaVezes ? String(base.frequenciaVezes) : '');
  const [unidade, setUnidade] = useState<UnidadeDaMeta>(unidadeDaMeta(base.frequenciaUnidade));
  const [inicio, setInicio] = useState(base.frequenciaAPartirDe ?? '');
  // Ritmo próprio da wave: com meta, os episódios dela saem da conta da série. Ligado por padrão.
  const [ritmoProprio, setRitmoProprio] = useState(alvo.tipo === 'temporada' ? ritmoProprioMarcado(alvo.temporada) : true);
  const [geral, setGeral] = useState<AcompanhamentoSerie | null>(alvo.tipo === 'temporada' ? null : acompanhamentoGeral(alvo.serie));
  const [linhas, setLinhas] = useState<Linha[]>(alvo.tipo === 'temporada' ? [] : linhasDaSerie(alvo.serie));
  const [erros, setErros] = useState<ErroDaMeta[]>([]);
  const [gravando, setGravando] = useState(false);
  const [regrasDaOnda, setRegrasDaOnda] = useState(() => ({
    inicio: alvo.tipo === 'temporada' ? alvo.temporada.acompanhamentoInicio ?? null : null,
    termino: alvo.tipo === 'temporada' ? alvo.temporada.acompanhamentoTermino ?? null : null,
    distanciaMaxDias: alvo.tipo === 'temporada' ? alvo.temporada.distanciaMaxDias ?? null : null,
    evitarDiasSeguidos: alvo.tipo === 'temporada' ? alvo.temporada.evitarDiasSeguidos === true : false,
  }));
  const comEscopos = alvo.tipo !== 'temporada' && alvo.serie.acompanhamentos !== undefined;

  const mudar = (id: string, patch: Partial<Linha>) => setLinhas(prev => prev.map(linha => (linha.id === id ? { ...linha, ...patch } : linha)));
  const adicionar = (escopo: 'conta' | 'formato') => {
    if (alvo.tipo === 'temporada') return;
    const criada = novoAcompanhamento(alvo.serie.id, escopo, escopo === 'conta' ? contas[0]?.id ?? null : null, escopo === 'formato' ? FORMATOS[0] ?? 'reels' : null, generateUUID());
    setLinhas(prev => [...prev, { ...criada, metaVezes: '', metaUnidade: 'semana', metaAPartirDe: '' }]);
  };

  const mensagem = (id: string) => erros.find(item => item.id === id)?.mensagem;
  const temAsterisco = vezes.trim() !== ''
    || linhas.some(linha => linha.escopo === 'conta');

  const salvar = async () => {
    if (gravando) return;
    const lista = errosDaMeta({
      vezes,
      unidade,
      inicio,
      tipo: alvo.tipo,
      unidadesDaRegra,
      janelaOnda: alvo.tipo === 'temporada' ? regrasDaOnda : null,
      janelaGeral: comEscopos ? geral : null,
      comEscopos,
      linhas: linhas.flatMap(linha => (
        linha.escopo === 'conta' || linha.escopo === 'formato'
          ? [{ ...linha, escopo: linha.escopo, rotulo: rotuloDoEscopo(linha, contas) }]
          : []
      )),
    });
    if (lista.length > 0) {
      setErros(lista);
      window.setTimeout(() => document.getElementById(lista[0].id)?.focus(), 0);
      return;
    }
    setErros([]);

    const vezesNumero = inteiroNaoNegativo(vezes);
    const frequencia = frequenciaParaGravar({
      vezes: vezesNumero,
      unidade,
      aPartirDe: inicio,
      tipo: alvo.tipo,
      unidadesDaRegra,
    });
    if ('erro' in frequencia) return;

    setGravando(true);
    try {
      if (alvo.tipo === 'temporada') {
        await dispatch({
          type: 'UPDATE_TEMPORADA',
          payload: {
            ...alvo.temporada,
            acompanhar,
            ritmoProprio,
            frequenciaVezes: frequencia.vezes,
            frequenciaUnidade: frequencia.unidade,
            frequenciaAPartirDe: frequencia.aPartirDe,
            acompanhamentoInicio: regrasDaOnda.inicio,
            acompanhamentoTermino: regrasDaOnda.termino,
            distanciaMaxDias: regrasDaOnda.distanciaMaxDias,
            evitarDiasSeguidos: regrasDaOnda.evitarDiasSeguidos,
          },
        });
        onClose();
        return;
      }

    const comGeral = comAcompanhamentoGeral(alvo.serie, acompanhar, generateUUID);
    const gerais = (comGeral.acompanhamentos ?? []).filter(item => item.escopo === 'geral').map(item => (
      geral
        ? {
          ...item,
          ativo: acompanhar,
          inicio: geral.inicio || null,
          termino: geral.termino || null,
          distanciaMaxDias: geral.distanciaMaxDias,
          evitarDiasSeguidos: geral.evitarDiasSeguidos,
        }
        : { ...item, ativo: acompanhar }
    ));
    const acompanhamentos = comEscopos
      ? [
        ...gerais,
        ...linhas.map(({ metaVezes: _vezes, metaUnidade: _unidade, metaAPartirDe: _inicio, ...item }) => ({
          ...item,
          platformId: item.escopo === 'conta' || item.escopo === 'formato' ? item.platformId || null : null,
          inicio: item.inicio || null,
          termino: item.termino || null,
        })),
      ]
      : comGeral.acompanhamentos;
    const metas: MetaDaSerieNoEscopo[] | undefined = comEscopos
      ? linhas.flatMap(linha => {
        const quantidade = inteiroNaoNegativo(linha.metaVezes);
        if (!Number.isFinite(quantidade) || quantidade <= 0) return [];
        return [{
          serieId: alvo.serie.id,
          platformId: linha.platformId || null,
          formato: linha.formato || null,
          vezes: quantidade,
          unidade: linha.metaUnidade,
          aPartirDe: linha.metaAPartirDe || null,
        }];
      })
      : alvo.serie.metasPorEscopo;

      await dispatch({
        type: 'UPDATE_SERIE',
        payload: {
          ...alvo.serie,
          ...comGeral,
          frequenciaVezes: frequencia.vezes,
          frequenciaUnidade: frequencia.unidade,
          frequenciaAPartirDe: frequencia.aPartirDe,
          frequenciaRecomendada: frequencia.recomendada,
          acompanhamentos,
          metasPorEscopo: metas,
          updatedAt: new Date().toISOString(),
        },
      });
      onClose();
    } catch {
      // O aviso de erro já saiu. O diálogo fica aberto com o que foi digitado.
    } finally {
      setGravando(false);
    }
  };

  const opcoesConta = contas.map(conta => ({ value: conta.id, label: rotuloConta(conta) }));
  const titulo = alvo.tipo === 'temporada' ? alvo.temporada.nome : alvo.serie.name;
  const subtitulo = alvo.tipo === 'temporada'
    ? `Temporada de ${alvo.serie.name}. A Saúde conta só os episódios desta wave.`
    : alvo.familia
      ? `Família: conta os episódios únicos das séries dela (quadros ficam fora). Regra de Ouro: até ${unidadesDaRegra} por semana, um por série ativa.`
      : 'Série inteira, sem os quadros (sob demanda). Regra de Ouro: no máximo 1 episódio por semana. Temporadas com ritmo próprio contam à parte.';

  return (
    <Dialog open onClose={gravando ? () => undefined : onClose} desktopMaxW="md:max-w-[640px]" ariaLabel={`Meta de ${titulo}`}>
      <OverlayHeader title={titulo} subtitle={subtitulo} onClose={gravando ? () => undefined : onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 stack-md">
        {erros.length > 0 ? (
          <div id="meta-erros" role="alert" className="rounded-[var(--radius-card)] border border-[var(--danger)] bg-[var(--bg-elevated)] px-4 py-3 stack-xs">
            <p className="t-body-strong flex items-center gap-2" style={{ color: 'var(--danger)' }}>
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              Falta preencher para salvar
            </p>
            <div className="stack-xs">
              {erros.map((item, index) => (
                <Text key={`${item.id}-${index}`} variant="meta" as="p" className="texto-erro">{item.mensagem}</Text>
              ))}
            </div>
          </div>
        ) : null}
        <label className="flex w-fit items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={acompanhar}
            onChange={event => {
              const ligado = event.target.checked;
              setAcompanhar(ligado);
              if (ligado && alvo.tipo !== 'temporada' && alvo.serie.acompanhamentos !== undefined && !geral) {
                setGeral(novoAcompanhamento(alvo.serie.id, 'geral', null, null, generateUUID()));
              }
            }}
            className="h-4 w-4 accent-[var(--brand-accent)]"
          />
          <Text variant="body" as="span">Acompanhar na Saúde</Text>
        </label>
        <CamposDaMeta
          idPrefix="meta-geral"
          vezes={vezes}
          unidade={unidade}
          inicio={inicio}
          onVezes={setVezes}
          onUnidade={setUnidade}
          onInicio={setInicio}
          erros={{
            quantidade: mensagem(ID_META.quantidade),
            periodo: mensagem(ID_META.periodo),
            inicio: mensagem(ID_META.inicio),
          }}
        />
        {temAsterisco ? (
          <Text variant="meta" as="p">
            <span className="text-[var(--brand-accent-text)]">*</span> Campo obrigatório
          </Text>
        ) : null}
        {alvo.tipo === 'temporada' && vezes.trim() ? (
          <label className="flex w-fit items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ritmoProprio}
              onChange={event => setRitmoProprio(event.target.checked)}
              className="h-4 w-4 accent-[var(--brand-accent)]"
            />
            <Text variant="body" as="span">Ritmo próprio: os episódios desta wave saem da conta da série</Text>
          </label>
        ) : null}
        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
          Quantidade vazia tira a meta. Com o acompanhamento ligado e sem meta, a Saúde pede a configuração e não marca falta.
        </Text>
        {alvo.tipo === 'temporada' ? (
          <div className="stack-sm rounded-[var(--radius-input)] bg-[var(--surface-subtle)] p-4">
            <Text variant="bodyStrong" as="span">Janela e regras da wave</Text>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              Antes do início não há aviso. Depois do término, sai da conferência.
            </Text>
            <RegrasDoAcompanhamento
              idPrefix="onda"
              erroTermino={mensagem(idDaJanela('onda', 'termino'))}
              item={regrasDaOnda}
              onChange={patch => setRegrasDaOnda(atual => ({ ...atual, ...patch }))}
            />
          </div>
        ) : null}
        {comEscopos && geral ? (
          <div className="stack-sm rounded-[var(--radius-input)] bg-[var(--surface-subtle)] p-4">
            <Text variant="bodyStrong" as="span">Janela do acompanhamento geral</Text>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              Antes do início não há aviso. Depois do término, sai da conferência.
            </Text>
            <RegrasDoAcompanhamento
              idPrefix="geral"
              erroTermino={mensagem(idDaJanela('geral', 'termino'))}
              item={geral}
              onChange={patch => setGeral(atual => (atual ? { ...atual, ...patch } : atual))}
            />
          </div>
        ) : null}
        {comEscopos ? (
          <div className="stack-sm border-t border-[var(--border-subtle)] pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text variant="bodyStrong" as="span">Por conta ou formato</Text>
              <div className="flex flex-wrap items-center gap-2">
                <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} disabled={contas.length === 0} onClick={() => adicionar('conta')}>Por conta</AppButton>
                <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => adicionar('formato')}>Por formato</AppButton>
              </div>
            </div>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              Cada escopo é conferido à parte. Sem meta própria, usa a meta geral.
            </Text>
            {linhas.length === 0 ? <Text variant="meta" as="p">Nenhum acompanhamento por conta ou formato.</Text> : null}
            {linhas.map(linha => (
              <div key={linha.id} className="stack-xs border-t border-[var(--border-subtle)] pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Text variant="bodyStrong" as="span">{rotuloDoEscopo(linha, contas)}</Text>
                  <AppButton variant="ghost" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setLinhas(prev => prev.filter(item => item.id !== linha.id))}>
                    Remover
                  </AppButton>
                </div>
                <div className="grid-form">
                  {linha.escopo === 'formato' ? (
                    <label className="flex flex-col gap-1" htmlFor={idDoEscopo(linha.id, 'formato')}>
                      <Text variant="meta" as="span">Formato</Text>
                      <SelectField
                        id={idDoEscopo(linha.id, 'formato')}
                        block
                        ariaLabel="Formato"
                        describedBy={mensagem(idDoEscopo(linha.id, 'formato')) ? `${idDoEscopo(linha.id, 'formato')}-erro` : undefined}
                        className={mensagem(idDoEscopo(linha.id, 'formato')) ? 'border-[var(--danger)]' : undefined}
                        value={linha.formato ?? ''}
                        onChange={formato => mudar(linha.id, { formato })}
                        options={FORMATOS.map(formato => ({ value: formato, label: rotuloDoFormato(formato) }))}
                      />
                      {mensagem(idDoEscopo(linha.id, 'formato')) ? <TextoErro id={`${idDoEscopo(linha.id, 'formato')}-erro`}>{mensagem(idDoEscopo(linha.id, 'formato'))!}</TextoErro> : null}
                    </label>
                  ) : null}
                  <label className="flex flex-col gap-1" htmlFor={idDoEscopo(linha.id, 'conta')}>
                    <Text variant="meta" as="span">
                      Conta
                      {linha.escopo === 'conta' ? <span className="text-[var(--brand-accent-text)]"> *</span> : null}
                    </Text>
                    <SelectField
                      id={idDoEscopo(linha.id, 'conta')}
                      block
                      ariaLabel="Conta"
                      describedBy={mensagem(idDoEscopo(linha.id, 'conta')) ? `${idDoEscopo(linha.id, 'conta')}-erro` : undefined}
                      className={mensagem(idDoEscopo(linha.id, 'conta')) ? 'border-[var(--danger)]' : undefined}
                      value={linha.platformId ?? ''}
                      onChange={platformId => mudar(linha.id, { platformId: platformId || null })}
                      options={linha.escopo === 'formato' ? [{ value: '', label: 'Todas as contas' }, ...opcoesConta] : opcoesConta}
                    />
                    {mensagem(idDoEscopo(linha.id, 'conta')) ? <TextoErro id={`${idDoEscopo(linha.id, 'conta')}-erro`}>{mensagem(idDoEscopo(linha.id, 'conta'))!}</TextoErro> : null}
                  </label>
                </div>
                <RegrasDoAcompanhamento
                  idPrefix={`escopo-${linha.id}`}
                  erroTermino={mensagem(idDoEscopo(linha.id, 'termino'))}
                  item={linha}
                  onChange={patch => mudar(linha.id, patch)}
                />
                <div className="grid-form">
                  <label className="flex flex-col gap-1" htmlFor={idDoEscopo(linha.id, 'meta-vezes')}>
                    <Text variant="meta" as="span">Meta neste escopo (vazio = meta geral)</Text>
                    <input
                      id={idDoEscopo(linha.id, 'meta-vezes')}
                      type="text"
                      inputMode="numeric"
                      aria-label="Meta neste escopo"
                      aria-invalid={mensagem(idDoEscopo(linha.id, 'meta-vezes')) ? true : undefined}
                      aria-describedby={mensagem(idDoEscopo(linha.id, 'meta-vezes')) ? `${idDoEscopo(linha.id, 'meta-vezes')}-erro` : undefined}
                      className={CAMPO}
                      style={mensagem(idDoEscopo(linha.id, 'meta-vezes')) ? { borderColor: 'var(--danger)' } : undefined}
                      value={linha.metaVezes}
                      onChange={event => mudar(linha.id, { metaVezes: event.target.value.slice(0, 4) })}
                    />
                    {mensagem(idDoEscopo(linha.id, 'meta-vezes')) ? <TextoErro id={`${idDoEscopo(linha.id, 'meta-vezes')}-erro`}>{mensagem(idDoEscopo(linha.id, 'meta-vezes'))!}</TextoErro> : null}
                  </label>
                  <div className="flex flex-col gap-1">
                    <Text variant="meta" as="span" aria-hidden>Período</Text>
                    <SelectField
                      block
                      ariaLabel="Período da meta"
                      value={linha.metaUnidade}
                      onChange={valor => mudar(linha.id, { metaUnidade: unidadeDaMeta(valor) })}
                      options={UNIDADES}
                    />
                  </div>
                  <label className="flex flex-col gap-1" htmlFor={idDoEscopo(linha.id, 'meta-inicio')}>
                    <Text variant="meta" as="span">
                      Meta a partir de
                    </Text>
                    <input
                      id={idDoEscopo(linha.id, 'meta-inicio')}
                      type="date"
                      aria-label="Meta a partir de"
                      aria-invalid={mensagem(idDoEscopo(linha.id, 'meta-inicio')) ? true : undefined}
                      aria-describedby={mensagem(idDoEscopo(linha.id, 'meta-inicio')) ? `${idDoEscopo(linha.id, 'meta-inicio')}-erro` : undefined}
                      className={CAMPO}
                      style={mensagem(idDoEscopo(linha.id, 'meta-inicio')) ? { borderColor: 'var(--danger)' } : undefined}
                      value={linha.metaAPartirDe}
                      onChange={event => mudar(linha.id, { metaAPartirDe: event.target.value })}
                    />
                    {mensagem(idDoEscopo(linha.id, 'meta-inicio')) ? <TextoErro id={`${idDoEscopo(linha.id, 'meta-inicio')}-erro`}>{mensagem(idDoEscopo(linha.id, 'meta-inicio'))!}</TextoErro> : null}
                  </label>
                </div>
                <label className="flex w-fit items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={linha.ativo} onChange={event => mudar(linha.id, { ativo: event.target.checked })} className="h-4 w-4 accent-[var(--brand-accent)]" />
                  <Text variant="body" as="span">Acompanhando</Text>
                </label>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <OverlayFooter className="justify-end">
        <AppButton variant="secondary" onClick={onClose} disabled={gravando}>Cancelar</AppButton>
        <AppButton variant="primary" onClick={() => void salvar()} disabled={gravando}>
          {gravando ? 'Salvando…' : 'Salvar'}
        </AppButton>
      </OverlayFooter>
    </Dialog>
  );
}

type Intervalo = { inicio: string; fim: string };

type LinhaDoPlano = {
  chave: string;
  tipo: TipoDaLinha;
  nome: string;
  detalhe: string | null;
  nivel: 0 | 1;
  serie?: Serie;
  temporada?: TemporadaDb;
  conta?: Platform;
  meta: number | null;
  metaTexto: string;
  contagem: ContagemDoPlano;
  selo?: string | null;
};

const ROTULO_DO_TIPO: Record<TipoDaLinha, string> = {
  conta: 'Conta',
  familia: 'Família',
  serie: 'Série',
  quadro: 'Quadro',
  temporada: 'Temporada',
};

const FILTROS: Array<{ value: FiltroDoPlano; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'conta', label: 'Contas' },
  { value: 'serie', label: 'Séries' },
  { value: 'temporada', label: 'Temporadas' },
];

function diaMes(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

/**
 * Plano do período em tabela: contas, séries e temporadas, com ritmo,
 * meta no período, episódios com data, publicados e programados. Liga o acompanhamento
 * e edita o ritmo sem sair do Editorial.
 */
export function ContinuidadePanel({ periodo }: { periodo: Intervalo }) {
  const { state, dispatch } = useAppContext();
  const { settings } = useEditorialPlano();
  const [searchParams, setSearchParams] = useSearchParams();
  const contas = state.platforms.filter(conta => conta.ativo);
  const editar = searchParams.get('editar');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroDoPlano>('todos');
  const [semana, setSemana] = useState('');

  const semanas = useMemo(() => semanasNoIntervalo(periodo.inicio, periodo.fim), [periodo.inicio, periodo.fim]);
  const intervalo: Intervalo = useMemo(() => {
    const escolhida = semanas.find(item => item.inicio === semana);
    return escolhida ? { inicio: escolhida.inicio, fim: escolhida.fim } : periodo;
  }, [periodo, semana, semanas]);
  const porSemana = intervalo.inicio !== periodo.inicio || intervalo.fim !== periodo.fim;

  // Episódios do app, com as publicações e a situação de cada conta.
  const episodios: EpisodioDoPlano[] = useMemo(() => {
    const agenda = publicacoesDaAgenda({ contents: state.contents, contas: state.platforms, series: state.series });
    const porConteudo = new Map(state.contents.map(content => [content.id, content]));
    const grupos = new Map<string, EpisodioDoPlano & { publicacoes: PublicacaoDoPlano[] }>();
    for (const pub of agenda) {
      const content = porConteudo.get(pub.contentId);
      if (!content) continue;
      let grupo = grupos.get(content.id);
      if (!grupo) {
        grupo = { contentId: content.id, serieId: content.seriesId ?? null, temporadaId: content.temporadaId ?? null, publicacoes: [] };
        grupos.set(content.id, grupo);
      }
      const original = (content.plataformas ?? []).find(item => item.id === pub.id);
      grupo.publicacoes.push({
        platformId: pub.platformId,
        data: pub.data,
        situacao: pub.situacao,
        // Programado = publicação programada e material pronto. Data futura sozinha não basta.
        programada: normalizePublicacaoStatus(original?.status) === 'programada' && isReadyToPublish(content),
        contaNaMeta: pub.contaNaMeta,
      });
    }
    return [...grupos.values()];
  }, [state.contents, state.platforms, state.series]);

  const linhas: LinhaDoPlano[] = useMemo(() => {
    const lista: LinhaDoPlano[] = [];
    const decisao = porSemana ? null : decisaoDoPeriodo(settings.periodos, periodo.inicio, periodo.fim);
    const metas = metasDasContas({
      platformIds: contas.map(conta => conta.id),
      linhas: state.editorial.metasDasContas ?? [],
      periodo: intervalo,
      // A meta temporária vale só para o período inteiro em que foi escrita.
      decisao: decisao ?? null,
      proporcaoGeral: readProporcao(state.editorial.proporcaoFuncoes),
      pausas: state.editorial.pausas ?? [],
    });
    for (const conta of contas) {
      const meta = metas.contas.find(item => item.platformId === conta.id);
      const fonte = meta?.fonte ?? 'nenhuma';
      lista.push({
        chave: `c:${conta.id}`,
        tipo: 'conta',
        nome: rotuloConta(conta),
        detalhe: null,
        nivel: 0,
        conta,
        meta: meta?.valor ?? null,
        metaTexto: fonte === 'periodo' ? 'Meta deste período' : fonte === 'base' ? 'Meta da conta' : 'Sem meta para este período',
        contagem: contarNaConta(episodios, conta.id, intervalo),
      });
    }

    const ativas = state.series.filter(serie => serie.ativa !== false);
    const linhaDaSerie = (serie: Serie, tipo: 'serie', nivel: 0 | 1, detalhe: string | null): LinhaDoPlano => {
      const rascunho = serie.status === 'rascunho';
      // Regra de Ouro: até 1 por semana por série.
      const meta = rascunho ? null : metaDoRitmo(serie, intervalo, unidadesDaRegraDeOuro(serie.id, state.series));
      return {
        chave: `s:${serie.id}`,
        tipo,
        nome: serie.name,
        detalhe,
        nivel,
        serie,
        meta: meta?.valor ?? null,
        metaTexto: rascunho
          ? 'Rascunho: o ritmo vale quando ativar'
          : meta
            ? `${meta.janelas} ${meta.janelas === 1 ? 'janela' : 'janelas'}`
            : 'Sem ritmo',
        contagem: contarEpisodios(episodiosDaLinha({ tipo, id: serie.id, episodios, series: state.series, temporadas: state.temporadas }), intervalo),
        selo: rascunho ? 'Rascunho' : null,
      };
    };

    // Família é pasta visual: não vira linha do plano. Quadro é sob demanda: sem meta.
    const series = ativas
      .filter(serie => tipoDaSerie(serie.id, state.series) === 'serie')
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    for (const serie of series) {
      lista.push(linhaDaSerie(serie, 'serie', 0, null));
      const temporadas = (state.temporadas as TemporadaDb[])
        .filter(item => item.serieId === serie.id)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      for (const temporada of temporadas) {
        const arquivada = temporada.status === 'arquivada';
        // Arquivada: só aparece nos períodos antes do arquivo (sem data, sai da conferência como antes).
        if (arquivada && (!temporada.arquivadaEm || temporada.arquivadaEm <= intervalo.inicio)) continue;
        const rascunho = temporada.status === 'rascunho';
        const meta = rascunho ? null : metaDoRitmo({
          frequenciaRecomendada: null,
          frequenciaVezes: temporada.frequenciaVezes ?? null,
          frequenciaUnidade: temporada.frequenciaUnidade ?? null,
          frequenciaAPartirDe: temporada.frequenciaAPartirDe ?? null,
        }, arquivada && temporada.arquivadaEm
          ? { inicio: intervalo.inicio, fim: temporada.arquivadaEm < intervalo.fim ? temporada.arquivadaEm : intervalo.fim }
          : intervalo);
        lista.push({
          chave: `t:${temporada.id}`,
          tipo: 'temporada',
          nome: temporada.nome,
          detalhe: `Temporada de ${serie.name}`,
          nivel: 1,
          serie,
          temporada,
          meta: meta?.valor ?? null,
          metaTexto: rascunho ? 'Rascunho' : meta ? `${meta.janelas} ${meta.janelas === 1 ? 'janela' : 'janelas'}` : 'Sem ritmo próprio',
          contagem: contarEpisodios(episodiosDaLinha({ tipo: 'temporada', id: temporada.id, episodios, series: state.series, temporadas: state.temporadas }), intervalo),
          selo: rascunho ? 'Rascunho' : arquivada && temporada.arquivadaEm ? `Arquivada em ${diaMes(temporada.arquivadaEm)}` : null,
        });
      }
    }
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contas, episodios, intervalo, periodo, porSemana, settings.periodos, state.editorial, state.series, state.temporadas]);

  const visiveis = filtrarLinhas(linhas, busca, filtro);
  const semTabela = state.series.length > 0 && state.series.every(serie => serie.acompanhamentos === undefined);

  const abrir = (chave: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('aba');
      next.set('editar', chave);
      return next;
    });
  };
  const fechar = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('editar');
      return next;
    }, { replace: true });
  };

  const alternarSerie = (serie: Serie, valor: boolean) => {
    void dispatch({
      type: 'UPDATE_SERIE',
      payload: { ...comAcompanhamentoGeral(serie, valor, generateUUID), updatedAt: new Date().toISOString() },
    });
  };
  const alternarTemporada = (temporada: Temporada, valor: boolean) => {
    void dispatch({ type: 'UPDATE_TEMPORADA', payload: { ...temporada, acompanhar: valor } });
  };

  const alvo: Alvo | null = (() => {
    if (!editar) return null;
    if (editar.startsWith('t:')) {
      const temporada = state.temporadas.find(item => item.id === editar.slice(2));
      const serie = temporada ? state.series.find(item => item.id === temporada.serieId) : undefined;
      return temporada && serie ? { tipo: 'temporada', temporada, serie } : null;
    }
    if (editar.startsWith('s:')) {
      const serie = state.series.find(item => item.id === editar.slice(2));
      if (!serie) return null;
      const tipo = tipoDaSerie(serie.id, state.series);
      if (tipo === 'quadro' || tipo === 'familia') return null;
      return { tipo: 'serie', serie };
    }
    return null;
  })();

  const celula = 'px-3 py-2 align-middle';

  return (
    <Section title="Conteúdos no período">
      {semTabela ? (
        <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
          Acompanhar por conta ou formato precisa da migração 20261103120000. A meta geral já pode ser editada aqui.
        </Text>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <input
          type="search"
          value={busca}
          onChange={event => setBusca(event.target.value)}
          placeholder="Buscar por nome"
          aria-label="Buscar no plano do período"
          className={cn(CAMPO, 'min-h-[var(--control-height-mobile)] md:min-h-[var(--control-height)] md:max-w-xs')}
        />
        <div className="flex min-w-0 flex-wrap items-center gap-4 md:justify-end">
          <SelectField ariaLabel="Exibir" value={filtro} onChange={valor => setFiltro(valor as FiltroDoPlano)} options={FILTROS} />
          <SelectField
            ariaLabel="Ver por semana"
            prefix="Ver:"
            value={semana}
            onChange={setSemana}
            options={[
              { value: '', label: `Período inteiro (${diaMes(periodo.inicio)} a ${diaMes(periodo.fim)})` },
              ...semanas.map(item => ({ value: item.inicio, label: `Semana ${diaMes(item.inicio)} a ${diaMes(item.fim)}` })),
            ]}
          />
        </div>
      </div>
      {porSemana ? (
        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
          Vendo uma semana. Meta temporária do período não vale aqui: as contas mostram a meta da conta. Ritmo mensal ou de 14 dias mostra a janela inteira que toca a semana.
        </Text>
      ) : null}
      {linhas.length === 0 ? (
        <EmptyState icon={<Activity className="h-8 w-8" />} title="Nada neste período" description="Os conteúdos aparecem aqui quando ganham uma data ou entram em acompanhamento." />
      ) : visiveis.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <Text variant="secondary" as="p">Nada com estes filtros.</Text>
          <AppButton variant="secondary" size="sm" onClick={() => { setBusca(''); setFiltro('todos'); setSemana(''); }}>
            Limpar filtros
          </AppButton>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[var(--bg-elevated)]">
              <tr>
                <th scope="col" className={celula}><Text variant="label" as="span">Série, quadro ou família</Text></th>
                <th scope="col" className={celula}><Text variant="label" as="span">Ritmo</Text></th>
                <th scope="col" className={cn(celula, 'text-right')}><Text variant="label" as="span">Meta no período</Text></th>
                <th scope="col" className={cn(celula, 'text-right')}>
                  <span className="inline-flex items-center justify-end">
                    <Text variant="label" as="span">Com data</Text>
                    <Ajuda alinhar="fim" rotulo="Sobre com data" texto="Já tem data no calendário e ainda vai ao ar. Programado: já está na conta, com o material pronto." />
                  </span>
                </th>
                <th scope="col" className={cn(celula, 'text-right')}>
                  <span className="inline-flex items-center justify-end">
                    <Text variant="label" as="span">Publicados</Text>
                    <Ajuda alinhar="fim" rotulo="Sobre publicados" texto="O que já foi ao ar neste período." />
                  </span>
                </th>
                <th scope="col" className={celula}><Text variant="label" as="span">Acompanhar</Text></th>
                <th scope="col" className={celula}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map(linha => {
                const rascunho = linha.selo === 'Rascunho';
                return (
                  <tr key={linha.chave} className="border-t border-[var(--border-subtle)]">
                    <td className={cn(celula, linha.nivel === 1 && 'pl-8')}>
                      <div className="flex min-w-0 items-center gap-2">
                        {linha.conta ? <PlatformIcon platform={iconeDaConta(linha.conta)} className="h-4 w-4 shrink-0" /> : null}
                        <div className="min-w-0">
                          <Text variant="body" as="span" className="block truncate">{linha.nome}</Text>
                          <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">
                            {linha.detalhe ?? ROTULO_DO_TIPO[linha.tipo]}
                          </Text>
                        </div>
                        {linha.selo ? <Badge variant="neutral">{linha.selo}</Badge> : null}
                        {linha.temporada && ondaComRitmoProprio(linha.temporada) ? <Badge variant="tag">Ritmo próprio</Badge> : null}
                      </div>
                    </td>
                    <td className={celula}>
                      {linha.serie && linha.tipo !== 'temporada' && !rascunho ? (
                        <FrequenciaChip serieId={linha.serie.id} aparencia="linha" />
                      ) : linha.temporada ? (
                        <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{textoDoChip(linha.temporada)}</Text>
                      ) : (
                        <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{linha.metaTexto}</Text>
                      )}
                    </td>
                    <td className={cn(celula, 'text-right tabular-nums')}>
                      {linha.meta != null ? (
                        <>
                          <Text variant="body" as="span" className="block">{linha.meta}</Text>
                          {linha.tipo !== 'conta' ? <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">{linha.metaTexto}</Text> : null}
                        </>
                      ) : (
                        <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">{linha.tipo === 'conta' ? 'Sem meta para este período' : '—'}</Text>
                      )}
                    </td>
                    <td className={cn(celula, 'text-right tabular-nums')}>
                      <Text variant="body" as="span" className="block">{linha.contagem.comData}</Text>
                      {linha.contagem.programados > 0 ? (
                        <Badge variant="success">{linha.contagem.programados} {linha.contagem.programados === 1 ? 'Programado' : 'Programados'}</Badge>
                      ) : null}
                    </td>
                    <td className={cn(celula, 'text-right tabular-nums')}>
                      <Text variant="body" as="span">{linha.contagem.publicados}</Text>
                    </td>
                    <td className={celula}>
                      {linha.serie && linha.tipo !== 'temporada' && !rascunho ? (
                        <input
                          type="checkbox"
                          aria-label={`Acompanhar ${linha.nome} na Saúde`}
                          checked={acompanhaNoGeral(linha.serie)}
                          onChange={event => alternarSerie(linha.serie!, event.target.checked)}
                          className="h-4 w-4 accent-[var(--brand-accent)]"
                        />
                      ) : linha.temporada && !rascunho && linha.temporada.status !== 'arquivada' ? (
                        <input
                          type="checkbox"
                          aria-label={`Acompanhar ${linha.nome} na Saúde`}
                          checked={linha.temporada.acompanhar === true}
                          onChange={event => alternarTemporada(linha.temporada!, event.target.checked)}
                          className="h-4 w-4 accent-[var(--brand-accent)]"
                        />
                      ) : null}
                    </td>
                    <td className={cn(celula, 'text-right')}>
                      {linha.tipo !== 'conta' && !rascunho && linha.temporada?.status !== 'arquivada' ? (
                        <AppButton variant="ghost" size="sm" onClick={() => abrir(linha.chave)}>
                          Editar ritmo
                        </AppButton>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {alvo ? <ModalDaMeta key={editar ?? alvo.tipo} alvo={alvo} contas={contas} onClose={fechar} /> : null}
    </Section>
  );
}