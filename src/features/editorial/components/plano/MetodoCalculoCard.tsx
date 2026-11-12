import { Calculator } from 'lucide-react';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { lerMetodoCalculo, type MetodoCalculo } from '../../lib/editorialSettings';
import { metodoDoPeriodo } from '../../lib/gradeCounts';
import { CardConfiguracao } from './campos';
import type { PeriodoSelecionado } from './PeriodoEditorialControl';
import { useEditorialPlano } from './useEditorialPlano';

const OPCOES_METODO: { value: MetodoCalculo; label: string }[] = [
  { value: 'conteudos-v1', label: 'Por roteiro' },
  { value: 'publicacoes-v2', label: 'Por publicação' },
];

/** Unidade da meta geral e do teto (roteiro ou publicação) do período aberto no Plano do período. */
export function MetodoCalculoCard({ periodo }: { periodo: PeriodoSelecionado }) {
  const { settings, salvarDecisao } = useEditorialPlano();
  // Sem escolha no intervalo exato, vale a do período salvo que o contém (a semana segue o mês).
  const metodo = metodoDoPeriodo(settings.periodos, periodo.inicio, periodo.fim);

  return (
      <CardConfiguracao
        icone={<Calculator className="h-5 w-5" />}
        titulo="Como contar a meta e o teto"
        descricao="Por roteiro, o mesmo roteiro conta uma vez, mesmo se for para várias contas. Um vídeo em duas contas conta 1. Por publicação, cada saída em uma conta conta uma vez, e o repost conta de novo. O mesmo vídeo em duas contas conta 2. Metas de conta contam publicações. Continuidade conta episódios."
      >
        <div className="grid-form">
          <div className="stack-sm">
            <label htmlFor="metodo-calculo">
              <Text variant="bodyStrong" as="span">Como contar</Text>
            </label>
            <SelectField
              id="metodo-calculo"
              block
              value={metodo}
              onChange={value => salvarDecisao(periodo, { metodoCalculo: lerMetodoCalculo(value) })}
              options={OPCOES_METODO}
            />
          </div>
        </div>
      </CardConfiguracao>
  );
}
