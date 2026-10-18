// src/components/ui/LanguageSwitcher.jsx
import { useTranslation } from 'react-i18next';
import { applyLanguage } from '../../i18n/index.js';
import { clsx } from 'clsx';

const LANGS = [
  { code: 'ar', label: 'ع' },
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
];

export function LanguageSwitcher({ className }) {
  const { i18n } = useTranslation();
  const current = i18n.language;

  const change = (code) => {
    i18n.changeLanguage(code);
    applyLanguage(code);
  };

  return (
    <div
      className={clsx('flex items-center gap-1', className)}
      role="group"
      aria-label="Language switcher"
    >
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => change(code)}
          aria-pressed={current === code}
          className={clsx(
            'px-2 py-1 rounded text-xs font-semibold transition-colors',
            current === code
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
