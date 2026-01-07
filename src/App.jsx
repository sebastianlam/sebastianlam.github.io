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
    <div className={`min-h-screen bg-transparent text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white transition-colors duration-300`}>
      <Suspense fallback={null}>
        <SkillsGraph />
      </Suspense>
      
      <div className="flex flex-col md:flex-row max-w-[1600px] mx-auto min-h-screen relative z-10 pointer-events-none">
        {!focusMode && <div className="pointer-events-auto"><Sidebar /></div>}
        
        <main className={`flex-1 px-6 md:px-12 py-12 ${density === 'compact' ? 'space-y-12' : 'space-y-32'} transition-all pointer-events-none`}>
          <Section title="Skills" id="skills" className="pointer-events-none">
            <div className="h-[400px]" /> {/* Spacer where the graph used to be */}
          </Section>

          <Section title="Experience" id="experience" className="pointer-events-auto">
            <div className="space-y-12">
              {cvData.experience.map((exp, i) => (
                <div key={i} className="group relative repel-target">
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="text-3xl font-serif italic">{exp.role}</h3>
                    <span className="text-sm font-mono opacity-50">{exp.period}</span>
                  </div>
                  <p className="text-lg font-bold mb-4">{exp.company}</p>
                  {exp.highlights ? (
                    <ul className="list-disc list-inside space-y-2 opacity-80">
                      {exp.highlights.map((h, j) => <li key={j}>{h}</li>)}
                    </ul>
                  ) : (
                    <p className="opacity-80">{exp.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {exp.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 text-[10px] uppercase tracking-widest border border-current opacity-30 group-hover:opacity-100 transition-opacity">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Projects" id="projects" className="pointer-events-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {cvData.projects.map((proj, i) => (
                <motion.div 
                  whileHover={{ y: -5 }}
                  key={i} 
                  className="p-8 border-2 border-zinc-900 dark:border-zinc-100 group transition-colors hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 repel-target"
                >
                  <h3 className="text-2xl mb-4 italic">{proj.title}</h3>
                  <p className="text-sm opacity-80 mb-6">{proj.description}</p>
                  <div className="flex justify-between items-end">
                     <span className="text-[10px] uppercase tracking-tighter opacity-50">{proj.status}</span>
                     {proj.link && <a href={proj.link} target="_blank" rel="noopener" className="underline text-sm font-bold">View Project</a>}
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
          className="hidden md:block fixed bottom-8 right-8 px-6 py-2 border-2 border-black dark:border-white font-bold uppercase text-xs z-50 bg-white/10 backdrop-blur-sm"
        >
          Exit Focus Mode
        </button>
      )}
    </div>
  );
}

export default App;

