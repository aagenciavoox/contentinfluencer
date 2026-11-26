import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { SegmentTabs, type SegmentTabOption } from '../../../components/ui/SegmentTabs';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { PAGE_SECTION } from '../../../layouts/navigation/navConfig';
import { Ajuda } from '../../../components/ui/Ajuda';
import { useAppContext } from '../../../context/AppContext';
import type { Platform } from '../../../lib/database';
import { contasAtivas, iconeDaConta, ordenarContas, rotuloConta } from '../../contas/lib/contas';
import { DirecaoEditorialPanel } from '../components/DirecaoEditorialPanel';
import {
  ANCORA_IDENTIDADE,
  ANCORA_PLANEJAMENTO,
  ANCORA_REGRAS_E_AVISOS,
  APOIO_DA_ABA,
  APOIO_DA_CONTA,
  paramsDaAba,
  paramsDaConta,
  urlDaAbaAntiga,
} from '../lib/abasEditorial';

const ATALHOS_GERAL = [
  { id: ANCORA_IDENTIDADE, label: 'Identidade' },
  { id: ANCORA_PLANEJAMENTO, label: 'Planejamento' },
  { id: ANCORA_REGRAS_E_AVISOS, label: 'Regras e avisos' },
] as const;

type AbaVisivel = 'geral' | string;

export function EditorialPage() {
  const { state } = useAppContext();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formularioConta, setFormularioConta] = useState<Platform | 'nova' | null>(null);
  const contas = useMemo(
    () => ordenarContas(contasAtivas(state.platforms)),
    [state.platforms],
  );
  const novaConta = searchParams.get('novaConta') === '1';

  useEffect(() => {
    if (novaConta) setFormularioConta('nova');
  }, [novaConta]);

  const abaParam = searchParams.get('aba');
  if (abaParam === 'series' || abaParam === 'quadros') {
    return <Navigate to="/series" replace />;
  }

  const destinoAntigo = urlDaAbaAntiga(searchParams, location.hash, contas[0]?.id ?? null);
  if (destinoAntigo) {
    return <Navigate to={destinoAntigo} replace />;
  }

  const contaParam = searchParams.get('conta');
  const conta = contas.find(item => item.id === contaParam) ?? null;
  if (contaParam && !conta) {
    const params = paramsDaAba(searchParams, 'geral').toString();
    return <Navigate to={`/editorial${params ? `?${params}` : ''}`} replace />;
  }

  const abaAtiva: AbaVisivel = conta?.id ?? 'geral';
  const noGeral = abaAtiva === 'geral';
  const abaOptions: SegmentTabOption<AbaVisivel>[] = [
    { id: 'geral', label: 'Geral' },
    ...contas.map(item => ({
      id: item.id,
      label: rotuloConta(item),
      icon: <PlatformIcon platform={iconeDaConta(item)} className="h-4 w-4" />,
    })),
  ];
  const apoio = noGeral ? APOIO_DA_ABA.geral : APOIO_DA_CONTA;

  const adicionarConta = (
    <AppButton
      variant="secondary"
      size="sm"
      className="shrink-0"
      leftIcon={<Plus className="h-4 w-4" />}
      onClick={() => setFormularioConta('nova')}
    >
      Adicionar conta
    </AppButton>
  );

  const handleAbaChange = (novaAba: AbaVisivel) => {
    setSearchParams(prev => (
      novaAba === 'geral' ? paramsDaAba(prev, 'geral') : paramsDaConta(prev, novaAba)
    ), { replace: true });
  };

  const mudarFormulario = (valor: Platform | 'nova' | null) => {
    setFormularioConta(valor);
    if (valor == null && novaConta) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('novaConta');
        return next;
      }, { replace: true });
    }
  };

  const [secaoAtiva, setSecaoAtiva] = useState<string>(ANCORA_IDENTIDADE);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, '');
    if (ATALHOS_GERAL.some(item => item.id === hash)) {
      setSecaoAtiva(hash);
    }
  }, [location.hash]);

  const rolarParaSecao = (id: string) => {
    setSecaoAtiva(id);
    const alvo = document.getElementById(id);
    if (alvo) {
      alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (window.location.hash !== `#${id}`) {
      window.history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
    }
  };

  const atalhosSecoes = noGeral ? (
    <nav
      aria-label="Atalhos das seções"
      className="mobile-h-scroll scrollbar-none flex items-center gap-6 pt-2"
    >
      {ATALHOS_GERAL.map(secao => {
        const ativa = secaoAtiva === secao.id;
        return (
          <a
            key={secao.id}
            href={`#${secao.id}`}
            aria-current={ativa ? 'location' : undefined}
            onClick={event => {
              event.preventDefault();
              rolarParaSecao(secao.id);
            }}
            className={ativa
              ? 'shrink-0 py-1 t-label text-[var(--brand-accent-text)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]'
              : 'shrink-0 py-1 t-label text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]'}
          >
            {secao.label}
          </a>
        );
      })}
    </nav>
  ) : null;

  const abasDesktop = (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        <SegmentTabs<AbaVisivel>
          options={abaOptions}
          value={abaAtiva}
          onChange={handleAbaChange}
          ariaLabel="Abas do Editorial"
        />
      </div>
      {adicionarConta}
    </div>
  );

  return (
    <PageLayout
      header={(
        <DesktopPageHeader
          section={PAGE_SECTION.estrategia}
          title="Editorial"
          subtitle="Definições que orientam o conteúdo, a rotina e os avisos do planejamento."
          rowAlign="center"
        />
      )}
      navigation={(
        <div className="stack-xs">
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0 flex-1">{abasDesktop}</div>
            <Ajuda alinhar="fim" rotulo="Sobre esta aba" texto={apoio} />
          </div>
          {atalhosSecoes}
        </div>
      )}
      mobileToolbar={(
        <div className="stack-xs">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="mobile-h-scroll scrollbar-none min-w-0 flex-1">
              <SegmentTabs<AbaVisivel>
                options={abaOptions}
                value={abaAtiva}
                onChange={handleAbaChange}
                ariaLabel="Abas do Editorial"
                className="w-max"
              />
            </div>
            <AppButton
              variant="secondary"
              size="sm"
              iconOnly
              aria-label="Adicionar conta"
              title="Adicionar conta"
              onClick={() => setFormularioConta('nova')}
            >
              <Plus className="h-4 w-4" />
            </AppButton>
            <Ajuda alinhar="fim" rotulo="Sobre esta aba" texto={apoio} />
          </div>
          {atalhosSecoes}
        </div>
      )}
    >
      <DirecaoEditorialPanel
        conta={conta}
        formularioConta={formularioConta}
        onFormularioConta={mudarFormulario}
      />
    </PageLayout>
  );
}
