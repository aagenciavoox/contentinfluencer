import {useState} from 'react';
import {AppButton} from '../../../components/ui/AppButton';
import type {Pilar} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {generateUUID} from '../../../utils/uuid';

export const PILAR_PRESET_CORES = [
  '#F5C543',
  '#4A90D9',
  '#E8A0BF',
  '#D44C47',
  '#448361',
  '#9065B0',
  '#2EAADC',
  '#D9730D',
  '#F5F0E4',
  '#37352F',
];

export const PILAR_HASHTAG_PLATFORMS = ['Instagram', 'TikTok', 'YouTube'];

export function PilarForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<Pilar>;
  onSave: (p: Pilar) => void;
  onCancel: () => void;
}) {
  const id = initial.id || generateUUID();
  const [form, setForm] = useState<Omit<Pilar, 'plataformas' | 'createdAt' | 'updatedAt'>>({
    id,
    userId: initial.userId || '',
    nome: initial.nome || '',
    descricao: initial.descricao || '',
    cor: initial.cor || '#F5C543',
    ativo: initial.ativo ?? true,
  });
  const [hashtags, setHashtags] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (initial.plataformas || []).forEach(platform => {
      map[platform.platformId] = platform.hashtags;
    });
    return map;
  });

  const handleSave = () => {
    if (!form.nome.trim()) return;

    onSave({
      ...form,
      plataformas: PILAR_HASHTAG_PLATFORMS.filter(platform => hashtags[platform]?.trim()).map(platform => ({
        pilarId: id,
        platformId: platform,
        hashtags: hashtags[platform].trim(),
      })),
      createdAt: initial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const fieldClass =
    'ds-input w-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="ds-meta">Identidade</h3>
        <label className="block">
          <span className="ds-section-label">Nome *</span>
          <input
            type="text"
            value={form.nome}
            onChange={event => setForm(prev => ({...prev, nome: event.target.value}))}
            placeholder="Ex: Humor"
            className={fieldClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={event => setForm(prev => ({...prev, ativo: event.target.checked}))}
          />
          Pilar ativo
        </label>
        <div>
          <span className="ds-section-label">Cor</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {PILAR_PRESET_CORES.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setForm(prev => ({...prev, cor: color}))}
                className={`h-7 w-7 rounded-full border-2 transition-all ${form.cor === color ? 'scale-110 border-[var(--text-primary)]' : 'border-transparent'}`}
                style={{backgroundColor: color}}
              />
            ))}
            <input
              type="color"
              value={form.cor}
              onChange={event => setForm(prev => ({...prev, cor: event.target.value}))}
              className="h-7 w-7 cursor-pointer rounded-full border-none"
              title="Cor personalizada"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="ds-meta">Distribuicao</h3>
        <label className="block">
          <span className="ds-section-label">Descricao curta</span>
          <textarea
            value={form.descricao}
            onChange={event => setForm(prev => ({...prev, descricao: event.target.value}))}
            placeholder="Em que conteudos aparece?"
            className={cn(fieldClass, 'min-h-[72px] resize-none')}
          />
        </label>
      </section>

      <section className="space-y-2">
        <h3 className="ds-meta">Hashtags</h3>
        {PILAR_HASHTAG_PLATFORMS.map(platform => (
          <label key={platform} className="block">
            <span className="ds-section-label">{platform}</span>
            <input
              type="text"
              value={hashtags[platform] || ''}
              onChange={event => setHashtags(prev => ({...prev, [platform]: event.target.value}))}
              placeholder="#hashtag1 #hashtag2"
              className={fieldClass}
            />
          </label>
        ))}
      </section>

      <div className="flex gap-2 border-t border-[var(--border-color)] pt-4">
        <AppButton variant="secondary" className="flex-1" onClick={onCancel}>
          Cancelar
        </AppButton>
        <AppButton variant="primary" className="flex-1" onClick={handleSave} disabled={!form.nome.trim()}>
          Salvar
        </AppButton>
      </div>
    </div>
  );
}
