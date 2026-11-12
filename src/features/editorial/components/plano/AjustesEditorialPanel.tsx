import { ValorVazio } from '../../../../components/ui/ValorVazio';
import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Clock, Hash, Pencil, Target, Undo2 } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { Text } from '../../../../components/ui/Text';
import { CampoStepper, CampoTexto, CardConfiguracao, inteiroOuNull } from './campos';
import { atualizarPreferencias } from '../../lib/editorialSettings';
import { agendarVigencia, desfazerMudanca, diretrizNoDomingo, domingosParaVigencia, mudancasAgendadas } from '../../lib/vigencias';
import { ProporcaoObjetivosEditor, proporcaoEmTexto, ResumoDaProporcao } from './ProporcaoObjetivosEditor';
import { VariedadeConcentracaoCard } from './VariedadeConcentracaoCard';
import { useEditorialPlano } from './useEditorialPlano';
import { diaMes, ValeAPartirDe } from './ValeAPartirDe';

type RitmoDraft = {
  limite: string;
  reserva: string;
  prontos: string;
  gravacoes: string;
};

function textoNumero(valor: number | null): string {
  return valor == null ? '' : String(valor);
}

function ritmoSalvo(preferencias: {
  limiteSemanal: number | null;
  reservaForaSeriesSemanal: number | null;
  reservaProntos: number | null;
  limiteGravacoesDia: number | null;
}): RitmoDraft {
  return {
    limite: textoNumero(preferencias.limiteSemanal),
    reserva: textoNumero(preferencias.reservaForaSeriesSemanal),
    prontos: textoNumero(preferencias.reservaProntos),
    gravacoes: textoNumero(preferencias.limiteGravacoesDia),
  };
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
  dotColor = '#10b981',
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

/** Que parte dos ajustes cada aba do Editorial mostra. */
export type SecaoAjustes = 'capacidade' | 'proporcao' | 'avisos' | 'operacional';

/**
 * Aba Ajustes: o que vale para todos os períodos. Não tem seletor de período; o que muda
 * de um período para outro fica na aba Período.
 */
export function AjustesEditorialPanel({ secao = 'capacidade' }: { secao?: SecaoAjustes } = {}) {
  const { settings, gravar, salvarPreferencias } = useEditorialPlano();
  const preferencias = settings.preferencias;
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const { estaSemana } = domingosParaVigencia(hoje);
  const [editandoRitmo, setEditandoRitmo] = useState(false);
  const [editandoProporcao, setEditandoProporcao] = useState(false);
  const [ritmo, setRitmo] = useState<RitmoDraft>(() => ritmoSalvo(preferencias));
  const [desdeRitmo, setDesdeRitmo] = useState(estaSemana);
  const [desdeProporcao, setDesdeProporcao] = useState(estaSemana);
  const reservaInvalida = !reservaCabeNoLimite(ritmo);
  const limiteMudou = ritmo.limite !== textoNumero(preferencias.limiteSemanal);
  const mudancas = mudancasAgendadas(settings, hoje);

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
    if (reservaInvalida) return;
    const salvo = ritmoSalvo(preferencias);
    const mudou = ritmo.limite !== salvo.limite
      || ritmo.reserva !== salvo.reserva
      || ritmo.prontos !== salvo.prontos
      || ritmo.gravacoes !== salvo.gravacoes;
    if (mudou) {
      // Reserva, prontos e gravações valem já; o limite vale a partir da segunda escolhida.
      let proximo = atualizarPreferencias(settings, {
        reservaForaSeriesSemanal: inteiroOuNull(ritmo.reserva),
        reservaProntos: inteiroOuNull(ritmo.prontos),
        // Zero é "sem limite": não há aviso de gravação.
        limiteGravacoesDia: inteiroOuNull(ritmo.gravacoes) || null,
      });
      if (limiteMudou) {
        proximo = agendarVigencia(proximo, desdeRitmo, {
          limiteSemanal: inteiroOuNull(ritmo.limite),
          proporcaoFuncoes: diretrizNoDomingo(settings, desdeRitmo, hoje).proporcaoFuncoes,
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
      {secao === 'capacidade' ? (<>
      <CardConfiguracao
        icone={<CalendarDays className="h-5 w-5" />}
        titulo="Tetos"
        descricao="O teto de publicação limita o plano. O teto de gravações corta o dia. Espaços fora das séries e roteiros de reserva continuam dentro da semana."
        acao={editandoRitmo ? (
          <div className="flex flex-wrap justify-end gap-2">
            <AppButton variant="secondary" size="sm" onClick={cancelarRitmo}>
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              onClick={salvarRitmo}
              disabled={reservaInvalida}
              disabledReason={reservaInvalida ? 'A reserva cabe dentro do limite semanal.' : undefined}
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
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <CampoStepper
              id="limite-semanal"
              label="Teto de publicação"
              unidade="por semana"
              hint="Se quiser um teto, até quantas publicações cabem no seu plano? A conta segue Por roteiro ou Por publicação."
              value={ritmo.limite}
              onChange={limite => setRitmo(atual => ({ ...atual, limite }))}
            />
            <div>
              <CampoStepper
                id="reserva-fora-series"
                label="Espaços fora das séries"
                unidade="por semana"
                hint="Para publicidades, ideias e oportunidades. Já entram no teto da semana."
                value={ritmo.reserva}
                onChange={reserva => setRitmo(atual => ({ ...atual, reserva }))}
                erro={reservaInvalida ? 'A reserva cabe dentro do limite semanal.' : undefined}
              />
            </div>
            <div>
              <CampoStepper
                id="reserva-prontos"
                label="Roteiros prontos de reserva"
                unidade="roteiros"
                hint="Finalizados e sem data de publicação."
                value={ritmo.prontos}
                onChange={prontos => setRitmo(atual => ({ ...atual, prontos }))}
              />
            </div>
            <div>
              <CampoStepper
                id="limite-gravacoes-dia"
                label="Teto de gravações por dia"
                unidade="no máximo"
                hint="Mais do que isso, o dia não comporta. Vazio, não há aviso."
                value={ritmo.gravacoes}
                onChange={gravacoes => setRitmo(atual => ({ ...atual, gravacoes }))}
              />
            </div>
            {limiteMudou ? (
              <div className="md:col-span-2 xl:col-span-4">
                <ValeAPartirDe id="limite-desde" valor={desdeRitmo} onChange={setDesdeRitmo} hoje={hoje} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <ValorDoRitmo
              rotulo="Teto de publicação"
              valor={preferencias.limiteSemanal}
              unidade="por semana"
              dotColor="#10b981"
              helper="Total do ciclo semanal"
            />
            <ValorDoRitmo
              rotulo="Espaços fora das séries"
              valor={preferencias.reservaForaSeriesSemanal}
              unidade="por semana"
              dotColor="#3b82f6"
              helper="Ideias e pautas avulsas"
            />
            <ValorDoRitmo
              rotulo="Roteiros de reserva"
              valor={preferencias.reservaProntos}
              unidade="roteiros"
              dotColor="#a855f7"
              helper="Estoque sem data"
            />
            <ValorDoRitmo
              rotulo="Teto de gravações por dia"
              valor={preferencias.limiteGravacoesDia}
              unidade="no máximo"
              dotColor="#ec4899"
              helper="Aviso de sobrecarga diária"
            />
          </div>
        )}
        {!editandoRitmo ? mudancas.filter(mudanca => mudanca.limite).map(mudanca => (
          <MudancaAgendadaAviso
            key={mudanca.vigenteDesde}
            texto={`A partir de dom, ${diaMes(mudanca.vigenteDesde)}: ${mudanca.limite!.para == null ? 'sem limite de publicações' : `meta geral de ${mudanca.limite!.para} por semana`}.`}
            onDesfazer={() => gravar(desfazerMudanca(settings, mudanca.vigenteDesde, 'limite', hoje))}
          />
        )) : null}
      </CardConfiguracao>

      <div id="dias-de-gravacao">
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
                  <AppButton
                    key={dia}
                    variant={marcado ? 'primary' : 'secondary'}
                    size="xs"
                    onClick={() => {
                      const dias = marcado
                        ? preferencias.diasGravacao.filter(item => item !== dia)
                        : [...preferencias.diasGravacao, dia].sort((a, b) => a - b);
                      gravar(atualizarPreferencias(settings, {diasGravacao: dias}));
                    }}
                  >
                    {rotulo}
                  </AppButton>
                );
              })}
            </div>
          </div>
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
      </>) : null}

      {secao === 'proporcao' ? (
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
            texto={`A partir de dom, ${diaMes(mudanca.vigenteDesde)}: ${mudanca.proporcao!.para ? proporcaoEmTexto(mudanca.proporcao!.para) : 'sem proporção definida'}.`}
            onDesfazer={() => gravar(desfazerMudanca(settings, mudanca.vigenteDesde, 'proporcao', hoje))}
          />
        )) : null}
      </CardConfiguracao>

      ) : null}

      {secao === 'avisos' ? <VariedadeConcentracaoCard /> : null}

      {secao === 'operacional' ? (
      <div className="grid gap-4 lg:grid-cols-2">
        {/* O perfil editorial foi para a aba Direção editorial (PerfilEditorialCard). */}
        <CardConfiguracao
          icone={<Hash className="h-5 w-5" />}
          titulo="Hashtags gerais"
          descricao="Hashtags que você usa em qualquer conteúdo, além das de cada pilar."
        >
          <div className="stack-sm">
            <CampoTexto
              id="hashtags-fora-series"
              label="Hashtags"
              rows={5}
              placeholder="#livro #resenha"
              value={preferencias.hashtagsForaSeries}
              onSave={hashtagsForaSeries => {
                if (hashtagsForaSeries === preferencias.hashtagsForaSeries) return;
                salvarPreferencias({ hashtagsForaSeries });
              }}
            />
          </div>
        </CardConfiguracao>

      </div>
      ) : null}
    </div>
  );
}
