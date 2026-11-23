import { type ComponentProps, type Dispatch, type SetStateAction } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Ajuda } from '../../../components/ui/Ajuda';
import { AppButton } from '../../../components/ui/AppButton';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import type { Platform } from '../../../lib/database';
import { generateUUID } from '../../../utils/uuid';
import { rotuloConta } from '../../contas/lib/contas';
import {
  novoAcompanhamento,
  type LinhaDeEscopo,
} from '../lib/acompanhamento';
import type { AcompanhamentoSerie } from '../lib/continuidadeEscopo';
import { idDaJanela, idDoEscopo, type ErroDaMeta } from '../lib/errosDaMeta';
import { unidadeDaMeta } from '../lib/metaDaOnda';
import { FORMATOS_DA_REDE, rotuloDoFormato } from '../lib/publicacoes';
import { inteiroNaoNegativo } from '../../../lib/inteiro';
import { CamposDaMeta, UNIDADES } from './plano/CamposDaMeta';
import { CAMPO } from './plano/campos';

const FORMATOS = [...new Set(Object.values(FORMATOS_DA_REDE).flatMap(lista => [...(lista ?? [])]))];

function numeroDeDias(texto: string): number | null {
  const n = inteiroNaoNegativo(texto);
  return n != null && n > 0 ? n : null;
}

export function rotuloDoEscopo(
  linha: Pick<AcompanhamentoSerie, 'escopo' | 'platformId' | 'formato'>,
  contas: readonly Platform[],
): string {
  const conta = contas.find(item => item.id === linha.platformId);
  const nomeConta = conta ? rotuloConta(conta) : null;
  if (linha.escopo === 'conta') return nomeConta ?? 'Conta removida';
  const formato = linha.formato ? rotuloDoFormato(linha.formato, conta?.rede ?? null) : 'Formato';
  return nomeConta ? `${formato} em ${nomeConta}` : `${formato} em todas as contas`;
}

function TextoErro({ id, children }: { id: string; children: string }) {
  return <Text id={id} variant="meta" as="span" className="texto-erro">{children}</Text>;
}

/** Janela e avisos de um acompanhamento. O modal do Plano usa isto no geral e na wave. */
export function RegrasDoAcompanhamento({
  item,
  onChange,
  idPrefix,
  erroTermino,
}: {
  item: Pick<AcompanhamentoSerie, 'inicio' | 'termino' | 'distanciaMaxDias' | 'evitarDiasSeguidos'>;
  onChange: (patch: Partial<AcompanhamentoSerie>) => void;
  idPrefix: string;
  erroTermino?: string;
}) {
  const terminoId = idDaJanela(idPrefix, 'termino');
  return (
    <>
      <div className="grid-form">
        <label className="flex flex-col gap-1" htmlFor={idDaJanela(idPrefix, 'inicio')}>
          <Text variant="meta" as="span">Início do acompanhamento (opcional)</Text>
          <input id={idDaJanela(idPrefix, 'inicio')} type="date" className={CAMPO} value={item.inicio ?? ''} onChange={event => onChange({ inicio: event.target.value || null })} />
        </label>
        <label className="flex flex-col gap-1" htmlFor={terminoId}>
          <Text variant="meta" as="span">Término (opcional)</Text>
          <input
            id={terminoId}
            type="date"
            aria-invalid={erroTermino ? true : undefined}
            aria-describedby={erroTermino ? `${terminoId}-erro` : undefined}
            className={CAMPO}
            style={erroTermino ? { borderColor: 'var(--danger)' } : undefined}
            value={item.termino ?? ''}
            onChange={event => onChange({ termino: event.target.value || null })}
          />
          {erroTermino ? <TextoErro id={`${terminoId}-erro`}>{erroTermino}</TextoErro> : null}
        </label>
        <label className="flex flex-col gap-1">
          <Text variant="meta" as="span">Distância máxima sem episódio (dias)</Text>
          <input
            type="text"
            inputMode="numeric"
            className={CAMPO}
            value={item.distanciaMaxDias ?? ''}
            onChange={event => onChange({ distanciaMaxDias: numeroDeDias(event.target.value) })}
          />
        </label>
      </div>
      <label className="flex w-fit items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={item.evitarDiasSeguidos}
          onChange={event => onChange({ evitarDiasSeguidos: event.target.checked })}
          className="h-4 w-4 accent-[var(--brand-accent)]"
        />
        <Text variant="body" as="span">Avisar episódios em dias seguidos</Text>
      </label>
    </>
  );
}

/**
 * Quantidade, período e início da meta.
 * O modal do Plano e o ritmo da temporada em Editar série usam os mesmos campos.
 */
export function CamposDoRitmo(props: ComponentProps<typeof CamposDaMeta>) {
  return <CamposDaMeta {...props} />;
}

/**
 * Regras por conta e por formato. Meta vazia neste escopo usa a meta geral.
 * O Plano e o Editar série compartilham este editor.
 */
export function RegrasPorContaEFormato({
  serieId,
  linhas,
  contas,
  erros,
  onChange,
}: {
  serieId: string;
  linhas: readonly LinhaDeEscopo[];
  contas: readonly Platform[];
  erros: readonly ErroDaMeta[];
  onChange: Dispatch<SetStateAction<LinhaDeEscopo[]>>;
}) {
  const mensagem = (id: string) => erros.find(item => item.id === id)?.mensagem;
  const mudar = (id: string, patch: Partial<LinhaDeEscopo>) => {
    onChange(prev => prev.map(linha => (linha.id === id ? { ...linha, ...patch } : linha)));
  };
  const adicionar = (escopo: 'conta' | 'formato') => {
    const criada = novoAcompanhamento(
      serieId,
      escopo,
      escopo === 'conta' ? contas[0]?.id ?? null : null,
      escopo === 'formato' ? FORMATOS[0] ?? 'reels' : null,
      generateUUID(),
    );
    onChange(prev => [...prev, { ...criada, metaVezes: '', metaUnidade: 'semana', metaAPartirDe: '' }]);
  };
  const opcoesConta = contas.map(conta => ({ value: conta.id, label: rotuloConta(conta) }));

  return (
    <div className="stack-sm border-t border-[var(--border-subtle)] pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center">
          <Text variant="bodyStrong" as="span">Por conta ou formato</Text>
          <Ajuda
            rotulo="Sobre meta por conta ou formato"
            texto="Cada escopo é conferido à parte. Sem meta própria, usa a meta geral."
          />
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} disabled={contas.length === 0} onClick={() => adicionar('conta')}>Por conta</AppButton>
          <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => adicionar('formato')}>Por formato</AppButton>
        </div>
      </div>
      {linhas.length === 0 ? <Text variant="meta" as="p">Nenhum acompanhamento por conta ou formato.</Text> : null}
      {linhas.map(linha => (
        <div key={linha.id} className="stack-xs border-t border-[var(--border-subtle)] pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text variant="bodyStrong" as="span">{rotuloDoEscopo(linha, contas)}</Text>
            <AppButton variant="ghost" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(prev => prev.filter(item => item.id !== linha.id))}>
              Remover
            </AppButton>
          </div>
          <div className="grid-form">
            {linha.escopo === 'formato' ? (
              <label className="flex flex-col gap-1" htmlFor={idDoEscopo(linha.id, 'formato')}>
                <Text variant="meta" as="span">Formato</Text>
                <SelectField
                  id={idDoEscopo(linha.id, 'formato')}
                  block
                  ariaLabel="Formato"
                  describedBy={mensagem(idDoEscopo(linha.id, 'formato')) ? `${idDoEscopo(linha.id, 'formato')}-erro` : undefined}
                  className={mensagem(idDoEscopo(linha.id, 'formato')) ? 'border-[var(--danger)]' : undefined}
                  value={linha.formato ?? ''}
                  onChange={formato => mudar(linha.id, { formato })}
                  options={FORMATOS.map(formato => ({ value: formato, label: rotuloDoFormato(formato) }))}
                />
                {mensagem(idDoEscopo(linha.id, 'formato')) ? <TextoErro id={`${idDoEscopo(linha.id, 'formato')}-erro`}>{mensagem(idDoEscopo(linha.id, 'formato'))!}</TextoErro> : null}
              </label>
            ) : null}
            <label className="flex flex-col gap-1" htmlFor={idDoEscopo(linha.id, 'conta')}>
              <Text variant="meta" as="span">
                Conta
                {linha.escopo === 'conta' ? <span className="text-[var(--brand-accent-text)]"> *</span> : null}
              </Text>
              <SelectField
                id={idDoEscopo(linha.id, 'conta')}
                block
                ariaLabel="Conta"
                describedBy={mensagem(idDoEscopo(linha.id, 'conta')) ? `${idDoEscopo(linha.id, 'conta')}-erro` : undefined}
                className={mensagem(idDoEscopo(linha.id, 'conta')) ? 'border-[var(--danger)]' : undefined}
                value={linha.platformId ?? ''}
                onChange={platformId => mudar(linha.id, { platformId: platformId || null })}
                options={linha.escopo === 'formato' ? [{ value: '', label: 'Todas as contas' }, ...opcoesConta] : opcoesConta}
              />
              {mensagem(idDoEscopo(linha.id, 'conta')) ? <TextoErro id={`${idDoEscopo(linha.id, 'conta')}-erro`}>{mensagem(idDoEscopo(linha.id, 'conta'))!}</TextoErro> : null}
            </label>
          </div>
          <RegrasDoAcompanhamento
            idPrefix={`escopo-${linha.id}`}
            erroTermino={mensagem(idDoEscopo(linha.id, 'termino'))}
            item={linha}
            onChange={patch => mudar(linha.id, patch)}
          />
          <div className="grid-form">
            <label className="flex flex-col gap-1" htmlFor={idDoEscopo(linha.id, 'meta-vezes')}>
              <Text variant="meta" as="span">Meta neste escopo (vazio = meta geral)</Text>
              <input
                id={idDoEscopo(linha.id, 'meta-vezes')}
                type="text"
                inputMode="numeric"
                aria-label="Meta neste escopo"
                aria-invalid={mensagem(idDoEscopo(linha.id, 'meta-vezes')) ? true : undefined}
                aria-describedby={mensagem(idDoEscopo(linha.id, 'meta-vezes')) ? `${idDoEscopo(linha.id, 'meta-vezes')}-erro` : undefined}
                className={CAMPO}
                style={mensagem(idDoEscopo(linha.id, 'meta-vezes')) ? { borderColor: 'var(--danger)' } : undefined}
                value={linha.metaVezes}
                onChange={event => mudar(linha.id, { metaVezes: event.target.value.slice(0, 4) })}
              />
              {mensagem(idDoEscopo(linha.id, 'meta-vezes')) ? <TextoErro id={`${idDoEscopo(linha.id, 'meta-vezes')}-erro`}>{mensagem(idDoEscopo(linha.id, 'meta-vezes'))!}</TextoErro> : null}
            </label>
            <div className="flex flex-col gap-1">
              <Text variant="meta" as="span" aria-hidden>Período</Text>
              <SelectField
                block
                ariaLabel="Período da meta"
                value={linha.metaUnidade}
                onChange={valor => mudar(linha.id, { metaUnidade: unidadeDaMeta(valor) })}
                options={UNIDADES}
              />
            </div>
            <label className="flex flex-col gap-1" htmlFor={idDoEscopo(linha.id, 'meta-inicio')}>
              <Text variant="meta" as="span">
                Meta a partir de
              </Text>
              <input
                id={idDoEscopo(linha.id, 'meta-inicio')}
                type="date"
                aria-label="Meta a partir de"
                aria-invalid={mensagem(idDoEscopo(linha.id, 'meta-inicio')) ? true : undefined}
                aria-describedby={mensagem(idDoEscopo(linha.id, 'meta-inicio')) ? `${idDoEscopo(linha.id, 'meta-inicio')}-erro` : undefined}
                className={CAMPO}
                style={mensagem(idDoEscopo(linha.id, 'meta-inicio')) ? { borderColor: 'var(--danger)' } : undefined}
                value={linha.metaAPartirDe}
                onChange={event => mudar(linha.id, { metaAPartirDe: event.target.value })}
              />
              {mensagem(idDoEscopo(linha.id, 'meta-inicio')) ? <TextoErro id={`${idDoEscopo(linha.id, 'meta-inicio')}-erro`}>{mensagem(idDoEscopo(linha.id, 'meta-inicio'))!}</TextoErro> : null}
            </label>
          </div>
          <label className="flex w-fit items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={linha.ativo} onChange={event => mudar(linha.id, { ativo: event.target.checked })} className="h-4 w-4 accent-[var(--brand-accent)]" />
            <Text variant="body" as="span">Acompanhando</Text>
          </label>
        </div>
      ))}
    </div>
  );
}
