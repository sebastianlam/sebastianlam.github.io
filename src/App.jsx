import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Section from './components/Section';
import { cvData, navItems } from './data/cvData';
import Lenis from 'lenis';
import { FileText, Github, Linkedin, Mail } from 'lucide-react';

const SkillsGraph = lazy(() => import('./components/SkillsGraph2D'));

function App() {
  const { focusMode, setFocusMode, registerScrollHandler, scrollToTarget } = useApp();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [graphReady, setGraphReady] = useState(false);

  const groupedSkills = useMemo(() => {
    const groups = new Map();
    cvData.skills.forEach((skill) => {
      if (!groups.has(skill.category)) groups.set(skill.category, []);
      groups.get(skill.category).push(skill);
    });
    return Array.from(groups.entries());
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setGraphReady(true), { timeout: 600 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setGraphReady(true), 120);
    return () => clearTimeout(id);
  }, []);

  // Idle-sleeping Lenis smooth scroll (disabled when prefers-reduced-motion is enabled)
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      registerScrollHandler(null);
      return undefined;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    let rafId = null;
    let lastActivity = 0;

    const tick = (time) => {
      rafId = null;
      lenis.raf(time);
      const stillMoving = lenis.isScrolling || Math.abs(lenis.velocity) > 0.01;
      if (stillMoving || performance.now() - lastActivity < 250) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const wake = () => {
      lastActivity = performance.now();
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    };

    registerScrollHandler((target) => {
      wake();
      if (target === 0 || target === '#top') {
        lenis.scrollTo(0);
        return;
      }
      const id = typeof target === 'string' ? target.replace(/^#/, '') : '';
      const el = id ? document.getElementById(id) : null;
      if (el) {
        const offset = window.innerWidth < 768 ? -104 : -48;
        lenis.scrollTo(el, { offset });
      }
    });

    window.addEventListener('wheel', wake, { passive: true });
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('touchstart', wake, { passive: true });
    window.addEventListener('touchmove', wake, { passive: true });
    window.addEventListener('keydown', wake, { passive: true });

    return () => {
      registerScrollHandler(null);
      window.removeEventListener('wheel', wake);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('touchstart', wake);
      window.removeEventListener('touchmove', wake);
      window.removeEventListener('keydown', wake);
      if (rafId !== null) cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [registerScrollHandler]);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    scrollToTarget(`#${id}`);
  };

  return (
    <div className="min-h-screen bg-transparent text-white transition-colors duration-300 w-full">
      <a
        href="#bio"
        onClick={(e) => handleNavClick(e, 'bio')}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:font-bold focus:text-xs focus:uppercase focus:tracking-widest"
      >
        Skip to main content
      </a>

      {graphReady && (
        <Suspense fallback={null}>
          <SkillsGraph />
        </Suspense>
      )}

      <div className="flex flex-col md:flex-row max-w-[1600px] w-full mx-auto min-h-screen relative z-10">
        {isMobile && (
          <header className="w-full max-w-full px-4 sm:px-6 pt-4 pb-3 border-b border-white/15 md:hidden bg-black/75 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <button
                type="button"
                className="text-left cursor-pointer min-w-0 flex-1 overflow-hidden bg-transparent border-0 p-0"
                onClick={() => scrollToTarget(0)}
                aria-label="Scroll to top"
              >
                <h1 className="text-xl sm:text-2xl font-serif tracking-tighter uppercase text-white leading-tight truncate">
                  {cvData.personal.name}
                </h1>
                <p className="text-[10px] font-mono tracking-wider uppercase text-white/75 truncate">
                  {cvData.personal.title}
                </p>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={cvData.personal.cv}
                  download="Jim_Lam_CV.pdf"
                  className="px-2.5 py-1.5 border border-white/25 hover:bg-white hover:text-black transition-colors text-white flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold"
                  aria-label="Download CV PDF"
                >
                  <FileText size={13} aria-hidden="true" />
                  <span>CV</span>
                </a>
                <a
                  href={cvData.personal.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub Profile"
                  className="p-1.5 text-white/85 hover:text-white"
                >
                  <Github size={16} aria-hidden="true" />
                </a>
                <a
                  href={cvData.personal.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn Profile"
                  className="p-1.5 text-white/85 hover:text-white"
                >
                  <Linkedin size={16} aria-hidden="true" />
                </a>
                <a
                  href={`mailto:${cvData.personal.email}`}
                  aria-label="Send Email"
                  className="p-1.5 text-white/85 hover:text-white"
                >
                  <Mail size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
            <nav
              aria-label="Mobile section navigation"
              className="flex items-center gap-4 overflow-x-auto pt-2.5 mt-2 border-t border-white/10 no-scrollbar w-full"
            >
              {navItems.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => handleNavClick(e, item.id)}
                  className="text-[10px] font-bold uppercase tracking-widest text-white/80 hover:text-white whitespace-nowrap py-0.5 shrink-0"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </header>
        )}

        {!isMobile && (
          <div
            aria-hidden={focusMode}
            className={`md:sticky md:top-0 md:h-screen z-50 shrink-0 transition-[width,opacity] duration-500 ease-in-out motion-reduce:transition-none ${
              focusMode ? 'w-0 opacity-0 pointer-events-none overflow-hidden' : 'w-80 opacity-100'
            }`}
          >
            <div className="w-80 h-full relative">
              <Sidebar />
            </div>
          </div>
        )}

        <main
          id="main-content"
          className="flex-1 min-w-0 px-5 sm:px-8 md:px-12 py-8 md:py-12 space-y-16 md:space-y-32"
        >
          <Section
            title="Skills"
            id="skills"
            hideTitle
            disableReveal
            className="min-h-[calc(100svh-6.5rem)] md:h-screen -mt-8 md:-mt-12 !py-0 !border-b-0"
            innerClassName="h-full min-h-[calc(100svh-6.5rem)] md:min-h-screen"
          >
            <div className="sr-only">
              <h2>Skills</h2>
              {groupedSkills.map(([category, items]) => (
                <div key={category}>
                  <h3>{category}</h3>
                  <ul>
                    {items.map((skill) => (
                      <li key={skill.name}>
                        {skill.name}
                        {skill.children?.length
                          ? ` (${skill.children.map((c) => c.name).join(', ')})`
                          : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="absolute inset-0" />
            <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/75 pointer-events-none select-none">
                Drag nodes to explore
              </span>
              <button
                type="button"
                className="cursor-pointer p-3 bg-transparent border-0 animate-chevron-float"
                aria-label="Scroll to background"
                onClick={() => scrollToTarget('#bio')}
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
                  aria-hidden="true"
                  className="text-white drop-shadow-lg md:w-12 md:h-12"
                >
                  <path d="M7 13l5 5 5-5" />
                  <path d="M7 6l5 5 5-5" />
                </svg>
              </button>
            </div>
          </Section>

          <Section title="Background" id="bio">
            <div className="max-w-3xl space-y-5 md:space-y-6">
              {cvData.bio.map((para, i) => (
                <p key={i} className="text-lg sm:text-xl font-serif text-white/85 leading-relaxed italic">
                  {para}
                </p>
              ))}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-white/70 mb-3">
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {cvData.languages.map((lang) => (
                    <span
                      key={lang.name}
                      className="px-3 py-1 text-xs font-mono border border-white/20 bg-black/30 text-white/90"
                    >
                      {lang.name} <span className="text-white/65">· {lang.level}</span>
                    </span>
                  ))}
                </div>
              </div>
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
                <article
                  key={i}
                  className="p-6 sm:p-8 border-2 border-white/15 bg-black/30 backdrop-blur-xs group transition-[background-color,transform] duration-200 hover:bg-white/5 hover:-translate-y-1.5 motion-reduce:hover:translate-y-0 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-xl sm:text-2xl mb-3 sm:mb-4 text-white">{proj.title}</h3>
                    <p className="text-sm text-white/90 mb-6 leading-relaxed">{proj.description}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] uppercase tracking-widest text-white/70">{proj.status}</span>
                    {proj.link && (
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-sm font-bold text-white hover:text-white/80 transition-colors"
                      >
                        View Project
                      </a>
                    )}
                  </div>
                </article>
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

              <div className="pt-8 border-t border-white/10">
                <h3 className="text-xl sm:text-2xl font-serif text-white mb-4">Certifications</h3>
                <ul className="space-y-2.5 text-sm sm:text-base text-white/90">
                  {cvData.certifications.map((cert) => (
                    <li key={cert.title} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5">
                      <span>
                        <strong className="font-semibold text-white">{cert.title}</strong>
                        <span className="text-white/70"> — {cert.issuer}</span>
                      </span>
                      <span className="text-xs font-mono text-white/70 shrink-0">{cert.date}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Interests" id="interests">
            <p className="text-lg sm:text-xl font-serif text-white leading-relaxed">
              {cvData.interests}
            </p>
          </Section>
        </main>
      </div>

      {!isMobile && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          tabIndex={focusMode ? 0 : -1}
          aria-hidden={!focusMode}
          className={`fixed bottom-8 right-8 px-6 py-2 border-2 border-white/25 text-white font-bold uppercase text-xs z-50 bg-black/70 hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-sm cursor-pointer ${
            focusMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'
          }`}
        >
          Exit Focus Mode
        </button>
      )}
    </div>
  );
}

export default App;
