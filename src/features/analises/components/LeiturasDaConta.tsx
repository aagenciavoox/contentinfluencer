import { useState } from 'react';
import { AppButton } from '../../../components/ui/AppButton';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import type { ContaMetrica } from '../../../lib/database';
import { dataCurta, textoDeMetrica } from '../lib/publicacoes';
import { inteiroDoCampo, leituraMaisProxima } from '../lib/leituras';

export type CamposLeitura = {
  platformId: string;
  registradoEm: string;
  seguidores: number | null;
  alcance: number | null;
  visualizacoes: number | null;
};

function diferenca(inicio: number | null, fim: number | null): string | null {
  if (inicio == null || fim == null) return null;
  const delta = fim - inicio;
  return delta > 0 ? `+${delta}` : String(delta);
}

function Numero({ id, rotulo, valor, onChange }: { id: string; rotulo: string; valor: string; onChange: (valor: string) => void }) {
  return (
    <label htmlFor={id} className="block">
      <Text variant="label" as="span" className="mb-2 block">{rotulo}</Text>
      <input
        id={id}
        className="input"
        inputMode="numeric"
        value={valor}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function Ponto({ rotulo, data, leitura }: { rotulo: string; data: string; leitura: ContaMetrica | null }) {
  const outraData = leitura && leitura.registradoEm.slice(0, 10) !== data.slice(0, 10);
  return (
    <div className="min-w-0 stack-xs">
      <Text variant="meta" as="p">
        {rotulo} · {dataCurta(data)}
        {outraData ? ` · leitura de ${dataCurta(leitura.registradoEm)}` : ''}
      </Text>
      <Text variant="body" as="p">Seguidores {textoDeMetrica(leitura?.seguidores ?? null)}</Text>
      <Text variant="body" as="p">Alcance {textoDeMetrica(leitura?.alcance ?? null)}</Text>
      <Text variant="body" as="p">Visualizações {textoDeMetrica(leitura?.visualizacoes ?? null)}</Text>
    </div>
  );
}

export function LeiturasDaConta({
  contas,
  leituras,
  inicio,
  fim,
  formAberto,
  onFechar,
  onSave,
}: {
  contas: { id: string; rotulo: string }[];
  leituras: readonly ContaMetrica[];
  inicio: string;
  fim: string;
  formAberto: boolean;
  onFechar: () => void;
  onSave: (campos: CamposLeitura) => Promise<void>;
}) {
  if (contas.length === 0) {
    return <Text variant="secondary">Escolha ao menos uma conta para ver o início e o fim.</Text>;
  }

  return (
    <div className="stack-sm">
      {contas.map(conta => {
        const noInicio = leituraMaisProxima(leituras, conta.id, inicio);
        const noFim = leituraMaisProxima(leituras, conta.id, fim);
        const seguidores = diferenca(noInicio?.seguidores ?? null, noFim?.seguidores ?? null);
        const alcance = diferenca(noInicio?.alcance ?? null, noFim?.alcance ?? null);
        const views = diferenca(noInicio?.visualizacoes ?? null, noFim?.visualizacoes ?? null);
        return (
          <div key={conta.id} className="stack-xs">
            <Text variant="itemTitle" as="h3">{conta.rotulo}</Text>
            <div className="grid-form">
              <Ponto rotulo="Início" data={inicio} leitura={noInicio} />
              <Ponto rotulo="Fim" data={fim} leitura={noFim} />
            </div>
            {seguidores || alcance || views ? (
              <Text variant="meta" as="p">
                Diferença: seguidores {seguidores ?? '—'}, alcance {alcance ?? '—'}, visualizações {views ?? '—'}.
              </Text>
            ) : null}
          </div>
        );
      })}
      {formAberto ? (
        <FormularioLeitura
          contas={contas}
          dataInicial={fim}
          onFechar={onFechar}
          onSave={onSave}
        />
      ) : null}
    </div>
  );
}

function FormularioLeitura({
  contas,
  dataInicial,
  onFechar,
  onSave,
}: {
  contas: { id: string; rotulo: string }[];
  dataInicial: string;
  onFechar: () => void;
  onSave: (campos: CamposLeitura) => Promise<void>;
}) {
  const [contaId, setContaId] = useState(contas[0]?.id ?? '');
  const [data, setData] = useState(dataInicial);
  const [seguidores, setSeguidores] = useState('');
  const [alcance, setAlcance] = useState('');
  const [views, setViews] = useState('');
  const [salvando, setSalvando] = useState(false);
  const numeros = [inteiroDoCampo(seguidores), inteiroDoCampo(alcance), inteiroDoCampo(views)];
  const invalido = numeros.some(numero => numero === undefined) || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !contaId;
  const vazio = numeros.every(numero => numero == null);
  const pode = !invalido && !vazio && !salvando;

  return (
    <form
      className="stack-sm"
      onSubmit={event => {
        event.preventDefault();
        if (!pode) return;
        setSalvando(true);
        void onSave({
          platformId: contaId,
          registradoEm: data,
          seguidores: inteiroDoCampo(seguidores) ?? null,
          alcance: inteiroDoCampo(alcance) ?? null,
          visualizacoes: inteiroDoCampo(views) ?? null,
        }).catch(() => undefined).finally(() => setSalvando(false));
      }}
    >
      <div>
        <label htmlFor="leitura-conta" className="mb-2 block">
          <Text variant="label" as="span">Conta</Text>
        </label>
        <SelectField
          id="leitura-conta"
          block
          ariaLabel="Conta da leitura"
          value={contaId}
          onChange={setContaId}
          options={contas.map(conta => ({ value: conta.id, label: conta.rotulo }))}
        />
      </div>
      <label htmlFor="leitura-data" className="block">
        <Text variant="label" as="span" className="mb-2 block">Data</Text>
        <input id="leitura-data" className="input" type="date" value={data} onChange={event => setData(event.target.value)} />
      </label>
      <div className="grid-form">
        <Numero id="leitura-seguidores" rotulo="Seguidores" valor={seguidores} onChange={setSeguidores} />
        <Numero id="leitura-alcance" rotulo="Alcance" valor={alcance} onChange={setAlcance} />
        <Numero id="leitura-views" rotulo="Visualizações" valor={views} onChange={setViews} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <AppButton type="button" variant="secondary" onClick={onFechar}>Cancelar</AppButton>
        <AppButton
          type="submit"
          variant="primary"
          disabled={!pode}
          disabledReason={invalido ? 'Use uma data e números inteiros.' : vazio ? 'Informe seguidores, alcance ou visualizações.' : undefined}
        >
          Salvar
        </AppButton>
      </div>
    </form>
  );
}
