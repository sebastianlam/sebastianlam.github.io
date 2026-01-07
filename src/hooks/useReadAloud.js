import { useState, useCallback } from 'react';

export const useReadAloud = () => {
  const [isReading, setIsReading] = useState(false);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsReading(false);
  }, []);

  const speak = useCallback((text) => {
    stop();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsReading(false);
    setIsReading(true);
    window.speechSynthesis.speak(utterance);
  }, [stop]);

  const toggle = useCallback((text) => {
    if (isReading) {
      stop();
    } else {
      speak(text);
    }
  }, [isReading, speak, stop]);

  return { isReading, toggle, stop };
};

