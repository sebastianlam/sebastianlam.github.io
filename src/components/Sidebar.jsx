import React from 'react';
import { useApp } from '../context/AppContext';
import { cvData } from '../data/cvData';
import { Sun, Moon, Maximize2, Type, Github, Linkedin, Mail, Volume2, VolumeX, FileText } from 'lucide-react';
import { useReadAloud } from '../hooks/useReadAloud';

const Sidebar = () => {
  const { theme, setTheme, setFocusMode } = useApp();
  const { isReading, toggle } = useReadAloud();

  const handleReadAloud = () => {
    const text = `Jim Lam, Software Engineer. ${cvData.experience.map(e => `${e.role} at ${e.company}`).join('. ')}`;
    toggle(text);
  };

  return (
    <aside className="hidden md:flex w-full h-full p-8 flex-col justify-between border-b md:border-b-0 md:border-r border-white/20 bg-black/50 backdrop-blur-md z-50 md:sidebar-fade-mask">
      <div>
        <header className="mb-12">
          <h1 className="text-4xl font-serif mb-2 tracking-tighter uppercase text-white">{cvData.personal.name}</h1>
          <p className="text-xs font-mono tracking-widest uppercase text-white">{cvData.personal.title}</p>
        </header>

        <nav className="space-y-4 mb-12">
          {['Skills', 'Experience', 'Projects', 'Education', 'Interests'].map(item => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`}
              className="block text-sm font-bold uppercase tracking-widest hover:font-black transition-all text-white hover:text-white"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white mb-4">Controls</p>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setFocusMode(true)}
              className="p-2 border border-white/20 hover:bg-white hover:text-black transition-colors text-white"
              title="Focus Mode"
              aria-label="Enter focus mode"
            >
              <Maximize2 size={14} />
            </button>
            <button 
              onClick={handleReadAloud}
              className={`p-2 border border-white/20 hover:bg-white hover:text-black transition-colors ${isReading ? 'bg-white text-black' : 'text-white'}`}
              title="Read Aloud"
              aria-label={isReading ? "Stop reading aloud" : "Read page content aloud"}
            >
              {isReading ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <a 
              href={cvData.personal.cv} 
              download="Jim_Lam_CV.pdf"
              className="p-2 border border-white/20 hover:bg-white hover:text-black transition-colors text-white flex items-center justify-center"
              title="Download CV"
              aria-label="Download CV PDF"
            >
              <FileText size={14} />
            </a>
          </div>
        </div>
      </div>


      <footer className="pt-8">
        <div className="flex gap-4 mb-4">
          <a href={cvData.personal.github} target="_blank" rel="noopener" aria-label="GitHub Profile"><Github size={18} className="text-white hover:text-white transition-colors" /></a>
          <a href={cvData.personal.linkedin} target="_blank" rel="noopener" aria-label="LinkedIn Profile"><Linkedin size={18} className="text-white hover:text-white transition-colors" /></a>
          <a href={`mailto:${cvData.personal.email}`} aria-label="Send Email"><Mail size={18} className="text-white hover:text-white transition-colors" /></a>
        </div>
        <p className="text-[10px] font-mono text-white">© 2026 {cvData.personal.name}</p>
      </footer>
    </aside>
  );
};

export default Sidebar;

