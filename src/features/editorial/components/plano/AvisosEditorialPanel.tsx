import { Bell } from 'lucide-react';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import { SelectField } from '../../../../components/ui/SelectField';
import { ToggleSwitch } from '../../../../components/ui/ToggleSwitch';
import { avisoLigado, GRUPOS_DE_AVISOS, limiteSaturacaoQuadro } from '../../lib/avisosEditoriais';
import { atualizarAviso, atualizarLimiteSaturacao } from '../../lib/editorialSettings';
import { CardConfiguracao } from './campos';
import { useEditorialPlano } from './useEditorialPlano';

interface AvisosEditorialPanelProps {
  onAbrirCapacidade?: () => void;
}

/** Liga e desliga cada tipo de aviso. Todos começam ligados. */
function AvisosLigadosCard() {
  const { settings, gravar } = useEditorialPlano();
  const todosAvisos = GRUPOS_DE_AVISOS.flatMap(grupo => grupo.avisos);
  const totalAvisos = todosAvisos.length;
  const avisosAtivos = todosAvisos.filter(aviso => avisoLigado(settings.avisos, aviso.tipo)).length;

  return (
    <CardConfiguracao
      icone={<Bell className="h-5 w-5" />}
      titulo="Avisos"
      descricao="Escolha o que vale um lembrete para você. Desligar um aviso tira ele da faixa do Planejamento, da Saúde e do Plano do período. Os números continuam iguais."
      acao={(
        <Badge variant="neutral" className="tabular-nums">
          {avisosAtivos} de {totalAvisos} ativos
        </Badge>
      )}
    >
      <div className="stack-lg">
        {GRUPOS_DE_AVISOS.map(grupo => (
          <div key={grupo.id} className="stack-sm border-t border-[var(--border-subtle)] pt-4 first:border-t-0 first:pt-0">
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

/** Quais avisos aparecem. A concentração e o modo gentil ficam fora deste card. */
export function AvisosEditorialPanel({ onAbrirCapacidade: _onAbrirCapacidade }: AvisosEditorialPanelProps = {}) {
  return <AvisosLigadosCard />;
}
