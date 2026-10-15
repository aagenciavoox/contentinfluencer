import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import type { Leitura } from '../lib/editorialReadings';

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
        {leituras.map(leitura => (
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
        ))}
      </ul>
    </Surface>
  );
}
