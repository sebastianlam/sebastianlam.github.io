import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Section from './components/Section';
import { cvData } from './data/cvData';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import { FileText, Github, Linkedin, Mail } from 'lucide-react';

const SkillsGraph = lazy(() => import('./components/SkillsGraph2D'));

function App() {
  const { focusMode, setFocusMode } = useApp();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [graphReady, setGraphReady] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setGraphReady(true), { timeout: 600 });
      return () => window.cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => setGraphReady(true), 120);
      return () => clearTimeout(id);
    }
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white transition-colors duration-300">
      {graphReady && (
        <Suspense fallback={null}>
          <SkillsGraph />
        </Suspense>
      )}

      <div className="flex flex-col md:flex-row max-w-[1600px] mx-auto min-h-screen relative z-10">
        {isMobile && (
          <header className="px-4 sm:px-6 pt-4 pb-3 border-b border-white/15 md:hidden bg-black/70 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center justify-between gap-2">
              <div
                className="cursor-pointer min-w-0"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <h1 className="text-xl sm:text-2xl font-serif tracking-tighter uppercase text-white leading-tight truncate">
                  {cvData.personal.name}
                </h1>
                <p className="text-[10px] font-mono tracking-wider uppercase text-white/70 truncate">
                  {cvData.personal.title}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={cvData.personal.cv}
                  download="Jim_Lam_CV.pdf"
                  className="px-2.5 py-1.5 border border-white/25 hover:bg-white hover:text-black transition-colors text-white flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold"
                  aria-label="Download CV PDF"
                >
                  <FileText size={13} />
                  <span>CV</span>
                </a>
                <a
                  href={cvData.personal.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub Profile"
                  className="p-2 text-white/80 hover:text-white"
                >
                  <Github size={16} />
                </a>
                <a
                  href={cvData.personal.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn Profile"
                  className="p-2 text-white/80 hover:text-white"
                >
                  <Linkedin size={16} />
                </a>
                <a
                  href={`mailto:${cvData.personal.email}`}
                  aria-label="Send Email"
                  className="p-2 text-white/80 hover:text-white"
                >
                  <Mail size={16} />
                </a>
              </div>
            </div>
            <nav
              aria-label="Mobile section navigation"
              className="flex items-center gap-4 overflow-x-auto pt-2.5 mt-2 border-t border-white/10 no-scrollbar"
            >
              {[
                { label: 'Skills', id: 'skills' },
                { label: 'Background', id: 'bio' },
                { label: 'Experience', id: 'experience' },
                { label: 'Projects', id: 'projects' },
                { label: 'Education', id: 'education' },
                { label: 'Interests', id: 'interests' },
              ].map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="text-[10px] font-bold uppercase tracking-widest text-white/75 hover:text-white whitespace-nowrap py-0.5"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </header>
        )}

        <AnimatePresence>
          {!focusMode && !isMobile && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 320 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="md:sticky md:top-0 md:h-screen z-50"
            >
              <div className="w-80 h-full relative">
                <Sidebar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.main
          layout
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="flex-1 px-5 sm:px-8 md:px-12 py-8 md:py-12 space-y-16 md:space-y-32"
        >
          <Section
            title="Skills"
            id="skills"
            hideTitle
            className="min-h-[calc(100svh-6.5rem)] md:h-screen -mt-8 md:-mt-12 !py-0 !border-b-0"
            innerClassName="h-full min-h-[calc(100svh-6.5rem)] md:min-h-screen"
          >
            <div className="absolute inset-0" />
            <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 pointer-events-none select-none">
                Drag nodes to explore
              </span>
              <motion.button
                type="button"
                animate={{
                  y: [0, 12, 0],
                  opacity: [0.5, 0.9, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="cursor-pointer p-3 bg-transparent border-0"
                aria-label="Scroll to background"
                onClick={() => {
                  const bioSection = document.getElementById('bio');
                  if (bioSection) {
                    const offset = window.innerWidth < 768 ? 96 : 48;
                    const top = bioSection.getBoundingClientRect().top + window.scrollY - offset;
                    window.scrollTo({ top, behavior: 'smooth' });
                  }
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white drop-shadow-lg md:w-12 md:h-12"
                >
                  <path d="M7 13l5 5 5-5" />
                  <path d="M7 6l5 5 5-5" />
                </svg>
              </motion.button>
            </div>
          </Section>

          <Section title="Background" id="bio">
            <div className="max-w-3xl space-y-5 md:space-y-6">
              {cvData.bio.map((para, i) => (
                <p key={i} className="text-lg sm:text-xl font-serif text-white/85 leading-relaxed italic">
                  {para}
                </p>
              ))}
            </div>
          </Section>

          <Section title="Experience" id="experience">
            <div className="space-y-10 md:space-y-12">
              {cvData.experience.map((exp, i) => (
                <article key={i} className="group relative">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1.5 sm:mb-2 gap-1">
                    <h3 className="text-2xl sm:text-3xl font-serif text-white leading-snug">{exp.role}</h3>
                    <span className="text-xs sm:text-sm font-mono text-white/75 shrink-0">{exp.period}</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-white/90">{exp.company}</p>
                  {exp.highlights ? (
                    <ul className="list-disc list-outside ml-5 space-y-2 text-sm sm:text-base text-white/90 leading-relaxed">
                      {exp.highlights.map((h, j) => <li key={j}>{h}</li>)}
                    </ul>
                  ) : (
                    <p className="text-sm sm:text-base text-white/90 leading-relaxed">{exp.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-4">
                    {exp.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 text-[10px] uppercase tracking-widest bg-white text-black font-bold transition-opacity">
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </Section>

          <Section title="Projects" id="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {cvData.projects.map((proj, i) => (
                <motion.article
                  whileHover={{ y: -5 }}
                  key={i}
                  className="p-6 sm:p-8 border-2 border-white/15 bg-black/30 backdrop-blur-xs group transition-colors hover:bg-white/5 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-xl sm:text-2xl mb-3 sm:mb-4 text-white">{proj.title}</h3>
                    <p className="text-sm text-white/90 mb-6 leading-relaxed">{proj.description}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] uppercase tracking-widest text-white/70">{proj.status}</span>
                    {proj.link && (
                      <a
                        href={proj.isBroken ? "#" : proj.link}
                        onClick={proj.isBroken ? (e) => e.preventDefault() : undefined}
                        target={proj.isBroken ? undefined : "_blank"}
                        rel={proj.isBroken ? "nofollow" : "noopener noreferrer"}
                        className={`underline text-sm font-bold transition-colors ${proj.isBroken ? 'cursor-not-allowed text-white/50' : 'text-white hover:text-white'}`}
                      >
                        {proj.isBroken ? "Currently Offline" : "View Project"}
                      </a>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          </Section>

          <Section title="Education" id="education">
            <div className="space-y-10 md:space-y-12">
              {cvData.education.map((edu, i) => (
                <article key={i} className="group relative">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1.5 sm:mb-2 gap-1">
                    <h3 className="text-2xl sm:text-3xl font-serif text-white leading-snug">{edu.degree}</h3>
                    <span className="text-xs sm:text-sm font-mono text-white/75 shrink-0">{edu.period}</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-white/90">{edu.school}</p>
                  {edu.details && <p className="text-sm sm:text-base text-white/90 mb-4 leading-relaxed">{edu.details}</p>}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-4">
                    {edu.tags?.map(tag => (
                      <span key={tag} className="px-2 py-1 text-[10px] uppercase tracking-widest bg-white text-black font-bold transition-opacity">
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </Section>

          <Section title="Interests" id="interests">
            <p className="text-lg sm:text-xl font-serif text-white leading-relaxed">
              {cvData.interests}
            </p>
          </Section>
        </motion.main>
      </div>

      <AnimatePresence>
        {focusMode && !isMobile && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            onClick={() => setFocusMode(false)}
            className="fixed bottom-8 right-8 px-6 py-2 border-2 border-white/10 text-white font-bold uppercase text-xs z-50 bg-black/50 hover:bg-white hover:text-black transition-colors backdrop-blur-sm"
          >
            Exit Focus Mode
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
