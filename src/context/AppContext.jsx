import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [focusMode, setFocusMode] = useState(false);
  const scrollHandlerRef = useRef(null);

  const registerScrollHandler = useCallback((handler) => {
    scrollHandlerRef.current = handler;
  }, []);

  const scrollToTarget = useCallback((target) => {
    if (scrollHandlerRef.current) {
      scrollHandlerRef.current(target);
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = prefersReduced ? 'auto' : 'smooth';

    if (target === 0 || target === '#top') {
      window.scrollTo({ top: 0, behavior });
      return;
    }

    const id = typeof target === 'string' ? target.replace(/^#/, '') : '';
    const el = id ? document.getElementById(id) : null;
    if (el) {
      const offset = window.innerWidth < 768 ? 104 : 48;
      const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
      window.scrollTo({ top, behavior });
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        focusMode,
        setFocusMode,
        registerScrollHandler,
        scrollToTarget,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
