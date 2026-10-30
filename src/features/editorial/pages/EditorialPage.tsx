import { Plus } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { DirecaoEditorialPanel } from '../components/DirecaoEditorialPanel';

export function EditorialPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const aba = searchParams.get('aba');
  if (aba === 'series' || aba === 'quadros') {
    return <Navigate to="/series" replace />;
  }

  return (
    <PageLayout
      header={(
        <DesktopPageHeader
          section="Criação"
          title="Editorial"
          meta="Público, pilares e ritmo. Prioridade e metas do intervalo ficam no Planejamento."
          actions={(
            <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/editorial/pilares/nova')}>
              Novo pilar
            </AppButton>
          )}
        />
      )}
    >
      <DirecaoEditorialPanel />
    </PageLayout>
  );
}
