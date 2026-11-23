import { useMemo } from 'react';
import { Text } from '../../../components/ui/Text';
import type { Content, Platform } from '../../../lib/database';
import { faixasNoPeriodo, type LinhaDeFaixa } from '../../editorial/lib/faixasEditoriais';
import type { EditorialSettings } from '../../editorial/lib/editorialSettings';
import type { LeituraDaFaixa } from '../../editorial/lib/indicadoresProducao';
import { textoDaFaixa } from '../../editorial/lib/indicadoresProducao';

function textoDaLeitura(leitura: LeituraDaFaixa | null): string {
  if (!leitura) return '';
  if (leitura.estado === 'abaixo') return 'abaixo';
  if (leitura.estado === 'acima') return 'acima';
  if (leitura.estado === 'na-meta') return 'na meta';
  return 'dentro da faixa';
}

function Linha({ linha }: { linha: LinhaDeFaixa }) {
  const faixa = linha.faixa ? textoDaFaixa(linha.faixa) : 'Sem faixa';
  const leitura = textoDaLeitura(linha.leitura);
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <Text variant="body" as="span">{linha.rotulo}</Text>
      <Text variant="meta" as="span">
        {linha.valor} · {faixa}{leitura ? ` · ${leitura}` : ''}
      </Text>
    </div>
  );
}

export function RitmoDoPeriodo({
  contents,
  platforms,
  editorial,
  inicio,
  fim,
  hoje,
  contasIds,
}: {
  contents: readonly Content[];
  platforms: readonly Platform[];
  editorial: EditorialSettings;
  inicio: string;
  fim: string;
  hoje: string;
  contasIds: readonly string[];
}) {
  const faixas = useMemo(() => faixasNoPeriodo({
    contents,
    platforms,
    preferencias: editorial.preferencias,
    vigencias: editorial.vigencias,
    metasDasContas: editorial.metasDasContas,
    pausas: editorial.pausas,
    periodo: { inicio, fim },
    hoje,
  }), [contents, editorial.metasDasContas, editorial.pausas, editorial.preferencias, editorial.vigencias, fim, hoje, inicio, platforms]);

  const contas = contasIds.length === 0
    ? []
    : faixas.contas.filter(conta => contasIds.includes(conta.id));

  return (
    <div className="stack-sm">
      <Text variant="secondary" as="p">
        O que saiu na grade, comparado com as faixas que valiam em cada semana. Stories ficam de fora.
      </Text>
      {contasIds.length === 0 ? (
        <Text variant="secondary">Escolha ao menos uma conta para ver o ritmo dela.</Text>
      ) : null}
      {faixas.gerais.length > 0 ? (
        <div className="stack-xs">
          <Text variant="label" as="p">Geral</Text>
          {faixas.gerais.map(linha => <Linha key={linha.id} linha={linha} />)}
        </div>
      ) : null}
      {contas.map(conta => (
        <div key={conta.id} className="stack-xs">
          <Text variant="itemTitle" as="h3">{conta.nome}</Text>
          {conta.total ? <Linha linha={conta.total} /> : null}
          {conta.gravacao.length > 0 ? <Text variant="label" as="p">Gravação</Text> : null}
          {conta.gravacao.map(linha => <Linha key={linha.id} linha={linha} />)}
          {conta.producao.length > 0 ? <Text variant="label" as="p">Produção</Text> : null}
          {conta.producao.map(linha => <Linha key={linha.id} linha={linha} />)}
        </div>
      ))}
      {faixas.gerais.length === 0 && contas.length === 0 && contasIds.length > 0 ? (
        <Text variant="secondary">Nenhuma faixa valia para o que saiu nestas contas.</Text>
      ) : null}
    </div>
  );
}
