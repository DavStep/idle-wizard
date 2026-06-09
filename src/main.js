import './styles/base.css';

import { AppFacade } from './app/AppFacade.js';

const root = document.querySelector('#app');
const app = new AppFacade({ root });

app.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => app.stop());
}
