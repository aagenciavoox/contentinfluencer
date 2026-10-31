import { useMemo } from 'react';
import { Palette, Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { Text } from '../../../components/ui/Text';
import type { Pilar } from '../../../lib/database';
import { getEntityTagStyle } from '../../../lib/utils';
import { CONFIRM } from '../../../lib/uiCopy';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { sortPilares } from '../../../features/settings/lib/activePilares';

interface PillarsMobileScreenProps {
  pilares: Pilar[];
  onCreate: () => void;
  onEdit: (pilarId: string) => void;
  onToggle: (pilar: Pilar) => void;
  onDelete: (pilarId: string) => void;
}

export function PillarsMobileScreen({
  pilares,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
}: PillarsMobileScreenProps) {
  const sortedPilares = useMemo(() => sortPilares(pilares), [pilares]);
  const activeCount = pilares.filter(pilar => pilar.ativo).length;

  return (
    <div className="stack-lg">
      {/* O cabeçalho já diz "Pilares": aqui fica só o resumo e a ação da tela. */}
      <section className="stack-md">
        <Text variant="secondary" className="px-1">
          {pilares.length === 0
            ? 'Nome e publicação por plataforma. O limite fica na aba Ajustes do Editorial.'
            : `${activeCount} ativo${activeCount === 1 ? '' : 's'}`}
        </Text>

        <AppButton
          variant="primary"
          fullWidth
          onClick={onCreate}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Novo pilar
        </AppButton>
      </section>

      <section className="stack-md">
        {sortedPilares.length === 0 ? (
          <EmptyState
            compact
            title="Nenhum pilar cadastrado"
            description="Adicione o primeiro pilar para organizar os temas editoriais."
            icon={<Palette className="h-8 w-8" />}
          />
        ) : (
          sortedPilares.map(pilar => (
            <MobileListCard
              key={pilar.id}
              title={pilar.nome}
              description={pilar.descricao || 'Descrição ainda não preenchida'}
              onClick={() => onEdit(pilar.id)}
              actionLabel={`Editar ${pilar.nome}`}
              meta={
                <>
                  <Text variant="label" as="span"
                    className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-transparent px-2 py-0.5 text-inherit"
                    style={getEntityTagStyle(pilar.cor)}
                  >
                    <span
                      className="entity-color-dot h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: pilar.cor }}
                    />
                    Cor
                  </Text>
                  <Badge variant="neutral">
                    {pilar.plataformas.length} plataforma{pilar.plataformas.length === 1 ? '' : 's'}
                  </Badge>
                </>
              }
              trailing={
                <div className="mt-1 flex items-start">
                  <MoreMenu
                    size="sm"
                    items={[
                      {
                        label: pilar.ativo ? 'Desativar' : 'Ativar',
                        tone: pilar.ativo ? 'default' : 'success',
                        onClick: () => onToggle(pilar),
                      },
                      {
                        label: CONFIRM.excluirPilar.confirmLabel,
                        tone: 'danger',
                        onClick: () => onDelete(pilar.id),
                      },
                    ]}
                    triggerClassName="border-transparent bg-transparent"
                  />
                </div>
              }
              status={
                // Tocar no card já abre a edição; o selo só informa o estado.
                <Badge variant="neutral">{pilar.ativo ? 'Ativo' : 'Inativo'}</Badge>
              }
            />
          ))
        )}
      </section>
    </div>
  );
}
