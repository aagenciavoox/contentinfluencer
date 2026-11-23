import { ValorVazio } from '../../../../components/ui/ValorVazio';
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Check, Clock, Copy, Hash, Pencil, Target, Undo2 } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import { CampoStepper, CardConfiguracao, inteiroOuNull } from './campos';
import { atualizarPreferencias } from '../../lib/editorialSettings';
import { agendarVigencia, desfazerMudanca, diretrizNoDomingo, domingosParaVigencia, mudancasAgendadas } from '../../lib/vigencias';
import { ProporcaoObjetivosEditor, proporcaoEmTexto, ResumoDaProporcao } from './ProporcaoObjetivosEditor';
import { VariedadeConcentracaoCard } from './VariedadeConcentracaoCard';
import { useEditorialPlano } from './useEditorialPlano';
import { diaMes, ValeAPartirDe } from './ValeAPartirDe';

type RitmoDraft = {
  limite: string;
  minimo: string;
  maximo: string;
  gravacaoMinimo: string;
  gravacaoMeta: string;
  gravacaoMaximo: string;
  reserva: string;
  prontos: string;
};

function textoNumero(valor: number | null | undefined): string {
  return valor == null ? '' : String(valor);
}

function ritmoSalvo(preferencias: {
  limiteSemanal: number | null;
  minimoSemanal?: number | null;
  maximoSemanal?: number | null;
  gravacaoMinimoSemanal?: number | null;
  gravacaoMetaSemanal?: number | null;
  gravacaoMaximoSemanal?: number | null;
  reservaForaSeriesSemanal: number | null;
  reservaProntos: number | null;
}): RitmoDraft {
  return {
    limite: textoNumero(preferencias.limiteSemanal),
    minimo: textoNumero(preferencias.minimoSemanal),
    maximo: textoNumero(preferencias.maximoSemanal),
    gravacaoMinimo: textoNumero(preferencias.gravacaoMinimoSemanal),
    gravacaoMeta: textoNumero(preferencias.gravacaoMetaSemanal),
    gravacaoMaximo: textoNumero(preferencias.gravacaoMaximoSemanal),
    reserva: textoNumero(preferencias.reservaForaSeriesSemanal),
    prontos: textoNumero(preferencias.reservaProntos),
  };
}

function ordemDaFaixa(ritmo: RitmoDraft): string | undefined {
  const limite = inteiroOuNull(ritmo.limite);
  const minimo = inteiroOuNull(ritmo.minimo);
  const maximo = inteiroOuNull(ritmo.maximo);
  if (limite != null && minimo != null && minimo > limite) return 'O mínimo de postagem precisa ser menor ou igual à meta.';
  if (limite != null && maximo != null && maximo < limite) return 'O máximo de postagem precisa ser maior ou igual à meta.';
  const meta = inteiroOuNull(ritmo.gravacaoMeta);
  if (meta != null && meta > 0) {
    const gravacaoMinimo = inteiroOuNull(ritmo.gravacaoMinimo);
    const gravacaoMaximo = inteiroOuNull(ritmo.gravacaoMaximo);
    if (gravacaoMinimo != null && gravacaoMinimo > meta) return 'O mínimo de gravação precisa ser menor ou igual à meta.';
    if (gravacaoMaximo != null && gravacaoMaximo < meta) return 'O máximo de gravação precisa ser maior ou igual à meta.';
  }
  return undefined;
}

function reservaCabeNoLimite(ritmo: RitmoDraft): boolean {
  const limite = inteiroOuNull(ritmo.limite);
  const reserva = inteiroOuNull(ritmo.reserva);
  return !(reserva != null && limite != null && reserva > limite);
}

function ValorDoRitmo({
  rotulo,
  valor,
  unidade,
  dotColor = 'var(--accent-green)',
  helper,
}: {
  rotulo: string;
  valor: number | null;
  unidade: string;
  dotColor?: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between transition-all hover:border-[var(--border-strong)]">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Text variant="label" as="span" className="tracking-wider uppercase text-[var(--text-tertiary)] truncate">
            {rotulo}
          </Text>
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: valor != null ? dotColor : 'var(--text-tertiary)' }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <Text variant="sectionTitle" as="div" className="tabular-nums text-[var(--text-primary)]">
            {valor == null ? <ValorVazio /> : String(valor)}
          </Text>
          {valor != null ? (
            <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
              {unidade}
            </Text>
          ) : null}
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
          {valor == null ? 'Não definido' : helper ?? 'Meta ativa'}
        </Text>
      </div>
    </div>
  );
}

/** Aviso de uma mudança agendada, com o botão de desfazer só aquela parte. */
function MudancaAgendadaAviso({ texto, onDesfazer }: { texto: string; onDesfazer: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2">
      <Text variant="meta" as="p" className="min-w-[12rem] flex-1 text-[var(--text-primary)]">{texto}</Text>
      <AppButton variant="ghost" size="sm" leftIcon={<Undo2 className="h-4 w-4" />} onClick={onDesfazer}>
        Desfazer
      </AppButton>
    </div>
  );
}

/** Que parte dos ajustes o Geral mostra. */
export type SecaoAjustes = 'faixas' | 'gravacao' | 'proporcao' | 'avisos' | 'operacional';

/**
 * Aba Ajustes: o que vale para todos os períodos. Não tem seletor de período; o que muda
 * de um período para outro fica na aba Período.
 */
export function AjustesEditorialPanel({ secao = 'faixas' }: { secao?: SecaoAjustes } = {}) {
  const { settings, gravar, salvarPreferencias } = useEditorialPlano();
  const preferencias = settings.preferencias;
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const { estaSemana } = domingosParaVigencia(hoje);
  const [editandoRitmo, setEditandoRitmo] = useState(false);
  const [editandoProporcao, setEditandoProporcao] = useState(false);
  const [editandoHashtags, setEditandoHashtags] = useState(false);
  const [rascunhoHashtags, setRascunhoHashtags] = useState(preferencias.hashtagsForaSeries);
  const [copiadoHashtags, setCopiadoHashtags] = useState(false);
  const timerCopiaRef = useRef<number | null>(null);
  const [ritmo, setRitmo] = useState<RitmoDraft>(() => ritmoSalvo(preferencias));
  const [desdeRitmo, setDesdeRitmo] = useState(estaSemana);
  const [desdeProporcao, setDesdeProporcao] = useState(estaSemana);
  const reservaInvalida = !reservaCabeNoLimite(ritmo);
  const ordemInvalida = ordemDaFaixa(ritmo);
  const salvoAgora = ritmoSalvo(preferencias);
  const faixaMudou = ritmo.limite !== salvoAgora.limite
    || ritmo.minimo !== salvoAgora.minimo
    || ritmo.maximo !== salvoAgora.maximo
    || ritmo.gravacaoMinimo !== salvoAgora.gravacaoMinimo
    || ritmo.gravacaoMeta !== salvoAgora.gravacaoMeta
    || ritmo.gravacaoMaximo !== salvoAgora.gravacaoMaximo;
  const gravacaoMetaRascunho = inteiroOuNull(ritmo.gravacaoMeta);
  const gravacaoVisivel = gravacaoMetaRascunho != null && gravacaoMetaRascunho > 0;
  const mudancas = mudancasAgendadas(settings, hoje);

  useEffect(() => () => {
    if (timerCopiaRef.current !== null) window.clearTimeout(timerCopiaRef.current);
  }, []);

  const abrirHashtags = () => {
    setRascunhoHashtags(preferencias.hashtagsForaSeries);
    setEditandoHashtags(true);
  };

  const cancelarHashtags = () => {
    setRascunhoHashtags(preferencias.hashtagsForaSeries);
    setEditandoHashtags(false);
  };

  const salvarHashtags = () => {
    const proximo = rascunhoHashtags.trim();
    if (proximo !== preferencias.hashtagsForaSeries) {
      salvarPreferencias({ hashtagsForaSeries: proximo });
    }
    setEditandoHashtags(false);
  };

  const copiarHashtags = async (lista: string[]) => {
    if (lista.length === 0) return;
    try {
      await navigator.clipboard.writeText(lista.join(' '));
      setCopiadoHashtags(true);
      if (timerCopiaRef.current !== null) window.clearTimeout(timerCopiaRef.current);
      timerCopiaRef.current = window.setTimeout(() => {
        timerCopiaRef.current = null;
        setCopiadoHashtags(false);
      }, 2000);
    } catch {
      // Clipboard indisponível no contexto atual
    }
  };

  const abrirRitmo = () => {
    setRitmo(ritmoSalvo(preferencias));
    setDesdeRitmo(estaSemana);
    setEditandoRitmo(true);
  };

  const cancelarRitmo = () => {
    setRitmo(ritmoSalvo(preferencias));
    setEditandoRitmo(false);
  };

  const salvarRitmo = () => {
    if (reservaInvalida || ordemInvalida) return;
    const salvo = ritmoSalvo(preferencias);
    const reservaMudou = ritmo.reserva !== salvo.reserva || ritmo.prontos !== salvo.prontos;
    if (reservaMudou || faixaMudou) {
      // Reserva e prontos valem já. Meta, mínimo e máximo valem a partir da segunda escolhida.
      let proximo = atualizarPreferencias(settings, {
        reservaForaSeriesSemanal: inteiroOuNull(ritmo.reserva),
        reservaProntos: inteiroOuNull(ritmo.prontos),
      });
      if (faixaMudou) {
        const metaGravacao = inteiroOuNull(ritmo.gravacaoMeta);
        const gravacaoLigada = metaGravacao != null && metaGravacao > 0;
        proximo = agendarVigencia(proximo, desdeRitmo, {
          limiteSemanal: inteiroOuNull(ritmo.limite),
          proporcaoFuncoes: diretrizNoDomingo(settings, desdeRitmo, hoje).proporcaoFuncoes,
          minimoSemanal: inteiroOuNull(ritmo.minimo),
          maximoSemanal: inteiroOuNull(ritmo.maximo),
          gravacaoMinimoSemanal: gravacaoLigada ? inteiroOuNull(ritmo.gravacaoMinimo) : null,
          gravacaoMetaSemanal: gravacaoLigada ? metaGravacao : null,
          gravacaoMaximoSemanal: gravacaoLigada ? inteiroOuNull(ritmo.gravacaoMaximo) : null,
        }, hoje);
      }
      gravar(proximo);
    }
    setEditandoRitmo(false);
  };

  const salvarProporcaoDesde = (proporcao: Parameters<typeof proporcaoEmTexto>[0]) => {
    gravar(agendarVigencia(settings, desdeProporcao, {
      limiteSemanal: diretrizNoDomingo(settings, desdeProporcao, hoje).limiteSemanal,
      proporcaoFuncoes: proporcao,
    }, hoje));
    setEditandoProporcao(false);
  };

  return (
    <div className="stack-lg">
      {secao === 'faixas' || secao === 'gravacao' ? (<>
      {secao === 'faixas' ? (
      <div id="faixas" className="scroll-mt-24">
      <CardConfiguracao
        icone={<CalendarDays className="h-5 w-5" />}
        titulo="Faixas"
        descricao="A meta de postagem limita o plano. Espaços fora das séries e roteiros de reserva continuam dentro da semana."
        acao={editandoRitmo ? (
          <div className="flex flex-wrap justify-end gap-2">
            <AppButton variant="secondary" size="sm" onClick={cancelarRitmo}>
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              onClick={salvarRitmo}
              disabled={reservaInvalida || Boolean(ordemInvalida)}
              disabledReason={ordemInvalida ?? (reservaInvalida ? 'A reserva cabe dentro do limite semanal.' : undefined)}
            >
              Salvar rotina
            </AppButton>
          </div>
        ) : (
          <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={abrirRitmo}>
            Editar ritmo
          </AppButton>
        )}
      >
        {editandoRitmo ? (
          <div className="stack-md">
            <div className="stack-sm">
              <Text variant="label" as="p">Postagem</Text>
              <div className="grid gap-4 md:grid-cols-3">
                <CampoStepper
                  id="minimo-semanal"
                  label="Mínimo"
                  unidade="por semana"
                  hint="Opcional. Abaixo disso, a semana pede mais esforço."
                  value={ritmo.minimo}
                  onChange={minimo => setRitmo(atual => ({ ...atual, minimo }))}
                />
                <CampoStepper
                  id="limite-semanal"
                  label="Meta de postagem"
                  unidade="por semana"
                  hint="A conta é por roteiro: um roteiro em três contas conta uma vez."
                  value={ritmo.limite}
                  onChange={limite => setRitmo(atual => ({ ...atual, limite }))}
                />
                <CampoStepper
                  id="maximo-semanal"
                  label="Máximo"
                  unidade="por semana"
                  hint="Opcional. Vazio, avisa acima da meta. Não bloqueia."
                  value={ritmo.maximo}
                  onChange={maximo => setRitmo(atual => ({ ...atual, maximo }))}
                />
              </div>
            </div>
            <div className="stack-sm">
              <Text variant="label" as="p">Gravação</Text>
              <Text variant="meta" as="p">Reels, Shorts, vídeo longo e o vídeo do TikTok. Stories, carrossel e imagem ficam de fora. Sem meta, esta faixa some.</Text>
              <div className="grid gap-4 md:grid-cols-3">
                {gravacaoVisivel ? (
                  <CampoStepper
                    id="gravacao-minimo"
                    label="Mínimo"
                    unidade="por semana"
                    value={ritmo.gravacaoMinimo}
                    onChange={gravacaoMinimo => setRitmo(atual => ({ ...atual, gravacaoMinimo }))}
                  />
                ) : null}
                <CampoStepper
                  id="gravacao-meta"
                  label="Meta de gravação"
                  unidade="por semana"
                  hint="Vazio, a faixa de gravação fica escondida."
                  value={ritmo.gravacaoMeta}
                  onChange={gravacaoMeta => setRitmo(atual => ({ ...atual, gravacaoMeta }))}
                />
                {gravacaoVisivel ? (
                  <CampoStepper
                    id="gravacao-maximo"
                    label="Máximo"
                    unidade="por semana"
                    hint="Opcional. Vazio, avisa acima da meta."
                    value={ritmo.gravacaoMaximo}
                    onChange={gravacaoMaximo => setRitmo(atual => ({ ...atual, gravacaoMaximo }))}
                  />
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <CampoStepper
                id="reserva-fora-series"
                label="Espaços fora das séries"
                unidade="por semana"
                hint="Para publicidades, ideias e oportunidades. Já entram no teto da semana."
                value={ritmo.reserva}
                onChange={reserva => setRitmo(atual => ({ ...atual, reserva }))}
                erro={reservaInvalida ? 'A reserva cabe dentro do limite semanal.' : undefined}
              />
              <CampoStepper
                id="reserva-prontos"
                label="Roteiros prontos de reserva"
                unidade="roteiros"
                hint="Finalizados e sem data de publicação."
                value={ritmo.prontos}
                onChange={prontos => setRitmo(atual => ({ ...atual, prontos }))}
              />
            </div>
            {ordemInvalida ? <Text variant="meta" as="p" className="text-[var(--accent-red)]">{ordemInvalida}</Text> : null}
            {faixaMudou ? (
              <ValeAPartirDe id="limite-desde" valor={desdeRitmo} onChange={setDesdeRitmo} hoje={hoje} />
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <ValorDoRitmo rotulo="Mínimo de postagem" valor={preferencias.minimoSemanal} unidade="por semana" helper="Opcional" />
            <ValorDoRitmo
              rotulo="Meta de postagem"
              valor={preferencias.limiteSemanal}
              unidade="por semana"
              dotColor="var(--accent-green)"
              helper="Por roteiro"
            />
            <ValorDoRitmo rotulo="Máximo de postagem" valor={preferencias.maximoSemanal} unidade="por semana" helper="Vazio avisa acima da meta" />
            {preferencias.gravacaoMetaSemanal != null && preferencias.gravacaoMetaSemanal > 0 ? (
              <>
                <ValorDoRitmo rotulo="Mínimo de gravação" valor={preferencias.gravacaoMinimoSemanal} unidade="por semana" helper="Opcional" />
                <ValorDoRitmo rotulo="Meta de gravação" valor={preferencias.gravacaoMetaSemanal} unidade="por semana" dotColor="var(--accent-orange)" helper="Peças de câmera" />
                <ValorDoRitmo rotulo="Máximo de gravação" valor={preferencias.gravacaoMaximoSemanal} unidade="por semana" helper="Vazio avisa acima da meta" />
              </>
            ) : null}
            <ValorDoRitmo
              rotulo="Espaços fora das séries"
              valor={preferencias.reservaForaSeriesSemanal}
              unidade="por semana"
              dotColor="var(--accent-blue)"
              helper="Ideias e pautas avulsas"
            />
            <ValorDoRitmo
              rotulo="Roteiros de reserva"
              valor={preferencias.reservaProntos}
              unidade="roteiros"
              dotColor="var(--accent-purple)"
              helper="Estoque sem data"
            />
          </div>
        )}
        {!editandoRitmo ? mudancas.filter(mudanca => mudanca.limite).map(mudanca => (
          <MudancaAgendadaAviso
            key={mudanca.vigenteDesde}
            texto={`A partir de seg., ${diaMes(mudanca.vigenteDesde)}: ${mudanca.limite!.para == null ? 'sem limite de publicações' : `meta geral de ${mudanca.limite!.para} por semana`}.`}
            onDesfazer={() => gravar(desfazerMudanca(settings, mudanca.vigenteDesde, 'limite', hoje))}
          />
        )) : null}
      </CardConfiguracao>
      </div>
      ) : null}

      {secao === 'gravacao' ? (
      <div id="dias-de-gravacao" className="scroll-mt-24">
      <CardConfiguracao
        icone={<Clock className="h-5 w-5" />}
        titulo="Gravação"
        descricao="Em quais dias você costuma gravar? Sem dia marcado, o lembrete do dia de gravar fica desligado."
      >
        <div className="stack-md">
          <div className="stack-xs">
            <Text variant="label" as="p">Dias de gravação</Text>
            <div className="flex flex-wrap gap-2">
              {([
                [1, 'Seg'],
                [2, 'Ter'],
                [3, 'Qua'],
                [4, 'Qui'],
                [5, 'Sex'],
                [6, 'Sáb'],
                [7, 'Dom'],
              ] as const).map(([dia, rotulo]) => {
                const marcado = preferencias.diasGravacao.includes(dia);
                return (
                  <button
                    key={dia}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => {
                      const dias = marcado
                        ? preferencias.diasGravacao.filter(item => item !== dia)
                        : [...preferencias.diasGravacao, dia].sort((a, b) => a - b);
                      gravar(atualizarPreferencias(settings, { diasGravacao: dias }));
                    }}
                    className={cn(
                      'min-h-9 min-w-11 px-3 rounded-[var(--radius-input)] border transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                      marcado
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-elevated)]'
                        : 'border-[var(--border-input)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                    )}
                  >
                    <Text variant="button" as="span">{rotulo}</Text>
                  </button>
                );
              })}
            </div>
          </div>
          <CampoStepper
            id="limite-gravacoes-dia"
            label="Teto de gravações por dia"
            unidade="no máximo"
            hint="Mais do que isso, o dia não comporta. Vazio, não há aviso."
            value={textoNumero(preferencias.limiteGravacoesDia)}
            onChange={valor => {
              gravar(atualizarPreferencias(settings, {
                limiteGravacoesDia: inteiroOuNull(valor) || null,
              }));
            }}
          />
          <CampoStepper
            id="antecedencia-postagem"
            label="Dias de antecedência"
            unidade="dias"
            hint="Me avise com estes dias de antecedência se um vídeo já tem data para sair e ainda falta gravar. Vazio desliga a antecedência."
            value={textoNumero(preferencias.antecedenciaPostagemDias)}
            onChange={valor => {
              gravar(atualizarPreferencias(settings, {
                antecedenciaPostagemDias: inteiroOuNull(valor),
              }));
            }}
          />
        </div>
      </CardConfiguracao>
      </div>
      ) : null}
      </>) : null}

      {secao === 'proporcao' ? (
      <div id="proporcao" className="scroll-mt-24">
      <CardConfiguracao
        icone={<Target className="h-5 w-5" />}
        titulo="Distribuição por objetivo"
        descricao="Quanto espaço você quer dar para cada objetivo no seu conteúdo? O total precisa somar 100%."
        acao={editandoProporcao ? undefined : (
          <AppButton
            variant="secondary"
            size="sm"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={() => {
              setDesdeProporcao(estaSemana);
              setEditandoProporcao(true);
            }}
          >
            {settings.proporcaoFuncoes ? 'Editar distribuição' : 'Definir distribuição'}
          </AppButton>
        )}
      >
        {editandoProporcao ? (
          <div className="stack-lg">
            <ValeAPartirDe id="proporcao-desde" valor={desdeProporcao} onChange={setDesdeProporcao} hoje={hoje} />
            <ProporcaoObjetivosEditor
              idBase="proporcao-ajustes"
              valor={settings.proporcaoFuncoes}
              onCancelar={() => setEditandoProporcao(false)}
              onSalvar={salvarProporcaoDesde}
            />
          </div>
        ) : (
          <ResumoDaProporcao proporcao={settings.proporcaoFuncoes} />
        )}
        {!editandoProporcao ? mudancas.filter(mudanca => mudanca.proporcao).map(mudanca => (
          <MudancaAgendadaAviso
            key={mudanca.vigenteDesde}
            texto={`A partir de seg., ${diaMes(mudanca.vigenteDesde)}: ${mudanca.proporcao!.para ? proporcaoEmTexto(mudanca.proporcao!.para) : 'sem proporção definida'}.`}
            onDesfazer={() => gravar(desfazerMudanca(settings, mudanca.vigenteDesde, 'proporcao', hoje))}
          />
        )) : null}
      </CardConfiguracao>
      </div>
      ) : null}

      {secao === 'avisos' ? <VariedadeConcentracaoCard /> : null}

      {secao === 'operacional' ? (() => {
        const hashtags = preferencias.hashtagsForaSeries
          .split(/[\s,]+/)
          .map(s => s.trim())
          .filter(Boolean);
        return (
          <div id="hashtags" className="scroll-mt-24">
          <CardConfiguracao
            icone={<Hash className="h-5 w-5" />}
            titulo="Hashtags gerais"
            descricao="Hashtags que você usa em qualquer conteúdo, além das de cada pilar."
            acao={editandoHashtags ? (
              <div className="flex flex-wrap justify-end gap-2">
                <AppButton variant="secondary" size="sm" onClick={cancelarHashtags}>
                  Cancelar
                </AppButton>
                <AppButton variant="primary" size="sm" onClick={salvarHashtags}>
                  Salvar hashtags
                </AppButton>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                {hashtags.length > 0 ? (
                  <AppButton
                    variant="secondary"
                    size="sm"
                    leftIcon={copiadoHashtags ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    onClick={() => void copiarHashtags(hashtags)}
                  >
                    {copiadoHashtags ? 'Copiadas!' : 'Copiar todas'}
                  </AppButton>
                ) : null}
                <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={abrirHashtags}>
                  Editar
                </AppButton>
              </div>
            )}
          >
            {editandoHashtags ? (
              <div className="stack-xs">
                <label htmlFor="hashtags-fora-series">
                  <Text variant="bodyStrong" as="span">Hashtags</Text>
                </label>
                <textarea
                  id="hashtags-fora-series"
                  rows={4}
                  placeholder="#livro #resenha"
                  value={rascunhoHashtags}
                  onChange={event => setRascunhoHashtags(event.target.value)}
                  className="input w-full min-h-28 resize-y"
                />
              </div>
            ) : hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1 t-secondary text-[var(--text-primary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <Text variant="secondary" as="p" className="text-[var(--text-tertiary)]">
                Nenhuma hashtag geral salva ainda. Clique em Editar para adicionar as hashtags que você usa em qualquer conteúdo.
              </Text>
            )}
          </CardConfiguracao>
          </div>
        );
      })() : null}
    </div>
  );
}
