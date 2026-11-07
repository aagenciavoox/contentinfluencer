import { useId } from 'react';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { OPCOES_UNIDADE, unidadeDaMeta, type UnidadeDaMeta } from '../../lib/metaDaOnda';
import { CAMPO } from './campos';

export const UNIDADES = OPCOES_UNIDADE;

function dicaDaUnidade(unidade: UnidadeDaMeta): string | null {
  if (unidade === 'quinzena') return 'Ciclos de 14 dias a partir da data de início.';
  if (unidade === 'bimestre') return 'Blocos fechados: jan–fev, mar–abr, mai–jun, jul–ago, set–out, nov–dez.';
  if (unidade === 'trimestre') return 'Blocos fechados: jan–mar, abr–jun, jul–set, out–dez.';
  if (unidade === 'semestre') return 'Blocos fechados: jan–jun e jul–dez.';
  return null;
}

function Marca({ obrigatoria }: { obrigatoria: boolean }) {
  if (!obrigatoria) return null;
  return <span className="text-[var(--brand-accent-text)]"> *</span>;
}

/** Quantidade, período e início da meta: Continuidade e chip de frequência. */
export function CamposDaMeta({
  vezes,
  unidade,
  inicio,
  onVezes,
  onUnidade,
  onInicio,
  idPrefix,
  erros,
  mostrarLegenda = false,
}: {
  vezes: string;
  unidade: UnidadeDaMeta;
  inicio: string;
  onVezes: (valor: string) => void;
  onUnidade: (valor: UnidadeDaMeta) => void;
  onInicio: (valor: string) => void;
  /** Prefixo dos ids, para o salvar focar o primeiro campo com erro. */
  idPrefix?: string;
  erros?: { quantidade?: string; periodo?: string; inicio?: string };
  /** Mostra "* Campo obrigatório" quando a data de início é exigida. */
  mostrarLegenda?: boolean;
}) {
  const gerado = useId();
  const base = idPrefix ?? gerado;
  const quantidadeId = `${base}-quantidade`;
  const periodoId = `${base}-periodo`;
  const inicioId = `${base}-inicio`;
  const inicioObrigatorio = unidade === 'quinzena' && vezes.trim() !== '';
  const dica = dicaDaUnidade(unidade);
  return (
    <div className="stack-xs">
      <div className="grid-form">
        <label className="flex flex-col gap-1" htmlFor={quantidadeId}>
          <Text variant="meta" as="span">
            Quantidade
            {vezes.trim() !== '' ? <Marca obrigatoria /> : null}
          </Text>
          <input
            id={quantidadeId}
            type="text"
            inputMode="numeric"
            aria-label="Quantidade"
            aria-invalid={erros?.quantidade ? true : undefined}
            aria-describedby={erros?.quantidade ? `${quantidadeId}-erro` : undefined}
            className={CAMPO}
            style={erros?.quantidade ? { borderColor: 'var(--danger)' } : undefined}
            value={vezes}
            onChange={event => onVezes(event.target.value.slice(0, 4))}
          />
          {erros?.quantidade ? <Text id={`${quantidadeId}-erro`} variant="meta" as="span" className="texto-erro">{erros.quantidade}</Text> : null}
        </label>
        <div className="flex flex-col gap-1">
          <label htmlFor={periodoId}>
            <Text variant="meta" as="span">
              Período
              {vezes.trim() !== '' ? <Marca obrigatoria /> : null}
            </Text>
          </label>
          <SelectField
            id={periodoId}
            block
            ariaLabel="Período"
            describedBy={erros?.periodo ? `${periodoId}-erro` : undefined}
            value={unidade}
            onChange={valor => onUnidade(unidadeDaMeta(valor))}
            options={UNIDADES}
            className={erros?.periodo ? 'border-[var(--danger)]' : undefined}
          />
          {dica ? <Text variant="meta" as="span">{dica}</Text> : null}
          {erros?.periodo ? <Text id={`${periodoId}-erro`} variant="meta" as="span" className="texto-erro">{erros.periodo}</Text> : null}
        </div>
        <label className="flex flex-col gap-1" htmlFor={inicioId}>
          <Text variant="meta" as="span">
            Data de início
            <Marca obrigatoria={inicioObrigatorio} />
            {inicioObrigatorio ? null : <span className="font-normal text-[var(--text-tertiary)]"> (opcional)</span>}
          </Text>
          <input
            id={inicioId}
            type="date"
            aria-label="Data de início"
            aria-required={inicioObrigatorio || undefined}
            aria-invalid={erros?.inicio ? true : undefined}
            aria-describedby={erros?.inicio ? `${inicioId}-erro` : undefined}
            className={CAMPO}
            style={erros?.inicio ? { borderColor: 'var(--danger)' } : undefined}
            value={inicio}
            onChange={event => onInicio(event.target.value)}
          />
          {erros?.inicio ? <Text id={`${inicioId}-erro`} variant="meta" as="span" className="texto-erro">{erros.inicio}</Text> : null}
        </label>
      </div>
      {mostrarLegenda && inicioObrigatorio ? (
        <Text variant="meta" as="p">
          <span className="text-[var(--brand-accent-text)]">*</span> Campo obrigatório
        </Text>
      ) : null}
    </div>
  );
}
