import type { AppState } from '../app/providers/appState';
import { planDemoteContentsToIdeas } from '../features/contents/lib/demoteContentToIdea.ts';
import { normalizeIdea } from '../features/ideas/lib/ideaText.ts';
import type * as db from '../lib/database.ts';
import type { AppAction } from './reducer';

type DatabaseModule = typeof import('../lib/database.ts');

export type PersistenceApi = Pick<DatabaseModule,
  | 'saveDnaVoz'
  | 'saveContent'
  | 'saveContentPlataformas'
  | 'saveBibliotecaItem'
  | 'saveItemGeneros'
  | 'deleteBibliotecaItem'
  | 'saveAnotacao'
  | 'deleteAnotacao'
  | 'deleteContent'
  | 'fetchContentsByIds'
  | 'saveIdea'
  | 'deleteIdea'
  | 'saveProjeto'
  | 'saveProjetoEtapa'
  | 'saveProjetoEtapas'
  | 'saveProjetoConteudos'
  | 'deleteProjetoEtapa'
  | 'deleteProjeto'
  | 'savePilar'
  | 'savePilarPlataformas'
  | 'clearPilarReferences'
  | 'deletePilar'
  | 'saveSerie'
  | 'saveSeriePilares'
  | 'saveSeriePlataformas'
  | 'deleteSerie'
  | 'saveCenario'
  | 'deleteCenario'
  | 'saveLook'
  | 'deleteLook'
  | 'saveContentMetric'
  | 'deleteContentMetric'
  | 'saveAgendaItem'
  | 'deleteAgendaItem'
  | 'saveRecordingBlock'
  | 'saveRecordingBlockContents'
  | 'deleteRecordingBlock'
  | 'saveTemplate'
  | 'deleteTemplate'
  | 'savePreference'
  | 'saveGoldenRule'
  | 'deleteGoldenRule'
  | 'savePlatform'
  | 'deletePlatform'
>;

interface PersistActionParams {
  action: AppAction;
  userId: string;
  state: AppState;
  api?: PersistenceApi;
}

async function getPersistenceApi(api?: PersistenceApi): Promise<PersistenceApi> {
  if (api) return api;
  return import('../lib/database.ts');
}

export async function persistContentRecord(
  content: db.Content,
  userId: string,
  api?: PersistenceApi
): Promise<void> {
  const persistenceApi = await getPersistenceApi(api);
  await persistenceApi.saveContent({ ...content, userId });
  await persistenceApi.saveContentPlataformas(content.id, content.plataformas);
}

export async function persistAction({ action, userId, state, api }: PersistActionParams): Promise<void> {
  const persistenceApi = await getPersistenceApi(api);

  switch (action.type) {
    case 'ADD_BOOK':
    case 'UPDATE_BOOK':
    case 'ADD_BIBLIOTECA_ITEM':
    case 'UPDATE_BIBLIOTECA_ITEM':
      await persistenceApi.saveBibliotecaItem({ ...action.payload, userId });
      if (action.payload.generoIds) {
        await persistenceApi.saveItemGeneros(action.payload.id, action.payload.generoIds);
      }
      return;

    case 'DELETE_BOOK':
    case 'DELETE_BIBLIOTECA_ITEM':
      await persistenceApi.deleteBibliotecaItem(action.payload);
      return;

    case 'ADD_ANNOTATION':
    case 'UPDATE_ANNOTATION':
    case 'ADD_ANOTACAO':
    case 'UPDATE_ANOTACAO': {
      const annotation = (action.payload as any).anotacao || action.payload;
      const itemId = (action.payload as any).livroId || (action.payload as any).itemId;
      await persistenceApi.saveAnotacao({ ...annotation, itemId, userId });
      return;
    }

    case 'DELETE_ANNOTATION':
    case 'DELETE_ANOTACAO': {
      const annotationId =
        (action.payload as any).annotationId ||
        (action.payload as any).anotacaoId ||
        action.payload;
      await persistenceApi.deleteAnotacao(annotationId as string);
      return;
    }

    case 'DISTILL_ANNOTATION': {
      const book = state.bibliotecaItems.find(item => item.id === action.payload.livroId);
      const note = book?.anotacoes.find(item => item.id === action.payload.annotationId);
      if (note) {
        await persistenceApi.saveAnotacao({ ...note, destilada: true, itemId: action.payload.livroId, userId });
      }
      return;
    }

    case 'ADD_CONTENT':
    case 'UPDATE_CONTENT':
      await persistContentRecord(action.payload, userId, persistenceApi);
      return;

    case 'DELETE_CONTENT':
      await persistenceApi.deleteContent(action.payload);
      return;

    case 'ADD_IDEA':
    case 'UPDATE_IDEA': {
      const normalizedIdea = normalizeIdea({ ...action.payload, userId });
      await persistenceApi.saveIdea(normalizedIdea);
      return;
    }

    case 'PROMOTE_IDEA': {
      await persistContentRecord(action.payload.content, userId, persistenceApi);
      const existingIdea = state.ideas.find(idea => idea.id === action.payload.ideaId);
      if (existingIdea) {
        await persistenceApi.saveIdea({
          ...existingIdea,
          userId,
          promotedToContentId: action.payload.contentId,
          archived: true,
        });
      }
      return;
    }

    case 'DEMOTE_CONTENTS_TO_IDEAS': {
      const contentIds = action.payload.contentIds;
      const fetchedContents = await persistenceApi.fetchContentsByIds(userId, contentIds);
      const fetchedById = new Map(fetchedContents.map(content => [content.id, content]));
      const payloadById = new Map((action.payload.contents ?? []).map(content => [content.id, content]));
      const demoteContents = contentIds
        .map(contentId => fetchedById.get(contentId) ?? payloadById.get(contentId) ?? state.contents.find(content => content.id === contentId))
        .filter((content): content is db.Content => Boolean(content));

      const plan = planDemoteContentsToIdeas(
        demoteContents,
        state.ideas,
        contentIds,
        userId,
      );

      for (const idea of plan.ideasToSave) {
        await persistenceApi.saveIdea(normalizeIdea({ ...idea, userId: idea.userId || userId }));
      }

      for (const contentId of plan.contentIdsToDelete) {
        await persistenceApi.deleteContent(contentId);
      }
      return;
    }

    case 'DELETE_IDEA':
      await persistenceApi.deleteIdea(action.payload);
      return;

    case 'ADD_CAMPAIGN':
    case 'ADD_PARTNERSHIP':
    case 'UPDATE_PARTNERSHIP':
    case 'ADD_PROJETO':
    case 'UPDATE_PROJETO':
      await persistenceApi.saveProjeto({ ...action.payload, userId });
      await persistenceApi.saveProjetoEtapas(action.payload.etapas || []);
      await persistenceApi.saveProjetoConteudos(action.payload.id, action.payload.contentIds || []);
      return;

    case 'ADD_PROJETO_ETAPA':
    case 'UPDATE_PROJETO_ETAPA':
      await persistenceApi.saveProjetoEtapa(action.payload.etapa);
      return;

    case 'DELETE_PROJETO_ETAPA':
      await persistenceApi.deleteProjetoEtapa(action.payload.etapaId);
      return;

    case 'DELETE_PARTNERSHIP':
    case 'DELETE_PROJETO':
      await persistenceApi.deleteProjeto(action.payload);
      return;

    case 'ADD_PILAR':
    case 'UPDATE_PILAR':
      await persistenceApi.savePilar({ ...action.payload, userId });
      if (action.payload.plataformas) {
        await persistenceApi.savePilarPlataformas(action.payload.id, action.payload.plataformas);
      }
      return;

    case 'DELETE_PILAR':
      await persistenceApi.clearPilarReferences(action.payload);
      await persistenceApi.deletePilar(action.payload);
      return;

    case 'ADD_SERIE':
    case 'UPDATE_SERIE':
      await persistenceApi.saveSerie({ ...action.payload, userId });
      if (action.payload.pilarIds) {
        await persistenceApi.saveSeriePilares(action.payload.id, action.payload.pilarIds);
      }
      if (action.payload.plataformas) {
        await persistenceApi.saveSeriePlataformas(action.payload.id, action.payload.plataformas);
      }
      return;

    case 'DELETE_SERIE':
      await persistenceApi.deleteSerie(action.payload);
      return;

    case 'ADD_CENARIO':
    case 'UPDATE_CENARIO':
      await persistenceApi.saveCenario({ ...action.payload, userId });
      return;

    case 'DELETE_CENARIO':
      await persistenceApi.deleteCenario(action.payload);
      return;

    case 'ADD_LOOK':
    case 'UPDATE_LOOK':
      await persistenceApi.saveLook({ ...action.payload, userId });
      return;

    case 'DELETE_LOOK':
      await persistenceApi.deleteLook(action.payload);
      return;

    case 'ADD_RESULT':
    case 'UPDATE_RESULT':
    case 'ADD_CONTENT_METRIC':
    case 'UPDATE_CONTENT_METRIC':
      await persistenceApi.saveContentMetric({ ...action.payload, userId });
      return;

    case 'DELETE_RESULT':
    case 'DELETE_CONTENT_METRIC':
      await persistenceApi.deleteContentMetric(action.payload);
      return;

    case 'ADD_AGENDA':
    case 'UPDATE_AGENDA':
    case 'ADD_AGENDA_ITEM':
    case 'UPDATE_AGENDA_ITEM':
      await persistenceApi.saveAgendaItem({ ...action.payload, userId });
      return;

    case 'DELETE_AGENDA':
    case 'DELETE_AGENDA_ITEM':
      await persistenceApi.deleteAgendaItem(action.payload);
      return;

    case 'ADD_RECORDING_BLOCK':
    case 'UPDATE_RECORDING_BLOCK':
      await persistenceApi.saveRecordingBlock({ ...action.payload, userId });
      return;

    case 'UPDATE_BLOCK_CONTENTS':
      await persistenceApi.saveRecordingBlockContents(action.payload.blockId, action.payload.contents);
      return;

    case 'DELETE_RECORDING_BLOCK':
      await persistenceApi.deleteRecordingBlock(action.payload);
      return;

    case 'ADD_TEMPLATE':
    case 'UPDATE_TEMPLATE':
      await persistenceApi.saveTemplate({ ...action.payload, userId });
      return;

    case 'DELETE_TEMPLATE':
      await persistenceApi.deleteTemplate(action.payload);
      return;

    case 'UPDATE_DNA_VOZ':
      await persistenceApi.saveDnaVoz(action.payload, userId);
      return;

    case 'SET_PREFERENCE':
    case 'UPDATE_PREFERENCE':
      await persistenceApi.savePreference(action.payload.key, action.payload.value);
      return;

    case 'ADD_GOLDEN_RULE':
    case 'UPDATE_GOLDEN_RULE':
      await persistenceApi.saveGoldenRule({ ...action.payload, userId });
      return;

    case 'DELETE_GOLDEN_RULE':
      await persistenceApi.deleteGoldenRule(action.payload);
      return;

    case 'ADD_PLATFORM':
    case 'UPDATE_PLATFORM':
      await persistenceApi.savePlatform({ ...action.payload, userId });
      return;

    case 'DELETE_PLATFORM':
      await persistenceApi.deletePlatform(action.payload);
      return;

    case 'DELETE_MULTIPLE_CONTENTS':
      for (const id of action.payload) {
        await persistenceApi.deleteContent(id);
      }
      return;

    case 'LOG_ENERGY':
    case 'SET_DATA':
    case 'SET_LOADED':
    case 'SET_THEME':
      return;

    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}
