import { useNavigate } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { Leitura } from '../lib/editorialReadings';

export function LeiturasLista({ leituras }: { leituras: Leitura[] }) {
  const navigate = useNavigate();
  if (leituras.length === 0) return null;

  return (
    <Surface variant="outlined" padding="md">
      <Text variant="eyebrow">Organização</Text>
      <ul className="mt-3 stack-sm">
        {leituras.map(leitura => (
          <li key={leitura.chave} className="flex flex-wrap items-center justify-between gap-3">
            <Text variant="secondary">{leitura.mensagem}</Text>
            <AppButton variant="ghost" size="sm" onClick={() => navigate(leitura.acao.href)}>
              {leitura.acao.rotulo}
            </AppButton>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
