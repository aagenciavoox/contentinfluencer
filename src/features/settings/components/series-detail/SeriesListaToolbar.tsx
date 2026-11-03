import { useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { ToolbarSearchInput } from '../../../../components/ui/ToolbarSearchInput';
import {
  ETAPAS_DO_FILTRO,
  ROTULO_AGRUPAR,
  ROTULO_ORDEM,
  filtrosListaAtivos,
  textoExibindo,
  type AgruparLista,
  type FiltrosLista,
  type OrdemLista,
} from '../../lib/seriesLista';

type Opcao = { id: string; label: string };

type Props = {
  filtros: FiltrosLista;
  onFiltros: (patch: Partial<FiltrosLista>) => void;
  onLimpar: () => void;
  agrupar: AgruparLista;
  opcoesAgrupar: readonly AgruparLista[];
  onAgrupar: (valor: AgruparLista) => void;
  ordem: OrdemLista;
  opcoesOrdem: readonly OrdemLista[];
  onOrdem: (valor: OrdemLista) => void;
  quadros: readonly Opcao[];
  contas: readonly Opcao[];
  /** Null quando a série não usa temporadas (o filtro some). */
  temporadas: readonly Opcao[] | null;
  visiveis: number;
  total: number;
  celular: boolean;
  /** Aviso curto sobre a ordem manual (ex.: indisponível ou sem setas nesta visualização). */
  avisoOrdem: string | null;
  acoes?: ReactNode;
};

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="stack-xs min-w-0">
      <Text variant="label" as="p">{rotulo}</Text>
      {children}
    </div>
  );
}

/** Busca, filtros, agrupamento e ordem da lista da série. Só muda a apresentação. */
export function SeriesListaToolbar(props: Props) {
  const { filtros, onFiltros, onLimpar, celular, visiveis, total } = props;
  const [maisFiltros, setMaisFiltros] = useState(false);
  const [painel, setPainel] = useState(false);
  const ativos = filtrosListaAtivos(filtros);

  const nomeDe = (lista: readonly Opcao[] | null, id: string) => lista?.find(item => item.id === id)?.label ?? id;
  const chips: Array<{ id: string; label: string; limpar: () => void }> = [
    ...(filtros.busca.trim() ? [{ id: 'busca', label: `Busca: ${filtros.busca.trim()}`, limpar: () => onFiltros({ busca: '' }) }] : []),
    ...(filtros.etapa !== 'todas' ? [{ id: 'etapa', label: `Etapa: ${ETAPAS_DO_FILTRO.find(item => item.value === filtros.etapa)?.label}`, limpar: () => onFiltros({ etapa: 'todas' }) }] : []),
    ...(filtros.quadro !== 'todos' ? [{ id: 'quadro', label: filtros.quadro === 'sem' ? 'Sem quadro' : `Quadro: ${nomeDe(props.quadros, filtros.quadro)}`, limpar: () => onFiltros({ quadro: 'todos' }) }] : []),
    ...(filtros.conta !== 'todas' ? [{ id: 'conta', label: `Conta: ${nomeDe(props.contas, filtros.conta)}`, limpar: () => onFiltros({ conta: 'todas' }) }] : []),
    ...(filtros.temporada !== 'todas' ? [{ id: 'temporada', label: filtros.temporada === 'sem' ? 'Sem temporada' : `Temporada: ${nomeDe(props.temporadas, filtros.temporada)}`, limpar: () => onFiltros({ temporada: 'todas' }) }] : []),
  ];

  const etapa = (
    <SelectField
      ariaLabel="Etapa"
      prefix="Etapa:"
      value={filtros.etapa}
      onChange={valor => onFiltros({ etapa: valor as FiltrosLista['etapa'] })}
      options={ETAPAS_DO_FILTRO.map(item => ({ value: item.value, label: item.label }))}
      selected={filtros.etapa !== 'todas'}
      block={celular}
    />
  );
  const quadro = props.quadros.length > 0 ? (
    <SelectField
      ariaLabel="Quadro"
      prefix="Quadro:"
      value={filtros.quadro}
      onChange={valor => onFiltros({ quadro: valor })}
      options={[{ value: 'todos', label: 'Todos' }, { value: 'sem', label: 'Sem quadro' }, ...props.quadros.map(item => ({ value: item.id, label: item.label }))]}
      selected={filtros.quadro !== 'todos'}
      block={celular}
    />
  ) : null;
  const conta = props.contas.length > 0 ? (
    <SelectField
      ariaLabel="Conta"
      prefix="Conta:"
      value={filtros.conta}
      onChange={valor => onFiltros({ conta: valor })}
      options={[{ value: 'todas', label: 'Todas' }, ...props.contas.map(item => ({ value: item.id, label: item.label }))]}
      selected={filtros.conta !== 'todas'}
      block={celular}
    />
  ) : null;
  const temporada = props.temporadas ? (
    <SelectField
      ariaLabel="Temporada"
      prefix="Temporada:"
      value={filtros.temporada}
      onChange={valor => onFiltros({ temporada: valor })}
      options={[{ value: 'todas', label: 'Todas' }, { value: 'sem', label: 'Sem temporada' }, ...props.temporadas.map(item => ({ value: item.id, label: item.label }))]}
      selected={filtros.temporada !== 'todas'}
      block={celular}
    />
  ) : null;
  const agrupar = props.opcoesAgrupar.length > 1 ? (
    <SelectField
      ariaLabel="Agrupar por"
      prefix="Agrupar por:"
      value={props.agrupar}
      onChange={valor => props.onAgrupar(valor as AgruparLista)}
      options={props.opcoesAgrupar.map(item => ({ value: item, label: ROTULO_AGRUPAR[item] }))}
      block={celular}
    />
  ) : null;
  const ordenar = (
    <SelectField
      ariaLabel="Ordenar"
      prefix="Ordenar:"
      value={props.ordem}
      onChange={valor => props.onOrdem(valor as OrdemLista)}
      options={props.opcoesOrdem.map(item => ({ value: item, label: ROTULO_ORDEM[item] }))}
      block={celular}
    />
  );
  const extras = [quadro, conta, temporada].filter(Boolean).length;

  const resumo = (
    <div className="flex flex-wrap items-center gap-2">
      <Text variant="meta" as="span" aria-live="polite">{textoExibindo(visiveis, total)}</Text>
      {chips.map(chip => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.limpar}
          className="inline-flex max-w-full items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--surface-subtle)] px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11"
          aria-label={`Remover filtro ${chip.label}`}
        >
          <Text variant="meta" as="span" className="truncate">{chip.label}</Text>
          <X className="h-3 w-3 shrink-0" aria-hidden />
        </button>
      ))}
      {ativos ? (
        <AppButton variant="ghost" size="sm" onClick={onLimpar}>Limpar filtros</AppButton>
      ) : null}
      {props.avisoOrdem ? <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">{props.avisoOrdem}</Text> : null}
    </div>
  );

  if (celular) {
    return (
      <div className="stack-sm py-2">
        <div className="flex items-center gap-2">
          <ToolbarSearchInput
            value={filtros.busca}
            onChange={valor => onFiltros({ busca: valor })}
            placeholder="Buscar episódio"
            className="min-w-0 flex-1"
          />
          <AppButton variant="secondary" leftIcon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setPainel(true)}>
            Filtrar e organizar
          </AppButton>
        </div>
        {resumo}
        <BottomSheetModal open={painel} onClose={() => setPainel(false)} desktopMaxW="max-w-md" ariaLabel="Filtrar e organizar">
          <OverlayHeader title="Filtrar e organizar" onClose={() => setPainel(false)} />
          <OverlayBody className="stack-md">
            <Campo rotulo="Etapa">{etapa}</Campo>
            {quadro ? <Campo rotulo="Quadro">{quadro}</Campo> : null}
            {conta ? <Campo rotulo="Conta">{conta}</Campo> : null}
            {temporada ? <Campo rotulo="Temporada">{temporada}</Campo> : null}
            {agrupar ? <Campo rotulo="Agrupar por">{agrupar}</Campo> : null}
            <Campo rotulo="Ordenar">{ordenar}</Campo>
          </OverlayBody>
          <OverlayFooter>
            {ativos ? <AppButton variant="secondary" onClick={onLimpar}>Limpar filtros</AppButton> : null}
            <AppButton variant="primary" onClick={() => setPainel(false)}>{textoExibindo(visiveis, total)}</AppButton>
          </OverlayFooter>
        </BottomSheetModal>
      </div>
    );
  }

  return (
    <div className="stack-sm py-2">
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarSearchInput
          value={filtros.busca}
          onChange={valor => onFiltros({ busca: valor })}
          placeholder="Buscar episódio"
          className="w-full max-w-xs"
        />
        {etapa}
        {extras > 0 ? (
          <AppButton
            variant={maisFiltros ? 'secondary' : 'ghost'}
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            aria-expanded={maisFiltros}
            onClick={() => setMaisFiltros(aberto => !aberto)}
          >
            Mais filtros
          </AppButton>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {agrupar}
          {ordenar}
          {props.acoes}
        </div>
      </div>
      {maisFiltros && extras > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {quadro}
          {conta}
          {temporada}
        </div>
      ) : null}
      {resumo}
    </div>
  );
}
