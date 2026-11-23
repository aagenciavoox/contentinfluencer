/** Meta semanal de cada conta: o texto da tabela e a gaveta de edição. */
import { useState } from 'react';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { Drawer } from '../../../../components/overlays/Drawer';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import type { Platform, RedeSocial } from '../../../../lib/database';
import { REDE_ROTULO, exibirHandle, iconeDaConta, redeDaConta } from '../../../contas/lib/contas';
import { agendarMetaDaConta, avisoDaSomaDeFormatos, metaDaContaHoje, type MetaDaContaVigencia } from '../../lib/metasPorConta';
import { faixaDeGravacao } from '../../lib/faixasEditoriais';
import type { ProporcaoFuncoes } from '../../lib/proporcaoObjetivos';
import { somaDaProporcao } from '../../lib/proporcaoObjetivos';
import { FORMATOS_DA_REDE, grupoDoFormato, type FormatoPublicacao, rotuloDoFormato } from '../../lib/publicacoes';

const FORMATOS_DE_GRAVACAO = new Set<FormatoPublicacao>(['reels', 'short', 'video-longo']);
const FORMATOS_DE_PRODUCAO = new Set<FormatoPublicacao>(['carrossel', 'post-estatico']);
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

/** "10 Reels · 1 carrossel · 3 sem formato". Sem total, mostra só os formatos. */
export function textoPorFormato(linha: MetaDaContaVigencia | null, rede: RedeSocial | null): string {
  if (!linha) return '';
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
  const sobra = linha.limiteSemanal != null && soma <= linha.limiteSemanal ? linha.limiteSemanal - soma : 0;
  if (sobra > 0) partes.push(`${sobra} sem formato`);
  if (partes.length === 0 && linha.limiteSemanal == null) return '';
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
  embutido = false,
}: {
  conta: Platform;
  linhas: readonly MetaDaContaVigencia[];
  proporcaoGeral: ProporcaoFuncoes | null;
  hoje: string;
  onSalvar: (linhas: MetaDaContaVigencia[]) => void;
  onCancelar: () => void;
  /** Na aba da conta o editor fica na página. Na gaveta, ocupa o painel. */
  embutido?: boolean;
}) {
  const { settings } = useEditorialPlano();
  const rede = redeDaConta(conta);
  const atual = metaDaContaHoje(linhas, conta.id, hoje);
  const formatos = [...new Set([...(rede ? FORMATOS_DA_REDE[rede] ?? [] : []), ...Object.keys(atual?.parcelasFormato ?? {})])]
    .filter(formato => formato !== 'stories');
  const gruposDeFormato = [
    { id: 'gravacao', titulo: 'Gravação', itens: formatos.filter(formato => FORMATOS_DE_GRAVACAO.has(formato as FormatoPublicacao)) },
    { id: 'producao', titulo: 'Produção', itens: formatos.filter(formato => FORMATOS_DE_PRODUCAO.has(formato as FormatoPublicacao)) },
    {
      id: 'outros',
      titulo: 'Outros formatos',
      itens: formatos.filter(formato => !FORMATOS_DE_GRAVACAO.has(formato as FormatoPublicacao) && !FORMATOS_DE_PRODUCAO.has(formato as FormatoPublicacao)),
    },
  ].filter(grupo => grupo.itens.length > 0);
  const [limite, setLimite] = useState(textoNumero(atual?.limiteSemanal));
  const [minimo, setMinimo] = useState(textoNumero(atual?.minimoSemanal));
  const [maximo, setMaximo] = useState(textoNumero(atual?.maximoSemanal));
  const [parcelas, setParcelas] = useState<Record<string, string>>(() => (
    Object.fromEntries(formatos.map(formato => [formato, textoNumero(atual?.parcelasFormato?.[formato])]))
  ));
  const [faixas, setFaixas] = useState<Record<string, { minimo: string; maximo: string }>>(() => (
    Object.fromEntries(formatos.map(formato => [formato, {
      minimo: textoNumero(atual?.faixasFormato?.[formato]?.minimo),
      maximo: textoNumero(atual?.faixasFormato?.[formato]?.maximo),
    }]))
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
  const minimoNumero = inteiroOuNull(minimo);
  const maximoNumero = inteiroOuNull(maximo);
  const faixasNumero = Object.fromEntries(
    Object.entries(faixas).flatMap(([formato, faixa]) => {
      const minimoFormato = inteiroOuNull(faixa.minimo);
      const maximoFormato = inteiroOuNull(faixa.maximo);
      if (minimoFormato == null && maximoFormato == null) return [];
      return [[formato, { minimo: minimoFormato, maximo: maximoFormato }]];
    }),
  );
  const avisoSoma = avisoDaSomaDeFormatos({
    limiteSemanal: total,
    maximoSemanal: maximoNumero,
    parcelasFormato: somaParcelas > 0 ? parcelasNumero : null,
  });
  const gravacaoGeral = faixaDeGravacao(settings.preferencias);
  const tetoGravacao = gravacaoGeral ? (gravacaoGeral.maximo ?? gravacaoGeral.meta) : null;
  const formatoAcimaDaGravacao = tetoGravacao == null ? null : formatos.find(formato => (
    grupoDoFormato(formato) === 'gravacao' && (parcelasNumero[formato] ?? 0) > tetoGravacao
  ));
  const avisoGravacao = formatoAcimaDaGravacao
    ? `${rotuloDoFormato(formatoAcimaDaGravacao, rede)} pede ${parcelasNumero[formatoAcimaDaGravacao]} por semana e a gravação geral cabe em ${tetoGravacao}.`
    : null;
  const ordemInvalida = (() => {
    if (total != null && minimoNumero != null && minimoNumero > total) return 'O mínimo precisa ser menor ou igual à meta.';
    if (total != null && maximoNumero != null && maximoNumero < total) return 'O máximo precisa ser maior ou igual à meta.';
    for (const formato of formatos) {
      const meta = parcelasNumero[formato];
      const faixa = faixasNumero[formato];
      if (!faixa || meta == null) continue;
      if (faixa.minimo != null && faixa.minimo > meta) return `O mínimo de ${rotuloDoFormato(formato, rede)} precisa ser menor ou igual à meta.`;
      if (faixa.maximo != null && faixa.maximo < meta) return `O máximo de ${rotuloDoFormato(formato, rede)} precisa ser maior ou igual à meta.`;
    }
    return undefined;
  })();
  const faltaProporcao = modo === 'propria' && (total != null || somaParcelas > 0) && !proporcao;
  const proporcaoNaoFecha = modo === 'propria' && proporcao != null && somaDaProporcao(proporcao) !== 100;
  const bloqueio = ordemInvalida
    ?? (faltaProporcao ? 'Defina a distribuição da conta ou use a geral.' : undefined)
    ?? (proporcaoNaoFecha ? 'A distribuição da conta precisa fechar em 100%.' : undefined);

  const valores = {
    limiteSemanal: total,
    minimoSemanal: minimoNumero,
    maximoSemanal: maximoNumero,
    proporcaoFuncoes: modo === 'propria' && (total != null || somaParcelas > 0) ? proporcao : null,
    parcelasFormato: somaParcelas > 0 ? parcelasNumero : null,
    faixasFormato: Object.keys(faixasNumero).length > 0 ? faixasNumero : null,
  };
  const igualHoje = atual
    ? atual.limiteSemanal === valores.limiteSemanal
      && (atual.minimoSemanal ?? null) === valores.minimoSemanal
      && (atual.maximoSemanal ?? null) === valores.maximoSemanal
      && JSON.stringify(atual.proporcaoFuncoes) === JSON.stringify(valores.proporcaoFuncoes)
      && JSON.stringify(atual.parcelasFormato) === JSON.stringify(valores.parcelasFormato)
      && JSON.stringify(atual.faixasFormato ?? null) === JSON.stringify(valores.faixasFormato)
    : valores.limiteSemanal == null && valores.parcelasFormato == null && valores.minimoSemanal == null && valores.maximoSemanal == null;

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
    sobra > 0
      ? (sobra === 1 ? '1 publicação sem formato definido.' : `${sobra} publicações sem formato definido.`)
      : '',
    total == null && somaParcelas > 0 ? 'Sem total, a meta da conta é a soma dos formatos.' : '',
    rede === 'instagram' ? 'Stories ficam fora da meta semanal.' : '',
  ].filter(Boolean).join(' ');
  const textoProporcao = modo === 'propria'
    ? (proporcao ? proporcaoEmTexto(proporcao) : '')
    : (proporcaoGeral ? proporcaoEmTexto(proporcaoGeral) : 'Ainda não definida.');

  return (
    <div className={embutido ? 'stack-lg' : 'flex min-h-0 flex-1 flex-col'}>
      <div className={embutido ? 'stack-lg' : 'overlay-body min-h-0 flex-1 overflow-y-auto'}>
        <div className="stack-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="stack-xs">
              <Text variant="bodyStrong" as="span">Meta semanal</Text>
              <Text variant="secondary" as="p">Publicações por semana</Text>
              {total == null ? (
                <Text variant="meta" as="p" className="text-[var(--text-secondary)]">Sem meta para este período.</Text>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <CampoStepper id={`conta-${conta.id}-minimo`} label="Mínimo" value={minimo} onChange={setMinimo} />
              <CampoStepper id={`conta-${conta.id}-limite`} label="Meta" hint="Vazio, o total da conta é a soma dos formatos." value={limite} onChange={setLimite} />
              <CampoStepper id={`conta-${conta.id}-maximo`} label="Máximo" hint="Vazio, avisa acima da meta." value={maximo} onChange={setMaximo} />
            </div>
          </div>

          {formatos.length > 0 ? (
            <div className="stack-sm">
              <div className="inline-flex items-center">
                <Text variant="bodyStrong" as="span">Metas por formato</Text>
                <Ajuda rotulo="Sobre metas por formato" texto="Quer acompanhar Reels, Shorts ou outro formato de perto? Escolha o formato e defina a quantidade." />
              </div>
              {gruposDeFormato.map(grupo => (
                <div key={grupo.id} className="stack-sm">
                  <Text variant="label" as="p">{grupo.titulo}</Text>
                  {grupo.itens.map(formato => (
                    <div key={formato} className="stack-xs">
                      <Text variant="bodyStrong" as="span">{rotuloDoFormato(formato, rede)}</Text>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <CampoStepper
                          id={`conta-${conta.id}-formato-${formato}-min`}
                          label="Mínimo"
                          zeroViraVazio
                          value={faixas[formato]?.minimo ?? ''}
                          onChange={valor => setFaixas(atuais => ({ ...atuais, [formato]: { minimo: valor, maximo: atuais[formato]?.maximo ?? '' } }))}
                        />
                        <CampoStepper
                          id={`conta-${conta.id}-formato-${formato}`}
                          label="Meta"
                          zeroViraVazio
                          value={parcelas[formato] ?? ''}
                          onChange={valor => setParcelas(atuais => ({ ...atuais, [formato]: valor }))}
                        />
                        <CampoStepper
                          id={`conta-${conta.id}-formato-${formato}-max`}
                          label="Máximo"
                          zeroViraVazio
                          value={faixas[formato]?.maximo ?? ''}
                          onChange={valor => setFaixas(atuais => ({ ...atuais, [formato]: { minimo: atuais[formato]?.minimo ?? '', maximo: valor } }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {avisoSoma ? <Text variant="meta" className="text-[var(--accent-orange)]">{avisoSoma} Dá para salvar assim.</Text> : null}
              {avisoGravacao ? <Text variant="meta" className="text-[var(--accent-orange)]">{avisoGravacao} Dá para salvar assim.</Text> : null}
              {ordemInvalida ? <Text variant="meta" className="text-[var(--accent-red)]">{ordemInvalida}</Text> : null}
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
                rotuloSalvar="Aplicar distribuição"
                varianteSalvar="secondary"
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

      <div className={embutido
        ? 'flex flex-wrap justify-end gap-2'
        : 'flex shrink-0 justify-end gap-2 border-t border-[var(--border-color)] px-6 py-4'}
      >
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

/** A mesma meta da gaveta, na aba da conta: total, formatos e proporção própria ou herdada. */
export function MetaDaContaEmbutida({ conta }: { conta: Platform }) {
  const { settings, gravar } = useEditorialPlano();
  const [versao, setVersao] = useState(0);
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const linhas = settings.metasDasContas ?? [];

  return (
    <Surface padding="md" className="stack-md">
      <Text variant="sectionTitle" as="h2">Meta da conta</Text>
      <EditorDaConta
        key={`${conta.id}-${versao}`}
        embutido
        conta={conta}
        linhas={linhas}
        proporcaoGeral={settings.proporcaoFuncoes}
        hoje={hoje}
        onCancelar={() => setVersao(atual => atual + 1)}
        onSalvar={novas => {
          void gravar({ ...settings, metasDasContas: novas });
        }}
      />
    </Surface>
  );
}
