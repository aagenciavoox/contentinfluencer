import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChartColumn } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { SelectField } from '../../../components/ui/SelectField';
import { TagSelect } from '../../../components/ui/TagSelect';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { ValorVazio } from '../../../components/ui/ValorVazio';
import { useAppContext } from '../../../context/AppContext';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { dia, intervalo } from '../../../lib/dates';
import { contasAtivas, REDE_ROTULO, REDES_PRINCIPAIS, redeDaConta, rotuloConta } from '../../contas/lib/contas';
import { intervaloDoModo, hojeIso, type ModoPeriodo } from '../../editorial/components/plano/PeriodoEditorialControl';
import {
  FORMULA_ENGAJAMENTO,
  filtrarPublicacoes,
  type BaseDoPeriodo,
} from '../lib/publicacoes';

type ModoVista = ModoPeriodo | 'tudo';

function Campo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
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

  const filtros = (
    <div className="stack-sm">
      <div className="flex flex-col gap-1">
        <Text variant="label" as="span">Contar pela</Text>
        <SelectField
          ariaLabel="Contar pela data planejada ou pela data efetiva"
          value={base}
          onChange={value => setBase(value as BaseDoPeriodo)}
          options={[
            {value: 'planejada', label: 'Data planejada'},
            {value: 'efetiva', label: 'Data efetiva'},
          ]}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
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
        <TagSelect
          id="analise-rede"
          label="Plataforma"
          placeholder="Todas"
          maxSelections={1}
          values={rede ? [rede] : []}
          options={REDES_PRINCIPAIS.map(item => ({ value: item, label: REDE_ROTULO[item] }))}
          onChange={values => {
            setRede(values[0] ?? '');
            setContaId('');
          }}
        />
        <TagSelect
          id="analise-conta"
          label="Conta"
          placeholder="Todas"
          searchable
          maxSelections={1}
          className="min-w-[12rem]"
          values={contaId ? [contaId] : []}
          options={contas.map(conta => ({ value: conta.id, label: rotuloConta(conta) }))}
          onChange={values => setContaId(values[0] ?? '')}
        />
      </div>
      <Text variant="meta">
        {recorte
          ? `${base === 'planejada' ? 'Data planejada' : 'Data efetiva'}: ${intervalo(recorte.inicio, recorte.fim)}.`
          : 'Sem recorte de data.'}
        {' '}Cada linha é uma publicação. O alcance de uma conta não se soma ao de outra como se fossem as mesmas pessoas.
      </Text>
      <Text variant="meta">
        A taxa usa {FORMULA_ENGAJAMENTO}. Sem visualizações no denominador, ela não é calculada.
      </Text>
    </div>
  );

  return (
    <PageLayout
      contentWidth="wide"
      contentStack="dense"
      header={(
        <DesktopPageHeader
          section="Criação"
          title="Análises"
          meta={pronto ? (linhas.length === 1 ? '1 publicação' : `${linhas.length} publicações`) : 'Carregando'}
        />
      )}
      toolbar={filtros}
      mobileHeader={filtros}
    >
      {!pronto ? (
        <Text variant="secondary">Carregando publicações.</Text>
      ) : linhas.length === 0 ? (
        <EmptyState
          icon={<ChartColumn className="h-6 w-6" />}
          title="Nenhuma publicação neste filtro"
          description="Cadastrar um @ ou informar um link não traz métricas nem marca a conta como conectada. A integração com o Instagram ainda não está ligada."
        />
      ) : (
        <div className="stack-sm">
          {linhas.map(linha => (
            <Surface key={linha.publicacaoId} padding="sm" className="stack-sm">
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
                <Campo rotulo="Pilar" valor={linha.pilar ?? <ValorVazio />} />
                <Campo rotulo="Série" valor={linha.serie ?? <ValorVazio />} />
                <Campo rotulo="Objetivo" valor={linha.objetivo ?? <ValorVazio />} />
                <Campo rotulo="Data planejada" valor={linha.dataPlanejada ? dia(linha.dataPlanejada) : <ValorVazio />} />
                <Campo rotulo="Data efetiva" valor={linha.dataEfetiva ? dia(linha.dataEfetiva) : <ValorVazio />} />
                <Campo rotulo="Período editorial" valor={linha.periodoEditorial ?? <ValorVazio />} />
                <Campo rotulo="Link" valor={linha.link ?? <ValorVazio />} />
                <Campo rotulo="Origem dos dados" valor={linha.origem ?? <ValorVazio />} />
                <Campo rotulo="Visualizações" valor={linha.views == null ? <ValorVazio /> : String(linha.views)} />
                <Campo rotulo="Alcance" valor={linha.alcance == null ? <ValorVazio /> : String(linha.alcance)} />
                <Campo rotulo="Interações" valor={linha.interacoes == null ? <ValorVazio /> : String(linha.interacoes)} />
                <Campo
                  rotulo="Taxa de engajamento"
                  valor={linha.taxa == null ? <ValorVazio /> : `${(linha.taxa * 100).toFixed(1)}%`}
                />
              </div>
              {linha.atualizadoEm ? (
                <Text variant="meta">
                  Atualizado em {dia(linha.atualizadoEm)}.
                </Text>
              ) : null}
            </Surface>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
