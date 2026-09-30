import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enResources, frResources, rwResources } from './loadLocales';

export type AppLang = 'rw' | 'en' | 'fr';

/** Language from saved user choice only  -  never browser language. */
function savedLanguage(): AppLang {
  try {
    const saved = localStorage.getItem('zm_lang');
    if (saved === 'en' || saved === 'rw' || saved === 'fr') return saved;
  } catch {
    /* ignore */
  }
  return 'rw';
}

function applyDocumentLang(lng: string) {
  if (typeof document !== 'undefined') {
    const short = lng.startsWith('rw') ? 'rw' : lng.startsWith('fr') ? 'fr' : 'en';
    document.documentElement.lang = short;
  }
}

const initial = savedLanguage();
applyDocumentLang(initial);

void i18n.use(initReactI18next).init({
  resources: {
    rw: { translation: rwResources },
    en: { translation: enResources },
    fr: { translation: frResources },
  },
  lng: initial,
  fallbackLng: {
    fr: ['en', 'rw'],
    default: ['rw', 'en'],
  },
  supportedLngs: ['rw', 'en', 'fr'],
  nonExplicitSupportedLngs: true,
  load: 'languageOnly',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  applyDocumentLang(lng);
});

export function setLanguage(lng: AppLang) {
  localStorage.setItem('zm_lang', lng);
  applyDocumentLang(lng);
  void i18n.changeLanguage(lng);
}

export default i18n;
