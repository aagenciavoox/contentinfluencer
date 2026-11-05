import { Calculator } from 'lucide-react';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { lerMetodoCalculo, type MetodoCalculo } from '../../lib/editorialSettings';
import { decisaoDoPeriodo } from '../../lib/periodoEditorial';
import { CardConfiguracao } from './campos';
import type { PeriodoSelecionado } from './PeriodoEditorialControl';
import { useEditorialPlano } from './useEditorialPlano';

const OPCOES_METODO: { value: MetodoCalculo; label: string }[] = [
  { value: 'conteudos-v1', label: 'Por roteiro: cada roteiro conta uma vez' },
  { value: 'publicacoes-v2', label: 'Por publicação: cada conta conta separado' },
];

/** Unidade das metas (roteiro ou publicação) do período aberto no Plano do período. */
export function MetodoCalculoCard({ periodo }: { periodo: PeriodoSelecionado }) {
  const { settings, salvarDecisao } = useEditorialPlano();
  const decisao = decisaoDoPeriodo(settings.periodos, periodo.inicio, periodo.fim);
  const metodo = lerMetodoCalculo(decisao?.metodoCalculo);

  return (
      <CardConfiguracao
        icone={<Calculator className="h-5 w-5" />}
        titulo="Como as metas são contadas"
        descricao="Vale para o período aberto no Plano do período. Períodos que já passaram continuam contados como estavam."
      >
        <div className="grid-form">
          <div className="stack-sm">
            <label htmlFor="metodo-calculo">
              <Text variant="bodyStrong" as="span">Unidade das metas</Text>
            </label>
            <SelectField
              id="metodo-calculo"
              block
              value={metodo}
              describedBy="metodo-calculo-hint"
              onChange={value => salvarDecisao(periodo, { metodoCalculo: lerMetodoCalculo(value) })}
              options={OPCOES_METODO}
            />
            <Text variant="secondary">
              <span id="metodo-calculo-hint">
                Por roteiro, um vídeo postado em duas contas conta 1. Por publicação, conta 2. A Saúde e as metas usam a mesma unidade.
              </span>
            </Text>
          </div>
        </div>
      </CardConfiguracao>
  );
}
