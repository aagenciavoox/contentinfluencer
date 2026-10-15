import {useEffect, useMemo, useState} from 'react';
import {DEFAULT_PLATFORMS} from '../../../../constants';
import {useAppContext} from '../../../../context/AppContext';
import type {ContentPlataforma, Pilar, Serie} from '../../../../lib/database';
import {generateUUID} from '../../../../utils/uuid';
import {cn} from '../../../../lib/utils';
import {PlatformIcon} from '../../../../components/ui/PlatformIcon';
import {SegmentTabs} from '../../../../components/ui/SegmentTabs';
import {Text} from '../../../../components/ui/Text';
import {contaDaRef, contasAtivas, iconeDaConta, redeDaRef, rotuloCurtoConta, rotuloConta} from '../../../contas/lib/contas';
import {DestinationChips} from '../../../editorial/components/DestinationChips';
import {LegendaBaseField} from '../../../editorial/components/legendas/LegendaBaseField';
import {PublicacaoLegenda} from '../../../editorial/components/legendas/PublicacaoLegenda';
import {definirLegendaCompartilhada, estadoLegenda} from '../../../editorial/lib/captions';
import {getEditorialSettings} from '../../../editorial/lib/editorialSettings';
import {limiteDeCaracteres, platformShowsField} from '../../../editorial/lib/platformFields';
import type {DestinoPlataforma} from '../../../editorial/lib/destinations';

export function ensurePlatformRecord(
  plataformas: ContentPlataforma[],
  platformId: string,
  contentId = ''
) {
  const existing = plataformas.find(plataforma => plataforma.platformId === platformId);
  if (existing) return existing;

  return {
    id: generateUUID(),
    contentId,
    platformId,
    legenda: '',
    hashtags: '',
    publishDate: null,
    publishDateEnabled: false,
    status: 'agendada',
    realizadaManualEm: null,
    realizadaApiEm: null,
    postCodigo: null,
    postUrl: null,
    legendaPropria: false,
    contaNaGrade: true,
  } satisfies ContentPlataforma;
}

interface PlatformCopyEditorProps {
  plataformas: ContentPlataforma[];
  pilar: Pilar | null;
  serie: Serie | null;
  disabled?: boolean;
  onChange: (plataformas: ContentPlataforma[]) => void;
  embedded?: boolean;
  contentId?: string;
  legendaBase?: string | null;
  onLegendaBaseChange?: (value: string) => void;
  titulo?: string;
  onTituloChange?: (value: string) => void;
  /** Status do conteúdo: Postado sem status por publicação conta como realizado. */
  status?: string | null;
}

/**
 * Legendas do conteúdo: a legenda-base compartilhada e, para cada publicação,
 * o texto efetivo naquela conta (acompanhando a base ou com versão própria).
 */
export function PlatformCopyEditor({
  plataformas,
  pilar,
  serie,
  disabled = false,
  onChange,
  embedded = false,
  contentId = '',
  legendaBase = null,
  onLegendaBaseChange,
  titulo = '',
  onTituloChange,
  status = null,
}: PlatformCopyEditorProps) {
  const {state} = useAppContext();
  const editorial = getEditorialSettings(state.preferences);
  const destinos = useMemo<DestinoPlataforma[]>(() => {
    const ativas = contasAtivas(state.platforms);
    if (ativas.length > 0) return ativas;
    return DEFAULT_PLATFORMS.map(nome => ({id: nome, nome}));
  }, [state.platforms]);
  // Publicações antigas podem estar numa conta inativa: ela ainda precisa de nome e ícone.
  const contas = state.platforms.length > 0 ? state.platforms : destinos;
  const conteudo = useMemo(
    () => ({status, legendaBase, plataformas}),
    [legendaBase, plataformas, status],
  );
  const [ativaId, setAtivaId] = useState<string | null>(plataformas[0]?.id ?? null);
  const ativa = plataformas.find(item => item.id === ativaId) ?? plataformas[0] ?? null;

  useEffect(() => {
    if (ativaId && plataformas.some(item => item.id === ativaId)) return;
    setAtivaId(plataformas[0]?.id ?? null);
  }, [ativaId, plataformas]);

  // A base mostra o menor limite entre as publicações que ainda a acompanham.
  const limiteDaBase = useMemo(() => {
    const limites = plataformas
      .filter(item => estadoLegenda(item, conteudo) === 'base')
      .map(item => limiteDeCaracteres(redeDaRef(item.platformId, contas) ?? contaDaRef(item.platformId, contas)?.nome))
      .filter((limite): limite is number => limite != null);
    return limites.length > 0 ? Math.min(...limites) : null;
  }, [contas, conteudo, plataformas]);

  const redeAtiva = ativa ? redeDaRef(ativa.platformId, contas) : null;
  const mostraTitulo = Boolean(ativa) && platformShowsField(redeAtiva ?? '', 'titulo');

  return (
    <section className={cn('cms-panel overflow-hidden', embedded && 'flex h-full flex-col')}>
      <div className="border-b border-[var(--border-color)] px-4 py-3">
        <Text variant="sectionTitle">{embedded ? 'Legendas' : 'Preparar distribuição'}</Text>
        <Text variant="secondary" className="mt-0.5">
          Cada conta marcada é uma publicação, com legenda, datas e status próprios.
        </Text>
      </div>

      <div className="stack-lg p-4">
        <DestinationChips
          platforms={destinos}
          publications={plataformas}
          contentId={contentId}
          disabled={disabled}
          activePlatformId={ativa?.platformId ?? null}
          onActivate={contaId => {
            const publicacao = plataformas.find(item => item.platformId === contaId && item.publicationKind !== 'repost');
            if (publicacao) setAtivaId(publicacao.id);
          }}
          onChange={next => {
            onChange(next);
            const nova = next.find(item => !plataformas.some(atual => atual.id === item.id));
            if (nova) setAtivaId(nova.id);
          }}
        />

        <LegendaBaseField
          id={`legenda-base-${contentId || 'novo'}`}
          value={legendaBase ?? ''}
          disabled={disabled}
          limite={limiteDaBase}
          descricao={legendaBase == null && plataformas.some(item => item.legenda.trim())
            ? 'Este conteúdo ainda não tem legenda-base. Ao escrevê-la, as publicações que já tinham outro texto ficam com versão própria.'
            : 'As publicações que usam a legenda-base acompanham o que você escrever aqui. Versões próprias e publicações já feitas não mudam.'}
          onChange={texto => {
            const resultado = definirLegendaCompartilhada({
              legendaBaseAtual: legendaBase,
              novoTexto: texto,
              publicacoes: plataformas,
              conteudo,
            });
            onLegendaBaseChange?.(resultado.legendaBase);
            onChange(resultado.publicacoes);
          }}
        />

        {ativa ? (
          <div className="stack-md">
            {plataformas.length > 1 ? (
              <div className="stack-xs">
                <Text variant="label" className="text-[var(--text-tertiary)]">Publicação em edição</Text>
                <div className="max-w-full overflow-x-auto pb-1">
                  <SegmentTabs<string>
                    ariaLabel="Publicação em edição"
                    className="w-max"
                    value={ativa.id}
                    onChange={setAtivaId}
                    options={plataformas.map(item => {
                      const conta = contaDaRef(item.platformId, contas);
                      const rotulo = conta ? rotuloCurtoConta(conta) : item.platformId;
                      return {
                        id: item.id,
                        label: item.publicationKind === 'repost' ? `${rotulo} · repost` : rotulo,
                        icon: <PlatformIcon platform={conta ? iconeDaConta(conta) : item.platformId} className="h-3.5 w-3.5" />,
                      };
                    })}
                  />
                </div>
              </div>
            ) : null}

            {mostraTitulo ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">
                  {`Título no ${rotuloConta(contaDaRef(ativa.platformId, contas) ?? {id: ativa.platformId, nome: 'YouTube'})}`}
                </span>
                <input
                  value={titulo}
                  disabled={disabled}
                  onChange={event => onTituloChange?.(event.target.value)}
                  className="min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
                />
              </label>
            ) : null}

            <PublicacaoLegenda
              publicacao={ativa}
              conteudo={conteudo}
              contas={contas}
              serie={serie}
              pilar={pilar}
              editorial={editorial}
              disabled={disabled}
              onChange={onChange}
            />
          </div>
        ) : destinos.length > 0 ? (
          <Text variant="secondary">Marque onde publicar para preparar a legenda de cada conta.</Text>
        ) : null}
      </div>
    </section>
  );
}
