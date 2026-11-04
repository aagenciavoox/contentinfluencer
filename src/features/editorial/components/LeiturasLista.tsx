import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import type { Leitura } from '../lib/editorialReadings';

function parseCapacidade(leitura: Leitura): { atual: number; limite: number } | null {
  if (leitura.capacidade) return leitura.capacidade;
  const match = leitura.mensagem.match(/Esta semana tem (\d+) e o limite é (\d+)/i);
  if (match) {
    return { atual: parseInt(match[1], 10), limite: parseInt(match[2], 10) };
  }
  return null;
}

export function LeiturasLista({ leituras }: { leituras: Leitura[] }) {
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  if (leituras.length === 0) return null;

  const resolver = (leitura: Leitura) => {
    if (leitura.resolver?.tipo !== 'marcar-lido') return;
    const livro = state.bibliotecaItems.find(item => item.id === leitura.resolver?.livroId);
    if (!livro) return;
    dispatch({
      type: 'UPDATE_BOOK',
      payload: { ...livro, status: 'Lido', dataFim: livro.dataFim || format(new Date(), 'yyyy-MM-dd') },
    });
  };

  return (
    <Surface variant="outlined" padding="md">
      <Text variant="eyebrow">Organização</Text>
      <ul className="mt-3 stack-sm">
        {leituras.map(leitura => {
          const cap = parseCapacidade(leitura);
          if (leitura.chave === 'limite-semana' && cap) {
            const percent = cap.limite > 0 ? Math.min(100, Math.round((cap.atual / cap.limite) * 100)) : 100;
            return (
              <li
                key={leitura.chave}
                className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--warning)_32%,var(--border-color))] bg-[color-mix(in_srgb,var(--warning)_8%,var(--bg-elevated))] p-3 stack-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Text variant="bodyStrong">Limite semanal</Text>
                    <Badge variant="warning">Sobrecarga</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Text variant="bodyStrong" as="span" className="tabular-nums">
                      {cap.atual}/{cap.limite} conteúdos planejados
                    </Text>
                    <AppButton variant="secondary" size="sm" onClick={() => navigate(leitura.acao.href)}>
                      {leitura.acao.rotulo}
                    </AppButton>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
                  <div
                    className="h-full rounded-full bg-[var(--warning)] transition-all"
                    style={{ width: `${percent}%` }}
                    aria-label={`Capacidade semanal: ${cap.atual} de ${cap.limite}`}
                  />
                </div>
                <Text variant="meta">
                  {leitura.mensagem}
                </Text>
              </li>
            );
          }

          return (
            <li key={leitura.chave} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              {/* Largura mínima para o texto: em tela estreita os botões descem em vez de espremer a frase. */}
              <Text variant="secondary" className="min-w-[12rem] flex-1">{leitura.mensagem}</Text>
              <div className="flex shrink-0 items-center gap-1">
                {leitura.resolver ? (
                  <AppButton variant="secondary" size="sm" onClick={() => resolver(leitura)}>
                    {leitura.resolver.rotulo}
                  </AppButton>
                ) : null}
                <AppButton variant="secondary" size="sm" onClick={() => navigate(leitura.acao.href)}>
                  {leitura.acao.rotulo}
                </AppButton>
              </div>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
