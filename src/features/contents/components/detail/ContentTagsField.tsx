import { useMemo } from 'react';
import { TagSelect, type TagSelectProps } from '../../../../components/ui/TagSelect';
import { useAppContext } from '../../../../context/AppContext';
import { applyUserTags, collectTagOptions, userTags } from '../../lib/contentTags';

interface ContentTagsFieldProps {
  /** Todas as tags salvas, inclusive as técnicas de produção. */
  tags?: readonly string[] | null;
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  selectProps?: Pick<TagSelectProps, 'hideLabel' | 'placeholder' | 'controlClassName' | 'leadingIcon'>;
}

/** Edita as tags livres do roteiro, com ou sem série. As tags de produção ficam guardadas. */
export function ContentTagsField({ tags, onChange, disabled, selectProps }: ContentTagsFieldProps) {
  const { state } = useAppContext();
  const values = userTags(tags);
  const options = useMemo(
    () => collectTagOptions(state.contents).map(tag => ({ value: tag, label: tag })),
    [state.contents],
  );

  return (
    <TagSelect
      id="roteiro-tags"
      label="Tags"
      hint="Palavras livres para achar o roteiro depois."
      creatable
      disabled={disabled}
      values={values}
      options={options}
      placeholder="Adicionar tag"
      {...selectProps}
      onChange={next => onChange(applyUserTags(tags, next))}
    />
  );
}
