import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import { atualizarIndicador } from '../../lib/editorialSettings';
import {
  INDICADORES_DE_PRODUCAO,
  rascunhoDaFaixa,
  textoDaFaixa,
  validarFaixa,
  type ErroDaFaixa,
  type IndicadorDeProducao,
  type RascunhoDaFaixa,
} from '../../lib/indicadoresProducao';
import { CAMPO, CardConfiguracao } from './campos';
import { useEditorialPlano } from './useEditorialPlano';

const CAMPOS: Array<{ id: keyof RascunhoDaFaixa; rotulo: string }> = [
  { id: 'minimo', rotulo: 'Mínimo' },
  { id: 'meta', rotulo: 'Meta' },
  { id: 'maximo', rotulo: 'Máximo' },
];

function EditorDoIndicador({ id, titulo, unidade, ajuda }: { id: IndicadorDeProducao; titulo: string; unidade: string; ajuda: string }) {
  const { settings, gravar } = useEditorialPlano();
  const gravada = settings.indicadoresProducao?.[id] ?? null;
  const [rascunho, setRascunho] = useState<RascunhoDaFaixa>(() => rascunhoDaFaixa(gravada));
  const [erros, setErros] = useState<ErroDaFaixa[]>([]);
  const [gravando, setGravando] = useState(false);
  const chaveGravada = JSON.stringify(gravada);
  useEffect(() => {
    setRascunho(rascunhoDaFaixa(gravada));
    setErros([]);
    // Volta ao gravado quando o valor salvo muda (outra aba, realtime).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveGravada]);

  const alterado = JSON.stringify(rascunho) !== JSON.stringify(rascunhoDaFaixa(gravada));
  const erroDe = (campo: keyof RascunhoDaFaixa) => erros.find(item => item.campo === campo)?.mensagem;

  const salvar = async () => {
    const { faixa, erros: lista } = validarFaixa(rascunho);
    setErros(lista);
    if (lista.length > 0) return;
    setGravando(true);
    try {
      await gravar(atualizarIndicador(settings, id, faixa));
    } finally {
      setGravando(false);
    }
  };

  return (
    <div className="stack-sm border-t border-[var(--border-subtle)] pt-3 first:border-t-0 first:pt-0">
      <div className="stack-xs">
        <div className="inline-flex items-center">
          <Text variant="bodyStrong" as="h4">{titulo}</Text>
          <Ajuda rotulo={`Sobre ${titulo}`} texto={ajuda} />
        </div>
        {gravada ? (
          <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">Gravado: {textoDaFaixa(gravada)} {unidade}</Text>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {CAMPOS.map(campo => {
          const campoId = `indicador-${id}-${campo.id}`;
          const erro = erroDe(campo.id);
          return (
            <label key={campo.id} htmlFor={campoId} className="flex flex-col gap-1">
              <Text variant="meta" as="span">
                {campo.rotulo}
                {campo.id === 'meta' && (rascunho.minimo.trim() || rascunho.maximo.trim() || rascunho.meta.trim())
                  ? <span className="text-[var(--brand-accent-text)]"> *</span>
                  : null}
              </Text>
              <input
                id={campoId}
                type="text"
                inputMode="numeric"
                className={CAMPO}
                value={rascunho[campo.id]}
                aria-invalid={erro ? true : undefined}
                aria-describedby={erro ? `${campoId}-erro` : undefined}
                style={erro ? { borderColor: 'var(--danger)' } : undefined}
                onChange={event => setRascunho(atual => ({ ...atual, [campo.id]: event.target.value.slice(0, 4) }))}
              />
              {erro ? <Text id={`${campoId}-erro`} variant="meta" as="span" className="texto-erro">{erro}</Text> : null}
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <AppButton variant="primary" size="sm" onClick={() => void salvar()} disabled={!alterado || gravando}>
          {gravando ? 'Salvando…' : 'Salvar rotina'}
        </AppButton>
        {gravada ? (
          <AppButton
            variant="ghost"
            size="sm"
            disabled={gravando}
            onClick={() => {
              setRascunho({ minimo: '', meta: '', maximo: '' });
              setErros([]);
              void gravar(atualizarIndicador(settings, id, null));
            }}
          >
            Remover indicador
          </AppButton>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Indicadores opcionais da rotina. Só a meta é obrigatória quando a faixa é usada.
 * Mínimo e máximo viram referência de alerta na Saúde; entre eles, é progresso.
 * O teto de gravações por dia continua separado, na capacidade.
 */
export function IndicadoresDaRotinaCard() {
  return (
    <CardConfiguracao
      icone={<Gauge className="h-5 w-5" />}
      titulo="Ritmo de criação"
      descricao="Comece pela meta. Se quiser, acrescente um mínimo, um máximo ou os dois. O teto de gravações por dia fica em Tetos."
    >
      <div className="stack-md">
        {INDICADORES_DE_PRODUCAO.map(item => (
          <EditorDoIndicador key={item.id} {...item} />
        ))}
      </div>
    </CardConfiguracao>
  );
}
