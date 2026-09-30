import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enResources, rwResources } from './loadLocales';

/** Language from saved user choice only — never browser language. */
function savedLanguage(): 'rw' | 'en' {
  try {
    const saved = localStorage.getItem('zm_lang');
    if (saved === 'en' || saved === 'rw') return saved;
  } catch {
    /* ignore */
  }
  return 'rw';
}

function applyDocumentLang(lng: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng.startsWith('rw') ? 'rw' : 'en';
  }
}

const initial = savedLanguage();
applyDocumentLang(initial);

void i18n.use(initReactI18next).init({
  resources: {
    rw: { translation: rwResources },
    en: { translation: enResources },
  },
  lng: initial,
  fallbackLng: 'rw',
  supportedLngs: ['rw', 'en'],
  nonExplicitSupportedLngs: true,
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  // Do not use i18next-browser-languagedetector — ignore navigator language.
});

i18n.on('languageChanged', (lng) => {
  applyDocumentLang(lng);
});

export function setLanguage(lng: 'en' | 'rw') {
  localStorage.setItem('zm_lang', lng);
  applyDocumentLang(lng);
  void i18n.changeLanguage(lng);
}

export default i18n;
