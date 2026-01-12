import React from 'react';
import { useApp } from '../context/AppContext';
import { cvData } from '../data/cvData';
import { Maximize2, Github, Linkedin, Mail, FileText } from 'lucide-react';

const Sidebar = () => {
  const { setFocusMode } = useApp();

  return (
    <aside 
      className="hidden md:flex h-full p-8 flex-col justify-between border-b md:border-b-0 md:border-r border-white/20 bg-black/50 backdrop-blur-md z-50 ml-[-2000px] pl-[calc(2000px+2rem)] w-[calc(100%+2000px)]"
      style={{
        maskImage: 'linear-gradient(to right, black 0px, black calc(100% - 256px), rgba(0,0,0,0.5) calc(100% - 160px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 0px, black calc(100% - 256px), rgba(0,0,0,0.5) calc(100% - 160px), transparent 100%)'
      }}
    >
      <div>
        <header className="mb-12">
          <h1 className="text-4xl font-serif mb-2 tracking-tighter uppercase text-white">{cvData.personal.name}</h1>
          <p className="text-xs font-mono tracking-widest uppercase text-white">{cvData.personal.title}</p>
        </header>

        <nav className="space-y-4 mb-12">
          {['Skills', 'Background', 'Experience', 'Projects', 'Education', 'Interests'].map(item => (
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
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setFocusMode(true)}
              className="px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-white flex items-center gap-4 w-full"
              title="Focus Mode"
              aria-label="Enter focus mode"
            >
              <Maximize2 size={16} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Focus Mode</span>
            </button>
            <a 
              href={cvData.personal.cv} 
              download="Jim_Lam_CV.pdf"
              className="px-4 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-white flex items-center gap-4 w-full"
              title="Download CV"
              aria-label="Download CV PDF"
            >
              <FileText size={16} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Download CV</span>
            </a>
          </div>
        </div>
      </div>


      <footer className="pt-8">
        <div className="flex gap-4 mb-4">
          <a href={cvData.personal.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile"><Github size={18} className="text-white hover:text-white transition-colors" /></a>
          <a href={cvData.personal.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile"><Linkedin size={18} className="text-white hover:text-white transition-colors" /></a>
          <a href={`mailto:${cvData.personal.email}`} aria-label="Send Email"><Mail size={18} className="text-white hover:text-white transition-colors" /></a>
        </div>
        <p className="text-[10px] font-mono text-white">© 2026 {cvData.personal.name}</p>
      </footer>
    </aside>
  );
};

export default Sidebar;

