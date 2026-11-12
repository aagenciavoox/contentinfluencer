import { useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Heart } from 'lucide-react';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import { SelectField } from '../../../../components/ui/SelectField';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
import { avisoLigado, GRUPOS_DE_AVISOS, limiteSaturacaoQuadro } from '../../lib/avisosEditoriais';
import { atualizarAviso, atualizarLimiteSaturacao } from '../../lib/editorialSettings';
import { AjustesEditorialPanel } from './AjustesEditorialPanel';
import { CardConfiguracao } from './campos';
import { useEditorialPlano } from './useEditorialPlano';

interface AvisosEditorialPanelProps {
  onAbrirCapacidade: () => void;
}

/** Liga e desliga cada tipo de aviso. Todos começam ligados. */
function AvisosLigadosCard() {
  const { settings, gravar } = useEditorialPlano();
  return (
    <CardConfiguracao
      icone={<Bell className="h-5 w-5" />}
      titulo="Avisos"
      descricao="Escolha o que vale um lembrete para você. Desligar um aviso tira ele da faixa do Planejamento, da Saúde e do Plano do período. Os números continuam iguais."
    >
      <div className="stack-lg">
        {GRUPOS_DE_AVISOS.map(grupo => (
          <div key={grupo.id} className="stack-sm">
            <Text variant="label" as="h3">{grupo.titulo}</Text>
            {grupo.avisos.map(aviso => {
              const id = `aviso-${aviso.tipo}`;
              const ligado = avisoLigado(settings.avisos, aviso.tipo);
              const linha = (
                <div key={aviso.tipo} className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center">
                    <label htmlFor={id}>
                      <Text variant="bodyStrong" as="span">{aviso.titulo}</Text>
                    </label>
                    <Ajuda rotulo={`Sobre ${aviso.titulo}`} texto={aviso.descricao} />
                  </span>
                  <ToggleSwitch
                    id={id}
                    label={aviso.titulo}
                    enabled={ligado}
                    onToggle={() => gravar(atualizarAviso(settings, aviso.tipo, !ligado))}
                  />
                </div>
              );
              if (aviso.tipo !== 'saturacao-quadro' || !ligado) return linha;
              // Teto do quadro sob demanda: 1 ou 2 vezes o mesmo quadro na semana.
              return (
                <div key={aviso.tipo} className="stack-sm">
                  {linha}
                  <div className="flex flex-wrap items-center gap-2">
                    <Text variant="meta" as="span" id="aviso-saturacao-limite-rotulo">Limite do mesmo quadro</Text>
                    <SelectField
                      id="aviso-saturacao-limite"
                      ariaLabel="Limite do mesmo quadro por semana"
                      describedBy="aviso-saturacao-limite-rotulo"
                      value={String(limiteSaturacaoQuadro(settings.avisos))}
                      onChange={valor => gravar(atualizarLimiteSaturacao(settings, valor === '1' ? 1 : 2))}
                      options={[
                        { value: '1', label: '1 por semana' },
                        { value: '2', label: '2 por semana' },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </CardConfiguracao>
  );
}

/** Avisos (na Rotina de criação): quais avisos aparecem, variedade e atalhos para o que gera aviso. */
export function AvisosEditorialPanel({ onAbrirCapacidade }: AvisosEditorialPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="stack-lg">
      <AvisosLigadosCard />

      <AjustesEditorialPanel secao="avisos" />

      <div className="grid gap-4 lg:grid-cols-2">
        <CardConfiguracao
          icone={<CalendarDays className="h-5 w-5" />}
          titulo="Dias de gravação"
          descricao="Em quais dias você costuma gravar? A antecedência do vídeo por gravar fica no mesmo bloco."
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
