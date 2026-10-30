import { ValorVazio } from '../../../../components/ui/ValorVazio';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { platformDisplayName } from '../../../../components/ui/platformName';
import { getVisualFormatLabel } from '../../../../constants';
import type { Pilar, Platform, Serie, Temporada, Template } from '../../../../lib/database';
import { ENERGIA_LABELS } from '../../../editorial/lib/editorialOptions';
import { rotuloFuncaoPadrao } from '../../../editorial/lib/funcoes';
import { pilarPrincipalDaSerie } from '../../../editorial/lib/pilarDaSerie';
import { filhosDaSerie } from '../../../editorial/lib/serieArvore';

function textoOuVazio(valor: string | null | undefined) {
  const limpo = valor?.trim() ?? '';
  return limpo || null;
}

function listaOuVazio(itens: readonly string[]) {
  const limpos = itens.map(item => item.trim()).filter(Boolean);
  return limpos.length > 0 ? limpos.join(', ') : null;
}

function Campo({ rotulo, valor, clamp }: { rotulo: string; valor: string | null; clamp?: boolean }) {
  return (
    <div className="stack-xs">
      <Text variant="label" as="p">{rotulo}</Text>
      <Text
        variant="body"
        as="p"
        className={clamp ? 'line-clamp-2 whitespace-pre-line' : undefined}
      >
        {valor ?? <ValorVazio />}
      </Text>
    </div>
  );
}

function Bloco({
  titulo,
  editar,
  children,
}: {
  titulo: string;
  editar: string;
  children: ReactNode;
}) {
  return (
    <Surface variant="info" padding="md" className="stack-lg">
      <div className="flex items-center justify-between gap-3">
        <Text variant="itemTitle" as="h2">{titulo}</Text>
        <Link
          to={editar}
          className="shrink-0 rounded-[var(--radius-input)] px-2 py-1 t-body-strong text-[var(--text-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          Editar
        </Link>
      </div>
      {children}
    </Surface>
  );
}

export function SeriesDefinicoes({
  serie,
  series,
  pilares,
  temporadas,
  plataformas,
  templates,
}: {
  serie: Serie;
  series: readonly Serie[];
  pilares: readonly Pilar[];
  temporadas: readonly Temporada[];
  plataformas: readonly Platform[];
  templates: readonly Template[];
}) {
  const pilarId = pilarPrincipalDaSerie(serie);
  const pilar = pilarId ? pilares.find(item => item.id === pilarId)?.nome : null;
  const pai = serie.parentId ? series.find(item => item.id === serie.parentId)?.name : null;
  const quadros = filhosDaSerie(serie.id, series).map(item => item.name?.trim() || 'Quadro');
  const formatos = (serie.formatoVisualPadrao ?? []).map(item => getVisualFormatLabel(item));
  const contas = serie.plataformas.flatMap(item => {
    const nome = plataformas.find(conta => conta.id === item.platformId)?.nome;
    if (!nome) return [];
    return [{
      id: item.platformId,
      nome: platformDisplayName(nome),
      hashtags: item.hashtags?.trim() || null,
    }];
  });
  const templatesDaSerie = templates.filter(item => item.seriesId === serie.id && item.ativo).length;

  return (
    <div className="stack-lg">
      <Bloco titulo="Sobre" editar={`/series/${serie.id}/editar?aba=sobre`}>
        <Campo rotulo="Elemento fixo" valor={textoOuVazio(serie.bordao)} />
        <Campo rotulo="Pilar" valor={textoOuVazio(pilar)} />
        <Campo rotulo="Faz parte de" valor={textoOuVazio(pai)} />
        <Campo rotulo="Quadros" valor={listaOuVazio(quadros)} />
        <Campo rotulo="Temporadas" valor={listaOuVazio(temporadas.map(item => item.nome))} />
        <Campo rotulo="Frequência" valor={textoOuVazio(serie.frequenciaRecomendada)} />
        <Campo rotulo="Função" valor={textoOuVazio(rotuloFuncaoPadrao(serie.funcaoPadrao))} />
        <Campo rotulo="Esforço" valor={serie.energiaPadrao ? ENERGIA_LABELS[serie.energiaPadrao] : null} />
        <Campo rotulo="Formatos" valor={listaOuVazio(formatos)} />
      </Bloco>

      <Bloco titulo="Roteiros" editar={`/series/${serie.id}/editar?aba=roteiros`}>
        <Campo rotulo="Estrutura do roteiro" valor={textoOuVazio(serie.estruturaRoteiro)} clamp />
        <Campo rotulo="Templates" valor={String(templatesDaSerie)} />
      </Bloco>

      <Bloco titulo="Publicação" editar={`/series/${serie.id}/editar?aba=publicacao`}>
        <Campo rotulo="Contas" valor={listaOuVazio(contas.map(item => item.nome))} />
        <Campo rotulo="Legenda-base" valor={serie.legendaBase?.trim() ? 'Sim' : null} />
        {contas.length === 0 ? (
          <Campo rotulo="Hashtags" valor={null} />
        ) : (
          contas.map(conta => (
            <Campo key={conta.id} rotulo={`Hashtags · ${conta.nome}`} valor={conta.hashtags} />
          ))
        )}
      </Bloco>
    </div>
  );
}
