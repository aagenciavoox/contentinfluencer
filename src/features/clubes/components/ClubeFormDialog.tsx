import { useState } from 'react';
import { AppButton } from '../../../components/ui/AppButton';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import type { Clube, ClubeOrigem } from '../../../lib/database';
import { CoverUploadField } from '../../library/components/CoverUploadField';
import { PILAR_PRESET_CORES } from '../../settings/lib/pilarConstants';
import { serieColorKey } from '../../settings/lib/serieColors';
import { ORIGEM_DO_CLUBE } from '../lib/clubeLista';

export type RascunhoClube = {
  nome: string;
  descricao: string;
  capaUrl: string;
  cor: string;
  origem: ClubeOrigem;
  url: string;
};

const ORIGENS: ClubeOrigem[] = ['catarse', 'apoiase', 'outro'];

export function ClubeFormDialog({
  open,
  clube,
  corInicial,
  coresOcupadas,
  onClose,
  onSave,
}: {
  open: boolean;
  clube: Clube | null;
  corInicial: string;
  coresOcupadas: readonly string[];
  onClose: () => void;
  onSave: (rascunho: RascunhoClube) => void;
}) {
  const [nome, setNome] = useState(clube?.nome ?? '');
  const [descricao, setDescricao] = useState(clube?.descricao ?? '');
  const [capaUrl, setCapaUrl] = useState(clube?.capaUrl ?? '');
  const [cor, setCor] = useState(clube?.cor || corInicial);
  const [origem, setOrigem] = useState<ClubeOrigem>(clube?.origem ?? 'outro');
  const [url, setUrl] = useState(clube?.url ?? '');
  const ocupadas = new Set(coresOcupadas.map(item => serieColorKey(item)).filter((item): item is string => Boolean(item)));
  const chaveAtual = serieColorKey(cor);

  return (
    <BottomSheetModal open={open} onClose={onClose} desktopMaxW="max-w-md">
      <OverlayHeader onClose={onClose}>
        <Text variant="sectionTitle">{clube ? 'Editar clube' : 'Novo clube'}</Text>
        <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
          Capa, nome e descrição, como na série. O nome fica marcado como clube.
        </Text>
      </OverlayHeader>
      <OverlayBody className="stack-md">
        <div className="stack-xs">
          <Text variant="label" as="span">Capa</Text>
          <CoverUploadField
            appearance="series"
            plain
            value={capaUrl}
            onChange={setCapaUrl}
            itemId={clube?.id}
            title={nome.trim() || 'Clube'}
          />
        </div>
        <label className="flex flex-col gap-1" htmlFor="clube-nome">
          <Text variant="label" as="span">Nome do clube</Text>
          <input
            id="clube-nome"
            className="input"
            value={nome}
            autoFocus
            onChange={event => setNome(event.target.value)}
            placeholder="Ex.: Clube de leitura"
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="clube-descricao">
          <Text variant="label" as="span">Descrição</Text>
          <textarea
            id="clube-descricao"
            className="input resize-y leading-relaxed"
            rows={4}
            value={descricao}
            onChange={event => setDescricao(event.target.value)}
            placeholder="Sobre o que é esse clube?"
          />
        </label>
        <div className="stack-xs">
          <Text variant="label" as="span">Apoio</Text>
          <SelectField
            id="clube-origem"
            ariaLabel="Onde o clube se apoia"
            value={origem}
            onChange={valor => {
              if (valor === 'catarse' || valor === 'apoiase' || valor === 'outro') setOrigem(valor);
            }}
            options={ORIGENS.map(item => ({ value: item, label: ORIGEM_DO_CLUBE[item] }))}
          />
        </div>
        <label className="flex flex-col gap-1" htmlFor="clube-url">
          <Text variant="label" as="span">Endereço</Text>
          <input
            id="clube-url"
            className="input"
            type="url"
            value={url}
            onChange={event => setUrl(event.target.value)}
            placeholder="https://"
          />
        </label>
        <div>
          <Text variant="label" as="div" className="mb-2">Cor</Text>
          <div className="flex flex-wrap gap-2">
            {PILAR_PRESET_CORES.map(item => {
              const chave = serieColorKey(item);
              const usada = Boolean(chave && ocupadas.has(chave) && chave !== chaveAtual);
              return (
                <button
                  key={item}
                  type="button"
                  disabled={usada}
                  aria-label={usada ? `Cor ${item} já usada` : `Escolher cor ${item}`}
                  aria-pressed={serieColorKey(cor) === chave}
                  onClick={() => setCor(chave || item)}
                  className="h-8 w-8 rounded-full border-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ backgroundColor: item, borderColor: cor === item ? 'var(--text-primary)' : 'transparent' }}
                />
              );
            })}
          </div>
        </div>
      </OverlayBody>
      <OverlayFooter>
        <AppButton variant="secondary" onClick={onClose}>Cancelar</AppButton>
        <AppButton variant="primary" onClick={() => onSave({ nome, descricao, capaUrl, cor, origem, url })} disabled={!nome.trim()}>
          Salvar
        </AppButton>
      </OverlayFooter>
    </BottomSheetModal>
  );
}
