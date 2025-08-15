// Smooth scroll for in-page anchors
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', targetId);
    });
});

// Scrollspy for table of contents
const tocLinks = Array.from(document.querySelectorAll('.toc a'));
const sections = tocLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const id = '#' + entry.target.id;
        const link = tocLinks.find(a => a.getAttribute('href') === id);
        if (!link) return;
        if (entry.isIntersecting) {
            tocLinks.forEach(a => a.classList.remove('active'));
            link.classList.add('active');
        }
    });
}, { rootMargin: '-40% 0px -55% 0px', threshold: [0, 1] });

sections.forEach(section => observer.observe(section));

// Subtle reveal on scroll
const revealTargets = [
    ...document.querySelectorAll('main section'),
    ...document.querySelectorAll('.experience-item, .education-item, .project-item')
];

revealTargets.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
        }
    });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

revealTargets.forEach(el => revealObserver.observe(el));

// Theme toggle with persistence
const root = document.documentElement;
const themeToggleButton = document.getElementById('theme-toggle');

function applyTheme(theme) {
    if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    applyTheme(savedTheme);
} else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
}

themeToggleButton?.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
});