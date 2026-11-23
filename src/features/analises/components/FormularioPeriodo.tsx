import { useState } from 'react';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';

export function FormularioPeriodo({
  inicial,
  podeSalvar,
  motivo,
  onCancel,
  onSave,
}: {
  inicial: { nome: string; oQueMudei: string; conclusao: string };
  podeSalvar: boolean;
  motivo?: string;
  onCancel: () => void;
  onSave: (valores: { nome: string; oQueMudei: string; conclusao: string }) => Promise<void>;
}) {
  const [nome, setNome] = useState(inicial.nome);
  const [oQueMudei, setOQueMudei] = useState(inicial.oQueMudei);
  const [conclusao, setConclusao] = useState(inicial.conclusao);
  const [salvando, setSalvando] = useState(false);

  return (
    <form
      className="stack-sm"
      onSubmit={event => {
        event.preventDefault();
        if (!podeSalvar || salvando) return;
        setSalvando(true);
        void onSave({ nome, oQueMudei, conclusao }).catch(() => undefined).finally(() => setSalvando(false));
      }}
    >
      <label htmlFor="periodo-nome" className="block">
        <Text variant="label" as="span" className="mb-2 block">Nome</Text>
        <input
          id="periodo-nome"
          className="input"
          value={nome}
          onChange={event => setNome(event.target.value)}
        />
      </label>
      <label htmlFor="periodo-mudei" className="block">
        <Text variant="label" as="span" className="mb-2 block">O que mudei</Text>
        <textarea
          id="periodo-mudei"
          className="input"
          rows={3}
          value={oQueMudei}
          onChange={event => setOQueMudei(event.target.value)}
        />
      </label>
      <label htmlFor="periodo-conclusao" className="block">
        <Text variant="label" as="span" className="mb-2 block">Conclusão</Text>
        <textarea
          id="periodo-conclusao"
          className="input"
          rows={3}
          value={conclusao}
          onChange={event => setConclusao(event.target.value)}
        />
      </label>
      <div className="flex items-center justify-between gap-2">
        <AppButton type="button" variant="secondary" onClick={onCancel}>Cancelar</AppButton>
        <AppButton type="submit" variant="primary" disabled={!podeSalvar || salvando} disabledReason={motivo}>
          Salvar
        </AppButton>
      </div>
    </form>
  );
}
