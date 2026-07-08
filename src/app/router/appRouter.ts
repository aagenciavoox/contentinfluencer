import { createBrowserRouter } from 'react-router-dom';
import { buildAppRoutes } from './buildAppRoutes';

export const appRouter = createBrowserRouter(buildAppRoutes());
