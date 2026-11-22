import './styles/index.css';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let graphController = null;
let focusMode = false;

// --- Smooth anchor & top scrolling (native compositor scroll) ---
function scrollToTarget(target) {
  const behavior = prefersReducedMotion ? 'auto' : 'smooth';
  if (!target || target === '#top') {
    window.scrollTo({ top: 0, behavior });
    return;
  }
  const id = target.replace(/^#/, '');
  const el = document.getElementById(id);
  if (!el) return;
  const offset = window.innerWidth < 768 ? 104 : 48;
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
  window.scrollTo({ top, behavior });
}

document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-scroll-target]');
  if (!trigger) return;
  e.preventDefault();
  scrollToTarget(trigger.getAttribute('data-scroll-target'));
});

// --- Focus Mode toggle (desktop sidebar collapse) ---
const sidebarShell = document.getElementById('desktop-sidebar-shell');
const enterFocusBtn = document.getElementById('enter-focus-btn');
const exitFocusBtn = document.getElementById('exit-focus-btn');

function setFocusMode(next) {
  focusMode = Boolean(next);
  if (sidebarShell) {
    sidebarShell.setAttribute('aria-hidden', String(focusMode));
    sidebarShell.classList.toggle('w-0', focusMode);
    sidebarShell.classList.toggle('opacity-0', focusMode);
    sidebarShell.classList.toggle('pointer-events-none', focusMode);
    sidebarShell.classList.toggle('overflow-hidden', focusMode);
    sidebarShell.classList.toggle('w-80', !focusMode);
    sidebarShell.classList.toggle('opacity-100', !focusMode);
  }
  if (exitFocusBtn) {
    exitFocusBtn.setAttribute('aria-hidden', String(!focusMode));
    exitFocusBtn.tabIndex = focusMode ? 0 : -1;
    exitFocusBtn.classList.toggle('opacity-100', focusMode);
    exitFocusBtn.classList.toggle('translate-y-0', focusMode);
    exitFocusBtn.classList.toggle('opacity-0', !focusMode);
    exitFocusBtn.classList.toggle('translate-y-5', !focusMode);
    exitFocusBtn.classList.toggle('pointer-events-none', !focusMode);
  }
  if (graphController) graphController.setFocusMode(focusMode);
}

enterFocusBtn?.addEventListener('click', () => setFocusMode(true));
exitFocusBtn?.addEventListener('click', () => setFocusMode(false));

// --- Lightweight section reveal via IntersectionObserver ---
const revealSections = document.querySelectorAll('section[data-reveal="true"]');
if (!prefersReducedMotion && 'IntersectionObserver' in window && revealSections.length > 0) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
  );
  revealSections.forEach((sec) => {
    const rect = sec.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95) {
      sec.classList.add('is-revealed');
    } else {
      sec.classList.add('reveal-pending');
      io.observe(sec);
    }
  });
}

// --- Deferred WebGL Skills Graph island ---
const mountGraph = async () => {
  const canvas = document.getElementById('skills-graph-canvas');
  if (!canvas) return;
  const { mountSkillsGraph } = await import('./skillsGraph.js');
  graphController = mountSkillsGraph(canvas, { initialFocusMode: focusMode });
};

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(mountGraph, { timeout: 600 });
} else {
  setTimeout(mountGraph, 120);
}
