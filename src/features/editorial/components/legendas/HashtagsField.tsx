import { useState } from 'react';
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
      placeholder="Nova hashtag"
      aria-label={`Nova hashtag para ${rotulo}`}
      className="h-8 min-w-[8.5rem] max-w-[12rem] rounded-[var(--radius-pill)] border border-dashed border-[var(--border-color)] bg-transparent px-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 pointer-coarse:h-11"
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
 * Hashtags de uma publicação. Sugestão da série e do pilar para aquela conta,
 * contador e aviso do limite da rede. Nada é cortado automaticamente.
 */
export function HashtagsField({
  rotulo,
  hashtags,
  sugestao,
  limite,
  disabled = false,
  semSugestao = null,
  boxed = false,
  onChange,
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
  onChange: (hashtags: string) => void;
}) {
  const tags = parseHashtags(hashtags);
  const acima = tags.length > limite;
  const jaIncluidas = sugestao.length > 0
    && sugestao.every(tag => tags.some(existing => existing.toLowerCase() === tag.toLowerCase()));

  const adicionar = (raw: string) => {
    const novas = parseHashtags(raw);
    if (novas.length === 0) return;
    onChange(joinHashtags(mergeHashtags(tags, novas)));
  };

  const contagem = (
    <Text variant="meta" className={cn('ml-auto font-semibold tabular-nums', acima && 'text-[var(--danger)]')}>
      {`${tags.length} de ${limite}`}
    </Text>
  );

  return (
    <div className={cn('stack-sm', boxed && 'stack-md rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4')}>
      <Text variant="bodyStrong" as="p" className={cn(!boxed && 'text-sm')}>Hashtags</Text>
      {sugestao.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Text variant="meta" className="font-semibold text-[var(--text-primary)]">Sugestão</Text>
            <Text variant="secondary" className="mt-0.5 break-words">{sugestao.join(' ')}</Text>
          </div>
          <AppButton
            size="xs"
            variant="secondary"
            disabled={disabled || jaIncluidas}
            aria-label={`Usar sugestão em ${rotulo}: ${sugestao.join(' ')}`}
            onClick={() => adicionar(sugestao.join(' '))}
          >
            {jaIncluidas ? 'Já incluídas' : 'Usar sugestão'}
          </AppButton>
        </div>
      ) : semSugestao ? (
        <Text variant="meta">{semSugestao}</Text>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {tags.map(tag => (
          <TagPill
            key={tag}
            label={tag}
            disabled={disabled}
            onRemove={() => onChange(joinHashtags(tags.filter(item => item !== tag)))}
          />
        ))}
        <NovaHashtag disabled={disabled} rotulo={rotulo} onAdd={adicionar} />
        {boxed ? contagem : null}
      </div>
      {acima || !boxed ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {acima ? (
            <Text variant="meta" className="text-[var(--danger)]">{`Mais de ${limite} hashtags.`}</Text>
          ) : null}
          {boxed ? null : contagem}
        </div>
      ) : null}
    </div>
  );
}
