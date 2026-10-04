import { Badge } from '../../../components/ui/Badge';
import { TagSelect } from '../../../components/ui/TagSelect';
import { Text } from '../../../components/ui/Text';
import type { FuncaoEditorial, FuncaoOrigem, FuncaoPadraoSerie } from '../../../lib/database';
import { FUNCAO_LABELS, resolveFuncao } from '../../editorial/lib/funcoes';
import {
  escolhaFuncaoNoEvento,
  isEscolhaFuncaoEvento,
  opcoesFuncaoNoEvento,
  type EscolhaFuncaoEvento,
} from '../lib/evento';

function rotuloResolvido(funcao: FuncaoEditorial | null, estado: string): string {
  if (funcao) return FUNCAO_LABELS[funcao];
  if (estado === 'nenhuma') return 'Nenhuma';
  return 'Ainda não escolhida';
}

export function FuncaoDoRoteiro({
  contentId,
  content,
  serie,
  onChange,
}: {
  contentId: string;
  content: {
    funcao?: FuncaoEditorial | null;
    funcaoOrigem?: FuncaoOrigem | null;
    classificacaoCongeladaEm?: string | null;
  };
  serie: { funcaoPadrao?: FuncaoPadraoSerie | null } | null;
  onChange: (escolha: EscolhaFuncaoEvento) => void;
}) {
  const resolved = resolveFuncao(content, serie);

  if (resolved.congelada) {
    return (
      <div className="stack-sm">
        <Text variant="label">Função</Text>
        <Badge variant="tag">{rotuloResolvido(resolved.funcao, resolved.estado)}</Badge>
        <Text variant="meta">Definida na publicação.</Text>
      </div>
    );
  }

  const escolha = escolhaFuncaoNoEvento(content);

  return (
    <TagSelect
      id={`funcao-roteiro-${contentId}`}
      label="Função"
      values={[escolha]}
      onChange={values => {
        const next = values[0] ?? 'indefinida';
        if (isEscolhaFuncaoEvento(next)) onChange(next);
      }}
      options={opcoesFuncaoNoEvento(serie)}
      maxSelections={1}
      placeholder="Escolha a função"
    />
  );
}
