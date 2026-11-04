import { useState } from 'react';
import { Check } from 'lucide-react';
import type { ContentPlataforma } from '../../../lib/database';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Text } from '../../../components/ui/Text';
import { Tooltip } from '../../../components/ui/Tooltip';
import { cn } from '../../../lib/utils';
import {
  complementoDoRotulo,
  ehRedePrincipal,
  formatoDoFiltro,
  iconeDaConta,
  REDE_ROTULO,
  ROTULO_REDE_DO_FILTRO,
  type RedeDoFiltro,
  redeBaseDoFiltro,
  redeDaConta,
  rotuloConta,
  rotuloCurtoConta,
} from '../../contas/lib/contas';
import { RedeIcon } from '../../../components/ui/PlatformIcons';
import { formatoDaPublicacao } from '../lib/publicacoes';
import {
  alternarDestino,
  destinoMarcado,
  mesmoDestino,
  publicacaoDoDestino,
  publicacaoOriginal,
  publicacaoPublicada,
  type DestinoPlataforma,
} from '../lib/destinations';

const DESTINOS_PRINCIPAIS: readonly RedeDoFiltro[] = [
  'instagram-video', 'instagram-carrossel',
  'tiktok',
  'youtube', 'youtube-shorts',
];

const iconButtonClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] border transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-40';

const contaChipClass =
  'inline-flex min-h-11 max-w-full items-center gap-2 rounded-[var(--radius-input)] border px-3 text-left t-body transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50';

/**
 * Onde o conteúdo vai ser publicado. Primeiro a plataforma, só com o ícone (Instagram, TikTok,
 * YouTube longo e YouTube Shorts); depois, quando a plataforma tem mais de uma conta, a conta,
 * pelo @. Cada conta marcada vira uma publicação própria, com legenda, datas, status, link e métricas dela.
 */
export function DestinationChips({
  platforms,
  publications,
  contentId,
  disabled = false,
  activePlatformId = null,
  onActivate,
  onChange,
}: {
  platforms: DestinoPlataforma[];
  publications: ContentPlataforma[];
  contentId: string;
  disabled?: boolean;
  activePlatformId?: string | null;
  onActivate?: (platformId: string) => void;
  onChange: (publications: ContentPlataforma[]) => void;
}) {
  const [abertas, setAbertas] = useState<string[]>([]);

  const publicada = (conta: DestinoPlataforma) => publications.some(item =>
    publicacaoOriginal(item) && mesmoDestino(item.platformId, conta) && publicacaoPublicada(item),
  );

  const pubDaConta = (conta: DestinoPlataforma) =>
    publications.find(item => publicacaoOriginal(item) && mesmoDestino(item.platformId, conta) && item.status !== 'nao_publicada' && item.status !== 'removida');

  const formatoDaConta = (conta: DestinoPlataforma) => {
    const pub = pubDaConta(conta);
    if (!pub) return null;
    const rede = redeDaConta(conta);
    return formatoDaPublicacao({ formatoVisual: null }, rede, pub);
  };

  const contaNoDestino = (conta: DestinoPlataforma, destino: RedeDoFiltro) => {
    if (!destinoMarcado(publications, conta)) return false;
    const formatoAlvo = formatoDoFiltro(destino);
    // Chip da rede inteira (TikTok): qualquer formato conta.
    if (!formatoAlvo) return true;
    return formatoDaConta(conta) === formatoAlvo;
  };

  const alternarConta = (conta: DestinoPlataforma, formatoEscolhido?: 'short' | 'video-longo') => {
    if (disabled) return;
    const marcada = destinoMarcado(publications, conta);
    if (marcada && publicada(conta)) return;
    onChange(alternarDestino({
      publicacoes: publications,
      plataforma: conta,
      contentId,
      marcar: !marcada,
      formatoPublicacao: formatoEscolhido,
    }));
    if (!marcada) onActivate?.(conta.id);
  };

  const contasDaRede = (rede: string) => platforms.filter(conta => redeDaConta(conta) === rede);
  const outras = platforms.filter(conta => !ehRedePrincipal(redeDaConta(conta)));

  const clicarNaPlataforma = (destino: RedeDoFiltro) => {
    if (disabled) return;
    const redeBase = redeBaseDoFiltro(destino);
    const contas = contasDaRede(redeBase);
    if (contas.length === 0) return;
    const formatoAlvo = formatoDoFiltro(destino);
    const formatoYoutube = formatoAlvo === 'short' || formatoAlvo === 'video-longo' ? formatoAlvo : null;

    if (formatoYoutube) {
      if (contas.length === 1) {
        const conta = contas[0];
        const pub = pubDaConta(conta);
        if (pub) {
          const formatoAtual = formatoDaConta(conta);
          if (formatoAtual === formatoYoutube) {
            if (!publicada(conta)) {
              onChange(alternarDestino({ publicacoes: publications, plataforma: conta, contentId, marcar: false }));
            }
          } else {
            onChange(publications.map(item =>
              item.id === pub.id ? { ...item, formatoPublicacao: formatoYoutube } : item
            ));
          }
        } else {
          onChange(alternarDestino({
            publicacoes: publications,
            plataforma: conta,
            contentId,
            marcar: true,
            formatoPublicacao: formatoYoutube,
          }));
          onActivate?.(conta.id);
        }
        return;
      }
      setAbertas(current => (current.includes(destino) ? current.filter(item => item !== destino) : [...current, destino]));
      return;
    }

    if (contas.length === 1) {
      alternarConta(contas[0]);
      return;
    }
    setAbertas(current => (current.includes(destino) ? current.filter(item => item !== destino) : [...current, destino]));
  };

  const chipDeConta = (conta: DestinoPlataforma) => {
    const marcada = destinoMarcado(publications, conta);
    const jaPublicada = publicada(conta);
    const ativa = activePlatformId === conta.id;
    const rede = redeDaConta(conta);
    const formato = rede === 'youtube' ? formatoDaConta(conta) : null;
    const icone = formato === 'short' ? 'youtube-shorts' : iconeDaConta(conta);
    const complementoFormato = formato === 'short' ? ' · Shorts' : formato === 'video-longo' ? ' · Vídeo longo' : '';

    return (
      <button
        key={conta.id}
        type="button"
        aria-pressed={marcada}
        disabled={disabled}
        title={jaPublicada ? 'Já publicada nesta conta. Fica marcada.' : `${rotuloConta(conta)}${complementoFormato}`}
        aria-label={`${rotuloConta(conta)}${complementoDoRotulo(conta) ? `, ${complementoDoRotulo(conta)}` : ''}${complementoFormato}${jaPublicada ? ', já publicada' : ''}`}
        onClick={() => {
          if (marcada && onActivate && !ativa) {
            onActivate(conta.id);
            return;
          }
          alternarConta(conta);
        }}
        className={cn(
          contaChipClass,
          marcada
            ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--bg-elevated))] text-[var(--text-primary)]'
            : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
          marcada && ativa && 'shadow-[var(--shadow-focus)]',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-[calc(var(--radius-sm)/2)] border',
            marcada ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-primary)]' : 'border-[var(--border-strong)]',
          )}
        >
          {marcada ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
        <PlatformIcon platform={icone} className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate t-body-strong">{rotuloCurtoConta(conta)}{complementoFormato}</span>
          {conta.handle && conta.nome.trim() && !ehRedePrincipalComMesmoNome(conta) ? (
            <span className="block truncate text-2xs text-[var(--text-tertiary)]">{conta.nome}</span>
          ) : null}
        </span>
      </button>
    );
  };

  const redesComLista = DESTINOS_PRINCIPAIS.filter(destino => {
    const contas = contasDaRede(redeBaseDoFiltro(destino));
    if (contas.length < 2) return false;
    return abertas.includes(destino);
  });

  return (
    <div className="stack-sm">
      <Text variant="label" className="text-[var(--text-tertiary)]">
        Onde você pretende publicar?
      </Text>
      {platforms.length === 0 ? (
        <Text variant="secondary">
          Nenhuma conta ativa. Cadastre em Contas e horários.
        </Text>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Plataformas">
            {DESTINOS_PRINCIPAIS.map(destino => {
              const contas = contasDaRede(redeBaseDoFiltro(destino));
              const marcadas = contas.filter(conta => contaNoDestino(conta, destino));
              const nome = ROTULO_REDE_DO_FILTRO[destino];
              const dica = contas.length === 0
                ? `${nome}: nenhuma conta ativa`
                : contas.length === 1
                  ? `${nome}: ${rotuloConta(contas[0])}`
                  : `${nome}: ${marcadas.length} de ${contas.length} contas`;
              return (
                <Tooltip key={destino} label={dica} side="top">
                  <button
                    type="button"
                    aria-label={dica}
                    aria-pressed={marcadas.length > 0}
                    aria-expanded={contas.length > 1 ? redesComLista.includes(destino) : undefined}
                    disabled={disabled || contas.length === 0}
                    onClick={() => clicarNaPlataforma(destino)}
                    className={cn(
                      iconButtonClass,
                      'relative',
                      marcadas.length > 0
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-primary)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                    )}
                  >
                    <RedeIcon rede={destino} className="h-[18px] w-[18px]" />
                    {contas.length > 1 && marcadas.length > 0 ? (
                      <span
                        aria-hidden
                        className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--bg-primary)] bg-[var(--text-primary)] px-1 text-[var(--bg-primary)]"
                      >
                        <Text variant="label" as="span" className="text-[var(--bg-primary)]">
                          {marcadas.length}
                        </Text>
                      </span>
                    ) : null}
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {redesComLista.map(destino => (
            <div key={destino} className="stack-xs">
              <Text variant="meta" className="text-[var(--text-secondary)]">
                {`Contas de ${ROTULO_REDE_DO_FILTRO[destino]}`}
              </Text>
              <div className="flex flex-wrap gap-2" role="group" aria-label={`Contas de ${ROTULO_REDE_DO_FILTRO[destino]}`}>
                {contasDaRede(redeBaseDoFiltro(destino)).map(chipDeConta)}
              </div>
            </div>
          ))}

          {outras.length > 0 ? (
            <div className="stack-xs">
              <Text variant="meta" className="text-[var(--text-secondary)]">Outras plataformas</Text>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Outras plataformas">
                {outras.map(chipDeConta)}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Conta cujo nome é só o nome da plataforma ("Instagram"): a segunda linha não acrescenta nada. */
function ehRedePrincipalComMesmoNome(conta: DestinoPlataforma): boolean {
  const rede = redeDaConta(conta);
  return ehRedePrincipal(rede) && conta.nome.trim().toLocaleLowerCase('pt-BR') === REDE_ROTULO[rede].toLocaleLowerCase('pt-BR');
}
