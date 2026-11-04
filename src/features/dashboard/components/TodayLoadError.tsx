import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';

export function TodayLoadError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return <div className="stack-sm" role="alert">
    <Text variant="secondary">Não foi possível carregar {label}.</Text>
    <AppButton variant="secondary" size="sm" onClick={onRetry}>Tentar novamente</AppButton>
  </div>;
}
