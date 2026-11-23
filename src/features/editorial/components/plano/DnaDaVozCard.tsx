import { useState } from 'react';
import { AudioLines, Pencil } from 'lucide-react';
import { useAppContext } from '../../../../context/AppContext';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import type { DnaVoz } from '../../../../lib/database';
import { atualizarPerfilEditorial, lerPerfilEditorial, type PerfilEditorial } from '../../lib/editorialSettings';
import { ANCORA_DNA } from '../../lib/abasEditorial';
import { CardConfiguracao } from './campos';
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

function rascunhoDe(dna: Pick<DnaVoz, 'promessaCentral' | 'publico' | 'tom' | 'naoFaco' | 'alertas'>, perfil: PerfilEditorial): RascunhoDna {
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

const CAMPOS: ReadonlyArray<{ chave: keyof RascunhoDna; id: string; titulo: string; pergunta: string; linhas: number }> = [
  { chave: 'promessa', id: 'dna-promessa', titulo: 'Promessa', pergunta: 'O que a pessoa pode esperar de você?', linhas: 3 },
  { chave: 'publico', id: 'dna-publico', titulo: 'Público', pergunta: 'Quem você imagina do outro lado?', linhas: 3 },
  { chave: 'motivacao', id: 'dna-motivacao', titulo: 'Motivação', pergunta: 'O que faz essas pessoas chegarem ou voltarem?', linhas: 3 },
  { chave: 'linguagens', id: 'dna-linguagens', titulo: 'Linguagens', pergunta: 'Que jeitos de falar, tons e referências combinam com o que você cria?', linhas: 3 },
  { chave: 'assuntos', id: 'dna-assuntos', titulo: 'Assuntos', pergunta: 'Sobre o que você quer conversar mais vezes?', linhas: 3 },
  { chave: 'tom', id: 'dna-tom', titulo: 'Tom', pergunta: 'Como você soa quando está no seu jeito?', linhas: 2 },
  { chave: 'naoFaco', id: 'dna-nao-faco', titulo: 'Não faço', pergunta: 'Uma linha por coisa que você não faz.', linhas: 3 },
  { chave: 'alertas', id: 'dna-alertas', titulo: 'Alertas', pergunta: 'Uma linha por alerta para lembrar na hora de escrever.', linhas: 3 },
];

/** DNA da voz num bloco só. Público grava em dna_voz e no perfil. Motivação, linguagens e assuntos ficam no perfil. */
export function DnaDaVozCard() {
  const { state, dispatch } = useAppContext();
  const { settings, gravar } = useEditorialPlano();
  const dna = state.dnaVoz ?? VAZIO;
  const perfil = settings.perfil ?? lerPerfilEditorial(null, settings.preferencias.publicoLinguagem);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoDna>(() => rascunhoDe(dna, perfil));

  const abrir = () => {
    setRascunho(rascunhoDe(dna, perfil));
    setEditando(true);
  };

  const cancelar = () => {
    setRascunho(rascunhoDe(dna, perfil));
    setEditando(false);
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
    setEditando(false);
  };

  const visivel = rascunhoDe(dna, perfil);

  return (
    <div id={ANCORA_DNA} className="scroll-mt-24">
      <CardConfiguracao
        icone={<AudioLines className="h-5 w-5" />}
        titulo="DNA da voz"
        descricao="Promessa, público e tom para escrever. Não muda datas nem metas."
        acao={editando ? (
          <div className="flex flex-wrap justify-end gap-2">
            <AppButton variant="secondary" size="sm" onClick={cancelar}>Cancelar</AppButton>
            <AppButton variant="primary" size="sm" onClick={salvar}>Salvar DNA</AppButton>
          </div>
        ) : (
          <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={abrir}>
            Editar DNA
          </AppButton>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {CAMPOS.map(campo => {
            const conteudo = (editando ? rascunho : visivel)[campo.chave].trim();
            return (
              <div key={campo.chave} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-xs">
                {editando ? (
                  <>
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
                      className="input w-full min-h-24 resize-y"
                    />
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center">
                      <Text variant="bodyStrong" as="h3">{campo.titulo}</Text>
                      <Ajuda rotulo={`Sobre ${campo.titulo}`} texto={campo.pergunta} />
                    </span>
                    {conteudo ? (
                      <Text variant="body" as="p" className="whitespace-pre-wrap">{visivel[campo.chave]}</Text>
                    ) : (
                      <Text variant="body" as="p" className="text-[var(--text-tertiary)]">{campo.pergunta}</Text>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardConfiguracao>
    </div>
  );
}
