import { ArrowLeft, Calendar, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { interceptBackLink } from '../../../../lib/navigation/goBack';
import { statusDaSerie } from '../../lib/statusSerie';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { MoreMenu, type MoreMenuItem } from '../../../../components/ui/MoreMenu';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import type { Serie, SerieTipoAgrupamento, Temporada } from '../../../../lib/database';
import { TIPO_AGRUPAMENTO_LABEL } from '../../lib/serieAgrupamento';
import { textoDaCadencia, type TotaisDoCabecalho } from '../../lib/serieCabecalho';

function capaHttp(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/** Ativa no ar; arquivada aparece como pausa. Rascunho continua rascunho. */
function seloDaSerie(serie: Serie): { rotulo: string; variant: 'success' | 'warning' | 'neutral' } {
  const status = statusDaSerie(serie);
  if (status === 'ativa') return { rotulo: 'Ativa', variant: 'success' };
  if (status === 'rascunho') return { rotulo: 'Rascunho', variant: 'warning' };
  return { rotulo: 'Pausada', variant: 'neutral' };
}

function contagem(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/**
 * Topo da série: capa, título, descrição, cadência e o atalho de episódio.
 * A contagem fica numa faixa abaixo, sem a conta de cotas do período.
 */
export function SeriesDetailHeader({
  serie,
  tipo,
  ancestrais,
  temporada,
  totais,
  celular,
  onConfigure,
  onCreate,
  onBulk,
  adicionar,
}: {
  serie: Serie;
  tipo: SerieTipoAgrupamento;
  /** Do mais distante ao mais próximo. */
  ancestrais: readonly Pick<Serie, 'id' | 'name'>[];
  temporada: Temporada | null;
  totais: TotaisDoCabecalho;
  celular: boolean;
  onConfigure: () => void;
  onCreate: () => void;
  onBulk: () => void;
  /** Na série e no quadro, temporada e quadro entram no menu ao lado de Novo episódio. */
  adicionar?: { onEpisodio: () => void; onTemporada?: () => void; onQuadro?: () => void } | null;
}) {
  const descricao = (temporada?.descricao?.trim() || serie.notes?.trim()) || '';
  const selo = seloDaSerie(serie);
  const pai = ancestrais.at(-1) ?? null;
  const nome = serie.name.trim() || 'Sem nome';
  const titulo = temporada ? temporada.nome : nome;
  const capa = capaHttp(serie.capaUrl);
  const iniciais = nome.slice(0, 2).toUpperCase();
  const cadencia = textoDaCadencia(serie, tipo).replace(/^Cadência: /, '');
  const navigate = useNavigate();
  const volta = temporada ? `/series/${serie.id}` : pai ? `/series/${pai.id}` : '/series';
  const depoisDaVolta = temporada ? nome : pai?.name?.trim() || '';
  const menu: MoreMenuItem[] = [
    { label: tipo === 'quadro' ? 'Editar quadro' : 'Editar série', onClick: onConfigure },
    { label: 'Criar em massa', onClick: onBulk },
    ...(adicionar?.onTemporada ? [{ label: 'Nova temporada', onClick: adicionar.onTemporada }] : []),
    ...(adicionar?.onQuadro ? [{ label: 'Novo quadro', onClick: adicionar.onQuadro }] : []),
  ];

  return (
    <div className="w-full stack-lg">
      <nav className="flex flex-wrap items-center gap-1.5 text-[var(--text-secondary)]" aria-label="Caminho">
        <Link
          to={volta}
          onClick={event => interceptBackLink(event, navigate, volta)}
          className="flex items-center gap-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <Text variant="secondary" as="span">Voltar</Text>
        </Link>
        {depoisDaVolta ? (
          <>
            <span className="text-[var(--text-tertiary)]" aria-hidden>/</span>
            <Text variant="secondary" as="span">{depoisDaVolta}</Text>
          </>
        ) : null}
      </nav>

      <div className={cn('flex gap-4', celular ? 'flex-col' : 'items-center justify-between')}>
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {capa ? (
            <img src={capa} alt="" className="h-28 w-44 shrink-0 rounded-[var(--radius-card)] object-cover" />
          ) : (
            <div
              className="flex h-28 w-44 shrink-0 items-center justify-center rounded-[var(--radius-card)]"
              style={{ backgroundColor: `${serie.cor || '#e11d48'}18`, color: serie.cor || '#e11d48' }}
              aria-hidden="true"
            >
              <Text variant="sectionTitle" as="span">{iniciais}</Text>
            </div>
          )}
          <div className="min-w-0 flex-1 stack-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="pageTitle" as="h1" className="text-[var(--text-primary)]">{titulo}</Text>
              {tipo !== 'serie' ? <Badge variant="neutral">{TIPO_AGRUPAMENTO_LABEL[tipo]}</Badge> : null}
              <Badge variant={selo.variant}>{selo.rotulo}</Badge>
            </div>
            {descricao ? (
              <Text variant="secondary" as="p" className="max-w-3xl">{descricao}</Text>
            ) : null}
            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Calendar className="h-4 w-4 shrink-0" aria-hidden />
              <Text variant="secondary" as="span">{cadencia}</Text>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AppButton
            variant="primary"
            onClick={adicionar ? adicionar.onEpisodio : onCreate}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Novo episódio
          </AppButton>
          <MoreMenu items={menu} label={`Mais ações de ${titulo}`} />
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-3 border-t border-[var(--border-color)] pt-[var(--space-md)]">
        <Text variant="sectionTitle" as="h2">Episódios</Text>
        <Text variant="sectionTitle" as="span" className="tabular-nums">{totais.total}</Text>
        <span className="hidden h-5 self-center border-l border-[var(--border-color)] sm:block" aria-hidden />
        <Text variant="secondary" as="p">
          {[
            contagem(totais.ideias, 'ideia', 'ideias'),
            contagem(totais.roteiros, 'roteiro', 'roteiros'),
            contagem(totais.producao, 'em produção', 'em produção'),
            contagem(totais.postados, 'postado', 'postados'),
          ].join(' · ')}
        </Text>
      </div>
    </div>
  );
}
