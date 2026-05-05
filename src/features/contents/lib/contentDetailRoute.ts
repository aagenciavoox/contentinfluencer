import type {ContentDetailTab} from './contentPipeline';

export function buildContentDetailRoute(contentId: string, tab: ContentDetailTab = 'roteiro') {
  return `/conteudos/${contentId}?tab=${tab}`;
}
