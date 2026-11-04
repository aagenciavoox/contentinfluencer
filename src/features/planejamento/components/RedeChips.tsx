import {RedeIcon} from '../../../components/ui/PlatformIcons';
import type {Platform} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {REDE_ROTULO, redeDaConta, rotuloCurtoConta, type RedeDoFiltro} from '../../contas/lib/contas';
import {compararExibicaoRede, normalizarRedesPostIt} from '../lib/redesPostIt';

export interface RedeChipsProps {
  value: readonly RedeDoFiltro[];
  onChange: (redes: RedeDoFiltro[]) => void;
  platforms?: readonly Platform[];
}

const EXCLUSOES: Partial<Record<RedeDoFiltro, readonly RedeDoFiltro[]>> = {
  youtube: ['youtube-shorts'],
  'youtube-shorts': ['youtube'],
  'instagram-video': ['instagram', 'instagram-carrossel'],
  'instagram-carrossel': ['instagram', 'instagram-video'],
};

function alternarRede(atuais: readonly RedeDoFiltro[], clicada: RedeDoFiltro): RedeDoFiltro[] {
  if (atuais.includes(clicada)) {
    return atuais.filter(r => r !== clicada);
  }
  const exclusoes = EXCLUSOES[clicada] ?? [];
  const proximas = atuais.filter(r => !exclusoes.includes(r));
  proximas.push(clicada);
  return normalizarRedesPostIt(proximas);
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
    {rede: 'youtube', sufixo: 'Vídeo longo'},
    {rede: 'youtube-shorts', sufixo: 'Shorts'},
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

/**
 * Chips de seleção de contas de publicação para post-its e temporadas.
 * Curtos primeiro: Instagram vídeo, TikTok, Shorts. Carrossel e vídeo longo depois.
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
              onClick={() => onChange(alternarRede(value, destino))}
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
            onClick={() => onChange(alternarRede(value, destino))}
            className={chipClass(value.includes(destino))}
          >
            <RedeIcon rede={destino} className="h-4 w-4 shrink-0" />
            <span>{rotuloDoChip(conta, rede, unica)}</span>
          </button>
        ),
      }];
    }).sort((a, b) => compararExibicaoRede(a.destino, b.destino));

    return (
      <div role="group" aria-label="Redes" className="flex flex-wrap gap-2">
        {chips.map(chip => chip.node)}
      </div>
    );
  }

  const redesPadrao: Array<{rede: RedeDoFiltro; label: string}> = [
    {rede: 'instagram-video', label: 'Instagram (vídeo)'},
    {rede: 'tiktok', label: 'TikTok'},
    {rede: 'youtube-shorts', label: 'YouTube Shorts'},
    {rede: 'instagram-carrossel', label: 'Instagram (carrossel)'},
    {rede: 'youtube', label: 'YouTube (vídeo longo)'},
  ];

  return (
    <div role="group" aria-label="Redes sociais" className="flex flex-wrap gap-2">
      {redesPadrao.map(({rede, label}) => {
        const active = value.includes(rede);
        return (
          <button
            key={rede}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(alternarRede(value, rede))}
            className={chipClass(active)}
          >
            <RedeIcon rede={rede} className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
