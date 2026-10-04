import {PlatformIcon} from '../../../components/ui/PlatformIcon';

export function CalendarNetworkIcons({names}: {names: string[]}) {
  if (names.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {names.map(name => (
        <PlatformIcon key={name} platform={name} className="h-3 w-3" />
      ))}
    </span>
  );
}