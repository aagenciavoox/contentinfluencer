import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartColumn } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PageToolbar } from '../../../components/ui/PageToolbar';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { SelectField } from '../../../components/ui/SelectField';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { intervalo } from '../../../lib/dates';
import { contasAtivas, REDE_ROTULO, REDES_PRINCIPAIS, redeDaConta, rotuloConta } from '../../contas/lib/contas';
import { intervaloDoModo, hojeIso, type ModoPeriodo } from '../../editorial/components/plano/PeriodoEditorialControl';
import {
  FORMULA_ENGAJAMENTO,
  filtrarPublicacoes,
  textoDeMetrica,
  type BaseDoPeriodo,
} from '../lib/publicacoes';

type ModoVista = ModoPeriodo | 'tudo';

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-10-28" → "28 out"; o ano só aparece quando não é o atual. */
function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  if (!ano || !mes || !dia) return iso;
  const sufixo = ano === new Date().getFullYear() ? '' : ` ${ano}`;
  return `${dia} ${MESES_CURTOS[mes - 1]}${sufixo}`;
}

function semMetricas(linha: { views: number | null; alcance: number | null; interacoes: number | null }): boolean {
  return linha.views == null && linha.alcance == null && linha.interacoes == null;
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <Text variant="meta" as="p">{rotulo}</Text>
      <Text variant="body" as="p" className="break-words">{valor}</Text>
    </div>
  );
}

export function AnalisesPage() {
  const { state } = useAppContext();
  const pronto = useDomainsReady(['bootstrap', 'content', 'production', 'analytics']);
  const [base, setBase] = useState<BaseDoPeriodo>('planejada');
  const [modo, setModo] = useState<ModoVista>('mes');
  const [rede, setRede] = useState('');
  const [contaId, setContaId] = useState('');
  const hoje = hojeIso();
  const recorte = modo === 'tudo' || modo === 'intervalo' ? null : intervaloDoModo(modo, hoje);

  const contas = useMemo(
    () => contasAtivas(state.platforms).filter(conta => !rede || redeDaConta(conta) === rede),
    [rede, state.platforms],
  );

  const linhas = useMemo(() => filtrarPublicacoes({
    contents: state.contents,
    contas: state.platforms,
    series: state.series,
    pilares: state.pilares,
    metricas: state.contentMetrics,
    filtro: {
      inicio: recorte?.inicio ?? null,
      fim: recorte?.fim ?? null,
      base,
      rede: rede || null,
      contaId: contaId || null,
    },
  }), [base, contaId, recorte?.fim, recorte?.inicio, rede, state.contentMetrics, state.contents, state.pilares, state.platforms, state.series]);
  const nenhumaComMetricas = linhas.length > 0 && linhas.every(semMetricas);

  const abasPeriodo = (
    <div className="max-w-full overflow-x-auto">
      <SegmentTabs<ModoVista>
        ariaLabel="Tamanho do período"
        className="w-max"
        value={modo}
        onChange={setModo}
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
              ...contas.map(conta => ({ value: conta.id, label: rotuloConta(conta) })),
            ]}
          />
        </div>
      )}
    />
  );

  return (
    <PageLayout
      contentWidth="wide"
      contentStack="dense"
      header={(
        <DesktopPageHeader
          section="Criação"
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

        {!pronto ? (
          <Text variant="secondary">Carregando publicações.</Text>
        ) : linhas.length === 0 ? (
          <EmptyState
            icon={<ChartColumn className="h-6 w-6" />}
            title="Nenhuma publicação neste filtro"
            description="Troque o período, a plataforma ou a conta para ver outras publicações."
          />
        ) : (
          <div className="stack-sm">
            {nenhumaComMetricas ? (
              <Text variant="secondary">Nenhuma destas publicações tem métricas ainda.</Text>
            ) : null}
            {linhas.map(linha => (
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
              {/* Campo vazio não aparece: uma linha só com "Sem…" repetido não diz nada. */}
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
    </PageLayout>
  );
}
