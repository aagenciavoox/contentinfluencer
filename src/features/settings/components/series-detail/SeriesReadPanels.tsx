import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import type { Pilar, Platform, Serie, Temporada } from '../../../../lib/database';
import { ENERGIA_LABELS } from '../../../editorial/lib/editorialOptions';
import { rotuloFuncaoPadrao } from '../../../editorial/lib/funcoes';
import { pilarPrincipalDaSerie } from '../../../editorial/lib/pilarDaSerie';
import { filhosDaSerie } from '../../../editorial/lib/serieArvore';

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="stack-xs">
      <Text variant="label" as="p">{rotulo}</Text>
      <Text variant="body" as="p">{valor}</Text>
    </div>
  );
}

export function SeriesAboutPanel({
  serie,
  series,
  pilares,
  temporadas,
  onEdit,
}: {
  serie: Serie;
  series: readonly Serie[];
  pilares: readonly Pilar[];
  temporadas: readonly Temporada[];
  onEdit: () => void;
}) {
  const pilarId = pilarPrincipalDaSerie(serie);
  const pilar = pilarId ? pilares.find(item => item.id === pilarId)?.nome : null;
  const pai = serie.parentId ? series.find(item => item.id === serie.parentId)?.name : null;
  const quadros = filhosDaSerie(serie.id, series).map(item => item.name?.trim() || 'Quadro');
  const nomesTemporada = temporadas.map(item => item.nome);
  const campos = [
    serie.notes?.trim() ? { rotulo: 'Proposta', valor: serie.notes.trim() } : null,
    serie.bordao?.trim() ? { rotulo: 'Elemento fixo', valor: serie.bordao.trim() } : null,
    pilar ? { rotulo: 'Pilar', valor: pilar } : null,
    pai ? { rotulo: 'Faz parte de', valor: pai } : null,
    quadros.length > 0 ? { rotulo: 'Quadros', valor: quadros.join(', ') } : null,
    nomesTemporada.length > 0 ? { rotulo: 'Temporadas', valor: nomesTemporada.join(', ') } : null,
  ].filter((item): item is { rotulo: string; valor: string } => Boolean(item));

  return (
    <Surface variant="outlined" padding="md" className="stack-lg">
      {campos.length > 0 ? (
        campos.map(campo => <Campo key={campo.rotulo} rotulo={campo.rotulo} valor={campo.valor} />)
      ) : (
        <Text variant="secondary">Nada preenchido sobre esta série ainda.</Text>
      )}
      <AppButton variant="secondary" onClick={onEdit}>Editar</AppButton>
    </Surface>
  );
}

export function SeriesSettingsPanel({
  serie,
  series,
  plataformas,
  onEdit,
}: {
  serie: Serie;
  series: readonly Serie[];
  plataformas: readonly Platform[];
  onEdit: () => void;
}) {
  const contas = serie.plataformas
    .map(item => plataformas.find(conta => conta.id === item.platformId)?.nome)
    .filter((nome): nome is string => Boolean(nome));
  const formatos = (serie.formatoVisualPadrao ?? []).map(item => item.trim()).filter(Boolean);
  const filhos = filhosDaSerie(serie.id, series);
  const heranca = serie.parentId
    ? 'O que ficar vazio aqui continua vindo do agrupamento superior.'
    : filhos.length > 0
      ? 'Quadros sem definição própria usam estes padrões.'
      : 'Conteúdos novos usam estes padrões.';

  return (
    <Surface variant="outlined" padding="md" className="stack-lg">
      <Campo rotulo="Frequência" valor={serie.frequenciaRecomendada?.trim() || 'Não definida'} />
      <Campo rotulo="Objetivo" valor={rotuloFuncaoPadrao(serie.funcaoPadrao) || 'Não definido'} />
      <Campo rotulo="Esforço" valor={serie.energiaPadrao ? ENERGIA_LABELS[serie.energiaPadrao] : 'Não definido'} />
      <Campo rotulo="Formatos" valor={formatos.length > 0 ? formatos.join(', ') : 'Não definido'} />
      <Campo rotulo="Contas" valor={contas.length > 0 ? contas.join(', ') : 'Nenhuma conta ligada'} />
      <Text variant="secondary">{heranca}</Text>
      <AppButton variant="secondary" onClick={onEdit}>Editar</AppButton>
    </Surface>
  );
}
