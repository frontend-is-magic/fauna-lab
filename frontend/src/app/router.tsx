import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '../components/AppShell';
import { DatasetPage } from '../pages/DatasetPage';
import { InferencePage } from '../pages/InferencePage';
import { ModelsPage } from '../pages/ModelsPage';
import { TrainPage } from '../pages/TrainPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DatasetPage /> },
      { path: 'train', element: <TrainPage /> },
      { path: 'inference', element: <InferencePage /> },
      { path: 'models', element: <ModelsPage /> }
    ]
  }
]);
