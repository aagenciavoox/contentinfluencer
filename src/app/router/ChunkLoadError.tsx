import {useEffect} from 'react';
import {useRouteError} from 'react-router-dom';
import {AppButton} from '../../components/ui/AppButton';
import {Surface} from '../../components/ui/Surface';
import {Text} from '../../components/ui/Text';
import {isChunkLoadError, recoverFromChunkError} from './chunkReload';

export function ChunkLoadError() {
  const error = useRouteError();
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    void recoverFromChunkError();
  }, [error]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <Surface variant="outlined" padding="md" className="stack-sm w-full max-w-md">
        <Text variant="sectionTitle">
          {chunkError ? 'Não foi possível abrir esta tela' : 'Algo saiu do lugar'}
        </Text>
        <Text variant="secondary">
          {chunkError
            ? 'O navegador ficou com uma versão antiga. Atualize para carregar a versão publicada.'
            : 'Atualize a página e tente de novo.'}
        </Text>
        <AppButton variant="primary" onClick={() => { void recoverFromChunkError(true); }}>
          Atualizar
        </AppButton>
      </Surface>
    </div>
  );
}
