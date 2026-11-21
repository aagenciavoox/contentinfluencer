import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { TagPill } from '../../../../components/ui/TagSelect';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import { joinHashtags, mergeHashtags, parseHashtags } from '../../../contents/lib/captionHashtags';

function NovaHashtag({ disabled, rotulo, onAdd }: { disabled: boolean; rotulo: string; onAdd: (raw: string) => void }) {
  const [value, setValue] = useState('');
  const commit = () => {
    const next = value.trim();
    if (!next) return;
    onAdd(next);
    setValue('');
  };
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      placeholder="+ Nova hashtag"
      aria-label={`Nova hashtag para ${rotulo}`}
      className="h-8 min-w-[8.5rem] max-w-[12rem] rounded-[var(--radius-pill)] border border-dashed border-[var(--border-input)] bg-transparent px-2.5 t-label text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 pointer-coarse:h-11"
      onChange={event => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setValue('');
        }
      }}
    />
  );
}

/**
 * Hashtags de uma publicação. Permite remover com um clique, adicionar novas
 * e ativar/desativar sugestões individuais da série e do pilar.
 */
export function HashtagsField({
  rotulo,
  hashtags,
  sugestao,
  limite,
  disabled = false,
  semSugestao = null,
  boxed = false,
  semLista = false,
  ocultarContagem = false,
  onChange,
  onAddTags,
  onRemoveTag,
}: {
  /** Plataforma e @ da conta, para os nomes acessíveis. */
  rotulo: string;
  hashtags: string;
  sugestao: string[];
  limite: number;
  disabled?: boolean;
  /** Frase quando série ou pilar existem mas não têm hashtags para esta conta. */
  semSugestao?: string | null;
  /** Em caixa própria, com a contagem na linha das hashtags. */
  boxed?: boolean;
  /** Oculta as pílulas atuais quando o chamador não quiser listá-las. */
  semLista?: boolean;
  /** Quando a contagem já aparece na barra do editor logo acima. */
  ocultarContagem?: boolean;
  onChange?: (hashtags: string) => void;
  /** Opcional: adiciona novas tags preservando a posição no texto da legenda. */
  onAddTags?: (tags: string[]) => void;
  /** Opcional: remove uma tag específica direto do texto da legenda. */
  onRemoveTag?: (tag: string) => void;
}) {
  const tags = parseHashtags(hashtags);
  const acima = tags.length > limite;
  const temTag = (alvo: string) => tags.some(existing => existing.toLowerCase() === alvo.toLowerCase());
  const restantes = sugestao.filter(tag => !temTag(tag));
  const jaIncluidas = sugestao.length > 0 && restantes.length === 0;

  const adicionar = (raw: string) => {
    const novas = parseHashtags(raw);
    if (novas.length === 0) return;
    if (onAddTags) {
      onAddTags(novas);
      return;
    }
    onChange?.(joinHashtags(mergeHashtags(tags, novas)));
  };

  const remover = (alvo: string) => {
    if (onRemoveTag) {
      onRemoveTag(alvo);
      return;
    }
    onChange?.(joinHashtags(tags.filter(item => item.toLowerCase() !== alvo.toLowerCase())));
  };

  const alternarSugestao = (tag: string) => {
    if (disabled) return;
    if (temTag(tag)) remover(tag);
    else adicionar(tag);
  };

  const contagem = (
    <Text variant="label" className={cn('ml-auto tabular-nums text-[var(--text-secondary)]', acima && 'text-[var(--danger)]')}>
      {`${tags.length} de ${limite}`}
    </Text>
  );

  return (
    <div className={cn('stack-sm', boxed && 'stack-md rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text variant="bodyStrong" as="p">Hashtags</Text>
        {!ocultarContagem && (boxed || semLista) ? contagem : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {semLista ? null : tags.map(tag => (
          <TagPill
            key={tag}
            label={tag}
            disabled={disabled}
            onRemove={() => remover(tag)}
          />
        ))}
        <NovaHashtag disabled={disabled} rotulo={rotulo} onAdd={adicionar} />
      </div>

      {!ocultarContagem && (acima || !(boxed || semLista)) ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {acima ? (
            <Text variant="meta" className="text-[var(--danger)]">{`Mais de ${limite} hashtags.`}</Text>
          ) : null}
          {boxed || semLista ? null : contagem}
        </div>
      ) : null}

      {sugestao.length > 0 ? (
        <div className="stack-xs rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--surface-subtle)] px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text variant="label" className="text-[var(--text-secondary)]">Sugestões</Text>
            {jaIncluidas ? (
              <Text variant="meta" className="text-[var(--text-tertiary)]">Todas incluídas</Text>
            ) : (
              <AppButton
                size="xs"
                variant="ghost"
                disabled={disabled}
                aria-label={`Adicionar sugestões restantes em ${rotulo}: ${restantes.join(' ')}`}
                onClick={() => adicionar(restantes.join(' '))}
              >
                {restantes.length === sugestao.length ? 'Usar todas' : `Adicionar restantes (${restantes.length})`}
              </AppButton>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sugestao.map(tag => {
              const incluida = temTag(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={disabled}
                  aria-pressed={incluida}
                  aria-label={incluida ? `Remover ${tag} de ${rotulo}` : `Adicionar ${tag} em ${rotulo}`}
                  onClick={() => alternarSugestao(tag)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-[var(--radius-pill)] border px-2.5 t-meta transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 pointer-coarse:min-h-9',
                    incluida
                      ? 'border-[var(--border-strong)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {incluida
                    ? <Check className="h-3 w-3 shrink-0 text-[var(--accent-green)]" aria-hidden />
                    : <Plus className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" aria-hidden />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : semSugestao ? (
        <Text variant="meta">{semSugestao}</Text>
      ) : null}
    </div>
  );
}
