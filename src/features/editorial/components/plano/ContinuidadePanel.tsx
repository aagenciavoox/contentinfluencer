import { Fragment, useMemo, useState } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Dialog } from '../../../../components/overlays/Dialog';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AjudaDaRegraDeOuro } from '../AjudaDaRegraDeOuro';
import { AppButton } from '../../../../components/ui/AppButton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { PageToolbar } from '../../../../components/ui/PageToolbar';
import { Section } from '../../../../components/ui/Section';
import { SelectField } from '../../../../components/ui/SelectField';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
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
  acompanhamentosDosEscopos,
  acompanhaNoGeral,
  comAcompanhamentoGeral,
  linhasDeEscopo,
  metasDosEscopos,
  novoAcompanhamento,
  type LinhaDeEscopo,
} from '../../lib/acompanhamento';
import type { AcompanhamentoSerie, MetaDaSerieNoEscopo } from '../../lib/continuidadeEscopo';
import { errosDaMeta, idDaJanela, ID_META, type ErroDaMeta } from '../../lib/errosDaMeta';
import { frequenciaParaGravar, unidadeDaMeta, type UnidadeDaMeta } from '../../lib/metaDaOnda';
import { publicacoesDaAgenda } from '../../lib/publicacoes';
import { CamposDoRitmo, RegrasDoAcompanhamento, RegrasPorContaEFormato, rotuloDoEscopo } from '../EditorDeRitmo';
import { CAMPO } from './campos';
import { textoDoChip } from '../../lib/frequenciaChip';
import { ehErroDaRegraDeOuro, unidadesDaRegraDeOuro } from '../../lib/regraDeOuro';
import { limiteRegraDeOuro } from '../../lib/avisosEditoriais';

/** Quadro é sob demanda: não tem meta, então não abre este modal. */
type AlvoSerie = { tipo: 'serie'; serie: Serie };
type AlvoTemporada = { tipo: 'temporada'; temporada: Temporada; serie: Serie };
type Alvo = AlvoSerie | AlvoTemporada;

function ModalDaMeta({ alvo, contas, onClose }: { alvo: Alvo; contas: readonly Platform[]; onClose: () => void }) {
  const { state, dispatch } = useAppContext();
  // Regra de Ouro: série e wave, até o limite por série escolhido na Rotina de criação.
  const unidadesDaRegra = unidadesDaRegraDeOuro(alvo.serie.id, state.series, limiteRegraDeOuro(state.editorial.avisos));
  const base = alvo.tipo === 'temporada' ? alvo.temporada : alvo.serie;
  const [acompanhar, setAcompanhar] = useState(alvo.tipo === 'temporada' ? alvo.temporada.acompanhar === true : acompanhaNoGeral(alvo.serie));
  const [vezes, setVezes] = useState(base.frequenciaVezes ? String(base.frequenciaVezes) : '');
  const [unidade, setUnidade] = useState<UnidadeDaMeta>(unidadeDaMeta(base.frequenciaUnidade));
  const [inicio, setInicio] = useState(base.frequenciaAPartirDe ?? '');
  // Ritmo próprio da wave: com meta, os episódios dela saem da conta da série. Ligado por padrão.
  const [ritmoProprio, setRitmoProprio] = useState(alvo.tipo === 'temporada' ? ritmoProprioMarcado(alvo.temporada) : true);
  const [geral, setGeral] = useState<AcompanhamentoSerie | null>(alvo.tipo === 'temporada' ? null : acompanhamentoGeral(alvo.serie));
  const [linhas, setLinhas] = useState<LinhaDeEscopo[]>(alvo.tipo === 'temporada' ? [] : linhasDeEscopo(alvo.serie));
  const [erros, setErros] = useState<ErroDaMeta[]>([]);
  const [gravando, setGravando] = useState(false);
  const [regrasDaOnda, setRegrasDaOnda] = useState(() => ({
    inicio: alvo.tipo === 'temporada' ? alvo.temporada.acompanhamentoInicio ?? null : null,
    termino: alvo.tipo === 'temporada' ? alvo.temporada.acompanhamentoTermino ?? null : null,
    distanciaMaxDias: alvo.tipo === 'temporada' ? alvo.temporada.distanciaMaxDias ?? null : null,
    evitarDiasSeguidos: alvo.tipo === 'temporada' ? alvo.temporada.evitarDiasSeguidos === true : false,
  }));
  const comEscopos = alvo.tipo !== 'temporada' && alvo.serie.acompanhamentos !== undefined;

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
      ? acompanhamentosDosEscopos(gerais, linhas)
      : comGeral.acompanhamentos;
    const metas: MetaDaSerieNoEscopo[] | undefined = comEscopos
      ? metasDosEscopos(alvo.serie.id, linhas)
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

  const titulo = alvo.tipo === 'temporada' ? alvo.temporada.nome : alvo.serie.name;
  const subtitulo = alvo.tipo === 'temporada'
    ? `Temporada de ${alvo.serie.name}. A Saúde conta só os episódios desta wave.`
    : `Série inteira, sem os quadros (sob demanda). Regra de Ouro: no máximo ${unidadesDaRegra} ${unidadesDaRegra === 1 ? 'episódio' : 'episódios'} por semana. Temporadas com ritmo próprio contam à parte.`;

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
                <div key={`${item.id}-${index}`} className="flex items-center gap-1">
                  <Text variant="meta" as="p" className="texto-erro">{item.mensagem}</Text>
                  {ehErroDaRegraDeOuro(item.mensagem) ? <AjudaDaRegraDeOuro /> : null}
                </div>
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
        <CamposDoRitmo
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
          <RegrasPorContaEFormato
            serieId={alvo.serie.id}
            linhas={linhas}
            contas={contas}
            erros={erros}
            onChange={setLinhas}
          />
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

function BarraProgressoMeta({
  meta,
  planejados,
  alinhadoDireita = false,
}: {
  meta: number;
  planejados: number;
  alinhadoDireita?: boolean;
}) {
  const pct = Math.min(100, Math.round((planejados / meta) * 100));
  const atingiu = planejados >= meta;
  return (
    <div className={cn('flex flex-col gap-1', alinhadoDireita ? 'mt-1.5 items-end' : 'w-full')}>
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 tabular-nums',
          alinhadoDireita ? 'justify-end' : 'w-full justify-between',
        )}
      >
        <Text
          variant="meta"
          as="span"
          style={atingiu ? { color: 'var(--success)' } : undefined}
        >
          {planejados}/{meta}
        </Text>
        {atingiu ? (
          <Badge variant="success" className="whitespace-nowrap">Meta atingida</Badge>
        ) : !alinhadoDireita ? (
          <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
            {pct}%
          </Text>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-valuenow={planejados}
        aria-valuemin={0}
        aria-valuemax={meta}
        aria-label={`${planejados} de ${meta} planejados no período`}
        title={`${planejados} de ${meta} (${pct}%)`}
        className={cn(
          'h-1 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-hover)]',
          alinhadoDireita && 'max-w-[5.5rem]',
        )}
      >
        <div
          className="h-full rounded-[var(--radius-pill)] transition-[width] duration-200"
          style={{
            width: `${pct}%`,
            backgroundColor: atingiu ? 'var(--success)' : 'var(--accent-blue)',
          }}
        />
      </div>
    </div>
  );
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
      // Regra de Ouro: até o limite por série (por semana).
      const meta = rascunho ? null : metaDoRitmo(serie, intervalo, unidadesDaRegraDeOuro(serie.id, state.series, limiteRegraDeOuro(state.editorial.avisos)));
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

  const contagensPorTipo = useMemo(() => {
    const mapa: Record<FiltroDoPlano, number> = {
      todos: linhas.length,
      conta: 0,
      familia: 0,
      serie: 0,
      quadro: 0,
      temporada: 0,
    };
    for (const linha of linhas) {
      mapa[linha.tipo] += 1;
    }
    return mapa;
  }, [linhas]);

  const visiveis = filtrarLinhas(linhas, busca, filtro);
  const contasVisiveis = visiveis.filter(linha => linha.tipo === 'conta');
  const seriesVisiveis = visiveis.filter(linha => linha.tipo !== 'conta');
  const separarGrupos = filtro === 'todos' && contasVisiveis.length > 0 && seriesVisiveis.length > 0;
  const gruposVisiveis: Array<{ chave: string; titulo: string | null; itens: LinhaDoPlano[] }> = separarGrupos
    ? [
      { chave: 'contas', titulo: 'Contas', itens: contasVisiveis },
      { chave: 'series', titulo: 'Séries e temporadas', itens: seriesVisiveis },
    ]
    : [{ chave: 'todos', titulo: null, itens: visiveis }];
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
      <PageToolbar
        search={
          <input
            type="search"
            value={busca}
            onChange={event => setBusca(event.target.value)}
            placeholder="Buscar por nome"
            aria-label="Buscar no plano do período"
            className={cn(CAMPO, 'min-h-[var(--control-height-mobile)] md:min-h-[var(--control-height)]')}
          />
        }
        chips={
          <div role="group" aria-label="Exibir por tipo" className="flex flex-wrap items-center gap-2">
            {FILTROS.map(opcao => {
              const ativo = filtro === opcao.value;
              const contagem = contagensPorTipo[opcao.value];
              return (
                <button
                  key={opcao.value}
                  type="button"
                  aria-pressed={ativo}
                  aria-label={`${opcao.label}, ${contagem}`}
                  onClick={() => setFiltro(opcao.value)}
                  className={cn(
                    'inline-flex min-h-[var(--control-height-mobile)] md:min-h-[var(--control-height)] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] border px-3 py-1.5 t-label transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                    ativo
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-elevated)]'
                      : 'border-[var(--border-input)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                  )}
                >
                  <span>{opcao.label}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'tabular-nums',
                      ativo ? 'text-[var(--bg-elevated)]' : 'text-[var(--text-tertiary)]',
                    )}
                  >
                    {contagem}
                  </span>
                </button>
              );
            })}
          </div>
        }
        filters={
          <div className="flex items-center md:justify-end">
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
        }
      />
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
        <>
          <div className="hidden md:block overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <th scope="col" className={celula}><Text variant="label" as="span">Conta, série ou temporada</Text></th>
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
                {gruposVisiveis.map(grupo => (
                  <Fragment key={grupo.chave}>
                    {grupo.titulo ? (
                      <tr className="border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                        <td colSpan={7} className="px-3 py-1.5">
                          <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
                            {grupo.titulo}
                          </Text>
                        </td>
                      </tr>
                    ) : null}
                    {grupo.itens.map(linha => {
                      const rascunho = linha.selo === 'Rascunho';
                      const planejados = linha.contagem.publicados + linha.contagem.comData;
                      const temProgresso = linha.meta != null && linha.meta > 0;
                      return (
                        <tr key={linha.chave} className="border-t border-[var(--border-subtle)]">
                          <td className={cn(celula, linha.nivel === 1 && 'pl-8')}>
                            <div className="flex min-w-0 items-center gap-2">
                              {linha.conta ? <PlatformIcon platform={iconeDaConta(linha.conta)} className="h-4 w-4 shrink-0" /> : null}
                              <div className="min-w-0">
                                {linha.serie && linha.tipo === 'serie' ? (
                                  <Link
                                    to={`/series/${linha.serie.id}`}
                                    className="block truncate rounded-[var(--radius-sm)] text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                                  >
                                    <Text variant="body" as="span">{linha.nome}</Text>
                                  </Link>
                                ) : (
                                  <Text variant="body" as="span" className="block truncate">{linha.nome}</Text>
                                )}
                                {linha.serie && linha.tipo === 'temporada' ? (
                                  <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">
                                    Temporada de{' '}
                                    <Link
                                      to={`/series/${linha.serie.id}`}
                                      className="rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                                    >
                                      {linha.serie.name}
                                    </Link>
                                  </Text>
                                ) : (
                                  <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">
                                    {linha.detalhe ?? ROTULO_DO_TIPO[linha.tipo]}
                                  </Text>
                                )}
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
                                {temProgresso ? (
                                  <BarraProgressoMeta meta={linha.meta} planejados={planejados} alinhadoDireita />
                                ) : null}
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
                              <ToggleSwitch
                                size="sm"
                                enabled={acompanhaNoGeral(linha.serie)}
                                onToggle={() => alternarSerie(linha.serie!, !acompanhaNoGeral(linha.serie!))}
                                label={`Acompanhar ${linha.nome} na Saúde`}
                              />
                            ) : linha.temporada && !rascunho && linha.temporada.status !== 'arquivada' ? (
                              <ToggleSwitch
                                size="sm"
                                enabled={linha.temporada.acompanhar === true}
                                onToggle={() => alternarTemporada(linha.temporada!, linha.temporada!.acompanhar !== true)}
                                label={`Acompanhar ${linha.nome} na Saúde`}
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
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden stack-md">
            {gruposVisiveis.map(grupo => (
              <div key={grupo.chave} className="stack-sm">
                {grupo.titulo ? (
                  <Text variant="eyebrow" as="p" className="text-[var(--text-tertiary)]">
                    {grupo.titulo}
                  </Text>
                ) : null}
                <ul className="stack-sm">
                  {grupo.itens.map(linha => {
                    const rascunho = linha.selo === 'Rascunho';
                    const planejados = linha.contagem.publicados + linha.contagem.comData;
                    const temProgresso = linha.meta != null && linha.meta > 0;
                    const temRitmoProprio = Boolean(linha.temporada && ondaComRitmoProprio(linha.temporada));
                    const temBadges = Boolean(linha.selo || temRitmoProprio);
                    const podeEditar = linha.tipo !== 'conta' && !rascunho && linha.temporada?.status !== 'arquivada';
                    return (
                      <Surface
                        key={linha.chave}
                        as="li"
                        variant="outlined"
                        padding="sm"
                        className={cn('stack-sm', linha.nivel === 1 && 'ml-3')}
                        style={linha.nivel === 1 ? { borderLeftWidth: 2, borderLeftColor: 'var(--border-strong)' } : undefined}
                      >
                        <div className="stack-xs">
                          <div className="flex min-w-0 items-start gap-2">
                            {linha.conta ? (
                              <PlatformIcon platform={iconeDaConta(linha.conta)} className="mt-0.5 h-4 w-4 shrink-0" />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              {linha.serie && linha.tipo === 'serie' ? (
                                <Link
                                  to={`/series/${linha.serie.id}`}
                                  className="inline-block max-w-full rounded-[var(--radius-sm)] text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                                >
                                  <Text variant="bodyStrong" as="span" className="break-words">{linha.nome}</Text>
                                </Link>
                              ) : (
                                <Text variant="bodyStrong" as="p" className="break-words">{linha.nome}</Text>
                              )}
                              {linha.serie && linha.tipo === 'temporada' ? (
                                <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                                  Temporada de{' '}
                                  <Link
                                    to={`/series/${linha.serie.id}`}
                                    className="rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                                  >
                                    {linha.serie.name}
                                  </Link>
                                </Text>
                              ) : (
                                <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                                  {linha.detalhe ?? ROTULO_DO_TIPO[linha.tipo]}
                                </Text>
                              )}
                            </div>
                          </div>
                          {temBadges ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {linha.selo ? <Badge variant="neutral">{linha.selo}</Badge> : null}
                              {temRitmoProprio ? <Badge variant="tag">Ritmo próprio</Badge> : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Text variant="label" as="span">Ritmo</Text>
                          {linha.serie && linha.tipo !== 'temporada' && !rascunho ? (
                            <FrequenciaChip serieId={linha.serie.id} aparencia="linha" />
                          ) : linha.temporada ? (
                            <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{textoDoChip(linha.temporada)}</Text>
                          ) : (
                            <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{linha.metaTexto}</Text>
                          )}
                        </div>

                        <div className="stack-xs">
                          <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-input)] bg-[var(--surface-subtle)] p-2.5 tabular-nums">
                            <div className="min-w-0">
                              <Text variant="label" as="span" className="block">Meta</Text>
                              {linha.meta != null ? (
                                <>
                                  <Text variant="bodyStrong" as="span" className="block">{linha.meta}</Text>
                                  {linha.tipo !== 'conta' ? (
                                    <Text variant="meta" as="span" className="block truncate text-[var(--text-tertiary)]">
                                      {linha.metaTexto}
                                    </Text>
                                  ) : null}
                                </>
                              ) : (
                                <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">—</Text>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Text variant="label" as="span" className="block">Com data</Text>
                              <Text variant="bodyStrong" as="span" className="block">{linha.contagem.comData}</Text>
                              {linha.contagem.programados > 0 ? (
                                <Badge variant="success" className="mt-1">
                                  {linha.contagem.programados} {linha.contagem.programados === 1 ? 'Programado' : 'Programados'}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <Text variant="label" as="span" className="block">Publicados</Text>
                              <Text variant="bodyStrong" as="span" className="block">{linha.contagem.publicados}</Text>
                            </div>
                          </div>
                          {temProgresso ? (
                            <BarraProgressoMeta meta={linha.meta!} planejados={planejados} />
                          ) : null}
                        </div>

                        {podeEditar ? (() => {
                          const acompanhando = linha.temporada
                            ? linha.temporada.acompanhar === true
                            : linha.serie
                              ? acompanhaNoGeral(linha.serie)
                              : false;
                          const toggleId = `acompanhar-mobile-${linha.chave}`;
                          return (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2.5">
                              <div className="flex items-center gap-1.5">
                                <ToggleSwitch
                                  id={toggleId}
                                  size="sm"
                                  enabled={acompanhando}
                                  onToggle={() => {
                                    if (linha.temporada) {
                                      alternarTemporada(linha.temporada, !acompanhando);
                                    } else if (linha.serie) {
                                      alternarSerie(linha.serie, !acompanhando);
                                    }
                                  }}
                                  label={`Acompanhar ${linha.nome} na Saúde`}
                                />
                                <label htmlFor={toggleId} className="cursor-pointer">
                                  <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                                    Acompanhar na Saúde
                                  </Text>
                                </label>
                              </div>
                              <AppButton variant="secondary" size="sm" onClick={() => abrir(linha.chave)}>
                                Editar ritmo
                              </AppButton>
                            </div>
                          );
                        })() : null}
                      </Surface>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
      {alvo ? <ModalDaMeta key={editar ?? alvo.tipo} alvo={alvo} contas={contas} onClose={fechar} /> : null}
    </Section>
  );
}