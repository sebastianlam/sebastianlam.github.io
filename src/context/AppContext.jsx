import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'auto');
  const [density, setDensity] = useState(localStorage.getItem('density') || 'comfortable');
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.remove('light', 'dark', 'hc');
    if (theme === 'hc') {
      root.classList.add('hc');
    } else {
      root.classList.add(isDark ? 'dark' : 'light');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('density', density);
  }, [density]);

  return (
    <AppContext.Provider value={{ 
      theme, setTheme, 
      density, setDensity, 
      focusMode, setFocusMode 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

