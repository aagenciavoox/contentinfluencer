import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { ANCORA_HASHTAGS } from '../../lib/abasEditorial';
import { EditorialDrawer } from './EditorialDrawer';
import { useEditorialPlano } from './useEditorialPlano';

/** Cartão compacto de hashtags gerais; edição acontece em drawer lateral, cópia continua direta. */
export function HashtagsGeraisCard() {
  const { settings, salvarPreferencias } = useEditorialPlano();
  const salvo = settings.preferencias.hashtagsForaSeries;
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(salvo);
  const [copiado, setCopiado] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const hashtags = salvo
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(Boolean);

  const dirty = aberto && rascunho.trim() !== salvo.trim();

  const abrir = () => {
    setRascunho(salvo);
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setRascunho(salvo);
  };

  const salvar = () => {
    const proximo = rascunho.trim();
    if (proximo !== salvo) {
      salvarPreferencias({ hashtagsForaSeries: proximo });
    }
    setAberto(false);
  };

  const copiarTodas = async () => {
    if (hashtags.length === 0) return;
    try {
      await navigator.clipboard.writeText(hashtags.join(' '));
      setCopiado(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setCopiado(false);
      }, 2000);
    } catch {
      // Clipboard indisponível no contexto atual
    }
  };

  return (
    <div id={ANCORA_HASHTAGS} className="scroll-mt-28 h-full">
      <Surface padding="lg" className="flex h-full flex-col justify-between gap-4">
        <div className="stack-md">
          <div className="flex items-center justify-between gap-2">
            <Text variant="itemTitle" as="h3">Hashtags gerais</Text>
            <AppButton variant="secondary" size="sm" onClick={abrir}>
              Editar
            </AppButton>
          </div>

          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            Para copiar quando fizer sentido na publicação.
          </Text>

          {hashtags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] px-3 py-1 t-meta text-[var(--text-primary)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
              Não definido
            </Text>
          )}
        </div>

        {hashtags.length > 0 ? (
          <div>
            <AppButton
              variant="secondary"
              size="sm"
              leftIcon={copiado ? <Check className="h-4 w-4" /> : undefined}
              onClick={() => void copiarTodas()}
            >
              {copiado ? 'Copiadas!' : 'Copiar todas'}
            </AppButton>
          </div>
        ) : null}
      </Surface>

      <EditorialDrawer
        open={aberto}
        title="Editar hashtags gerais"
        subtitle="Hashtags usadas em qualquer conteúdo, além das de cada pilar."
        escopoConta="Geral"
        secao="Identidade"
        dirty={dirty}
        onClose={fechar}
        onSave={salvar}
        saveLabel="Salvar hashtags"
      >
        <div className="stack-xs">
          <label htmlFor="hashtags-fora-series">
            <Text variant="bodyStrong" as="span">Hashtags</Text>
          </label>
          <textarea
            id="hashtags-fora-series"
            rows={5}
            placeholder="#livro #resenha"
            value={rascunho}
            onChange={event => setRascunho(event.target.value)}
            className="input w-full min-h-32 resize-y"
          />
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            Separe por espaço ou vírgula.
          </Text>
        </div>
      </EditorialDrawer>
    </div>
  );
}
