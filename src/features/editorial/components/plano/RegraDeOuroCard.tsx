import { useState } from 'react';
import { AppButton } from '../../../../components/ui/AppButton';
import { LinhaDeLeitura } from '../../../../components/ui/LinhaDeLeitura';
import { SelectField } from '../../../../components/ui/SelectField';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { ANCORA_REGRA_DE_OURO } from '../../lib/abasEditorial';
import { limiteRegraDeOuro } from '../../lib/avisosEditoriais';
import { atualizarLimiteRegraDeOuro } from '../../lib/editorialSettings';
import { LIMITE_REGRA_DE_OURO_MAXIMO, normalizarLimiteDaRegraDeOuro, tetoDaRegraDeOuro } from '../../lib/regraDeOuro';
import { EditorialDrawer } from './EditorialDrawer';
import { useEditorialPlano } from './useEditorialPlano';

const OPCOES = Array.from({ length: LIMITE_REGRA_DE_OURO_MAXIMO }, (_, indice) => {
  const valor = indice + 1;
  return { value: String(valor), label: `${valor} por semana` };
});

/**
 * Limite por série (Regra de Ouro) em cartão compacto de leitura; seletor fica no drawer lateral.
 */
export function RegraDeOuroCard({ embutido: _embutido = false }: { embutido?: boolean } = {}) {
  const { settings, gravar } = useEditorialPlano();
  const limite = limiteRegraDeOuro(settings.avisos);
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(String(limite));

  const limiteRascunho = normalizarLimiteDaRegraDeOuro(Number.parseInt(rascunho, 10)) ?? limite;
  const dirty = aberto && limiteRascunho !== limite;

  const abrir = () => {
    setRascunho(String(limite));
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setRascunho(String(limite));
  };

  const salvar = () => {
    if (limiteRascunho !== limite) {
      gravar(atualizarLimiteRegraDeOuro(settings, limiteRascunho));
    }
    setAberto(false);
  };

  return (
    <div id={ANCORA_REGRA_DE_OURO} className="scroll-mt-28 h-full">
      <Surface padding="lg" className="flex h-full flex-col justify-between gap-4">
        <div className="stack-xs">
          <Text variant="itemTitle" as="h3">Limite por série</Text>
          <Text variant="meta" as="p" className="text-[var(--text-secondary)] tabular-nums">
            {limite === 1 ? '1 publicação por semana' : `${limite} publicações por semana`}
          </Text>
        </div>

        <div className="flex justify-end">
          <AppButton variant="secondary" size="sm" onClick={abrir}>
            Editar
          </AppButton>
        </div>
      </Surface>

      <EditorialDrawer
        open={aberto}
        title="Editar limite por série"
        subtitle="Regra de Ouro: máximo de episódios da mesma série por semana."
        escopoConta="Geral"
        secao="Regras e avisos"
        dirty={dirty}
        onClose={fechar}
        onSave={salvar}
        saveLabel="Salvar limite"
      >
        <div className="stack-lg">
          <div className="stack-xs">
            <label htmlFor="regra-de-ouro-limite">
              <Text variant="bodyStrong" as="span">Limite por série</Text>
            </label>
            <SelectField
              id="regra-de-ouro-limite"
              ariaLabel="Limite por série: episódios por semana da mesma série"
              describedBy="regra-de-ouro-janelas-drawer"
              block
              value={rascunho}
              onChange={setRascunho}
              options={OPCOES}
            />
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              A meta de cada série e de cada wave não pode passar deste valor. Quadro e família não têm meta.
            </Text>
          </div>

          <div
            id="regra-de-ouro-janelas-drawer"
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3 divide-y divide-[var(--border-subtle)]"
          >
            <LinhaDeLeitura rotulo="14 dias" valor={`Até ${tetoDaRegraDeOuro('quinzena', limiteRascunho)}`} />
            <LinhaDeLeitura rotulo="Mês" valor={`Até ${tetoDaRegraDeOuro('mes', limiteRascunho)}`} />
            <LinhaDeLeitura rotulo="Bimestre" valor={`Até ${tetoDaRegraDeOuro('bimestre', limiteRascunho)}`} />
            <LinhaDeLeitura rotulo="Trimestre" valor={`Até ${tetoDaRegraDeOuro('trimestre', limiteRascunho)}`} />
            <LinhaDeLeitura rotulo="Semestre" valor={`Até ${tetoDaRegraDeOuro('semestre', limiteRascunho)}`} />
          </div>
        </div>
      </EditorialDrawer>
    </div>
  );
}
