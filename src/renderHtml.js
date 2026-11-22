import { cvData, navItems } from './data/cvData.js';

const esc = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ICONS = {
  maximize: (size) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`,
  fileText: (size) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>`,
  github: (size) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>`,
  linkedin: (size) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>`,
  mail: (size) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>`,
  chevrons: () =>
    `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="text-white drop-shadow-lg md:w-12 md:h-12"><path d="M7 13l5 5 5-5"></path><path d="M7 6l5 5 5-5"></path></svg>`,
};

function renderGroupedSkillsSrOnly() {
  const groups = new Map();
  for (const skill of cvData.skills) {
    if (!groups.has(skill.category)) groups.set(skill.category, []);
    groups.get(skill.category).push(skill);
  }
  return Array.from(groups.entries())
    .map(([category, items]) => {
      const list = items
        .map((s) => {
          const kids = s.children?.length ? ` (${s.children.map((c) => c.name).join(', ')})` : '';
          return `<li>${esc(s.name + kids)}</li>`;
        })
        .join('');
      return `<div><h3>${esc(category)}</h3><ul>${list}</ul></div>`;
    })
    .join('');
}

function renderSection(title, id, bodyHtml, { hideTitle = false, extraClass = '', innerClass = '', reveal = true } = {}) {
  const heading = hideTitle
    ? ''
    : `<div class="flex items-center gap-3 sm:gap-4 mb-8 md:mb-12">
        <h2 class="text-4xl sm:text-6xl md:text-8xl font-serif text-white uppercase select-none leading-[1.1] py-1 md:py-2">${esc(title)}</h2>
        <div class="h-[2px] flex-1 bg-white/80 min-w-[24px]"></div>
      </div>`;
  const revealAttr = reveal ? ' data-reveal="true"' : '';
  return `<section id="${esc(id)}"${revealAttr} class="relative scroll-mt-28 md:scroll-mt-12 ${extraClass}">
    ${heading}
    <div class="relative z-10 ${innerClass}">${bodyHtml}</div>
  </section>`;
}

export function renderAppHtml() {
  const { personal } = cvData;

  const mobileNavLinks = navItems
    .map(
      (item) =>
        `<a href="#${esc(item.id)}" data-scroll-target="#${esc(item.id)}" class="text-[10px] font-bold uppercase tracking-widest text-white/80 hover:text-white whitespace-nowrap py-0.5 shrink-0">${esc(item.label)}</a>`
    )
    .join('');

  const desktopNavLinks = navItems
    .map(
      (item) =>
        `<a href="#${esc(item.id)}" data-scroll-target="#${esc(item.id)}" class="block text-sm font-bold uppercase tracking-widest hover:font-black transition-all text-white/90 hover:text-white">${esc(item.label)}</a>`
    )
    .join('');

  const heroPills = cvData.heroHighlights
    .map(
      (h) =>
        `<a href="${esc(h.href)}" data-scroll-target="${esc(h.href)}" class="pointer-events-auto px-3 py-1.5 text-[10px] sm:text-xs font-mono uppercase tracking-wider border border-white/20 bg-black/65 backdrop-blur-sm text-white/90 hover:bg-white hover:text-black transition-colors">${esc(h.label)}</a>`
    )
    .join('');

  const skillsBody = `
    <div class="sr-only">
      <h2>Skills</h2>
      ${renderGroupedSkillsSrOnly()}
    </div>
    <div class="absolute inset-0 pointer-events-none"></div>
    <div class="absolute bottom-5 md:bottom-10 inset-x-0 z-20 flex flex-col items-center gap-3 pointer-events-none px-4">
      <div class="flex flex-wrap items-center justify-center gap-2 max-w-5xl">
        ${heroPills}
      </div>
      <div class="flex flex-col items-center gap-0.5">
        <span class="text-[10px] font-mono uppercase tracking-widest text-white/75 select-none">Drag nodes to explore</span>
        <button type="button" data-scroll-target="#bio" class="pointer-events-auto cursor-pointer p-2.5 bg-transparent border-0 animate-chevron-float" aria-label="Scroll to background">
          ${ICONS.chevrons()}
        </button>
      </div>
    </div>`;

  const bioBody = `
    <div class="max-w-3xl space-y-5 md:space-y-6">
      ${cvData.bio
        .map((p) => `<p class="text-lg sm:text-xl font-serif text-white/85 leading-relaxed italic">${esc(p)}</p>`)
        .join('')}
      <div class="pt-4 border-t border-white/10">
        <h3 class="text-xs font-mono uppercase tracking-[0.2em] text-white/75 mb-3">Languages</h3>
        <div class="flex flex-wrap gap-2">
          ${cvData.languages
            .map(
              (l) =>
                `<span class="px-3 py-1 text-xs font-mono border border-white/20 bg-black/30 text-white/90">${esc(l.name)} <span class="text-white/70">· ${esc(l.level)}</span></span>`
            )
            .join('')}
        </div>
      </div>
    </div>`;

  const experienceBody = `
    <div class="space-y-10 md:space-y-12">
      ${cvData.experience
        .map(
          (exp) => `<article class="group relative">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1.5 sm:mb-2 gap-1">
              <h3 class="text-2xl sm:text-3xl font-serif text-white leading-snug">${esc(exp.role)}</h3>
              <span class="text-xs sm:text-sm font-mono text-white/75 shrink-0">${esc(exp.period)}</span>
            </div>
            <p class="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-white/90">${esc(exp.company)}</p>
            <ul class="list-disc list-outside ml-5 space-y-2 text-sm sm:text-base text-white/90 leading-relaxed">
              ${exp.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}
            </ul>
            <div class="flex flex-wrap gap-1.5 sm:gap-2 mt-4">
              ${exp.tags
                .map((tag) => `<span class="px-2 py-1 text-[10px] uppercase tracking-widest bg-white text-black font-bold">${esc(tag)}</span>`)
                .join('')}
            </div>
          </article>`
        )
        .join('')}
    </div>`;

  const projectsBody = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      ${cvData.projects
        .map(
          (proj) => `<article class="p-6 sm:p-8 border-2 border-white/15 bg-black/35 backdrop-blur-xs group transition-[background-color,transform] duration-200 hover:bg-white/5 hover:-translate-y-1.5 motion-reduce:hover:translate-y-0 flex flex-col justify-between gap-6">
            <div>
              <h3 class="text-xl sm:text-2xl mb-3 sm:mb-4 text-white">${esc(proj.title)}</h3>
              <p class="text-sm text-white/90 mb-5 leading-relaxed">${esc(proj.description)}</p>
              <div class="flex flex-wrap gap-1.5">
                ${proj.tags
                  .map((t) => `<span class="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-white/20 text-white/80">${esc(t)}</span>`)
                  .join('')}
              </div>
            </div>
            <div class="flex justify-between items-end gap-4">
              <span class="text-[10px] uppercase tracking-widest text-white/75">${esc(proj.status)}</span>
              ${
                proj.link
                  ? `<a href="${esc(proj.link)}" target="_blank" rel="noopener noreferrer" class="underline text-sm font-bold text-white hover:text-white/80 transition-colors shrink-0">View Project</a>`
                  : ''
              }
            </div>
          </article>`
        )
        .join('')}
    </div>`;

  const educationBody = `
    <div class="space-y-10 md:space-y-12">
      ${cvData.education
        .map(
          (edu) => `<article class="group relative">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1.5 sm:mb-2 gap-1">
              <h3 class="text-2xl sm:text-3xl font-serif text-white leading-snug">${esc(edu.degree)}</h3>
              <span class="text-xs sm:text-sm font-mono text-white/75 shrink-0">${esc(edu.period)}</span>
            </div>
            <p class="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-white/90">${esc(edu.school)}</p>
            ${edu.details ? `<p class="text-sm sm:text-base text-white/90 mb-4 leading-relaxed">${esc(edu.details)}</p>` : ''}
            <div class="flex flex-wrap gap-1.5 sm:gap-2 mt-4">
              ${(edu.tags || [])
                .map((tag) => `<span class="px-2 py-1 text-[10px] uppercase tracking-widest bg-white text-black font-bold">${esc(tag)}</span>`)
                .join('')}
            </div>
          </article>`
        )
        .join('')}
      <div class="pt-8 border-t border-white/10">
        <h3 class="text-xl sm:text-2xl font-serif text-white mb-4">Certifications</h3>
        <ul class="space-y-2.5 text-sm sm:text-base text-white/90">
          ${cvData.certifications
            .map(
              (cert) => `<li class="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5">
                <span><strong class="font-semibold text-white">${esc(cert.title)}</strong><span class="text-white/75"> — ${esc(cert.issuer)}</span></span>
                <span class="text-xs font-mono text-white/75 shrink-0">${esc(cert.date)}</span>
              </li>`
            )
            .join('')}
        </ul>
      </div>
    </div>`;

  const interestsBody = `<p class="text-lg sm:text-xl font-serif text-white leading-relaxed">${esc(cvData.interests)}</p>`;

  return `<div class="min-h-screen bg-transparent text-white w-full">
  <a href="#bio" data-scroll-target="#bio" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:font-bold focus:text-xs focus:uppercase focus:tracking-widest">Skip to main content</a>

  <div id="skills-graph-root" aria-hidden="true" class="fixed inset-0 w-full h-full z-0 bg-[#050505] overflow-hidden pointer-events-none">
    <canvas id="skills-graph-canvas" class="absolute top-0 left-0 w-full h-full"></canvas>
  </div>

  <div class="flex flex-col md:flex-row max-w-[1600px] w-full mx-auto min-h-screen relative z-10">
    <header class="w-full max-w-full px-4 sm:px-6 pt-4 pb-3 border-b border-white/15 md:hidden bg-black/75 backdrop-blur-md sticky top-0 z-50">
      <div class="flex items-center justify-between gap-2 min-w-0">
        <button type="button" data-scroll-target="#top" class="text-left cursor-pointer min-w-0 flex-1 overflow-hidden bg-transparent border-0 p-0" aria-label="Scroll to top">
          <span class="block text-xl sm:text-2xl font-serif tracking-tighter uppercase text-white leading-tight truncate">${esc(personal.name)}</span>
          <span class="block text-[10px] font-mono tracking-wider uppercase text-white/75 truncate">${esc(personal.title)}</span>
        </button>
        <div class="flex items-center gap-1 shrink-0">
          <a href="${esc(personal.cv)}" download="Jim_Lam_CV.pdf" class="px-2.5 py-1.5 border border-white/25 hover:bg-white hover:text-black transition-colors text-white flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold" aria-label="Download CV PDF">
            ${ICONS.fileText(13)}
            <span>CV</span>
          </a>
          <a href="${esc(personal.github)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile" class="p-1.5 text-white/85 hover:text-white">${ICONS.github(16)}</a>
          <a href="${esc(personal.linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile" class="p-1.5 text-white/85 hover:text-white">${ICONS.linkedin(16)}</a>
          <a href="mailto:${esc(personal.email)}" aria-label="Send Email" class="p-1.5 text-white/85 hover:text-white">${ICONS.mail(16)}</a>
        </div>
      </div>
      <nav aria-label="Mobile section navigation" class="flex items-center gap-4 overflow-x-auto pt-2.5 mt-2 border-t border-white/10 no-scrollbar w-full">
        ${mobileNavLinks}
      </nav>
    </header>

    <div id="desktop-sidebar-shell" class="hidden md:block md:sticky md:top-0 md:h-screen z-50 shrink-0 w-80 opacity-100 transition-[width,opacity] duration-500 ease-in-out motion-reduce:transition-none">
      <div class="w-80 h-full relative">
        <aside class="flex h-full p-8 flex-col justify-between relative z-50 w-80">
          <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 -z-10 border-r border-white/20 bg-black/65 backdrop-blur-md w-[calc(100%+2000px)] sidebar-mask"></div>
          <div>
            <header class="mb-12">
              <a href="#skills" data-scroll-target="#top" class="block text-left cursor-pointer group w-full" aria-label="Scroll to top">
                <h1 class="text-4xl font-serif mb-2 tracking-tighter uppercase text-white group-hover:text-white transition-colors leading-tight py-1">${esc(personal.name)}</h1>
                <p class="text-xs font-mono tracking-widest uppercase text-white/75 group-hover:text-white transition-colors">${esc(personal.title)}</p>
              </a>
            </header>
            <nav aria-label="Primary navigation" class="space-y-4 mb-12">
              ${desktopNavLinks}
            </nav>
            <div class="space-y-4">
              <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-white/80 mb-4">Controls</p>
              <div class="flex flex-col gap-2">
                <button type="button" id="enter-focus-btn" class="px-4 py-3 border border-white/25 bg-black/40 hover:bg-white hover:text-black transition-colors text-white flex items-center gap-4 w-full cursor-pointer" title="Focus Mode" aria-label="Enter focus mode">
                  ${ICONS.maximize(16)}
                  <span class="text-[10px] uppercase tracking-[0.2em] font-bold">Focus Mode</span>
                </button>
                <a href="${esc(personal.cv)}" download="Jim_Lam_CV.pdf" class="px-4 py-3 border border-white/25 bg-black/40 hover:bg-white hover:text-black transition-colors text-white flex items-center gap-4 w-full" title="Download CV" aria-label="Download CV PDF">
                  ${ICONS.fileText(16)}
                  <span class="text-[10px] uppercase tracking-[0.2em] font-bold">Download CV</span>
                </a>
              </div>
            </div>
          </div>
          <footer class="pt-8">
            <div class="flex gap-4 mb-4">
              <a href="${esc(personal.github)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile" class="text-white/85 hover:text-white transition-colors">${ICONS.github(18)}</a>
              <a href="${esc(personal.linkedin)}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile" class="text-white/85 hover:text-white transition-colors">${ICONS.linkedin(18)}</a>
              <a href="mailto:${esc(personal.email)}" aria-label="Send Email" class="text-white/85 hover:text-white transition-colors">${ICONS.mail(18)}</a>
            </div>
            <p class="text-[10px] font-mono text-white/80">© 2026 ${esc(personal.name)}</p>
          </footer>
        </aside>
      </div>
    </div>

    <main id="main-content" class="flex-1 min-w-0 px-5 sm:px-8 md:px-12 py-8 md:py-12 space-y-16 md:space-y-32">
      ${renderSection('Skills', 'skills', skillsBody, {
        hideTitle: true,
        reveal: false,
        extraClass: 'min-h-[calc(100svh-6.5rem)] md:h-screen -mt-8 md:-mt-12 !py-0 !border-b-0',
        innerClass: 'h-full min-h-[calc(100svh-6.5rem)] md:min-h-screen',
      })}
      ${renderSection('Background', 'bio', bioBody)}
      ${renderSection('Experience', 'experience', experienceBody)}
      ${renderSection('Systems', 'projects', projectsBody)}
      ${renderSection('Education', 'education', educationBody)}
      ${renderSection('Interests', 'interests', interestsBody)}
    </main>
  </div>

  <button type="button" id="exit-focus-btn" tabindex="-1" aria-hidden="true" class="hidden md:block fixed bottom-8 right-8 px-6 py-2 border-2 border-white/25 text-white font-bold uppercase text-xs z-50 bg-black/70 hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-sm cursor-pointer opacity-0 translate-y-5 pointer-events-none">
    Exit Focus Mode
  </button>
</div>`.replace(/[ \t]+$/gm, '');
}
