import { Drawer } from '../../../components/overlays/Drawer';
import { SaudeEditorialPanel } from './SaudeEditorialPanel';
import type { ComponentProps } from 'react';

type PanelProps = ComponentProps<typeof SaudeEditorialPanel>;

/** Análise da Saúde: drawer de 720px no desktop e tela inteira no celular. */
export function AnalisePlanejamento({
  aberta,
  onFechar,
  ...panel
}: { aberta: boolean; onFechar: () => void } & Omit<PanelProps, 'modo' | 'onFechar'>) {
  return (
    <Drawer
      open={aberta}
      onClose={onFechar}
      widthClassName="sm:max-w-[720px]"
      ariaLabel="Saúde do Planejamento"
    >
      <SaudeEditorialPanel modo="analise" onFechar={onFechar} {...panel} />
    </Drawer>
  );
}
