import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartColumn } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageToolbar } from '../../../components/ui/PageToolbar';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { SelectField } from '../../../components/ui/SelectField';
import { Surface } from '../../../components/ui/Surface';
import { TagSelect } from '../../../components/ui/TagSelect';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { PAGE_SECTION } from '../../../layouts/navigation/navConfig';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { intervalo } from '../../../lib/dates';
import type { ContaMetrica, PeriodoAnalise } from '../../../lib/database';
import { generateUUID } from '../../../utils/uuid';
import { contasAtivas, REDE_ROTULO, REDES_PRINCIPAIS, redeDaConta, rotuloConta } from '../../contas/lib/contas';
import { intervaloDoModo, hojeIso, type ModoPeriodo } from '../../editorial/components/plano/PeriodoEditorialControl';
import { FormularioPeriodo } from '../components/FormularioPeriodo';
import { LeiturasDaConta, type CamposLeitura } from '../components/LeiturasDaConta';
import { RitmoDoPeriodo } from '../components/RitmoDoPeriodo';
import { somarPublicacoes } from '../lib/leituras';
import {
  FORMULA_ENGAJAMENTO,
  dataCurta,
  filtrarPublicacoes,
  textoDeMetrica,
  type BaseDoPeriodo,
} from '../lib/publicacoes';

type ModoVista = ModoPeriodo | 'tudo';
type Painel = 'periodo' | 'leitura' | null;

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <Text variant="meta" as="p">{rotulo}</Text>
      <Text variant="body" as="p" className="break-words">{valor}</Text>
    </div>
  );
}

function semMetricas(linha: { views: number | null; alcance: number | null; interacoes: number | null }): boolean {
  return linha.views == null && linha.alcance == null && linha.interacoes == null;
}

function rotuloDoSalvo(periodo: PeriodoAnalise): string {
  const datas = `${dataCurta(periodo.inicio)} – ${dataCurta(periodo.fim)}`;
  const nome = periodo.nome.trim();
  return nome ? `${nome} · ${datas}` : datas;
}

export function AnalisesPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const pronto = useDomainsReady(['bootstrap', 'content', 'production', 'analytics']);
  const hoje = hojeIso();
  const mesInicial = intervaloDoModo('mes', hoje);
  const [base, setBase] = useState<BaseDoPeriodo>('planejada');
  const [modo, setModo] = useState<ModoVista>('mes');
  const [inicio, setInicio] = useState(mesInicial.inicio);
  const [fim, setFim] = useState(mesInicial.fim);
  const [rede, setRede] = useState('');
  const [contaId, setContaId] = useState('');
  const [contasIds, setContasIds] = useState<string[]>([]);
  const [periodoAberto, setPeriodoAberto] = useState('');
  const [painel, setPainel] = useState<Painel>(null);

  const atalho = modo === 'semana' || modo === 'mes';
  const inicioEfetivo = atalho ? intervaloDoModo(modo, hoje).inicio : inicio;
  const fimEfetivo = atalho ? intervaloDoModo(modo, hoje).fim : fim;
  const periodoValido = /^\d{4}-\d{2}-\d{2}$/.test(inicioEfetivo)
    && /^\d{4}-\d{2}-\d{2}$/.test(fimEfetivo)
    && inicioEfetivo <= fimEfetivo;
  const filtroInicio = modo === 'tudo' ? null : periodoValido ? inicioEfetivo : '9999-12-31';
  const filtroFim = modo === 'tudo' ? null : periodoValido ? fimEfetivo : '0001-01-01';
  const recorte = filtroInicio && filtroFim && periodoValido && modo !== 'tudo'
    ? { inicio: filtroInicio, fim: filtroFim }
    : null;

  const contasDoFiltro = useMemo(
    () => contasAtivas(state.platforms).filter(conta => !rede || redeDaConta(conta) === rede),
    [rede, state.platforms],
  );
  const periodos = state.periodosAnalise ?? [];
  const leituras = state.contasMetricas ?? [];
  const periodoAtual = periodos.find(periodo => periodo.id === periodoAberto) ?? null;
  const opcoesContas = useMemo(() => {
    const ativas = contasAtivas(state.platforms);
    const extras = state.platforms.filter(conta => contasIds.includes(conta.id) && !ativas.some(item => item.id === conta.id));
    return [...ativas, ...extras];
  }, [contasIds, state.platforms]);
  const contasEscolhidas = opcoesContas
    .filter(conta => contasIds.includes(conta.id))
    .map(conta => ({ id: conta.id, rotulo: rotuloConta(conta) }));

  const linhas = useMemo(() => filtrarPublicacoes({
    contents: state.contents,
    contas: state.platforms,
    series: state.series,
    pilares: state.pilares,
    metricas: state.contentMetrics,
    filtro: {
      inicio: filtroInicio,
      fim: filtroFim,
      base,
      rede: rede || null,
      contaId: contaId || null,
    },
  }), [base, contaId, filtroFim, filtroInicio, rede, state.contentMetrics, state.contents, state.pilares, state.platforms, state.series]);

  const linhasVisiveis = useMemo(() => {
    if (contasIds.length === 0) return linhas;
    const ids = new Set(contasIds);
    return linhas.filter(linha => ids.has(linha.platformId));
  }, [contasIds, linhas]);
  const soma = useMemo(() => somarPublicacoes(linhasVisiveis), [linhasVisiveis]);
  const nenhumaComMetricas = linhasVisiveis.length > 0 && linhasVisiveis.every(semMetricas);

  const mudarDatas = (proximoInicio: string, proximoFim: string) => {
    setInicio(proximoInicio);
    setFim(proximoFim);
    setModo('intervalo');
    if (proximoFim < proximoInicio) setPainel(atual => atual === 'leitura' ? null : atual);
  };

  const abrirPeriodo = (id: string) => {
    setPeriodoAberto(id);
    const periodo = periodos.find(item => item.id === id);
    if (!periodo) return;
    mudarDatas(periodo.inicio, periodo.fim);
    setContasIds(periodo.contaIds);
    setContaId(atual => periodo.contaIds.includes(atual) ? atual : '');
    setPainel(null);
  };

  const salvarPeriodo = async (valores: { nome: string; oQueMudei: string; conclusao: string }) => {
    if (!user?.id || !periodoValido) return;
    const agora = new Date().toISOString();
    const payload: PeriodoAnalise = {
      id: periodoAtual?.id ?? generateUUID(),
      userId: user.id,
      nome: valores.nome.trim(),
      inicio: inicioEfetivo,
      fim: fimEfetivo,
      oQueMudei: valores.oQueMudei.trim(),
      conclusao: valores.conclusao.trim(),
      contaIds: contasIds,
      createdAt: periodoAtual?.createdAt ?? agora,
      updatedAt: agora,
    };
    await dispatch({
      type: periodoAtual ? 'UPDATE_PERIODO_ANALISE' : 'ADD_PERIODO_ANALISE',
      payload,
    });
    setPeriodoAberto(payload.id);
    setPainel(null);
  };

  const salvarLeitura = async (campos: CamposLeitura) => {
    if (!user?.id) return;
    const agora = new Date().toISOString();
    const existente = leituras.find(item => (
      item.platformId === campos.platformId
      && item.registradoEm.slice(0, 10) === campos.registradoEm
      && item.origem === 'manual'
    ));
    const payload: ContaMetrica = {
      id: existente?.id ?? generateUUID(),
      userId: user.id,
      platformId: campos.platformId,
      registradoEm: campos.registradoEm,
      seguidores: campos.seguidores,
      alcance: campos.alcance,
      visualizacoes: campos.visualizacoes,
      interacoes: existente?.interacoes ?? null,
      janelaDias: existente?.janelaDias ?? null,
      extras: existente?.extras ?? {},
      origem: 'manual',
      externoRef: existente?.externoRef ?? null,
      nota: existente?.nota ?? '',
      createdAt: existente?.createdAt ?? agora,
      updatedAt: agora,
    };
    await dispatch({
      type: existente ? 'UPDATE_CONTA_METRICA' : 'ADD_CONTA_METRICA',
      payload,
    });
    setPainel(null);
  };

  const abasPeriodo = (
    <div className="max-w-full overflow-x-auto">
      <SegmentTabs<ModoVista>
        ariaLabel="Tamanho do período"
        className="w-max"
        value={modo}
        onChange={value => {
          setModo(value);
          if (value === 'semana' || value === 'mes') {
            const intervaloAtalho = intervaloDoModo(value, hoje);
            setInicio(intervaloAtalho.inicio);
            setFim(intervaloAtalho.fim);
          }
        }}
        options={[
          { id: 'semana', label: 'Semana' },
          { id: 'mes', label: 'Mês' },
          { id: 'tudo', label: 'Tudo' },
        ]}
      />
    </div>
  );

  const filtros = (
    <PageToolbar
      filters={(
        <div className="inline-stack-sm min-w-0 flex-wrap">
          <SelectField
            ariaLabel="Contar pela data planejada ou pela data efetiva"
            prefix="Data:"
            value={base}
            onChange={value => setBase(value as BaseDoPeriodo)}
            options={[
              { value: 'planejada', label: 'Planejada' },
              { value: 'efetiva', label: 'Efetiva' },
            ]}
          />
          <SelectField
            ariaLabel="Plataforma"
            prefix="Plataforma:"
            value={rede || 'todas'}
            selected={Boolean(rede)}
            onChange={value => {
              setRede(value === 'todas' ? '' : value);
              setContaId('');
            }}
            options={[
              { value: 'todas', label: 'Todas' },
              ...REDES_PRINCIPAIS.map(item => ({ value: item, label: REDE_ROTULO[item] })),
            ]}
          />
          <SelectField
            ariaLabel="Conta"
            prefix="Conta:"
            value={contaId || 'todas'}
            selected={Boolean(contaId)}
            onChange={value => setContaId(value === 'todas' ? '' : value)}
            options={[
              { value: 'todas', label: 'Todas' },
              ...contasDoFiltro.map(conta => ({ value: conta.id, label: rotuloConta(conta) })),
            ]}
          />
        </div>
      )}
    />
  );

  const motivoDoPeriodo = !user?.id
    ? 'Entre na conta para salvar.'
    : !periodoValido
      ? 'O fim precisa ser no mesmo dia ou depois do início.'
      : contasIds.length === 0
        ? 'Escolha ao menos uma conta.'
        : undefined;

  return (
    <PageLayout
      contentWidth="wide"
      contentStack="dense"
      header={(
        <DesktopPageHeader
          section={PAGE_SECTION.estrategia}
          title="Análises"
        />
      )}
      navigation={abasPeriodo}
      toolbar={filtros}
      mobileHeader={(
        <div className="stack-sm">
          {abasPeriodo}
          {filtros}
        </div>
      )}
    >
      <div className="stack-sm">
        <Text variant="meta">
          {recorte
            ? `${base === 'planejada' ? 'Data planejada' : 'Data efetiva'}: ${intervalo(recorte.inicio, recorte.fim)}.`
            : 'Sem recorte de data.'}
          {' '}O alcance de cada conta é contado à parte. Taxa de engajamento: {FORMULA_ENGAJAMENTO}.
        </Text>

        <div className="grid w-full min-w-0 grid-cols-1 items-start gap-2 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-4">
          <div className="stack-sm min-w-0">
            <Surface variant="outlined" padding="md" className="stack-sm">
              <Text variant="sectionTitle" as="h2">Período</Text>
              <div className="grid-form">
                <label htmlFor="analises-inicio" className="block">
                  <Text variant="label" as="span" className="mb-2 block">Início</Text>
                  <input
                    id="analises-inicio"
                    className="input"
                    type="date"
                    value={inicioEfetivo}
                    onChange={event => mudarDatas(event.target.value, fimEfetivo)}
                  />
                </label>
                <label htmlFor="analises-fim" className="block">
                  <Text variant="label" as="span" className="mb-2 block">Fim</Text>
                  <input
                    id="analises-fim"
                    className="input"
                    type="date"
                    value={fimEfetivo}
                    onChange={event => mudarDatas(inicioEfetivo, event.target.value)}
                  />
                </label>
              </div>
              <TagSelect
                id="analises-contas"
                label="Contas"
                values={contasIds}
                onChange={ids => {
                  setContasIds(ids);
                  if (ids.length === 0) setPainel(atual => atual === 'leitura' ? null : atual);
                }}
                options={opcoesContas.map(conta => ({ value: conta.id, label: rotuloConta(conta) }))}
                placeholder="Escolher contas"
                searchable
              />
              {periodos.length > 0 ? (
                <div>
                  <label htmlFor="analises-salvo" className="mb-2 block">
                    <Text variant="label" as="span">Período salvo</Text>
                  </label>
                  <SelectField
                    id="analises-salvo"
                    block
                    ariaLabel="Período salvo"
                    value={periodoAtual ? periodoAtual.id : 'nenhum'}
                    onChange={value => {
                      if (value === 'nenhum') {
                        setPeriodoAberto('');
                        return;
                      }
                      abrirPeriodo(value);
                    }}
                    options={[
                      { value: 'nenhum', label: 'Nenhum' },
                      ...periodos.map(periodo => ({ value: periodo.id, label: rotuloDoSalvo(periodo) })),
                    ]}
                  />
                </div>
              ) : null}
              {!periodoValido ? (
                <Text variant="secondary">O fim precisa ser no mesmo dia ou depois do início.</Text>
              ) : null}
              {periodoAtual && painel !== 'periodo' && (periodoAtual.oQueMudei || periodoAtual.conclusao) ? (
                <div className="grid-form">
                  {periodoAtual.oQueMudei ? <Campo rotulo="O que mudei" valor={periodoAtual.oQueMudei} /> : null}
                  {periodoAtual.conclusao ? <Campo rotulo="Conclusão" valor={periodoAtual.conclusao} /> : null}
                </div>
              ) : null}
              {painel === null ? (
                <div className="flex flex-wrap gap-2">
                  <AppButton variant="secondary" onClick={() => setPainel('periodo')}>
                    {periodoAtual ? 'Editar período' : 'Salvar período'}
                  </AppButton>
                  {periodoValido ? (
                    <AppButton
                      variant="secondary"
                      disabled={contasIds.length === 0}
                      disabledReason="Escolha ao menos uma conta."
                      onClick={() => setPainel('leitura')}
                    >
                      Registrar leitura
                    </AppButton>
                  ) : null}
                </div>
              ) : null}
              {painel === 'periodo' ? (
                <FormularioPeriodo
                  key={periodoAtual?.id ?? 'novo'}
                  inicial={{
                    nome: periodoAtual?.nome ?? '',
                    oQueMudei: periodoAtual?.oQueMudei ?? '',
                    conclusao: periodoAtual?.conclusao ?? '',
                  }}
                  podeSalvar={Boolean(user?.id) && periodoValido && contasIds.length > 0}
                  motivo={motivoDoPeriodo}
                  onCancel={() => setPainel(null)}
                  onSave={salvarPeriodo}
                />
              ) : null}
            </Surface>

            {periodoValido ? (
              <Surface variant="outlined" padding="md" className="stack-sm">
                <Text variant="sectionTitle" as="h2">Contas no período</Text>
                <LeiturasDaConta
                  contas={contasEscolhidas}
                  leituras={leituras}
                  inicio={inicioEfetivo}
                  fim={fimEfetivo}
                  formAberto={painel === 'leitura'}
                  onFechar={() => setPainel(null)}
                  onSave={salvarLeitura}
                />
              </Surface>
            ) : null}
          </div>

          <div className="stack-sm min-w-0">
            {periodoValido ? (
              <Surface variant="outlined" padding="md" className="stack-sm">
                <Text variant="sectionTitle" as="h2">Ritmo</Text>
                <RitmoDoPeriodo
                  contents={state.contents}
                  platforms={state.platforms}
                  editorial={state.editorial}
                  inicio={inicioEfetivo}
                  fim={fimEfetivo}
                  hoje={hoje}
                  contasIds={contasIds}
                />
              </Surface>
            ) : null}

            {!pronto ? (
              <Text variant="secondary">Carregando publicações.</Text>
            ) : linhasVisiveis.length === 0 ? (
              <EmptyState
                icon={<ChartColumn className="h-6 w-6" />}
                title="Nenhuma publicação neste filtro"
                description="Troque o período, a plataforma ou a conta para ver outras publicações."
              />
            ) : (
              <div className="stack-sm">
                <Surface variant="outlined" padding="md" className="stack-sm">
                  <Text variant="sectionTitle" as="h2">Resultados das publicações</Text>
                  <Text variant="meta" as="p">Soma do que esta lista mostra. O alcance de cada publicação entra à parte do alcance da conta.</Text>
                  <div className="grid-metrics-3">
                    <Campo rotulo="Visualizações" valor={textoDeMetrica(soma.views)} />
                    <Campo rotulo="Alcance" valor={textoDeMetrica(soma.alcance)} />
                    <Campo rotulo="Interações" valor={textoDeMetrica(soma.interacoes)} />
                  </div>
                </Surface>
                {nenhumaComMetricas ? (
                  <Text variant="secondary">Nenhuma destas publicações tem métricas ainda.</Text>
                ) : null}
                {linhasVisiveis.map(linha => (
                <Surface key={linha.publicacaoId} variant="outlined" padding="md" className="stack-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      to={`/conteudos/${linha.contentId}?tab=publicacao`}
                      className="min-w-0 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <Text variant="itemTitle">{linha.titulo}</Text>
                    </Link>
                    <Text variant="meta">{linha.contaRotulo}</Text>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                    {linha.pilar ? <Campo rotulo="Pilar" valor={linha.pilar} /> : null}
                    {linha.serie ? <Campo rotulo="Série" valor={linha.serie} /> : null}
                    {linha.objetivo ? <Campo rotulo="Objetivo" valor={linha.objetivo} /> : null}
                    {linha.dataPlanejada ? <Campo rotulo="Data planejada" valor={dataCurta(linha.dataPlanejada)} /> : null}
                    {linha.dataEfetiva ? <Campo rotulo="Data efetiva" valor={dataCurta(linha.dataEfetiva)} /> : null}
                    {linha.link ? <Campo rotulo="Link" valor={linha.link} /> : null}
                    {semMetricas(linha) ? null : (
                      <>
                        <Campo rotulo="Visualizações" valor={textoDeMetrica(linha.views)} />
                        <Campo rotulo="Alcance" valor={textoDeMetrica(linha.alcance)} />
                        <Campo rotulo="Interações" valor={textoDeMetrica(linha.interacoes)} />
                        <Campo
                          rotulo="Taxa de engajamento"
                          valor={linha.taxa == null ? textoDeMetrica(null) : `${(linha.taxa * 100).toFixed(1)}%`}
                        />
                      </>
                    )}
                  </div>
                  {(semMetricas(linha) && !nenhumaComMetricas) || linha.atualizadoEm ? (
                    <Text variant="meta">
                      {semMetricas(linha) ? 'Sem métricas ainda.' : `Atualizado em ${dataCurta(linha.atualizadoEm!)}.`}
                    </Text>
                  ) : null}
                </Surface>
              ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
