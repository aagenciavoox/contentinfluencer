import { cn } from '../../lib/utils';
import { Text } from './Text';

export interface SegmentTabOption<T extends string = string> {
  id: T;
  label: string;
}

interface SegmentTabsProps<T extends string = string> {
  options: SegmentTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Segmented control used in toolbars (Contents pipeline/publicados, etc.). */
export function SegmentTabs<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: SegmentTabsProps<T>) {
  return (
    <div className={cn('segment-tabs', className)} role="tablist">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn('segment-tabs-item', value === option.id && 'segment-tabs-item-active')}
        >
          <Text variant="label" as="span" className="font-semibold">
            {option.label}
          </Text>
        </button>
      ))}
    </div>
  );
}
