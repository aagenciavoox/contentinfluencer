import { Plus } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { PAGE_SECTION } from '../../../layouts/navigation/navConfig';
import { Ajuda } from '../../../components/ui/Ajuda';
import { abaEditorialDaUrl, DirecaoEditorialPanel, opcoesAbasEditorial, type EditorialAba } from '../components/DirecaoEditorialPanel';
import { APOIO_DA_ABA, APOIO_DA_PAGINA, ancoraDaAbaAntiga, ehAbaAntiga, paramsDaAba } from '../lib/abasEditorial';

export function EditorialPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const abaParam = searchParams.get('aba');
  if (abaParam === 'series' || abaParam === 'quadros') {
    return <Navigate to="/series" replace />;
  }

  const abaAtiva = abaEditorialDaUrl(abaParam);
  // Abas que deixaram de existir (continuidade, avisos, operacional, capacidade…): troca pelo id atual
  // e leva até o bloco certo dentro da aba nova.
  if (ehAbaAntiga(abaParam)) {
    const params = paramsDaAba(searchParams, abaAtiva).toString();
    const ancora = ancoraDaAbaAntiga(abaParam);
    return <Navigate to={`/editorial${params ? `?${params}` : ''}${ancora ? `#${ancora}` : ''}`} replace />;
  }
  const abaOptions = opcoesAbasEditorial();

  const novoPilar = (
    <AppButton
      variant="primary"
      leftIcon={<Plus className="h-4 w-4" />}
      onClick={() => navigate('/editorial/pilares/nova')}
    >
      Adicionar pilar
    </AppButton>
  );

  const handleAbaChange = (novaAba: EditorialAba) => {
    setSearchParams(prev => paramsDaAba(prev, novaAba), { replace: true });
  };

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
          actions={abaAtiva === 'direcao' ? novoPilar : undefined}
        />
      )}
      navigation={(
        <div className="flex min-w-0 items-center gap-1">
          <div className="min-w-0 flex-1">
            <SegmentTabs<EditorialAba>
              options={abaOptions}
              value={abaAtiva}
              onChange={handleAbaChange}
              ariaLabel="Abas do Editorial"
            />
          </div>
          <Ajuda alinhar="fim" rotulo="Sobre esta aba" texto={APOIO_DA_ABA[abaAtiva]} />
        </div>
      )}
      // No celular o cabeçalho e a navegação do desktop não aparecem: as abas vêm aqui.
      mobileToolbar={(
        <div className="stack-sm">
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0 flex-1">
              <SegmentTabs<EditorialAba>
                options={abaOptions}
                value={abaAtiva}
                onChange={handleAbaChange}
                ariaLabel="Abas do Editorial"
              />
            </div>
            <Ajuda alinhar="fim" rotulo="Sobre o Editorial" texto={APOIO_DA_PAGINA} />
            <Ajuda alinhar="fim" rotulo="Sobre esta aba" texto={APOIO_DA_ABA[abaAtiva]} />
          </div>
          {abaAtiva === 'direcao' ? novoPilar : null}
        </div>
      )}
    >
      <DirecaoEditorialPanel abaAtiva={abaAtiva} />
    </PageLayout>
  );
}
