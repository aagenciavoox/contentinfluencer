import {Drawer} from '../../../components/overlays/Drawer';
import {SaudeEditorialPanel} from './SaudeEditorialPanel';
import type {ComponentProps} from 'react';

type PanelProps = ComponentProps<typeof SaudeEditorialPanel>;

/** Análise da Saúde: drawer por cima da tela, em qualquer largura; no celular ocupa a tela inteira. */
export function AnalisePlanejamento({
  aberta,
  onFechar,
  ...panel
}: {aberta: boolean; onFechar: () => void} & Omit<PanelProps, 'modo' | 'onFechar'>) {
  return (
    <Drawer
      open={aberta}
      onClose={onFechar}
      widthClassName="max-w-xl"
      ariaLabel="Análise da Saúde"
    >
      <div className="h-full min-h-0 overflow-y-auto bg-[var(--bg-elevated)]">
        <SaudeEditorialPanel modo="analise" onFechar={onFechar} {...panel} />
      </div>
    </Drawer>
  );
}
