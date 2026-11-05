import { useNavigate } from 'react-router-dom';
import { CalendarDays, Heart } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { AjustesEditorialPanel } from './AjustesEditorialPanel';
import { CardConfiguracao } from './campos';

interface AvisosEditorialPanelProps {
  onAbrirCapacidade: () => void;
}

/** Aba Avisos: variedade e atalhos para o que gera aviso em outras abas. */
export function AvisosEditorialPanel({ onAbrirCapacidade }: AvisosEditorialPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="stack-lg">
      <AjustesEditorialPanel secao="avisos" />

      <div className="grid gap-4 lg:grid-cols-2">
        <CardConfiguracao
          icone={<CalendarDays className="h-5 w-5" />}
          titulo="Avisos do que falta para postar"
          descricao="Os dias em que você grava e a antecedência ficam em Capacidade e regras, junto do ritmo."
          acao={(
            <AppButton variant="secondary" size="sm" onClick={onAbrirCapacidade}>
              Abrir dias de gravação
            </AppButton>
          )}
        />
        <CardConfiguracao
          icone={<Heart className="h-5 w-5" />}
          titulo="Modo gentil"
          descricao="Pausa e contagens do modo gentil ficam nas Configurações e valem para o app inteiro."
          acao={(
            <AppButton variant="secondary" size="sm" onClick={() => navigate('/configuracoes')}>
              Abrir Configurações
            </AppButton>
          )}
        />
      </div>
    </div>
  );
}
