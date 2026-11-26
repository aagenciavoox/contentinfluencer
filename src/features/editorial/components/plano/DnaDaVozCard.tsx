import { useMemo, useState } from 'react';
import { useAppContext } from '../../../../context/AppContext';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { Badge } from '../../../../components/ui/Badge';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import type { DnaVoz } from '../../../../lib/database';
import { atualizarPerfilEditorial, lerPerfilEditorial, type PerfilEditorial } from '../../lib/editorialSettings';
import { ANCORA_DNA } from '../../lib/abasEditorial';
import { EditorialDrawer } from './EditorialDrawer';
import { useEditorialPlano } from './useEditorialPlano';

type RascunhoDna = {
  promessa: string;
  publico: string;
  motivacao: string;
  linguagens: string;
  assuntos: string;
  tom: string;
  naoFaco: string;
  alertas: string;
};

const VAZIO: Pick<DnaVoz, 'promessaCentral' | 'publico' | 'tom' | 'naoFaco' | 'alertas'> = {
  promessaCentral: '',
  publico: '',
  tom: '',
  naoFaco: [],
  alertas: [],
};

function linhas(lista: readonly string[]): string {
  return lista.join('\n');
}

function lista(texto: string): string[] {
  return texto.split('\n').map(item => item.trim()).filter(Boolean);
}

function rascunhoDe(
  dna: Pick<DnaVoz, 'promessaCentral' | 'publico' | 'tom' | 'naoFaco' | 'alertas'>,
  perfil: PerfilEditorial,
): RascunhoDna {
  return {
    promessa: dna.promessaCentral,
    publico: dna.publico.trim() || perfil.publico,
    motivacao: perfil.motivacaoPublico,
    linguagens: perfil.linguagens,
    assuntos: perfil.assuntos,
    tom: dna.tom,
    naoFaco: linhas(dna.naoFaco),
    alertas: linhas(dna.alertas),
  };
}

function mesmoRascunho(a: RascunhoDna, b: RascunhoDna): boolean {
  return (
    a.promessa === b.promessa
    && a.publico === b.publico
    && a.motivacao === b.motivacao
    && a.linguagens === b.linguagens
    && a.assuntos === b.assuntos
    && a.tom === b.tom
    && a.naoFaco === b.naoFaco
    && a.alertas === b.alertas
  );
}

const CAMPOS: ReadonlyArray<{ chave: keyof RascunhoDna; id: string; titulo: string; pergunta: string; linhas: number }> = [
  { chave: 'promessa', id: 'dna-promessa', titulo: 'Promessa', pergunta: 'O que a pessoa pode esperar de você?', linhas: 3 },
  { chave: 'publico', id: 'dna-publico', titulo: 'Público', pergunta: 'Quem você imagina do outro lado?', linhas: 3 },
  { chave: 'tom', id: 'dna-tom', titulo: 'Tom', pergunta: 'Como você soa quando está no seu jeito?', linhas: 2 },
  { chave: 'motivacao', id: 'dna-motivacao', titulo: 'Motivação', pergunta: 'O que faz essas pessoas chegarem ou voltarem?', linhas: 3 },
  { chave: 'linguagens', id: 'dna-linguagens', titulo: 'Linguagens', pergunta: 'Que jeitos de falar, tons e referências combinam com o que você cria?', linhas: 3 },
  { chave: 'assuntos', id: 'dna-assuntos', titulo: 'Assuntos', pergunta: 'Sobre o que você quer conversar mais vezes?', linhas: 3 },
  { chave: 'naoFaco', id: 'dna-nao-faco', titulo: 'Não faço', pergunta: 'Uma linha por coisa que você não faz.', linhas: 3 },
  { chave: 'alertas', id: 'dna-alertas', titulo: 'Alertas', pergunta: 'Uma linha por alerta para lembrar na hora de escrever.', linhas: 3 },
];

/** DNA da voz em cartão compacto de leitura; edição completa acontece no drawer lateral. */
export function DnaDaVozCard() {
  const { state, dispatch } = useAppContext();
  const { settings, gravar } = useEditorialPlano();
  const dna = state.dnaVoz ?? VAZIO;
  const perfil = settings.perfil ?? lerPerfilEditorial(null, settings.preferencias.publicoLinguagem);

  const salvo = useMemo(() => rascunhoDe(dna, perfil), [dna, perfil]);
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoDna>(salvo);

  const preenchidos = CAMPOS.filter(campo => salvo[campo.chave].trim().length > 0);
  const semDefinicao = CAMPOS.length - preenchidos.length;
  const dirty = aberto && !mesmoRascunho(rascunho, salvo);

  const abrir = () => {
    setRascunho(salvo);
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setRascunho(salvo);
  };

  const salvar = () => {
    const publico = rascunho.publico;
    const dnaProximo = {
      promessaCentral: rascunho.promessa,
      publico,
      tom: rascunho.tom,
      naoFaco: lista(rascunho.naoFaco),
      alertas: lista(rascunho.alertas),
    };
    const perfilMudou = publico !== perfil.publico
      || rascunho.motivacao !== perfil.motivacaoPublico
      || rascunho.linguagens !== perfil.linguagens
      || rascunho.assuntos !== perfil.assuntos;
    const dnaMudou = dnaProximo.promessaCentral !== dna.promessaCentral
      || dnaProximo.publico !== dna.publico
      || dnaProximo.tom !== dna.tom
      || linhas(dnaProximo.naoFaco) !== linhas(dna.naoFaco)
      || linhas(dnaProximo.alertas) !== linhas(dna.alertas);
    if (dnaMudou || publico !== dna.publico) {
      void dispatch({ type: 'UPDATE_DNA_VOZ', payload: dnaProximo });
    }
    if (perfilMudou) {
      gravar(atualizarPerfilEditorial(settings, {
        publico,
        motivacaoPublico: rascunho.motivacao,
        linguagens: rascunho.linguagens,
        assuntos: rascunho.assuntos,
      }));
    }
    setAberto(false);
  };

  const camposTexto = preenchidos.filter(c => c.chave !== 'naoFaco' && c.chave !== 'alertas');
  const naoFacoItens = lista(salvo.naoFaco);
  const alertasItens = lista(salvo.alertas);

  return (
    <div id={ANCORA_DNA} className="scroll-mt-28 h-full">
      <Surface padding="lg" className="h-full stack-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text variant="itemTitle" as="h3">DNA da voz</Text>
          <div className="flex flex-wrap items-center gap-2">
            {semDefinicao > 0 ? (
              <Badge variant="neutral" className="tabular-nums">
                {semDefinicao === 1 ? '1 campo sem definição' : `${semDefinicao} campos sem definição`}
              </Badge>
            ) : null}
            <AppButton variant="secondary" size="sm" onClick={abrir}>
              {preenchidos.length === 0 ? 'Preencher' : 'Editar'}
            </AppButton>
          </div>
        </div>

        {preenchidos.length === 0 ? (
          <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">
            Defina promessa, público, tom e limites para orientar seus roteiros.
          </Text>
        ) : (
          <div className="stack-md">
            {camposTexto.map(campo => (
              <div key={campo.chave} className="stack-xs">
                <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                  {campo.titulo}
                </Text>
                <Text variant="body" as="p" className="line-clamp-2 text-[var(--text-primary)]">
                  {salvo[campo.chave].trim()}
                </Text>
              </div>
            ))}

            {naoFacoItens.length > 0 ? (
              <div className="stack-xs">
                <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                  Não faço
                </Text>
                <div className="flex flex-wrap gap-2">
                  {naoFacoItens.slice(0, 5).map((item, idx) => (
                    <span
                      key={`nao-faco-${idx}`}
                      className="inline-flex max-w-full items-center rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] px-3 py-1 t-meta text-[var(--text-primary)]"
                    >
                      <span className="truncate">{item}</span>
                    </span>
                  ))}
                  {naoFacoItens.length > 5 ? (
                    <span className="inline-flex items-center px-1 t-meta text-[var(--text-tertiary)] tabular-nums">
                      +{naoFacoItens.length - 5}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {alertasItens.length > 0 ? (
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                <span className="text-[var(--text-tertiary)]">Alertas: </span>
                {alertasItens.join(' · ')}
              </Text>
            ) : null}
          </div>
        )}
      </Surface>

      <EditorialDrawer
        open={aberto}
        title="Editar DNA da voz"
        subtitle="Promessa, público, tom e limites para orientar seus roteiros."
        escopoConta="Geral"
        secao="Identidade"
        dirty={dirty}
        onClose={fechar}
        onSave={salvar}
        saveLabel="Salvar DNA"
      >
        <div className="stack-md">
          {CAMPOS.map(campo => (
            <div key={campo.chave} className="stack-xs">
              <span className="inline-flex items-center">
                <label htmlFor={campo.id}>
                  <Text variant="bodyStrong" as="span">{campo.titulo}</Text>
                </label>
                <Ajuda rotulo={`Sobre ${campo.titulo}`} texto={campo.pergunta} />
              </span>
              <textarea
                id={campo.id}
                rows={campo.linhas}
                value={rascunho[campo.chave]}
                placeholder={campo.pergunta}
                onChange={event => {
                  const valor = event.target.value;
                  setRascunho(atual => ({ ...atual, [campo.chave]: valor }));
                }}
                className="input w-full min-h-20 resize-y"
              />
            </div>
          ))}
        </div>
      </EditorialDrawer>
    </div>
  );
}
