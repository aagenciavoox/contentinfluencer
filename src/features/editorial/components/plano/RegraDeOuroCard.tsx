import { Target } from 'lucide-react';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { limiteRegraDeOuro } from '../../lib/avisosEditoriais';
import { atualizarLimiteRegraDeOuro } from '../../lib/editorialSettings';
import { LIMITE_REGRA_DE_OURO_MAXIMO, normalizarLimiteDaRegraDeOuro, tetoDaRegraDeOuro } from '../../lib/regraDeOuro';
import { CardConfiguracao } from './campos';
import { useEditorialPlano } from './useEditorialPlano';

const OPCOES = Array.from({ length: LIMITE_REGRA_DE_OURO_MAXIMO }, (_, indice) => {
  const valor = indice + 1;
  return { value: String(valor), label: `${valor} por semana` };
});

/**
 * Regra de Ouro (na Rotina de criação): quantos episódios da mesma série cabem na semana.
 * As janelas maiores seguem a mesma proporção (14 dias = 2×, mês = 4×, bimestre = 8×, trimestre = 13×, semestre = 26×).
 * Grava no jsonb dos avisos de `editorial_conta`, como o limite do mesmo quadro.
 */
export function RegraDeOuroCard() {
  const { settings, gravar } = useEditorialPlano();
  const limite = limiteRegraDeOuro(settings.avisos);
  const janelas = [
    `${tetoDaRegraDeOuro('quinzena', limite)} a cada 14 dias`,
    `${tetoDaRegraDeOuro('mes', limite)} por mês`,
    `${tetoDaRegraDeOuro('bimestre', limite)} por bimestre`,
    `${tetoDaRegraDeOuro('trimestre', limite)} por trimestre`,
    `${tetoDaRegraDeOuro('semestre', limite)} por semestre`,
  ].join(', ');

  return (
    <CardConfiguracao
      icone={<Target className="h-5 w-5" />}
      titulo="Regra de Ouro"
      descricao="Até quantos episódios da mesma série cabem numa semana. A meta de cada série e de cada wave não pode passar disso: se passar, o formulário da meta avisa e não salva. Janelas maiores seguem a mesma proporção. A Saúde e a Continuidade contam no máximo esse número. Quadro e família não têm meta."
    >
      <div className="stack-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="label" as="span" id="regra-de-ouro-limite-rotulo">Limite por série</Text>
          <SelectField
            id="regra-de-ouro-limite"
            ariaLabel="Limite por série: episódios por semana da mesma série"
            describedBy="regra-de-ouro-limite-rotulo regra-de-ouro-janelas"
            value={String(limite)}
            onChange={valor => {
              const novo = normalizarLimiteDaRegraDeOuro(Number.parseInt(valor, 10));
              if (novo != null && novo !== limite) gravar(atualizarLimiteRegraDeOuro(settings, novo));
            }}
            options={OPCOES}
          />
        </div>
        <Text variant="meta" as="p" id="regra-de-ouro-janelas">
          Nas metas com janela maior: até {janelas}.
        </Text>
      </div>
    </CardConfiguracao>
  );
}
