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
  iconeDaConta,
  REDE_ROTULO,
  REDES_PRINCIPAIS,
  redeDaConta,
  rotuloConta,
  rotuloCurtoConta,
} from '../../contas/lib/contas';
import {
  alternarDestino,
  destinoMarcado,
  mesmoDestino,
  publicacaoOriginal,
  publicacaoPublicada,
  type DestinoPlataforma,
} from '../lib/destinations';

const iconButtonClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-input)] border transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-40';

const contaChipClass =
  'inline-flex min-h-11 max-w-full items-center gap-2 rounded-[var(--radius-input)] border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50';

/**
 * Onde o conteúdo vai ser publicado. Primeiro a plataforma, só com o ícone; depois,
 * quando a plataforma tem mais de uma conta, a conta, pelo @. Cada conta marcada
 * vira uma publicação própria, com legenda, datas, status, link e métricas dela.
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

  const alternarConta = (conta: DestinoPlataforma) => {
    if (disabled) return;
    const marcada = destinoMarcado(publications, conta);
    if (marcada && publicada(conta)) return;
    onChange(alternarDestino({ publicacoes: publications, plataforma: conta, contentId, marcar: !marcada }));
    if (!marcada) onActivate?.(conta.id);
  };

  const contasDaRede = (rede: string) => platforms.filter(conta => redeDaConta(conta) === rede);
  const outras = platforms.filter(conta => !ehRedePrincipal(redeDaConta(conta)));

  const clicarNaPlataforma = (rede: (typeof REDES_PRINCIPAIS)[number]) => {
    const contas = contasDaRede(rede);
    if (contas.length === 1) {
      alternarConta(contas[0]);
      return;
    }
    // Com duas ou mais contas, a plataforma não escolhe uma delas sozinha: abre a lista.
    setAbertas(current => (current.includes(rede) ? current.filter(item => item !== rede) : [...current, rede]));
  };

  const chipDeConta = (conta: DestinoPlataforma) => {
    const marcada = destinoMarcado(publications, conta);
    const jaPublicada = publicada(conta);
    const ativa = activePlatformId === conta.id;
    return (
      <button
        key={conta.id}
        type="button"
        aria-pressed={marcada}
        disabled={disabled}
        title={jaPublicada ? 'Já publicada nesta conta. Fica marcada.' : rotuloConta(conta)}
        aria-label={`${rotuloConta(conta)}${complementoDoRotulo(conta) ? `, ${complementoDoRotulo(conta)}` : ''}${jaPublicada ? ', já publicada' : ''}`}
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
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
            marcada ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-primary)]' : 'border-[var(--border-strong)]',
          )}
        >
          {marcada ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
        <PlatformIcon platform={iconeDaConta(conta)} className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{rotuloCurtoConta(conta)}</span>
          {conta.handle && conta.nome.trim() && !ehRedePrincipalComMesmoNome(conta) ? (
            <span className="block truncate text-xs text-[var(--text-tertiary)]">{conta.nome}</span>
          ) : null}
        </span>
      </button>
    );
  };

  const redesComLista = REDES_PRINCIPAIS.filter(rede => {
    const contas = contasDaRede(rede);
    if (contas.length < 2) return false;
    return abertas.includes(rede) || contas.some(conta => destinoMarcado(publications, conta));
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
            {REDES_PRINCIPAIS.map(rede => {
              const contas = contasDaRede(rede);
              const marcadas = contas.filter(conta => destinoMarcado(publications, conta));
              const nome = REDE_ROTULO[rede];
              const dica = contas.length === 0
                ? `${nome}: nenhuma conta ativa`
                : contas.length === 1
                  ? `${rotuloConta(contas[0])}${complementoDoRotulo(contas[0]) ? `, ${complementoDoRotulo(contas[0])}` : ''}`
                  : `${nome}: ${marcadas.length} de ${contas.length} contas`;
              return (
                <Tooltip key={rede} label={dica} side="top">
                  <button
                    type="button"
                    aria-label={dica}
                    aria-pressed={marcadas.length > 0}
                    aria-expanded={contas.length > 1 ? redesComLista.includes(rede) : undefined}
                    disabled={disabled || contas.length === 0}
                    onClick={() => clicarNaPlataforma(rede)}
                    className={cn(
                      iconButtonClass,
                      'relative',
                      marcadas.length > 0
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-primary)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                    )}
                  >
                    <PlatformIcon platform={rede} className="h-[18px] w-[18px]" />
                    {contas.length > 1 && marcadas.length > 0 ? (
                      <span
                        aria-hidden
                        className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--bg-primary)] bg-[var(--text-primary)] px-1 text-[var(--bg-primary)]"
                      >
                        <Text variant="label" as="span" className="font-semibold text-[var(--bg-primary)]">
                          {marcadas.length}
                        </Text>
                      </span>
                    ) : null}
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {redesComLista.map(rede => (
            <div key={rede} className="stack-xs">
              <Text variant="meta" className="text-[var(--text-secondary)]">
                {`Contas de ${REDE_ROTULO[rede]}`}
              </Text>
              <div className="flex flex-wrap gap-2" role="group" aria-label={`Contas de ${REDE_ROTULO[rede]}`}>
                {contasDaRede(rede).map(chipDeConta)}
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
