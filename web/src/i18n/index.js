// src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar.json';
import fr from './fr.json';
import en from './en.json';

const resources = {
  ar: { translation: ar },
  fr: { translation: fr },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar',          // Arabic is the default per spec
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;

/**
 * Apply RTL/LTR direction and lang attribute to the <html> element.
 * Called whenever the language changes.
 * @param {'ar'|'fr'|'en'} lang
 */
export function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}
