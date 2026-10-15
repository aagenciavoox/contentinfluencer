import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import type { ContentPlataforma, Pilar, Serie } from '../../../../lib/database';
import { suggestHashtags } from '../../../contents/lib/captionHashtags';
import {
  complementoDoRotulo,
  contaDaRef,
  iconeDaConta,
  redeDaRef,
  rotuloConta,
  type ContaRef,
} from '../../../contas/lib/contas';
import {
  criarVersaoPropria,
  editarVersaoPropria,
  estadoLegenda,
  legendaEfetiva,
  voltarParaBase,
  type ConteudoDaLegenda,
} from '../../lib/captions';
import { limiteHashtagsDaRede, type EditorialSettings } from '../../lib/editorialSettings';
import { limiteDeCaracteres, platformShowsField } from '../../lib/platformFields';
import { HashtagsField } from './HashtagsField';
import { LegendaVersaoField } from './LegendaVersaoField';

export type ConteudoComLegenda = Omit<ConteudoDaLegenda, 'plataformas'> & {
  legendaBase?: string | null;
  plataformas: ContentPlataforma[];
};

/** Texto pronto para colar: legenda efetiva e, quando a rede usa, as hashtags. */
export function textoParaCopiar(
  legendaBase: string | null | undefined,
  publicacao: ContentPlataforma,
  mostraHashtags: boolean,
): string {
  return [legendaEfetiva(legendaBase, publicacao).trim(), mostraHashtags ? publicacao.hashtags.trim() : '']
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Legenda e hashtags de uma publicação. As regras vêm de `captions.ts`; esta peça
 * só mostra e chama. Roteiro e Legendas usam a mesma.
 */
export function PublicacaoLegenda({
  publicacao,
  conteudo,
  contas,
  serie,
  pilar,
  editorial,
  disabled = false,
  compact = false,
  onChange,
}: {
  publicacao: ContentPlataforma;
  conteudo: ConteudoComLegenda;
  contas: readonly ContaRef[];
  serie: Pick<Serie, 'name' | 'plataformas'> | null;
  pilar: Pick<Pilar, 'nome' | 'plataformas'> | null;
  editorial: Pick<EditorialSettings, 'limitesHashtags'>;
  disabled?: boolean;
  compact?: boolean;
  onChange: (publicacoes: ContentPlataforma[]) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const conta = contaDaRef(publicacao.platformId, contas);
  const rede = redeDaRef(publicacao.platformId, contas);
  const chaveDaRede = rede && rede !== 'outra' ? rede : conta?.nome ?? publicacao.platformId;
  const rotulo = conta ? rotuloConta(conta) : publicacao.platformId;
  const estado = estadoLegenda(publicacao, conteudo);
  const base = conteudo.legendaBase;
  const texto = legendaEfetiva(base, publicacao);
  const mostraHashtags = platformShowsField(chaveDaRede, 'hashtags');
  const repost = publicacao.publicationKind === 'repost';
  const bloqueada = disabled || estado === 'publicada';
  const sugestao = suggestHashtags({ platformId: publicacao.platformId, serie, pilar, contas });

  const copiar = async () => {
    const valor = textoParaCopiar(base, publicacao, mostraHashtags);
    if (!valor) return;
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="stack-sm">
      <LegendaVersaoField
        id={`legenda-${publicacao.id}`}
        icone={conta ? iconeDaConta(conta) : publicacao.platformId}
        rotulo={repost ? `${rotulo} (repost)` : rotulo}
        detalhe={conta ? complementoDoRotulo(conta) : null}
        estado={estado}
        texto={texto}
        baseVazia={!(base ?? '').trim()}
        limite={limiteDeCaracteres(chaveDaRede)}
        publicadaEm={publicacao.realizadaApiEm ?? publicacao.realizadaManualEm ?? null}
        disabled={disabled}
        compact={compact}
        onCriarPropria={() => onChange(criarVersaoPropria(base, conteudo.plataformas, publicacao.id, conteudo))}
        onEditar={valor => onChange(editarVersaoPropria(conteudo.plataformas, publicacao.id, valor, conteudo))}
        onVoltarParaBase={() => onChange(voltarParaBase(base, conteudo.plataformas, publicacao.id, conteudo))}
        acoes={(
          <AppButton
            size="xs"
            variant="ghost"
            iconOnly
            disabled={!texto.trim() && !(mostraHashtags && publicacao.hashtags.trim())}
            aria-label={mostraHashtags ? `Copiar legenda e hashtags de ${rotulo}` : `Copiar legenda de ${rotulo}`}
            title={mostraHashtags ? 'Copiar legenda e hashtags' : 'Copiar legenda'}
            leftIcon={copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            onClick={() => void copiar()}
          />
        )}
      />
      {mostraHashtags ? (
        <HashtagsField
          rotulo={rotulo}
          hashtags={publicacao.hashtags}
          sugestao={sugestao}
          limite={limiteHashtagsDaRede(editorial, publicacao.platformId, chaveDaRede)}
          disabled={bloqueada}
          semSugestao={!compact && (serie || pilar) && sugestao.length === 0
            ? `Nenhuma hashtag definida${serie ? ` em ${serie.name}` : ''}${serie && pilar ? ' ou' : ''}${pilar ? ` em ${pilar.nome}` : ''} para ${rotulo}.`
            : null}
          onChange={hashtags => onChange(conteudo.plataformas.map(item => (
            item.id === publicacao.id ? { ...item, hashtags } : item
          )))}
        />
      ) : null}
    </div>
  );
}
