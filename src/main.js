import '@fontsource/lexend/latin-400.css';
import '@fontsource/lexend/latin-700.css';
import './styles/base.css';

import { AppFacade } from './app/AppFacade.js';
import { AuthMobileRedirectBridgeManager } from './backend/auth/managers/AuthMobileRedirectBridgeManager.js';

const mobileAuthCallbackUri =
  import.meta.env.VITE_GOOGLE_AUTH_MOBILE_CALLBACK_URI ??
  'com.idlewizard.game://auth/callback';
const mobileAuthAndroidPackage =
  import.meta.env.VITE_ANDROID_APP_ID ?? 'com.idlewizard.game';
const mobileAuthNativeMarkerParam =
  import.meta.env.VITE_GOOGLE_AUTH_MOBILE_MARKER_PARAM ?? 'native_auth';

function redirectMobileOidcCallbackToApp() {
  return new AuthMobileRedirectBridgeManager({
    callbackUri: mobileAuthCallbackUri,
    androidPackage: mobileAuthAndroidPackage,
    nativeMarkerParam: mobileAuthNativeMarkerParam,
  }).redirectIfNeeded();
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
