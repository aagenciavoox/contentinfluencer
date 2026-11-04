import {RedeIcon} from '../../../components/ui/PlatformIcons';
import type {Platform} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {redeDaConta, rotuloCurtoConta, type RedeDoFiltro} from '../../contas/lib/contas';
import {normalizarRedesPostIt} from '../lib/redesPostIt';

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

/**
 * Chips de seleção de contas de publicação para post-its.
 * YouTube, Instagram e TikTok separam vídeo e carrossel/Shorts.
 */
export function RedeChips({value, onChange, platforms = []}: RedeChipsProps) {
  const ativas = platforms.filter(p => p.ativo);

  if (ativas.length > 0) {
    return (
      <div role="group" aria-label="Contas de publicação cadastradas" className="flex flex-wrap gap-2">
        {ativas.flatMap(conta => {
          const rede = redeDaConta(conta) ?? (conta.nome.toLowerCase().includes('instagram') ? 'instagram' : conta.nome.toLowerCase().includes('tiktok') ? 'tiktok' : conta.nome.toLowerCase().includes('youtube') ? 'youtube' : 'outra');
          const rotulo = rotuloCurtoConta(conta);
          const variantes = VARIANTES_POR_REDE[rede];
          if (variantes) {
            return variantes.map(({rede: destino, sufixo}) => {
              const active = value.includes(destino);
              return (
                <button
                  key={`${conta.id}-${destino}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(alternarRede(value, destino))}
                  className={cn(
                    'filter-chip min-h-9 pointer-coarse:min-h-11 flex items-center gap-1.5 px-2.5 py-1 t-secondary',
                    active && 'filter-chip-active',
                  )}
                >
                  <RedeIcon rede={destino} className="h-4 w-4 shrink-0" />
                  <span>{rotulo} · {sufixo}</span>
                </button>
              );
            });
          }

          const active = value.includes(rede);
          return [
            <button
              key={conta.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(alternarRede(value, rede))}
              className={cn(
                'filter-chip min-h-9 pointer-coarse:min-h-11 flex items-center gap-1.5 px-2.5 py-1 t-secondary',
                active && 'filter-chip-active',
              )}
            >
              <RedeIcon rede={rede} className="h-4 w-4 shrink-0" />
              <span>{rotulo}</span>
            </button>,
          ];
        })}
      </div>
    );
  }

  const redesPadrao: Array<{rede: RedeDoFiltro; label: string}> = [
    {rede: 'instagram-video', label: 'Instagram (vídeo)'},
    {rede: 'instagram-carrossel', label: 'Instagram (carrossel)'},
    {rede: 'tiktok', label: 'TikTok'},
    {rede: 'youtube', label: 'YouTube (vídeo longo)'},
    {rede: 'youtube-shorts', label: 'YouTube Shorts'},
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
            className={cn(
              'filter-chip min-h-9 pointer-coarse:min-h-11 flex items-center gap-1.5 px-2.5 py-1 t-secondary',
              active && 'filter-chip-active',
            )}
          >
            <RedeIcon rede={rede} className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
