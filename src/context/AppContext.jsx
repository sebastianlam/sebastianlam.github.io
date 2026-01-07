import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [density, setDensity] = useState(localStorage.getItem('density') || 'comfortable');
  const [focusMode, setFocusMode] = useState(window.innerWidth < 768);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(isDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
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

