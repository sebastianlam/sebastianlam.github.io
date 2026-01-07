import React, { Suspense, lazy } from 'react';
import { useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Section from './components/Section';
import { cvData } from './data/cvData';
import { AnimatePresence, motion } from 'framer-motion';

const SkillsGraph = lazy(() => import('./components/SkillsGraph2D'));

function App() {
  const { density, focusMode, setFocusMode } = useApp();

  return (
    <div className={`min-h-screen bg-transparent text-white transition-colors duration-300`}>
      <Suspense fallback={null}>
        <SkillsGraph />
      </Suspense>
      
      <div className="flex flex-col md:flex-row max-w-[1600px] mx-auto min-h-screen relative z-10">
        {!focusMode && <Sidebar />}
        
        <main className={`flex-1 px-6 md:px-12 py-12 ${density === 'compact' ? 'space-y-12' : 'space-y-32'} transition-all`}>
          <Section title="Skills" id="skills">
            <div className="h-[400px]" /> {/* Spacer where the graph used to be */}
          </Section>

          <Section title="Experience" id="experience">
            <div className="space-y-12">
              {cvData.experience.map((exp, i) => (
                <div key={i} className="group relative repel-target">
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="text-3xl font-serif italic text-white">{exp.role}</h3>
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
                  <h3 className="text-2xl mb-4 italic text-white">{proj.title}</h3>
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
        </main>
      </div>

      {focusMode && (
        <button 
          onClick={() => setFocusMode(false)}
          className="hidden md:block fixed bottom-8 right-8 px-6 py-2 border-2 border-white/10 text-white font-bold uppercase text-xs z-50 bg-black/50 hover:bg-white hover:text-black transition-colors backdrop-blur-sm"
        >
          Exit Focus Mode
        </button>
      )}
    </div>
  );
}

export default App;

