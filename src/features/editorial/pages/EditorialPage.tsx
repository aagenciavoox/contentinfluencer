import { Palette, Plus, SlidersHorizontal, Target } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { SegmentTabs, type SegmentTabOption } from '../../../components/ui/SegmentTabs';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { DirecaoEditorialPanel, type EditorialAba } from '../components/DirecaoEditorialPanel';

export function EditorialPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const abaParam = searchParams.get('aba');
  if (abaParam === 'series' || abaParam === 'quadros') {
    return <Navigate to="/series" replace />;
  }

  const abaAtiva: EditorialAba = abaParam === 'pilares' || abaParam === 'ajustes' ? abaParam : 'plano';

  const abaOptions: SegmentTabOption<EditorialAba>[] = [
    { id: 'plano', label: 'Plano Vigente', icon: <Target className="h-4 w-4" /> },
    { id: 'pilares', label: 'Pilares & Linhas', icon: <Palette className="h-4 w-4" /> },
    { id: 'ajustes', label: 'Ritmo & Regras Gerais', icon: <SlidersHorizontal className="h-4 w-4" /> },
  ];

  const handleAbaChange = (novaAba: EditorialAba) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (novaAba === 'plano') next.delete('aba');
      else next.set('aba', novaAba);
      return next;
    });
  };

  return (
    <PageLayout
      header={(
        <DesktopPageHeader
          section="Criação"
          title="Editorial"
          rowAlign="center"
          actions={(
            <AppButton
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/editorial/pilares/nova')}
            >
              Novo pilar
            </AppButton>
          )}
        />
      )}
      navigation={(
        <div className="flex min-w-0 items-center justify-between gap-3">
          <SegmentTabs<EditorialAba>
            options={abaOptions}
            value={abaAtiva}
            onChange={handleAbaChange}
            ariaLabel="Abas do Editorial"
          />
        </div>
      )}
    >
      <DirecaoEditorialPanel abaAtiva={abaAtiva} />
    </PageLayout>
  );
}
