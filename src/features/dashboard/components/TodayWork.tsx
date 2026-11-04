import { Link } from 'react-router-dom';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { DetailBackState } from '../../../lib/navigation/detailBack';
import type { TodayWorkItem } from '../lib/todayWork';

export function TodayWork({ items, detailBack }: { items: TodayWorkItem[]; detailBack: DetailBackState }) {
  if (!items.length) {
    return (
      <section className="stack-sm h-full flex flex-col" aria-labelledby="today-work-title">
        <Text variant="sectionTitle" id="today-work-title">Continuar trabalho</Text>
        <Surface variant="outlined" padding="md" className="h-full flex-1 flex flex-col items-center justify-center text-center p-6 stack-xs">
          <Text variant="bodyStrong">Tudo em dia</Text>
          <Text variant="secondary">Nenhum roteiro em andamento ou gravação pausada.</Text>
        </Surface>
      </section>
    );
  }

  return (
    <section className="stack-sm h-full flex flex-col" aria-labelledby="today-work-title">
      <Text variant="sectionTitle" id="today-work-title">Continuar trabalho</Text>
      <div className="stack-sm flex-1">
        {items.map(item => (
          <Surface key={item.id} variant="outlined" padding="md" className="h-full flex flex-col justify-between">
            <Link
              to={item.to}
              state={detailBack}
              className="group block rounded-[var(--radius-sm)] stack-xs focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Text variant="itemTitle" className="line-clamp-2 group-hover:text-[var(--accent-blue)] transition-colors">{item.title}</Text>
              <Text variant="meta">{item.description}</Text>
              <Text variant="bodyStrong" as="span" className="underline underline-offset-2 text-[var(--accent-blue)]">Continuar</Text>
            </Link>
          </Surface>
        ))}
      </div>
    </section>
  );
}
