import { useCallback, useEffect, useState } from 'react';
import type { Language } from '../types';

const LOCALES: Record<Language, string> = {
  kn: 'kn-IN',
  en: 'en-IN',
  hi: 'hi-IN',
};

export function useReadAloud() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, language: Language) => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 12000));
      utterance.lang = LOCALES[language] ?? LOCALES.kn;
      utterance.rate = 0.92;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speaking, speak, stop };
}
