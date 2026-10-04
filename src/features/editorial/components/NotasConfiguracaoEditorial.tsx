import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { ConfigNota } from '../lib/checkEditorialConfig';

export function NotasConfiguracaoEditorial({ notas }: { notas: ConfigNota[] }) {
  if (notas.length === 0) return null;

  return (
    <Surface>
      <Text variant="bodyStrong">Configuração</Text>
      <div className="mt-2 stack-sm">
        {notas.map(nota => (
          <Text key={nota.chave} variant="secondary">{nota.mensagem}</Text>
        ))}
      </div>
    </Surface>
  );
}
