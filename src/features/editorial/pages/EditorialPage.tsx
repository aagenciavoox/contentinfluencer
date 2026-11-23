import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { SegmentTabs, type SegmentTabOption } from '../../../components/ui/SegmentTabs';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { PAGE_SECTION } from '../../../layouts/navigation/navConfig';
import { Ajuda } from '../../../components/ui/Ajuda';
import { useAppContext } from '../../../context/AppContext';
import type { Platform } from '../../../lib/database';
import { contasAtivas, ordenarContas, rotuloConta } from '../../contas/lib/contas';
import { DirecaoEditorialPanel } from '../components/DirecaoEditorialPanel';
import {
  APOIO_DA_ABA,
  APOIO_DA_CONTA,
  APOIO_DA_PAGINA,
  paramsDaAba,
  paramsDaConta,
  urlDaAbaAntiga,
} from '../lib/abasEditorial';

type AbaVisivel = 'geral' | string;

export function EditorialPage() {
  const { state } = useAppContext();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pilarAberto, setPilarAberto] = useState<string | null>(null);
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
    ...contas.map(item => ({ id: item.id, label: rotuloConta(item) })),
  ];
  const apoio = noGeral ? APOIO_DA_ABA.geral : APOIO_DA_CONTA;

  const novoPilar = (
    <AppButton
      variant="primary"
      leftIcon={<Plus className="h-4 w-4" />}
      onClick={() => setPilarAberto('nova')}
    >
      Adicionar pilar
    </AppButton>
  );

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
    setPilarAberto(null);
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
          rowAlign="center"
          titleAside={(
            <Ajuda rotulo="Sobre o Editorial" texto={APOIO_DA_PAGINA} />
          )}
          actions={noGeral ? novoPilar : undefined}
        />
      )}
      navigation={(
        <div className="flex min-w-0 items-center gap-1">
          <div className="min-w-0 flex-1">{abasDesktop}</div>
          <Ajuda alinhar="fim" rotulo="Sobre esta aba" texto={apoio} />
        </div>
      )}
      mobileToolbar={(
        <div className="stack-sm">
          <div className="flex min-w-0 items-center gap-1">
            <div className="mobile-h-scroll scrollbar-none flex min-w-0 flex-1 items-center gap-2">
              <SegmentTabs<AbaVisivel>
                options={abaOptions}
                value={abaAtiva}
                onChange={handleAbaChange}
                ariaLabel="Abas do Editorial"
                className="w-max"
              />
              {adicionarConta}
            </div>
            <Ajuda alinhar="fim" rotulo="Sobre esta aba" texto={apoio} />
          </div>
          {noGeral ? novoPilar : null}
        </div>
      )}
    >
      <DirecaoEditorialPanel
        conta={conta}
        formularioConta={formularioConta}
        onFormularioConta={mudarFormulario}
        pilarAberto={pilarAberto}
        onPilarAbertoChange={setPilarAberto}
      />
    </PageLayout>
  );
}
