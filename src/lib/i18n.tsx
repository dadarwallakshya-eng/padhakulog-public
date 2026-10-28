'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { LANG_COOKIE, type Lang } from './lang';

// Two languages for the public pages: Hinglish (default) and plain English,
// so students who don't speak Hindi aren't left out. The choice is kept in a
// cookie so the server renders the right one on the next visit.

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'hinglish', setLang: () => {} });

export function LangProvider({ initial = 'hinglish', children }: { initial?: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l === 'english' ? 'en' : 'hi-Latn';
  }, []);
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

// Pick the string for the current language: t({ hinglish: '...', english: '...' }).
export function useT() {
  const { lang } = useLang();
  return useCallback(<T,>(s: { hinglish: T; english: T }) => s[lang], [lang]);
}

export function LangSwitch({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useLang();
  const base = 'h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors';
  const on = dark ? 'bg-paper text-ink' : 'bg-ink text-paper';
  const off = dark ? 'text-neutral-300 hover:text-paper' : 'text-ink hover:bg-neutral-100';
  return (
    <div role="group" aria-label="Language" className={`flex rounded-full border-[1.5px] p-[3px] ${dark ? 'border-neutral-700 bg-neutral-900' : 'border-ink bg-white'}`}>
      <button type="button" aria-pressed={lang === 'hinglish'} onClick={() => setLang('hinglish')} className={`${base} ${lang === 'hinglish' ? on : off}`}>
        Hinglish
      </button>
      <button type="button" aria-pressed={lang === 'english'} onClick={() => setLang('english')} className={`${base} ${lang === 'english' ? on : off}`}>
        English
      </button>
    </div>
  );
}
