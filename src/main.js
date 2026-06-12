import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/lexend/latin-400.css';
import '@fontsource/lexend/latin-700.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-700.css';
import './styles/base.css';

import { AppFacade } from './app/AppFacade.js';

const root = document.querySelector('#app');
const app = new AppFacade({ root });
let devCheatsFacade = null;
let disposed = false;

app.start();

if (import.meta.env.VITE_ENABLE_CHEATS === 'true') {
  void import('./dev/cheats/DevCheatsFacade.js').then(({ DevCheatsFacade }) => {
    if (disposed) {
      return;
    }

    devCheatsFacade = new DevCheatsFacade({ app });
    devCheatsFacade.mount();
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposed = true;
    devCheatsFacade?.unmount();
    app.stop();
  });
}
