import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-700.css';
import './styles/base.css';

import { AppFacade } from './app/AppFacade.js';

const root = document.querySelector('#app');
const app = new AppFacade({ root });

app.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => app.stop());
}
