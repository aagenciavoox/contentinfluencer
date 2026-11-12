/** Meta semanal de cada conta: o texto da tabela e a gaveta de edição. */
import { useState } from 'react';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { Drawer } from '../../../../components/overlays/Drawer';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import type { Platform, RedeSocial } from '../../../../lib/database';
import { REDE_ROTULO, exibirHandle, iconeDaConta, redeDaConta } from '../../../contas/lib/contas';
import { agendarMetaDaConta, metaDaContaHoje, type MetaDaContaVigencia } from '../../lib/metasPorConta';
import type { ProporcaoFuncoes } from '../../lib/proporcaoObjetivos';
import { somaDaProporcao } from '../../lib/proporcaoObjetivos';
import { FORMATOS_DA_REDE, rotuloDoFormato } from '../../lib/publicacoes';
import { domingosParaVigencia } from '../../lib/vigencias';
import { CampoStepper, inteiroOuNull } from './campos';
import { ProporcaoObjetivosEditor, proporcaoEmTexto } from './ProporcaoObjetivosEditor';
import { useEditorialPlano } from './useEditorialPlano';
import { ValeAPartirDe } from './ValeAPartirDe';

function textoNumero(valor: number | null | undefined): string {
  return valor == null ? '' : String(valor);
}

function nomeNoResumo(formato: string, rede: RedeSocial | null, quantidade: number): string {
  if (formato === 'reels' && rede === 'tiktok') return quantidade === 1 ? 'vídeo' : 'vídeos';
  if (formato === 'reels') return 'Reels';
  if (formato === 'short') return quantidade === 1 ? 'Short' : 'Shorts';
  if (formato === 'video-longo') return quantidade === 1 ? 'vídeo longo' : 'vídeos longos';
  if (formato === 'carrossel') return quantidade === 1 ? 'carrossel' : 'carrosséis';
  if (formato === 'post-estatico') return quantidade === 1 ? 'post estático' : 'posts estáticos';
  return rotuloDoFormato(formato, rede);
}

/** "10 Reels · 1 carrossel · 3 sem formato". Vazio quando a conta não tem meta. */
export function textoPorFormato(linha: MetaDaContaVigencia | null, rede: RedeSocial | null): string {
  if (linha?.limiteSemanal == null) return '';
  const ordem = (rede ? FORMATOS_DA_REDE[rede] : undefined) ?? [];
  const indice = (formato: string) => {
    const posicao = ordem.findIndex(item => item === formato);
    return posicao < 0 ? ordem.length : posicao;
  };
  const parcelas = Object.entries(linha.parcelasFormato ?? {})
    .filter(([, valor]) => valor > 0)
    .sort(([esquerda], [direita]) => indice(esquerda) - indice(direita));
  const partes = parcelas.map(([formato, valor]) => `${valor} ${nomeNoResumo(formato, rede, valor)}`);
  const soma = parcelas.reduce((total, [, valor]) => total + valor, 0);
  const sobra = linha.limiteSemanal - soma;
  if (sobra > 0) partes.push(`${sobra} sem formato`);
  return partes.join(' · ');
}

function nomeDaRede(conta: Platform): string {
  const rede = redeDaConta(conta);
  return rede && rede !== 'outra' ? REDE_ROTULO[rede] : conta.nome;
}

type ModoProporcao = 'geral' | 'propria';

function OpcaoMarcada({
  marcada,
  children,
  onClick,
}: {
  marcada: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcada}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-[var(--radius-input)] border px-4 py-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        marcada
          ? 'border-[var(--brand-accent-strong)] bg-[var(--brand-accent-strong)] text-[var(--brand-on-accent)]'
          : 'border-[var(--border-input)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
      )}
    >
      <Text variant="button" as="span">
        {children}
      </Text>
    </button>
  );
}

/** Total da semana, formatos e proporção, a partir de uma segunda escolhida. */
function EditorDaConta({
  conta,
  linhas,
  proporcaoGeral,
  hoje,
  onSalvar,
  onCancelar,
}: {
  conta: Platform;
  linhas: readonly MetaDaContaVigencia[];
  proporcaoGeral: ProporcaoFuncoes | null;
  hoje: string;
  onSalvar: (linhas: MetaDaContaVigencia[]) => void;
  onCancelar: () => void;
}) {
  const rede = redeDaConta(conta);
  const atual = metaDaContaHoje(linhas, conta.id, hoje);
  const formatos = [...new Set([...(rede ? FORMATOS_DA_REDE[rede] ?? [] : []), ...Object.keys(atual?.parcelasFormato ?? {})])];
  const [limite, setLimite] = useState(textoNumero(atual?.limiteSemanal));
  const [parcelas, setParcelas] = useState<Record<string, string>>(() => (
    Object.fromEntries(formatos.map(formato => [formato, textoNumero(atual?.parcelasFormato?.[formato])]))
  ));
  const [modo, setModo] = useState<ModoProporcao>(atual?.proporcaoFuncoes ? 'propria' : 'geral');
  const [proporcao, setProporcao] = useState<ProporcaoFuncoes | null>(atual?.proporcaoFuncoes ?? null);
  const [editandoProporcao, setEditandoProporcao] = useState(false);
  const [desde, setDesde] = useState(domingosParaVigencia(hoje).estaSemana);

  const total = inteiroOuNull(limite);
  const parcelasNumero = Object.fromEntries(
    Object.entries(parcelas).flatMap(([formato, valor]) => {
      const numero = inteiroOuNull(valor);
      return numero ? [[formato, numero]] : [];
    }),
  ) as Record<string, number>;
  const somaParcelas = Object.values(parcelasNumero).reduce((soma, valor) => soma + valor, 0);
  const erroParcelas = somaParcelas > 0 && total == null
    ? 'Defina o total da conta antes de dividir por formato.'
    : total != null && somaParcelas > total
      ? `Os formatos somam ${somaParcelas} e passam do total da conta (${total}).`
      : undefined;
  const faltaProporcao = modo === 'propria' && total != null && !proporcao;
  const proporcaoNaoFecha = modo === 'propria' && proporcao != null && somaDaProporcao(proporcao) !== 100;
  const bloqueio = erroParcelas
    ?? (faltaProporcao ? 'Defina a distribuição da conta ou use a geral.' : undefined)
    ?? (proporcaoNaoFecha ? 'A distribuição da conta precisa fechar em 100%.' : undefined);

  const valores = {
    limiteSemanal: total,
    proporcaoFuncoes: modo === 'propria' && total != null ? proporcao : null,
    parcelasFormato: total != null && somaParcelas > 0 ? parcelasNumero : null,
  };
  const igualHoje = atual
    ? atual.limiteSemanal === valores.limiteSemanal
      && JSON.stringify(atual.proporcaoFuncoes) === JSON.stringify(valores.proporcaoFuncoes)
      && JSON.stringify(atual.parcelasFormato) === JSON.stringify(valores.parcelasFormato)
    : valores.limiteSemanal == null;

  const salvar = () => {
    if (bloqueio) return;
    if (igualHoje && desde === domingosParaVigencia(hoje).estaSemana) {
      onCancelar();
      return;
    }
    onSalvar(agendarMetaDaConta(linhas, conta.id, desde, valores, hoje));
  };

  const sobra = total != null && somaParcelas <= total ? total - somaParcelas : 0;
  const notas = [
    !erroParcelas && sobra > 0
      ? (sobra === 1 ? '1 publicação sem formato definido.' : `${sobra} publicações sem formato definido.`)
      : '',
    rede === 'instagram' ? 'Stories ficam fora da meta semanal.' : '',
  ].filter(Boolean).join(' ');
  const textoProporcao = modo === 'propria'
    ? (proporcao ? proporcaoEmTexto(proporcao) : '')
    : (proporcaoGeral ? proporcaoEmTexto(proporcaoGeral) : 'Ainda não definida.');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="overlay-body min-h-0 flex-1 overflow-y-auto">
        <div className="stack-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="stack-xs">
              <Text variant="bodyStrong" as="span">Meta semanal</Text>
              <Text variant="secondary" as="p">Publicações por semana</Text>
              {total == null ? (
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">Sem meta para este período.</Text>
              ) : null}
            </div>
            <CampoStepper
              id={`conta-${conta.id}-limite`}
              label="Publicações por semana"
              rotuloVisivel={false}
              value={limite}
              onChange={setLimite}
            />
          </div>

          {formatos.length > 0 ? (
            <div className="stack-sm">
              <div className="inline-flex items-center">
                <Text variant="bodyStrong" as="span">Metas por formato</Text>
                <Ajuda rotulo="Sobre metas por formato" texto="Quer acompanhar Reels, Shorts ou outro formato de perto? Escolha o formato e defina a quantidade." />
              </div>
              {formatos.map(formato => (
                <CampoStepper
                  key={formato}
                  id={`conta-${conta.id}-formato-${formato}`}
                  label={rotuloDoFormato(formato, rede)}
                  layout="row"
                  zeroViraVazio
                  value={parcelas[formato] ?? ''}
                  onChange={valor => setParcelas(atuais => ({ ...atuais, [formato]: valor }))}
                />
              ))}
              {erroParcelas ? <Text variant="meta" className="text-[var(--accent-red)]">{erroParcelas}</Text> : null}
              {notas ? <Text variant="secondary" as="p">{notas}</Text> : null}
            </div>
          ) : rede === 'instagram' ? (
            <Text variant="secondary" as="p">Stories ficam fora da meta semanal.</Text>
          ) : null}

          <div className="stack-sm">
            <div className="inline-flex items-center">
              <Text variant="bodyStrong" as="span">Distribuição por objetivo</Text>
              <Ajuda rotulo="Sobre a distribuição da conta" texto="Você pode usar a mesma distribuição da Direção editorial ou escolher uma para esta conta." />
            </div>
            <div role="radiogroup" aria-label="Distribuição da conta" className="flex flex-wrap gap-2">
              <OpcaoMarcada
                marcada={modo === 'geral'}
                onClick={() => {
                  setModo('geral');
                  setEditandoProporcao(false);
                }}
              >
                Usar a distribuição geral
              </OpcaoMarcada>
              <OpcaoMarcada
                marcada={modo === 'propria'}
                onClick={() => {
                  setModo('propria');
                  if (!proporcao) setEditandoProporcao(true);
                }}
              >
                Definir para esta conta
              </OpcaoMarcada>
            </div>
            {modo === 'propria' && editandoProporcao ? (
              <ProporcaoObjetivosEditor
                idBase={`conta-${conta.id}-proporcao`}
                valor={proporcao ?? proporcaoGeral}
                rotuloSalvar="Salvar distribuição"
                onCancelar={() => {
                  setEditandoProporcao(false);
                  if (!proporcao) setModo('geral');
                }}
                onSalvar={nova => {
                  setProporcao(nova);
                  setEditandoProporcao(false);
                  if (!nova) setModo('geral');
                }}
              />
            ) : (
              <div className="stack-xs">
                {textoProporcao ? <Text variant="secondary" as="p">{textoProporcao}</Text> : null}
                {modo === 'propria' && proporcao ? (
                  <AppButton variant="ghost" size="sm" className="self-start" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditandoProporcao(true)}>
                    Editar distribuição
                  </AppButton>
                ) : null}
              </div>
            )}
          </div>

          <ValeAPartirDe id={`conta-${conta.id}-desde`} valor={desde} onChange={setDesde} hoje={hoje} aparencia="cartoes" />
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--border-color)] px-6 py-4">
        <AppButton variant="secondary" onClick={onCancelar}>Cancelar</AppButton>
        <AppButton
          variant="primary"
          onClick={salvar}
          disabled={Boolean(bloqueio) || editandoProporcao}
          disabledReason={bloqueio ?? (editandoProporcao ? 'Termine a distribuição antes de salvar.' : undefined)}
        >
          Salvar meta
        </AppButton>
      </div>
    </div>
  );
}

/** Gaveta para editar a meta semanal de uma conta. */
export function PainelMetaDaConta({
  conta,
  onClose,
}: {
  conta: Platform | null;
  onClose: () => void;
}) {
  const { settings, gravar } = useEditorialPlano();
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const linhas = settings.metasDasContas ?? [];
  const handle = conta ? exibirHandle(conta.handle) : null;

  const salvar = (novas: MetaDaContaVigencia[]) => {
    void gravar({ ...settings, metasDasContas: novas });
    onClose();
  };

  return (
    <Drawer
      open={conta != null}
      onClose={onClose}
      ariaLabel={conta ? `Editar meta do ${nomeDaRede(conta)}` : 'Editar meta'}
      widthClassName="max-w-xl"
    >
      {conta ? (
        <>
          <OverlayHeader onClose={onClose}>
            <div className="flex items-start gap-3">
              <PlatformIcon platform={iconeDaConta(conta)} colored className="mt-1 h-6 w-6 shrink-0" />
              <div className="min-w-0">
                <Text variant="sectionTitle" as="h2">Editar meta do {nomeDaRede(conta)}</Text>
                {handle ? (
                  <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">{handle}</Text>
                ) : null}
              </div>
            </div>
          </OverlayHeader>
          <EditorDaConta
            key={conta.id}
            conta={conta}
            linhas={linhas}
            proporcaoGeral={settings.proporcaoFuncoes}
            hoje={hoje}
            onCancelar={onClose}
            onSalvar={salvar}
          />
        </>
      ) : null}
    </Drawer>
  );
}
