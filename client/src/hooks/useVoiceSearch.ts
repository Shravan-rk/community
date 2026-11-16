import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../types';

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => Recognition;

const LOCALES: Record<Language, string> = {
  kn: 'kn-IN',
  en: 'en-IN',
  hi: 'hi-IN',
};

export function useVoiceSearch(language: Language, onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);

  const supported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { SpeechRecognition?: RecognitionConstructor }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition,
    );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setError('unsupported');
      return;
    }
    setError(null);
    const Constructor =
      (window as unknown as { SpeechRecognition?: RecognitionConstructor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition;
    if (!Constructor) return;

    recognitionRef.current?.abort();
    const recognition = new Constructor();
    recognition.lang = LOCALES[language] ?? LOCALES.kn;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript.trim()) onResult(transcript.trim());
    };
    recognition.onerror = (event) => {
      setError(event.error ?? 'failed');
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setError('failed');
      setListening(false);
    }
  }, [language, onResult, supported]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, error, start, stop };
}
