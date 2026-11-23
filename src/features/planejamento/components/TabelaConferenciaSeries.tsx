import { Link } from 'react-router-dom';
import { Text } from '../../../components/ui/Text';
import type { LinhaContinuidade } from '../lib/saudeIndicadores';
import { ANCORA_CONFERENCIA } from '../../editorial/lib/abasEditorial';
import { rotuloDaSituacaoNoRecorte, situacaoDoRecorte, textoDaMetaNoRecorte } from '../../editorial/lib/apuracaoSerie';

type ItemDaLinha = { contentId: string; data: string | null; realizada: boolean };

export type LinhaConferencia = {
  chave: string;
  nome: string;
  detalhe: string | null;
  ritmo: string;
  situacao: string | null;
  publicados: number;
  comData: number;
  href: string;
  nivel: 0 | 1;
};

/** A conferência lê o que a Saúde já apurou: ritmo no recorte, situação da janela e o que já saiu. */
export function linhasDaConferencia<T extends ItemDaLinha>(
  linhas: readonly LinhaContinuidade<T>[],
  hoje?: string,
  recorte?: { inicio: string; fim: string },
): LinhaConferencia[] {
  return linhas.map(linha => {
    const publicados = new Set(linha.itens.filter(item => item.realizada).map(item => item.contentId));
    const comData = new Set(linha.itens.filter(item => item.data && !item.realizada).map(item => item.contentId));
    const temJanela = linha.intervalos.length > 0 && hoje && recorte;
    return {
      chave: linha.chave,
      nome: linha.nome,
      detalhe: linha.tipo === 'temporada' ? linha.paiNome : null,
      ritmo: temJanela ? `${linha.frequencia} · ${textoDaMetaNoRecorte(linha.intervalos, recorte)}` : linha.frequencia,
      situacao: temJanela ? rotuloDaSituacaoNoRecorte(situacaoDoRecorte(linha.intervalos, hoje)) : null,
      publicados: publicados.size,
      comData: comData.size,
      href: `/series/${linha.serieId}/editar`,
      nivel: linha.tipo === 'temporada' ? 1 : 0,
    };
  });
}

/**
 * Tabela só de leitura: o ritmo, o que tem data e o que já saiu.
 * Quem chama entrega o recorte que a tela já tem.
 */
export function TabelaConferenciaSeries({ linhas }: { linhas: readonly LinhaConferencia[] }) {
  const celula = 'px-3 py-2 align-middle';
  if (linhas.length === 0) {
    return (
      <div id={ANCORA_CONFERENCIA} className="scroll-mt-24">
        <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">Nenhuma série neste período.</Text>
      </div>
    );
  }

  return (
    <div id={ANCORA_CONFERENCIA} className="scroll-mt-24 stack-sm">
      <Text variant="bodyStrong" as="h3">Conferência das séries</Text>
      <div className="hidden md:block overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="bg-[var(--bg-elevated)]">
            <tr>
              <th scope="col" className={celula}><Text variant="label" as="span">Série</Text></th>
              <th scope="col" className={celula}><Text variant="label" as="span">Ritmo</Text></th>
              <th scope="col" className={celula}><Text variant="label" as="span">Situação</Text></th>
              <th scope="col" className={`${celula} text-right`}><Text variant="label" as="span">Com data</Text></th>
              <th scope="col" className={`${celula} text-right`}><Text variant="label" as="span">Publicados</Text></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(linha => (
              <tr key={linha.chave} className="border-t border-[var(--border-subtle)]">
                <td className={`${celula} ${linha.nivel === 1 ? 'pl-8' : ''}`}>
                  <Link
                    to={linha.href}
                    className="block truncate rounded-[var(--radius-sm)] text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Text variant="body" as="span">{linha.nome}</Text>
                  </Link>
                  {linha.detalhe ? (
                    <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">{linha.detalhe}</Text>
                  ) : null}
                </td>
                <td className={celula}>
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{linha.ritmo}</Text>
                </td>
                <td className={celula}>
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{linha.situacao ?? '—'}</Text>
                </td>
                <td className={`${celula} text-right tabular-nums`}>
                  <Text variant="body" as="span">{linha.comData}</Text>
                </td>
                <td className={`${celula} text-right tabular-nums`}>
                  <Text variant="body" as="span">{linha.publicados}</Text>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden stack-sm">
        {linhas.map(linha => (
          <li key={linha.chave} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 stack-xs">
            <Link
              to={linha.href}
              className="block truncate rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Text variant="bodyStrong" as="span">{linha.nome}</Text>
            </Link>
            {linha.detalhe ? <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">{linha.detalhe}</Text> : null}
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">{linha.ritmo}</Text>
            {linha.situacao ? <Text variant="meta" as="p">{linha.situacao}</Text> : null}
            <Text variant="meta" as="p" className="tabular-nums">
              {linha.comData} com data · {linha.publicados} {linha.publicados === 1 ? 'publicado' : 'publicados'}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}
