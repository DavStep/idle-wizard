import '@fontsource/lexend/latin-400.css';
import '@fontsource/lexend/latin-700.css';
import './styles/base.css';

import { AppFacade } from './app/AppFacade.js';

const mobileAuthCallbackUri =
  import.meta.env.VITE_SPACETIME_AUTH_MOBILE_CALLBACK_URI ??
  'com.idlewizard.game://auth/callback';

function redirectMobileOidcCallbackToApp() {
  if (globalThis.Capacitor?.isNativePlatform?.()) {
    return false;
  }

  const { location, navigator } = globalThis;
  const params = new URLSearchParams(location.search);
  const hasCallback = params.has('state') && (params.has('code') || params.has('error'));
  const isAndroidBrowser = /Android/i.test(navigator?.userAgent ?? '');
  if (!hasCallback || !isAndroidBrowser) {
    return false;
  }

  location.replace(`${mobileAuthCallbackUri}${location.search}${location.hash}`);
  return true;
}

if (!redirectMobileOidcCallbackToApp()) {
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
}
