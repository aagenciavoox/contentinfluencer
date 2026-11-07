import { useState } from 'react';
import { Activity, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Dialog } from '../../../../components/overlays/Dialog';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Section } from '../../../../components/ui/Section';
import { SelectField } from '../../../../components/ui/SelectField';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import type { Platform, Serie } from '../../../../lib/database';
import type { Temporada } from '../../lib/temporadas';
import { ondaComRitmoProprio, ritmoProprioMarcado } from '../../lib/metaPropria';
import { Badge } from '../../../../components/ui/Badge';
import { generateUUID } from '../../../../utils/uuid';
import { tipoDaSerie } from '../../../settings/lib/serieAgrupamento';
import { rotuloConta } from '../../../contas/lib/contas';
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
import { FORMATOS_DA_REDE, rotuloDoFormato } from '../../lib/publicacoes';
import { CAMPO } from './campos';
import { CamposDaMeta, UNIDADES } from './CamposDaMeta';
import { textoDoChip } from '../../lib/frequenciaChip';

const FORMATOS = [...new Set(Object.values(FORMATOS_DA_REDE).flatMap(lista => [...(lista ?? [])]))];

type Linha = AcompanhamentoSerie & {
  metaVezes: string;
  metaUnidade: MetaDaSerieNoEscopo['unidade'];
  metaAPartirDe: string;
};


function numeroDeDias(texto: string): number | null {
  const n = Number.parseInt(texto.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
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


type AlvoSerie = { tipo: 'serie' | 'quadro'; serie: Serie };
type AlvoTemporada = { tipo: 'temporada'; temporada: Temporada; serie: Serie };
type Alvo = AlvoSerie | AlvoTemporada;

function ModalDaMeta({ alvo, contas, onClose }: { alvo: Alvo; contas: readonly Platform[]; onClose: () => void }) {
  const { dispatch } = useAppContext();
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
    || linhas.some(linha => linha.escopo === 'conta' || (linha.metaVezes !== '' && linha.metaUnidade === 'quinzena'));

  const salvar = async () => {
    if (gravando) return;
    const lista = errosDaMeta({
      vezes,
      unidade,
      inicio,
      tipo: alvo.tipo,
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

    const vezesNumero = vezes.trim() ? Number.parseInt(vezes, 10) : null;
    const frequencia = frequenciaParaGravar({
      vezes: vezesNumero,
      unidade,
      aPartirDe: inicio,
      tipo: alvo.tipo,
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
        const quantidade = Number.parseInt(linha.metaVezes, 10);
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
    : alvo.tipo === 'quadro'
      ? 'Quadro com meta própria. Os episódios dele contam aqui e saem da conta da série.'
      : 'Série inteira. Quadros com meta própria e temporadas com ritmo próprio contam à parte.';

  return (
    <Dialog open onClose={gravando ? () => undefined : onClose} desktopMaxW="md:max-w-3xl" ariaLabel={`Meta de ${titulo}`}>
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
          <div className="stack-xs border-t border-[var(--border-subtle)] pt-3">
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
          <div className="stack-xs border-t border-[var(--border-subtle)] pt-3">
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
            <Text variant="bodyStrong" as="span">Por conta ou formato</Text>
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
                      onChange={event => mudar(linha.id, { metaVezes: event.target.value.replace(/\D/g, '').slice(0, 2) })}
                    />
                    {mensagem(idDoEscopo(linha.id, 'meta-vezes')) ? <TextoErro id={`${idDoEscopo(linha.id, 'meta-vezes')}-erro`}>{mensagem(idDoEscopo(linha.id, 'meta-vezes'))!}</TextoErro> : null}
                  </label>
                  <SelectField
                    block
                    ariaLabel="Período da meta"
                    value={linha.metaUnidade}
                    onChange={valor => mudar(linha.id, { metaUnidade: unidadeDaMeta(valor) })}
                    options={UNIDADES}
                  />
                  <label className="flex flex-col gap-1" htmlFor={idDoEscopo(linha.id, 'meta-inicio')}>
                    <Text variant="meta" as="span">
                      Meta a partir de
                      {linha.metaVezes !== '' && linha.metaUnidade === 'quinzena' ? <span className="text-[var(--brand-accent-text)]"> *</span> : null}
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
            <div className="flex flex-wrap gap-2">
              <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} disabled={contas.length === 0} onClick={() => adicionar('conta')}>Por conta</AppButton>
              <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => adicionar('formato')}>Por formato</AppButton>
            </div>
          </div>
        ) : null}
      </div>
      <OverlayFooter className="justify-between">
        <AppButton variant="secondary" onClick={onClose} disabled={gravando}>Cancelar</AppButton>
        <AppButton variant="primary" onClick={() => void salvar()} disabled={gravando}>
          {gravando ? 'Salvando…' : 'Salvar'}
        </AppButton>
      </OverlayFooter>
    </Dialog>
  );
}

function LinhaDaOnda({
  id,
  nome,
  detalhe,
  marcada,
  resumo,
  ritmoProprio = false,
  onToggle,
  onEditar,
}: {
  ritmoProprio?: boolean;
  id: string;
  nome: string;
  detalhe?: string;
  marcada: boolean;
  resumo: string;
  onToggle: (valor: boolean) => void;
  onEditar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={id} className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={marcada}
          onChange={event => onToggle(event.target.checked)}
          className="h-4 w-4 shrink-0 accent-[var(--brand-accent)]"
        />
        <span className="min-w-0">
          <Text variant="body" as="span" className="block truncate">{nome}</Text>
          {detalhe ? <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">{detalhe}</Text> : null}
        </span>
      </label>
      <span className="flex shrink-0 items-center gap-2">
        {ritmoProprio ? <Badge variant="tag" className="px-1.5 py-0">Ritmo próprio</Badge> : null}
        <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{resumo}</Text>
        <AppButton variant="ghost" size="sm" onClick={onEditar}>Editar</AppButton>
      </span>
    </div>
  );
}

/** Aba Continuidade: liga o acompanhamento e edita a meta sem sair do Editorial. */
export function ContinuidadePanel() {
  const { state, dispatch } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const contas = state.platforms.filter(conta => conta.ativo);
  const editar = searchParams.get('editar');

  const donaDe = (serie: Serie): string | null => {
    let atual: Serie | undefined = serie;
    const vistos = new Set<string>();
    while (atual && !vistos.has(atual.id)) {
      vistos.add(atual.id);
      if (tipoDaSerie(atual.id, state.series) === 'serie') return atual.id;
      atual = atual.parentId ? state.series.find(item => item.id === atual?.parentId) : undefined;
    }
    return null;
  };

  const series = state.series
    .filter(serie => serie.ativa !== false && tipoDaSerie(serie.id, state.series) === 'serie')
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const quadros = state.series.filter(serie => serie.ativa !== false && tipoDaSerie(serie.id, state.series) === 'quadro');
  const semTabela = state.series.length > 0 && state.series.every(serie => serie.acompanhamentos === undefined);

  const abrir = (chave: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('aba', 'continuidade');
      next.set('editar', chave);
      return next;
    });
  };
  const fechar = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('editar');
      return next;
    });
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
      return { tipo: tipo === 'quadro' ? 'quadro' : 'serie', serie };
    }
    return null;
  })();

  return (
    <Section
      title="Continuidade"
      description="Ligue o acompanhamento e defina quantidade, período e data de início de cada série. Quadro e temporada podem ter uma wave própria: os episódios continuam na série, e a Saúde cobra cada wave à parte."
    >
      {semTabela ? (
        <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
          Acompanhar por conta ou formato precisa da migração 20261103120000. A meta geral já pode ser editada aqui.
        </Text>
      ) : null}
      {series.length === 0 && quadros.every(quadro => donaDe(quadro) != null) ? (
        <EmptyState icon={<Activity className="h-8 w-8" />} title="Nenhuma série" description="Quando houver uma série, o acompanhamento da Saúde fica aqui." />
      ) : (
        <div className="stack-sm">
          {quadros.filter(quadro => donaDe(quadro) == null).map(quadro => (
            <Surface key={quadro.id} variant="outlined" padding="md">
              <LinhaDaOnda
                id={`onda-${quadro.id}`}
                nome={quadro.name}
                detalhe="Quadro"
                marcada={acompanhaNoGeral(quadro)}
                resumo={textoDoChip(quadro)}
                onToggle={valor => alternarSerie(quadro, valor)}
                onEditar={() => abrir(`s:${quadro.id}`)}
              />
            </Surface>
          ))}
          {series.map(serie => {
            const filhos = quadros
              .filter(quadro => donaDe(quadro) === serie.id)
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            const temporadas = state.temporadas
              .filter(item => item.serieId === serie.id)
              .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            return (
              <Surface key={serie.id} variant="outlined" padding="md" className="stack-sm">
                <LinhaDaOnda
                  id={`onda-${serie.id}`}
                  nome={serie.name}
                  marcada={acompanhaNoGeral(serie)}
                  resumo={textoDoChip(serie)}
                  onToggle={valor => alternarSerie(serie, valor)}
                  onEditar={() => abrir(`s:${serie.id}`)}
                />
                {filhos.length > 0 || temporadas.length > 0 ? (
                  <div className="stack-sm border-t border-[var(--border-subtle)] pt-3">
                    {filhos.map(quadro => (
                      <LinhaDaOnda
                        key={quadro.id}
                        id={`onda-${quadro.id}`}
                        nome={quadro.name}
                        detalhe="Quadro"
                        marcada={acompanhaNoGeral(quadro)}
                        resumo={textoDoChip(quadro)}
                        onToggle={valor => alternarSerie(quadro, valor)}
                        onEditar={() => abrir(`s:${quadro.id}`)}
                      />
                    ))}
                    {temporadas.map(temporada => (
                      <LinhaDaOnda
                        key={temporada.id}
                        id={`onda-${temporada.id}`}
                        nome={temporada.nome}
                        detalhe="Temporada"
                        marcada={temporada.acompanhar === true}
                        resumo={textoDoChip(temporada)}
                        ritmoProprio={ondaComRitmoProprio(temporada)}
                        onToggle={valor => alternarTemporada(temporada, valor)}
                        onEditar={() => abrir(`t:${temporada.id}`)}
                      />
                    ))}
                  </div>
                ) : null}
              </Surface>
            );
          })}
        </div>
      )}
      {alvo ? <ModalDaMeta key={editar ?? alvo.tipo} alvo={alvo} contas={contas} onClose={fechar} /> : null}
    </Section>
  );
}
