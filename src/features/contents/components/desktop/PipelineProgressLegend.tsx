import {Text} from '../../../../components/ui/Text';

const LEGEND_ITEMS = [
  {label: 'Roteiro', color: 'var(--status-writing)'},
  {label: 'Legenda', color: 'var(--accent-purple)'},
  {label: 'Thumbnail', color: 'var(--accent-orange)'},
  {label: 'Publicado', color: 'var(--status-posted)'},
  {label: 'Analytics', color: 'var(--text-tertiary)'},
] as const;

const STATUS_HINTS = [
  {label: 'Pronto para Gravar', color: 'var(--status-ready)'},
  {label: 'A Editar', color: 'var(--status-editing)'},
  {label: 'Editado', color: 'var(--status-edited)'},
] as const;

export function PipelineProgressLegend() {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-color)] pt-4 md:flex-row md:items-center md:justify-between">
      <div className="stack-sm">
        <Text variant="label" className="text-[var(--text-tertiary)]">
          Legenda do progresso
        </Text>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {LEGEND_ITEMS.map(item => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span className="h-2 w-2 rounded-full" style={{backgroundColor: item.color}} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {STATUS_HINTS.map(item => (
          <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full ring-2 ring-[var(--bg-primary)]" style={{backgroundColor: item.color}} />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
          <span className="h-2 w-2 rounded-full bg-[var(--status-idea)]" />
          Ideia
        </span>
      </div>
    </div>
  );
}
