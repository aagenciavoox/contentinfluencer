import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, X } from 'lucide-react';
import { BottomSheetModal } from '../../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import type { Temporada } from '../../../../lib/database';
import { cn } from '../../../../lib/utils';
import { textoQuantidade, type EstadoMarcacao, type PlanoDefinirQuadro, type PlanoDefinirTemporada } from '../../lib/selecaoEpisodios';

const episodios = (quantidade: number) => textoQuantidade(quantidade, 'episódio', 'episódios');

/** Caixa com três estados: vazia, marcada e parcial. */
export function CaixaMarcacao({ estado, rotulo, onToggle, className }: {
  estado: EstadoMarcacao;
  rotulo: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={estado === 'todos' ? true : estado === 'parcial' ? 'mixed' : false}
      aria-label={rotulo}
      onClick={onToggle}
      className={cn(
        'relative z-[2] flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-input)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:h-11 pointer-coarse:w-11',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded-[calc(var(--radius-sm)/2)] border transition-colors',
          estado === 'nenhum'
            ? 'border-[var(--border-strong)] bg-[var(--bg-elevated)]'
            : 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]',
        )}
      >
        {estado === 'todos' ? <Check className="h-3 w-3 stroke-[3px]" /> : null}
        {estado === 'parcial' ? <Minus className="h-3 w-3 stroke-[3px]" /> : null}
      </span>
    </button>
  );
}

/** Barra presa ao pé da tela enquanto há seleção. No celular: contagem e "Ações", acima da área segura. */
export function BarraDeAcoes({
  quantidade,
  celular,
  temporadasHabilitadas,
  disponivel,
  onDefinirQuadro,
  onDefinirTemporada,
  onLimpar,
}: {
  quantidade: number;
  celular: boolean;
  temporadasHabilitadas: boolean;
  /** Falso enquanto a operação do banco não existe: ações desabilitadas com aviso. */
  disponivel: boolean;
  onDefinirQuadro: () => void;
  onDefinirTemporada: () => void;
  onLimpar: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const titulo = `${quantidade === 1 ? '1 episódio selecionado' : `${quantidade} episódios selecionados`}`;
  const aviso = disponivel ? null : 'Ações em massa ficam disponíveis depois de atualizar o banco.';
  const botoes = (bloco: boolean) => (
    <>
      <AppButton variant="primary" size="sm" className={cn(bloco && 'w-full')} disabled={!disponivel} onClick={() => { setMenu(false); onDefinirQuadro(); }}>
        Definir quadro
      </AppButton>
      {temporadasHabilitadas ? (
        <AppButton variant="secondary" size="sm" className={cn(bloco && 'w-full')} disabled={!disponivel} onClick={() => { setMenu(false); onDefinirTemporada(); }}>
          Definir temporada
        </AppButton>
      ) : null}
    </>
  );
  return (
    <div
      className={cn(
        'sticky z-30',
        'bottom-[calc(3.5rem+1px+max(0.25rem,env(safe-area-inset-bottom,0px))+var(--space-sm))]',
        'lg:bottom-[var(--space-lg)]',
      )}
    >
      <section
        aria-label="Ações nos episódios selecionados"
        className="mx-auto flex w-full flex-wrap items-center gap-2 rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 pl-4 shadow-[var(--shadow-dropdown)] md:w-fit md:max-w-full md:flex-nowrap md:gap-3"
      >
        <p className="t-item-title min-w-0 flex-1 truncate text-[var(--text-primary)] md:flex-none" aria-live="polite">{titulo}</p>
        {celular ? (
          <AppButton variant="primary" size="sm" onClick={() => setMenu(true)}>Ações</AppButton>
        ) : (
          <>
            {botoes(false)}
            <AppButton variant="ghost" size="sm" onClick={onLimpar}>Limpar seleção</AppButton>
          </>
        )}
        {celular ? (
          <AppButton variant="ghost" size="sm" iconOnly aria-label="Limpar seleção" title="Limpar seleção" onClick={onLimpar}>
            <X className="h-4 w-4" />
          </AppButton>
        ) : null}
        {aviso ? <Text variant="meta" as="p" className="w-full text-[var(--text-tertiary)]">{aviso}</Text> : null}
      </section>
      {celular ? (
        <BottomSheetModal open={menu} onClose={() => setMenu(false)} desktopMaxW="max-w-md" ariaLabel="Ações">
          <OverlayHeader title={titulo} onClose={() => setMenu(false)} />
          <OverlayBody className="stack-sm">
            {botoes(true)}
            <AppButton variant="ghost" size="sm" className="w-full" onClick={() => { setMenu(false); onLimpar(); }}>Limpar seleção</AppButton>
            {aviso ? <Text variant="meta" as="p">{aviso}</Text> : null}
          </OverlayBody>
        </BottomSheetModal>
      ) : null}
    </div>
  );
}

function Rodape({ salvando, desabilitado, rotulo, onClose, onConfirmar }: {
  salvando: boolean; desabilitado: boolean; rotulo: string; onClose: () => void; onConfirmar: () => void;
}) {
  return (
    <OverlayFooter>
      <AppButton variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</AppButton>
      <AppButton variant="primary" onClick={onConfirmar} disabled={desabilitado || salvando} aria-busy={salvando}>
        {salvando ? 'Salvando…' : rotulo}
      </AppButton>
    </OverlayFooter>
  );
}

/** Definir quadro: destino, resumo e avisos antes de salvar. */
export function DefinirQuadroSheet({
  open, quantidade, destinos, plano, salvando, erro, onClose, onConfirmar,
}: {
  open: boolean;
  quantidade: number;
  destinos: ReadonlyArray<{ id: string; label: string }>;
  plano: (destinoId: string) => PlanoDefinirQuadro;
  salvando: boolean;
  erro: string | null;
  onClose: () => void;
  onConfirmar: (destinoId: string) => void;
}) {
  const [destino, setDestino] = useState(destinos[0]?.id ?? '');
  useEffect(() => {
    if (open) setDestino(atual => (destinos.some(item => item.id === atual) ? atual : destinos[0]?.id ?? ''));
  }, [destinos, open]);
  const resultado = useMemo(() => (destino ? plano(destino) : null), [destino, plano]);
  const nome = destinos.find(item => item.id === destino)?.label ?? '';
  const mudam = resultado?.mudam.length ?? 0;
  return (
    <BottomSheetModal open={open} onClose={salvando ? () => undefined : onClose} desktopMaxW="max-w-md" ariaLabel="Definir quadro">
      <OverlayHeader title="Definir quadro" subtitle={`${episodios(quantidade)} selecionados`} onClose={onClose} />
      <OverlayBody className="stack-md">
        <div className="stack-xs">
          <Text variant="label" as="p">Destino</Text>
          <SelectField ariaLabel="Destino" value={destino} onChange={setDestino} options={destinos.map(item => ({ value: item.id, label: item.label }))} block />
        </div>
        <Text variant="bodyStrong" as="p">{mudam > 0 ? `Mover ${episodios(mudam)} para ${nome}` : 'Nenhum episódio precisa mudar.'}</Text>
        {resultado && resultado.jaNoDestino.length > 0 ? (
          <Text variant="meta" as="p">{`${episodios(resultado.jaNoDestino.length)} já ${resultado.jaNoDestino.length === 1 ? 'está' : 'estão'} aí e não ${resultado.jaNoDestino.length === 1 ? 'muda' : 'mudam'}.`}</Text>
        ) : null}
        {resultado && resultado.perdemTemporada.length > 0 ? (
          <Text variant="meta" as="p" className="text-[var(--status-warning,var(--text-primary))]" role="alert">
            {`Atenção: ${episodios(resultado.perdemTemporada.length)} ${resultado.perdemTemporada.length === 1 ? 'vai sair da temporada atual' : 'vão sair da temporada atual'}, porque ela não vale no destino.`}
          </Text>
        ) : null}
        <Text variant="meta" as="p">Roteiro, legendas, contas, datas e etapa não mudam. Pilar e objetivo escolhidos à mão continuam; os herdados passam a vir do destino. Os movidos vão para o fim da ordem.</Text>
        {erro ? <Text variant="meta" as="p" role="alert" className="text-[var(--status-danger,var(--text-primary))]">{erro}</Text> : null}
      </OverlayBody>
      <Rodape salvando={salvando} desabilitado={mudam === 0} rotulo="Mover episódios" onClose={onClose} onConfirmar={() => onConfirmar(destino)} />
    </BottomSheetModal>
  );
}

const SEM_TEMPORADA = '__sem__';

/** Definir temporada: só temporadas válidas para todos os selecionados, mais "Sem temporada". */
export function DefinirTemporadaSheet({
  open, quantidade, comuns, plano, salvando, erro, onClose, onConfirmar,
}: {
  open: boolean;
  quantidade: number;
  comuns: readonly Temporada[];
  plano: (temporadaId: string | null) => PlanoDefinirTemporada;
  salvando: boolean;
  erro: string | null;
  onClose: () => void;
  onConfirmar: (temporadaId: string | null) => void;
}) {
  const [escolha, setEscolha] = useState(comuns[0]?.id ?? SEM_TEMPORADA);
  useEffect(() => {
    if (open) setEscolha(atual => (atual === SEM_TEMPORADA || comuns.some(item => item.id === atual) ? atual : comuns[0]?.id ?? SEM_TEMPORADA));
  }, [comuns, open]);
  const temporadaId = escolha === SEM_TEMPORADA ? null : escolha;
  const resultado = useMemo(() => plano(temporadaId), [plano, temporadaId]);
  const nome = temporadaId ? comuns.find(item => item.id === temporadaId)?.nome ?? '' : 'Sem temporada';
  const mudam = resultado.mudam.length;
  return (
    <BottomSheetModal open={open} onClose={salvando ? () => undefined : onClose} desktopMaxW="max-w-md" ariaLabel="Definir temporada">
      <OverlayHeader title="Definir temporada" subtitle={`${episodios(quantidade)} selecionados`} onClose={onClose} />
      <OverlayBody className="stack-md">
        <div className="stack-xs">
          <Text variant="label" as="p">Temporada</Text>
          <SelectField
            ariaLabel="Temporada"
            value={escolha}
            onChange={setEscolha}
            options={[...comuns.map(item => ({ value: item.id, label: item.nome })), { value: SEM_TEMPORADA, label: 'Sem temporada' }]}
            block
          />
        </div>
        {comuns.length === 0 ? (
          <Text variant="meta" as="p">Os episódios selecionados não têm nenhuma temporada em comum. Para pôr numa temporada, selecione só episódios desta série ou de quadros que usam as mesmas temporadas.</Text>
        ) : null}
        <Text variant="bodyStrong" as="p">{mudam > 0 ? `${temporadaId ? 'Colocar' : 'Tirar'} ${episodios(mudam)} ${temporadaId ? `em ${nome}` : 'da temporada'}` : 'Nenhum episódio precisa mudar.'}</Text>
        {resultado.jaNoDestino.length > 0 ? (
          <Text variant="meta" as="p">{`${episodios(resultado.jaNoDestino.length)} já ${resultado.jaNoDestino.length === 1 ? 'está' : 'estão'} assim e não ${resultado.jaNoDestino.length === 1 ? 'muda' : 'mudam'}.`}</Text>
        ) : null}
        {resultado.substituem > 0 ? (
          <Text variant="meta" as="p" role="alert">{`Atenção: ${episodios(resultado.substituem)} já ${resultado.substituem === 1 ? 'tem' : 'têm'} outra temporada, que será substituída.`}</Text>
        ) : null}
        <Text variant="meta" as="p">Só a temporada muda. O quadro de cada episódio continua o mesmo.</Text>
        {erro ? <Text variant="meta" as="p" role="alert">{erro}</Text> : null}
      </OverlayBody>
      <Rodape salvando={salvando} desabilitado={mudam === 0} rotulo="Definir temporada" onClose={onClose} onConfirmar={() => onConfirmar(temporadaId)} />
    </BottomSheetModal>
  );
}
