import { useState } from 'react';
import { Pencil, UserRound } from 'lucide-react';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import { atualizarPerfilEditorial, lerPerfilEditorial, type PerfilEditorial } from '../../lib/editorialSettings';
import { CardConfiguracao } from './campos';
import { useEditorialPlano } from './useEditorialPlano';

const CAMPOS: ReadonlyArray<{ chave: keyof PerfilEditorial; id: string; titulo: string; pergunta: string }> = [
  { chave: 'publico', id: 'perfil-publico', titulo: 'Público', pergunta: 'Quem você imagina do outro lado?' },
  { chave: 'motivacaoPublico', id: 'perfil-motivacao', titulo: 'Motivação do público', pergunta: 'O que faz essas pessoas chegarem ou voltarem?' },
  { chave: 'linguagens', id: 'perfil-linguagens', titulo: 'Linguagens', pergunta: 'Que jeitos de falar, tons e referências combinam com o que você cria?' },
  { chave: 'assuntos', id: 'perfil-assuntos', titulo: 'Assuntos', pergunta: 'Sobre o que você quer conversar mais vezes?' },
];

/** Perfil editorial: referência ao escrever. Não muda a grade sozinho. */
export function PerfilEditorialCard() {
  const { settings, gravar } = useEditorialPlano();
  const perfil = settings.perfil ?? lerPerfilEditorial(null, settings.preferencias.publicoLinguagem);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<PerfilEditorial>(perfil);

  const abrirEdicao = () => {
    setRascunho(perfil);
    setEditando(true);
  };

  const cancelarEdicao = () => {
    setRascunho(perfil);
    setEditando(false);
  };

  const salvarEdicao = () => {
    const mudou = CAMPOS.some(campo => rascunho[campo.chave] !== perfil[campo.chave]);
    if (mudou) {
      gravar(atualizarPerfilEditorial(settings, rascunho));
    }
    setEditando(false);
  };

  return (
    <CardConfiguracao
      icone={<UserRound className="h-5 w-5" />}
      titulo="Perfil editorial"
      descricao="Uma referência para escrever. Não muda datas nem metas."
      acao={editando ? (
        <div className="flex flex-wrap justify-end gap-2">
          <AppButton variant="secondary" size="sm" onClick={cancelarEdicao}>
            Cancelar
          </AppButton>
          <AppButton variant="primary" size="sm" onClick={salvarEdicao}>
            Salvar perfil
          </AppButton>
        </div>
      ) : (
        <AppButton variant="secondary" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={abrirEdicao}>
          Editar perfil
        </AppButton>
      )}
    >
      {/* Quatro cards: cada campo do perfil no seu próprio bloco. */}
      <div className="grid gap-4 md:grid-cols-2">
        {CAMPOS.map(campo => {
          const conteudo = perfil[campo.chave].trim();
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
                    rows={3}
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
                    <Text variant="body" as="p" className="whitespace-pre-wrap">
                      {perfil[campo.chave]}
                    </Text>
                  ) : (
                    <Text variant="body" as="p" className="text-[var(--text-tertiary)]">
                      {campo.pergunta}
                    </Text>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </CardConfiguracao>
  );
}
