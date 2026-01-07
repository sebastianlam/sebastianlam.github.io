import React from 'react';
import { useApp } from '../context/AppContext';
import { cvData } from '../data/cvData';
import { Sun, Moon, Maximize2, Type, LayoutGrid, Github, Linkedin, Mail, Volume2, VolumeX } from 'lucide-react';
import { useReadAloud } from '../hooks/useReadAloud';

const Sidebar = () => {
  const { theme, setTheme, density, setDensity, setFocusMode } = useApp();
  const { isReading, toggle } = useReadAloud();

  const handleReadAloud = () => {
    const text = `Jim Lam, Software Engineer. ${cvData.experience.map(e => `${e.role} at ${e.company}`).join('. ')}`;
    toggle(text);
  };

  return (
    <aside className="w-full md:w-80 md:sticky md:top-0 h-auto md:h-screen p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md z-50">
      <div>
        <header className="mb-12">
          <h1 className="text-4xl font-serif italic mb-2 tracking-tighter uppercase">{cvData.personal.name}</h1>
          <p className="text-xs font-mono tracking-widest uppercase opacity-50">{cvData.personal.title}</p>
        </header>

        <nav className="space-y-4 mb-12">
          {['Skills', 'Experience', 'Projects'].map(item => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`}
              className="block text-sm font-bold uppercase tracking-widest hover:italic transition-all"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30 mb-4">Controls</p>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
              className="p-2 border border-zinc-100 dark:border-zinc-900 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              title="Toggle Density"
            >
              <LayoutGrid size={14} />
            </button>
            <button 
              onClick={() => setFocusMode(true)}
              className="p-2 border border-zinc-100 dark:border-zinc-900 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              title="Focus Mode"
            >
              <Maximize2 size={14} />
            </button>
            <button 
              onClick={handleReadAloud}
              className={`p-2 border border-zinc-100 dark:border-zinc-900 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors ${isReading ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : ''}`}
              title="Read Aloud"
            >
              {isReading ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>
      </div>


      <footer className="pt-8">
        <div className="flex gap-4 mb-4">
          <a href={cvData.personal.github} target="_blank" rel="noopener"><Github size={18} className="opacity-50 hover:opacity-100" /></a>
          <a href={cvData.personal.linkedin} target="_blank" rel="noopener"><Linkedin size={18} className="opacity-50 hover:opacity-100" /></a>
          <a href={`mailto:${cvData.personal.email}`}><Mail size={18} className="opacity-50 hover:opacity-100" /></a>
        </div>
        <p className="text-[10px] font-mono opacity-30">© 2026 {cvData.personal.name}</p>
      </footer>
    </aside>
  );
};

export default Sidebar;

