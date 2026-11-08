import type {ReactNode} from 'react';
import {RedeIcon} from '../../../components/ui/PlatformIcons';
import type {Platform} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {REDE_ROTULO, redeDaConta, rotuloCurtoConta, type RedeDoFiltro} from '../../contas/lib/contas';
import {agruparPorBlocoVisual, alternarRedeNoFoco, compararExibicaoRede} from '../lib/redesPostIt';

export interface RedeChipsProps {
  value: readonly RedeDoFiltro[];
  onChange: (redes: RedeDoFiltro[]) => void;
  platforms?: readonly Platform[];
}

function nomeDaRede(rede: string): string | null {
  if (rede === 'instagram' || rede === 'tiktok' || rede === 'youtube' || rede === 'blog' || rede === 'outra') {
    return REDE_ROTULO[rede];
  }
  return null;
}

/** Com uma conta na rede, o @ não distingue nada: o chip usa o nome da rede. */
function rotuloDoChip(conta: Parameters<typeof rotuloCurtoConta>[0], rede: string, unica: boolean, sufixo?: string): string {
  const curto = rotuloCurtoConta(conta);
  const base = unica && curto.startsWith('@') ? (nomeDaRede(rede) ?? conta.nome.trim()) : curto;
  return sufixo ? `${base} · ${sufixo}` : base;
}

const VARIANTES_POR_REDE: Partial<Record<string, Array<{rede: RedeDoFiltro; sufixo: string}>>> = {
  youtube: [
    {rede: 'youtube-shorts', sufixo: 'Shorts'},
    {rede: 'youtube', sufixo: 'Vídeo longo'},
  ],
  instagram: [
    {rede: 'instagram-video', sufixo: 'Vídeo'},
    {rede: 'instagram-carrossel', sufixo: 'Carrossel'},
  ],
};

const chipClass = (active: boolean) => cn(
  'filter-chip min-h-9 pointer-coarse:min-h-11 flex items-center gap-1.5 px-2.5 py-1 t-secondary',
  active && 'filter-chip-active',
);

function ChipsEmBlocos({
  chips,
  rotulo,
}: {
  chips: ReadonlyArray<{destino: RedeDoFiltro; node: ReactNode}>;
  rotulo: string;
}) {
  const grupos = agruparPorBlocoVisual(
    [...chips].sort((a, b) => compararExibicaoRede(a.destino, b.destino)),
    chip => chip.destino,
  );
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap items-center gap-4">
      {grupos.map(grupo => (
        <div key={grupo[0].destino} className="flex flex-wrap items-center gap-2">
          {grupo.map(chip => chip.node)}
        </div>
      ))}
    </div>
  );
}

/**
 * Chips de seleção de contas de publicação para post-its e temporadas.
 * A fileira fica fixa: Reels, TikTok e Shorts, depois o YouTube longo e o carrossel.
 * Uma conta só na rede aparece pelo nome da rede; o @ entra quando há outra conta para distinguir.
 */
export function RedeChips({value, onChange, platforms = []}: RedeChipsProps) {
  const ativas = platforms.filter(p => p.ativo);

  if (ativas.length > 0) {
    const redeDa = (conta: (typeof ativas)[number]) => redeDaConta(conta) ?? (conta.nome.toLowerCase().includes('instagram') ? 'instagram' : conta.nome.toLowerCase().includes('tiktok') ? 'tiktok' : conta.nome.toLowerCase().includes('youtube') ? 'youtube' : 'outra');
    const quantas = new Map<string, number>();
    for (const conta of ativas) {
      const rede = redeDa(conta);
      quantas.set(rede, (quantas.get(rede) ?? 0) + 1);
    }
    const chips = ativas.flatMap(conta => {
      const rede = redeDa(conta);
      const unica = (quantas.get(rede) ?? 0) <= 1;
      const variantes = VARIANTES_POR_REDE[rede];
      if (variantes) {
        return variantes.map(({rede: destino, sufixo}) => ({
          destino,
          node: (
            <button
              key={`${conta.id}-${destino}`}
              type="button"
              aria-pressed={value.includes(destino)}
              onClick={() => onChange(alternarRedeNoFoco(value, destino))}
              className={chipClass(value.includes(destino))}
            >
              <RedeIcon rede={destino} className="h-4 w-4 shrink-0" />
              <span>{rotuloDoChip(conta, rede, unica, sufixo)}</span>
            </button>
          ),
        }));
      }
      const destino = rede as RedeDoFiltro;
      return [{
        destino,
        node: (
          <button
            key={conta.id}
            type="button"
            aria-pressed={value.includes(destino)}
            onClick={() => onChange(alternarRedeNoFoco(value, destino))}
            className={chipClass(value.includes(destino))}
          >
            <RedeIcon rede={destino} className="h-4 w-4 shrink-0" />
            <span>{rotuloDoChip(conta, rede, unica)}</span>
          </button>
        ),
      }];
    });

    return <ChipsEmBlocos chips={chips} rotulo="Redes" />;
  }

  const redesPadrao: Array<{destino: RedeDoFiltro; label: string}> = [
    {destino: 'instagram-video', label: 'Instagram (vídeo)'},
    {destino: 'tiktok', label: 'TikTok'},
    {destino: 'youtube-shorts', label: 'YouTube Shorts'},
    {destino: 'youtube', label: 'YouTube (vídeo longo)'},
    {destino: 'instagram-carrossel', label: 'Instagram (carrossel)'},
  ];

  return (
    <ChipsEmBlocos
      rotulo="Redes sociais"
      chips={redesPadrao.map(({destino: rede, label}) => {
        const active = value.includes(rede);
        return {
          destino: rede,
          node: (
            <button
              key={rede}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(alternarRedeNoFoco(value, rede))}
              className={chipClass(active)}
            >
              <RedeIcon rede={rede} className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ),
        };
      })}
    />
  );
}
