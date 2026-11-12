import { UserRound } from 'lucide-react';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { Text } from '../../../../components/ui/Text';
import { atualizarPerfilEditorial, lerPerfilEditorial, type PerfilEditorial } from '../../lib/editorialSettings';
import { CampoTexto, CardConfiguracao } from './campos';
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

  return (
    <CardConfiguracao
      icone={<UserRound className="h-5 w-5" />}
      titulo="Perfil editorial"
      descricao="Uma referência para escrever. Não muda datas nem metas."
    >
      {/* Quatro cards: cada campo do perfil no seu próprio bloco. */}
      <div className="grid gap-4 md:grid-cols-2">
        {CAMPOS.map(campo => (
          <div key={campo.chave} className="stack-xs rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <span className="inline-flex items-center">
              <label htmlFor={campo.id}>
                <Text variant="bodyStrong" as="span">{campo.titulo}</Text>
              </label>
              <Ajuda rotulo={`Sobre ${campo.titulo}`} texto={campo.pergunta} />
            </span>
            <CampoTexto
              id={campo.id}
              rows={3}
              value={perfil[campo.chave]}
              onSave={valor => {
                if (valor === perfil[campo.chave]) return;
                gravar(atualizarPerfilEditorial(settings, { [campo.chave]: valor }));
              }}
            />
          </div>
        ))}
      </div>
    </CardConfiguracao>
  );
}
