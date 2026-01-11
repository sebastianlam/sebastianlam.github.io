import React, { Suspense, lazy, useEffect } from 'react';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Section from './components/Section';
import { cvData } from './data/cvData';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import SkillsGraph from './components/SkillsGraph2D';

function App() {
  const { focusMode, setFocusMode } = useApp();
  const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className={`min-h-screen bg-transparent text-white transition-colors duration-300`}>
      <SkillsGraph />
      
      <div className="flex flex-col md:flex-row max-w-[1600px] mx-auto min-h-screen relative z-10">
        <AnimatePresence>
          {!focusMode && !isMobile && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 320 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="md:sticky md:top-0 md:h-screen z-50"
            >
              <div className="w-80 h-full overflow-hidden">
                <Sidebar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.main 
          layout
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={`flex-1 px-6 md:px-12 py-12 space-y-32`}
        >
          <Section title="Skills" id="skills" hideTitle>
            <div className="h-[400px]" /> {/* Spacer where the graph used to be */}
          </Section>

          <Section title="Experience" id="experience">
            <div className="space-y-12">
              {cvData.experience.map((exp, i) => (
                <div key={i} className="group relative repel-target">
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="text-3xl font-serif text-white">{exp.role}</h3>
                    <span className="text-sm font-mono text-white">{exp.period}</span>
                  </div>
                  <p className="text-lg font-bold mb-4 text-white">{exp.company}</p>
                  {exp.highlights ? (
                    <ul className="list-disc list-inside space-y-2 text-white">
                      {exp.highlights.map((h, j) => <li key={j}>{h}</li>)}
                    </ul>
                  ) : (
                    <p className="text-white">{exp.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {exp.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 text-[10px] uppercase tracking-widest bg-white text-black font-bold transition-opacity">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Projects" id="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {cvData.projects.map((proj, i) => (
                <motion.div 
                  whileHover={{ y: -5 }}
                  key={i} 
                  className="p-8 border-2 border-white/5 group transition-colors hover:bg-white/5 repel-target"
                >
                  <h3 className="text-2xl mb-4 text-white">{proj.title}</h3>
                  <p className="text-sm text-white mb-6">{proj.description}</p>
                  <div className="flex justify-between items-end">
                     <span className="text-[10px] uppercase tracking-tighter text-white">{proj.status}</span>
                     {proj.link && (
                       <a 
                         href={proj.isBroken ? "#" : proj.link} 
                         onClick={proj.isBroken ? (e) => e.preventDefault() : undefined}
                         target={proj.isBroken ? undefined : "_blank"} 
                         rel="noopener" 
                         className={`underline text-sm font-bold transition-colors ${proj.isBroken ? 'cursor-not-allowed text-white' : 'text-white hover:text-white'}`}
                       >
                         {proj.isBroken ? "Apologies, this link is currently broken" : "View Project"}
                       </a>
                     )}
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>

          <Section title="Education" id="education">
            <div className="space-y-12">
              {cvData.education.map((edu, i) => (
                <div key={i} className="group relative repel-target">
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="text-3xl font-serif text-white">{edu.degree}</h3>
                    <span className="text-sm font-mono text-white">{edu.period}</span>
                  </div>
                  <p className="text-lg font-bold mb-4 text-white">{edu.school}</p>
                  {edu.details && <p className="text-white mb-4">{edu.details}</p>}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {edu.tags?.map(tag => (
                      <span key={tag} className="px-2 py-1 text-[10px] uppercase tracking-widest bg-white text-black font-bold transition-opacity">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Interests" id="interests">
            <p className="text-xl font-serif text-white leading-relaxed repel-target">
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

