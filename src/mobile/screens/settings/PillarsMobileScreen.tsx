import { useMemo } from 'react';
import { ChevronRight, Palette, Plus } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { Text } from '../../../components/ui/Text';
import type { Pilar } from '../../../lib/database';
import { CONFIRM } from '../../../lib/uiCopy';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobilePillButton } from '../../components/MobilePillButton';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';
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
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <MobileSectionHeader
          icon={Palette}
          tone="orange"
          title="Pilares editoriais"
          description={
            pilares.length === 0
              ? 'Nome, distribuição e hashtags por plataforma.'
              : `${activeCount} ativo${activeCount === 1 ? '' : 's'} · ${pilares.length} no total`
          }
        />

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
              meta={
                <>
                  <span
                    className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-transparent px-3 py-1 text-xs font-medium text-[var(--text-primary)]"
                    style={{ backgroundColor: `${pilar.cor}22` }}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: pilar.cor }}
                    />
                    Cor
                  </span>
                  <Badge variant="neutral">
                    {pilar.plataformas.length} plataforma{pilar.plataformas.length === 1 ? '' : 's'}
                  </Badge>
                </>
              }
              trailing={
                <div className="mt-1 flex items-start gap-1">
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
                  <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
                </div>
              }
              status={
                <div className="flex flex-wrap items-center gap-2">
                  <Text
                    variant="meta"
                    className={
                      pilar.ativo
                        ? 'font-semibold text-[var(--accent-green)]'
                        : 'font-semibold text-[var(--text-tertiary)]'
                    }
                  >
                    {pilar.ativo ? 'Ativo' : 'Inativo'}
                  </Text>
                  <MobilePillButton
                    tone="muted"
                    onClick={event => {
                      event.stopPropagation();
                      onEdit(pilar.id);
                    }}
                  >
                    Editar
                  </MobilePillButton>
                </div>
              }
            />
          ))
        )}
      </section>
    </div>
  );
}
