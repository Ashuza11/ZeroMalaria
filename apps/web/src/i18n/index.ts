import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import rw from './rw.json';

const saved = localStorage.getItem('zm_lang') || 'rw';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    rw: { translation: rw },
  },
  lng: saved,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(lng: 'en' | 'rw') {
  localStorage.setItem('zm_lang', lng);
  void i18n.changeLanguage(lng);
}

export default i18n;
