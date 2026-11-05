import { useState } from 'react';
import { format } from 'date-fns';
import { Layers, Pencil, Undo2 } from 'lucide-react';
import { SidePanel } from '../../../../components/layout/SidePanel';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { ChoiceChips } from '../../../../components/ui/ChoiceChips';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { Text } from '../../../../components/ui/Text';
import type { Platform } from '../../../../lib/database';
import { iconeDaConta, redeDaConta, rotuloConta } from '../../../contas/lib/contas';
import {
  agendarMetaDaConta,
  desfazerMudancaDaConta,
  metaDaContaHoje,
  proximaMudancaDaConta,
  type MetaDaContaVigencia,
} from '../../lib/metasPorConta';
import type { ProporcaoFuncoes } from '../../lib/proporcaoObjetivos';
import { somaDaProporcao } from '../../lib/proporcaoObjetivos';
import { FORMATOS_DA_REDE, rotuloDoFormato } from '../../lib/publicacoes';
import { domingosParaVigencia } from '../../lib/vigencias';
import { CampoStepper, CardConfiguracao, inteiroOuNull } from './campos';
import { ProporcaoObjetivosEditor, proporcaoEmTexto, ResumoDaProporcao } from './ProporcaoObjetivosEditor';
import { useEditorialPlano } from './useEditorialPlano';
import { diaMes, ValeAPartirDe } from './ValeAPartirDe';

function textoNumero(valor: number | null | undefined): string {
  return valor == null ? '' : String(valor);
}

function parcelasEmTexto(linha: MetaDaContaVigencia | null, rede: ReturnType<typeof redeDaConta>): string {
  const parcelas = Object.entries(linha?.parcelasFormato ?? {}).filter(([, valor]) => valor > 0);
  if (parcelas.length === 0) return '';
  const texto = parcelas.map(([formato, valor]) => `${rotuloDoFormato(formato, rede)} ${valor}`).join(' · ');
  const soma = parcelas.reduce((total, [, valor]) => total + valor, 0);
  const sobra = (linha?.limiteSemanal ?? 0) - soma;
  return sobra > 0 ? `${texto} · ${sobra} sem formato definido` : texto;
}

function ritmoEmTexto(linha: MetaDaContaVigencia | null): string {
  return linha?.limiteSemanal == null ? 'Sem meta' : `${linha.limiteSemanal} por semana`;
}

/** Linha de uma conta no cartão: ritmo de hoje, proporção, formatos e a mudança agendada. */
function ResumoDaConta({
  conta,
  linhas,
  hoje,
  onEditar,
  onDesfazer,
}: {
  conta: Platform;
  linhas: readonly MetaDaContaVigencia[];
  hoje: string;
  onEditar: () => void;
  onDesfazer: (vigenteDesde: string) => void;
}) {
  const rede = redeDaConta(conta);
  const atual = metaDaContaHoje(linhas, conta.id, hoje);
  const proxima = proximaMudancaDaConta(linhas, conta.id, hoje);
  const formatos = parcelasEmTexto(atual, rede);
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <PlatformIcon platform={iconeDaConta(conta)} colored className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 stack-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="bodyStrong" as="span">{rotuloConta(conta)}</Text>
            {atual?.limiteSemanal == null ? <Badge variant="warning">Sem meta</Badge> : null}
          </div>
          {atual?.limiteSemanal != null ? (
            <Text variant="secondary">
              {ritmoEmTexto(atual)} · desde {diaMes(atual.vigenteDesde)}
            </Text>
          ) : null}
          {atual?.limiteSemanal != null ? (
            <Text variant="meta" className="text-[var(--text-secondary)]">
              {atual.proporcaoFuncoes ? `Proporção própria: ${proporcaoEmTexto(atual.proporcaoFuncoes)}` : 'Usa a proporção geral'}
            </Text>
          ) : null}
          {formatos ? (
            <Text variant="meta" className="text-[var(--text-secondary)]">{formatos}</Text>
          ) : null}
          {proxima ? (
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="meta" className="text-[var(--text-primary)]">
                A partir de dom, {diaMes(proxima.vigenteDesde)}: {ritmoEmTexto(proxima).toLowerCase()}
                {JSON.stringify(proxima.proporcaoFuncoes) !== JSON.stringify(atual?.proporcaoFuncoes ?? null) && proxima.limiteSemanal != null
                  ? (proxima.proporcaoFuncoes ? ', proporção própria' : ', proporção geral')
                  : ''}
              </Text>
              <AppButton variant="ghost" size="sm" leftIcon={<Undo2 className="h-4 w-4" />} onClick={() => onDesfazer(proxima.vigenteDesde)}>
                Desfazer
              </AppButton>
            </div>
          ) : null}
        </div>
      </div>
      <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={onEditar} className="self-start shrink-0">
        {atual ? 'Editar' : 'Definir meta'}
      </AppButton>
    </li>
  );
}

type ModoProporcao = 'geral' | 'propria';

/** Painel de uma conta: total por semana, proporção e formatos, a partir de uma segunda escolhida. */
function EditorDaConta({
  conta,
  linhas,
  proporcaoGeral,
  hoje,
  onSalvar,
  onCancelar,
}: {
  conta: Platform;
  linhas: readonly MetaDaContaVigencia[];
  proporcaoGeral: ProporcaoFuncoes | null;
  hoje: string;
  onSalvar: (linhas: MetaDaContaVigencia[]) => void;
  onCancelar: () => void;
}) {
  const rede = redeDaConta(conta);
  const atual = metaDaContaHoje(linhas, conta.id, hoje);
  const formatos = [...new Set([...(rede ? FORMATOS_DA_REDE[rede] ?? [] : []), ...Object.keys(atual?.parcelasFormato ?? {})])];
  const [limite, setLimite] = useState(textoNumero(atual?.limiteSemanal));
  const [parcelas, setParcelas] = useState<Record<string, string>>(() => (
    Object.fromEntries(formatos.map(formato => [formato, textoNumero(atual?.parcelasFormato?.[formato])]))
  ));
  const [modo, setModo] = useState<ModoProporcao>(atual?.proporcaoFuncoes ? 'propria' : 'geral');
  const [proporcao, setProporcao] = useState<ProporcaoFuncoes | null>(atual?.proporcaoFuncoes ?? null);
  const [editandoProporcao, setEditandoProporcao] = useState(false);
  const [desde, setDesde] = useState(domingosParaVigencia(hoje).estaSemana);

  const total = inteiroOuNull(limite);
  const parcelasNumero = Object.fromEntries(
    Object.entries(parcelas).flatMap(([formato, valor]) => {
      const numero = inteiroOuNull(valor);
      return numero ? [[formato, numero]] : [];
    }),
  ) as Record<string, number>;
  const somaParcelas = Object.values(parcelasNumero).reduce((soma, valor) => soma + valor, 0);
  const erroParcelas = somaParcelas > 0 && total == null
    ? 'Defina o total da conta antes de dividir por formato.'
    : total != null && somaParcelas > total
      ? `Os formatos somam ${somaParcelas} e passam do total da conta (${total}).`
      : undefined;
  const faltaProporcao = modo === 'propria' && total != null && !proporcao;
  const proporcaoNaoFecha = modo === 'propria' && proporcao != null && somaDaProporcao(proporcao) !== 100;
  const bloqueio = erroParcelas
    ?? (faltaProporcao ? 'Defina a proporção da conta ou use a geral.' : undefined)
    ?? (proporcaoNaoFecha ? 'A proporção da conta precisa fechar em 100%.' : undefined);

  const valores = {
    limiteSemanal: total,
    proporcaoFuncoes: modo === 'propria' && total != null ? proporcao : null,
    parcelasFormato: total != null && somaParcelas > 0 ? parcelasNumero : null,
  };
  const igualHoje = atual
    ? atual.limiteSemanal === valores.limiteSemanal
      && JSON.stringify(atual.proporcaoFuncoes) === JSON.stringify(valores.proporcaoFuncoes)
      && JSON.stringify(atual.parcelasFormato) === JSON.stringify(valores.parcelasFormato)
    : valores.limiteSemanal == null;

  const salvar = () => {
    if (bloqueio) return;
    // Nada mudou para esta semana: não cria linha repetida.
    if (igualHoje && desde === domingosParaVigencia(hoje).estaSemana) {
      onCancelar();
      return;
    }
    onSalvar(agendarMetaDaConta(linhas, conta.id, desde, valores, hoje));
  };

  return (
    <div className="stack-lg">
      <CampoStepper
        id={`conta-${conta.id}-limite`}
        label="Publicações por semana"
        unidade="nesta conta"
        hint="Cada publicação nesta conta conta uma vez, inclusive repostagens. Vazio: a conta fica sem meta e a soma das contas fica incompleta. Nada é copiado do ritmo geral."
        value={limite}
        onChange={setLimite}
      />

      {formatos.length > 0 ? (
        <div className="stack-sm">
          <Text variant="bodyStrong" as="span">Por formato</Text>
          <Text variant="secondary">Parte do total da conta, não soma por cima. O que sobrar fica sem formato definido.</Text>
          <div className="grid gap-4 sm:grid-cols-2">
            {formatos.map(formato => (
              <CampoStepper
                key={formato}
                id={`conta-${conta.id}-formato-${formato}`}
                label={rotuloDoFormato(formato, rede)}
                unidade="por semana"
                value={parcelas[formato] ?? ''}
                onChange={valor => setParcelas(atuais => ({ ...atuais, [formato]: valor }))}
              />
            ))}
          </div>
          {erroParcelas ? <Text variant="meta" className="text-[var(--accent-red)]">{erroParcelas}</Text> : null}
        </div>
      ) : null}

      <div className="stack-sm">
        <Text variant="bodyStrong" as="span">Proporção por objetivo</Text>
        <ChoiceChips<ModoProporcao>
          label="Proporção da conta"
          value={modo}
          onChange={escolha => {
            if (!escolha) return;
            setModo(escolha);
            if (escolha === 'propria' && !proporcao) setEditandoProporcao(true);
          }}
          options={[
            { value: 'geral', label: 'Usar a geral', description: proporcaoGeral ? proporcaoEmTexto(proporcaoGeral) : 'ainda não definida' },
            { value: 'propria', label: 'Própria desta conta' },
          ]}
        />
        {modo === 'propria' ? (
          editandoProporcao ? (
            <ProporcaoObjetivosEditor
              idBase={`conta-${conta.id}-proporcao`}
              valor={proporcao ?? proporcaoGeral}
              rotuloSalvar="Usar esta proporção"
              onCancelar={() => {
                setEditandoProporcao(false);
                if (!proporcao) setModo('geral');
              }}
              onSalvar={nova => {
                setProporcao(nova);
                setEditandoProporcao(false);
                if (!nova) setModo('geral');
              }}
            />
          ) : (
            <div className="stack-sm">
              <ResumoDaProporcao proporcao={proporcao} />
              <AppButton variant="secondary" size="sm" className="self-start" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditandoProporcao(true)}>
                Editar proporção da conta
              </AppButton>
            </div>
          )
        ) : null}
      </div>

      <ValeAPartirDe id={`conta-${conta.id}-desde`} valor={desde} onChange={setDesde} hoje={hoje} />

      <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
        <AppButton variant="secondary" size="sm" onClick={onCancelar}>Cancelar</AppButton>
        <AppButton
          variant="primary"
          size="sm"
          onClick={salvar}
          disabled={Boolean(bloqueio) || editandoProporcao}
          disabledReason={bloqueio ?? (editandoProporcao ? 'Termine a proporção antes de salvar.' : undefined)}
        >
          Salvar
        </AppButton>
      </div>
    </div>
  );
}

/**
 * Ritmo de publicações de cada conta (Ritmo & Regras). Medida separada da meta de conteúdos únicos:
 * um roteiro em três contas é um conteúdo e três publicações. Conta sem meta não vira zero.
 */
export function ContasEFormatosCard() {
  const { state, settings, gravar } = useEditorialPlano();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const linhas = settings.metasDasContas ?? [];
  const ativas = state.platforms.filter(platform => platform.ativo);
  const editando = ativas.find(conta => conta.id === editandoId) ?? null;

  const atuais = ativas.map(conta => ({ conta, linha: metaDaContaHoje(linhas, conta.id, hoje) }));
  const comMeta = atuais.filter(item => item.linha?.limiteSemanal != null);
  const semMeta = atuais.filter(item => item.linha?.limiteSemanal == null);
  const soma = comMeta.reduce((total, item) => total + (item.linha?.limiteSemanal ?? 0), 0);

  const gravarLinhas = (novas: MetaDaContaVigencia[]) => gravar({ ...settings, metasDasContas: novas });

  return (
    <CardConfiguracao
      icone={<Layers className="h-5 w-5" />}
      titulo="Contas e formatos"
      descricao="Quantas publicações cada conta recebe por semana. Um roteiro em três contas é um conteúdo e três publicações; a meta de conteúdos únicos continua no ritmo de criação."
    >
      <div className="stack-md">
        {comMeta.length === 0 ? (
          <Text variant="secondary">
            Nenhuma conta tem meta de publicações. Sem meta, a conta não entra na soma.
          </Text>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="bodyStrong" as="span">
              Soma das contas: {soma} publicações por semana
            </Text>
            {semMeta.length > 0 ? (
              <Badge variant="warning">
                Incompleta: {semMeta.length === 1 ? '1 conta sem meta' : `${semMeta.length} contas sem meta`}
              </Badge>
            ) : null}
          </div>
        )}

        {ativas.length === 0 ? (
          <Text variant="secondary">Nenhuma conta ativa. Ative as contas em Contas e horários.</Text>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {ativas.map(conta => (
              <ResumoDaConta
                key={conta.id}
                conta={conta}
                linhas={linhas}
                hoje={hoje}
                onEditar={() => setEditandoId(conta.id)}
                onDesfazer={vigenteDesde => gravarLinhas(desfazerMudancaDaConta(linhas, conta.id, vigenteDesde, hoje))}
              />
            ))}
          </ul>
        )}
      </div>

      <SidePanel
        open={editando != null}
        onClose={() => setEditandoId(null)}
        title={editando ? rotuloConta(editando) : 'Conta'}
        subtitle="Meta de publicações desta conta. Mudanças valem a partir de uma segunda; as semanas passadas mantêm o que tinham."
        widthClassName="max-w-2xl"
      >
        {editando ? (
          <EditorDaConta
            key={editando.id}
            conta={editando}
            linhas={linhas}
            proporcaoGeral={settings.proporcaoFuncoes}
            hoje={hoje}
            onCancelar={() => setEditandoId(null)}
            onSalvar={novas => {
              gravarLinhas(novas);
              setEditandoId(null);
            }}
          />
        ) : null}
      </SidePanel>
    </CardConfiguracao>
  );
}
