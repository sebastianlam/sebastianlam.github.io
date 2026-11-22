import React from 'react';
import { useApp } from '../context/AppContext';
import { cvData, navItems } from '../data/cvData';
import { Maximize2, Github, Linkedin, Mail, FileText } from 'lucide-react';

const Sidebar = () => {
  const { setFocusMode, scrollToTarget } = useApp();

  const handleNavClick = (e, id) => {
    e.preventDefault();
    scrollToTarget(`#${id}`);
  };

  return (
    <aside className="hidden md:flex h-full p-8 flex-col justify-between relative z-50 w-80">
      {/* Masked backdrop layer only — keeps foreground text and controls at 100% contrast */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 border-r border-white/20 bg-black/65 backdrop-blur-md w-[calc(100%+2000px)]"
        style={{
          maskImage: 'linear-gradient(to right, black 0px, black calc(100% - 72px), rgba(0,0,0,0.65) calc(100% - 28px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 0px, black calc(100% - 72px), rgba(0,0,0,0.65) calc(100% - 28px), transparent 100%)',
        }}
      />

      <div>
        <header className="mb-12">
          <button
            type="button"
            className="text-left cursor-pointer group w-full bg-transparent border-0 p-0"
            onClick={() => scrollToTarget(0)}
            aria-label="Scroll to top"
          >
            <h1 className="text-4xl font-serif mb-2 tracking-tighter uppercase text-white group-hover:text-white transition-colors leading-tight py-1">
              {cvData.personal.name}
            </h1>
            <p className="text-xs font-mono tracking-widest uppercase text-white/75 group-hover:text-white transition-colors">
              {cvData.personal.title}
            </p>
          </button>
        </header>

        <nav aria-label="Primary navigation" className="space-y-4 mb-12">
          {navItems.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleNavClick(e, item.id)}
              className="block text-sm font-bold uppercase tracking-widest hover:font-black transition-all text-white/90 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/80 mb-4">Controls</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setFocusMode(true)}
              className="px-4 py-3 border border-white/25 bg-black/40 hover:bg-white hover:text-black transition-colors text-white flex items-center gap-4 w-full cursor-pointer"
              title="Focus Mode"
              aria-label="Enter focus mode"
            >
              <Maximize2 size={16} aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Focus Mode</span>
            </button>
            <a
              href={cvData.personal.cv}
              download="Jim_Lam_CV.pdf"
              className="px-4 py-3 border border-white/25 bg-black/40 hover:bg-white hover:text-black transition-colors text-white flex items-center gap-4 w-full"
              title="Download CV"
              aria-label="Download CV PDF"
            >
              <FileText size={16} aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Download CV</span>
            </a>
          </div>
        </div>
      </div>

      <footer className="pt-8">
        <div className="flex gap-4 mb-4">
          <a href={cvData.personal.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile" className="text-white/85 hover:text-white transition-colors">
            <Github size={18} aria-hidden="true" />
          </a>
          <a href={cvData.personal.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile" className="text-white/85 hover:text-white transition-colors">
            <Linkedin size={18} aria-hidden="true" />
          </a>
          <a href={`mailto:${cvData.personal.email}`} aria-label="Send Email" className="text-white/85 hover:text-white transition-colors">
            <Mail size={18} aria-hidden="true" />
          </a>
        </div>
        <p className="text-[10px] font-mono text-white/80">© 2026 {cvData.personal.name}</p>
      </footer>
    </aside>
  );
};

export default Sidebar;
