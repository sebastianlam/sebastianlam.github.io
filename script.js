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
            link.setAttribute('aria-current', 'location');
            tocLinks.filter(a => a !== link).forEach(a => a.removeAttribute('aria-current'));
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
    } else if (theme === 'hc') {
        root.setAttribute('data-theme', 'hc');
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
    const current = root.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : (current === 'hc' ? 'light' : 'dark');
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
});

// Settings modal, density, font scaling, explicit theme
const settingsOpen = document.getElementById('settings-open');
const settingsClose = document.getElementById('settings-close');
const settingsOverlay = document.getElementById('settings-overlay');
const themeSelect = document.getElementById('theme-select');
const densitySelect = document.getElementById('density-select');
const fontScale = document.getElementById('font-scale');
const content = document.getElementById('content');
let previouslyFocusedElement = null;

function applyDensity(density) {
    content?.setAttribute('data-density', density);
}

function applyFontScale(scalePercent) {
    document.body.style.fontSize = `${scalePercent}%`;
}

function openSettings() {
    settingsOverlay?.removeAttribute('hidden');
    settingsOverlay?.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onSettingsKeydown);
    previouslyFocusedElement = document.activeElement;
    // Focus trap inside settings panel
    const panel = settingsOverlay?.querySelector('.settings-panel');
    const focusable = panel ? Array.from(panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')) : [];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();
    function trap(e) {
        if (e.key !== 'Tab') return;
        if (focusable.length === 0) return;
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
    panel?.addEventListener('keydown', trap);
    if (panel) {
        panel.setAttribute('data-trap', '1');
        panel._trapHandler = trap;
    }
}

function closeSettings() {
    settingsOverlay?.setAttribute('hidden', '');
    settingsOverlay?.removeEventListener('click', onOverlayClick);
    document.removeEventListener('keydown', onSettingsKeydown);
    const panel = settingsOverlay?.querySelector('.settings-panel');
    if (panel && panel.getAttribute('data-trap') === '1') {
        if (panel._trapHandler) {
            panel.removeEventListener('keydown', panel._trapHandler);
            delete panel._trapHandler;
        }
        panel.removeAttribute('data-trap');
    }
    // Restore focus
    if (previouslyFocusedElement && previouslyFocusedElement.focus) {
        previouslyFocusedElement.focus();
    }
}

function onOverlayClick(e) {
    if (e.target === settingsOverlay) closeSettings();
}

function onSettingsKeydown(e) {
    if (e.key === 'Escape') closeSettings();
}

settingsOpen?.addEventListener('click', openSettings);
settingsClose?.addEventListener('click', closeSettings);

// Initialize settings from storage
const savedDensity = localStorage.getItem('density') || 'comfortable';
const savedFontScale = parseInt(localStorage.getItem('fontScale') || '100', 10);
const savedThemeSelect = localStorage.getItem('themeSelection') || 'auto';
applyDensity(savedDensity);
applyFontScale(savedFontScale);
if (themeSelect) themeSelect.value = savedThemeSelect;
if (densitySelect) densitySelect.value = savedDensity;
if (fontScale) fontScale.value = String(savedFontScale);

themeSelect?.addEventListener('change', () => {
    const val = themeSelect.value;
    if (val === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
        localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
    } else {
        applyTheme(val);
        localStorage.setItem('theme', val);
    }
    localStorage.setItem('themeSelection', val);
});

densitySelect?.addEventListener('change', () => {
    const val = densitySelect.value;
    applyDensity(val);
    localStorage.setItem('density', val);
});

fontScale?.addEventListener('input', () => {
    const val = parseInt(fontScale.value, 10);
    applyFontScale(val);
    localStorage.setItem('fontScale', String(val));
});

// Focus mode
const focusModeToggle = document.getElementById('focus-mode-toggle');
function setFocusMode(enabled) {
    document.body.classList.toggle('focus-mode', enabled);
    localStorage.setItem('focusMode', enabled ? '1' : '0');
}
const savedFocus = localStorage.getItem('focusMode') === '1';
setFocusMode(savedFocus);
if (focusModeToggle) {
    focusModeToggle.setAttribute('aria-pressed', String(savedFocus));
}
focusModeToggle?.addEventListener('click', () => {
    const enabled = !document.body.classList.contains('focus-mode');
    setFocusMode(enabled);
    focusModeToggle.setAttribute('aria-pressed', String(enabled));
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === '/') {
        e.preventDefault();
        document.getElementById('site-search')?.focus();
    } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        themeToggleButton?.click();
    } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        focusModeToggle?.click();
    } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        openSettings();
    }
});

// Search index and UI
const searchInput = document.getElementById('site-search');
const searchResults = document.getElementById('search-results');

function indexContent() {
    const items = [];
    document.querySelectorAll('main section').forEach(section => {
        const title = section.querySelector('h2')?.textContent?.trim() || '';
        const id = section.id;
        const text = section.textContent || '';
        items.push({ type: 'section', title, id, text });
        section.querySelectorAll('article').forEach(article => {
            const h3 = article.querySelector('h3');
            const aTitle = h3 ? h3.textContent.trim() : '';
            const aId = id + ':' + (aTitle || Math.random().toString(36).slice(2));
            const aText = article.textContent || '';
            const tags = (article.getAttribute('data-tags') || '').split(';').map(s => s.trim()).filter(Boolean);
            items.push({ type: 'item', section: id, title: aTitle, id: aId, text: aText, tags });
        });
    });
    return items;
}

const searchIndex = indexContent();

function performSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const parts = q.split(/\s+/g);
    function scoreFor(text, tags) {
        let score = 0;
        for (const part of parts) {
            if (text.includes(part)) score += 2;
            if (tags && tags.some(t => t.includes(part))) score += 3;
        }
        return score;
    }
    return searchIndex
        .map(item => ({ item, score: scoreFor((item.title + ' ' + item.text).toLowerCase(), item.tags) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map(x => x.item);
}

function renderResults(results) {
    if (!searchResults) return;
    searchResults.innerHTML = '';
    results.forEach((res, idx) => {
        const el = document.createElement('li');
        el.className = 'search-result';
        el.id = `search-option-${idx}`;
        el.setAttribute('data-target', res.type === 'section' ? `#${res.id}` : `#${res.section}`);
        el.textContent = res.title || res.text?.slice(0, 80) || 'Untitled';
        if (idx === 0) el.setAttribute('aria-selected', 'true');
        el.addEventListener('click', () => {
            const target = document.querySelector(el.getAttribute('data-target'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        searchResults.appendChild(el);
    });
    if (searchInput) {
        const first = searchResults.querySelector('.search-result');
        if (first) searchInput.setAttribute('aria-activedescendant', first.id);
        searchInput.setAttribute('aria-expanded', results.length > 0 ? 'true' : 'false');
    }
}

let activeIndex = 0;
searchInput?.addEventListener('input', () => {
    activeIndex = 0;
    const results = performSearch(searchInput.value);
    renderResults(results);
});

searchInput?.addEventListener('focus', () => {
    const results = performSearch(searchInput.value || '');
    renderResults(results);
});

searchInput?.addEventListener('blur', () => {
    if (searchInput) searchInput.setAttribute('aria-expanded', 'false');
});

searchInput?.addEventListener('keydown', (e) => {
    const items = Array.from(searchResults?.querySelectorAll('.search-result') || []);
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        items[activeIndex]?.click();
    }
    items.forEach((el, i) => el.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false'));
    if (items[activeIndex] && searchInput) {
        searchInput.setAttribute('aria-activedescendant', items[activeIndex].id);
    }
});

// Tag chips and filters
function collectTags(scopeSelector) {
    const set = new Set();
    document.querySelectorAll(`${scopeSelector} [data-tags]`).forEach(el => {
        (el.getAttribute('data-tags') || '').split(';').forEach(tag => {
            const trimmed = tag.trim();
            if (trimmed) set.add(trimmed);
        });
    });
    return Array.from(set).sort();
}

function renderChips(containerId, scopeSelector) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const tags = collectTags(scopeSelector);
    tags.forEach(tag => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.setAttribute('role', 'button');
        chip.setAttribute('aria-pressed', 'false');
        chip.textContent = tag;
        chip.addEventListener('click', () => {
            const pressed = chip.getAttribute('aria-pressed') === 'true';
            chip.setAttribute('aria-pressed', String(!pressed));
            applyFilter(scopeSelector);
        });
        container.appendChild(chip);
    });
}

function applyFilter(scopeSelector) {
    const container = scopeSelector === '#experience' ? document.getElementById('experience-filters') : document.getElementById('project-filters');
    const active = Array.from(container?.querySelectorAll('.chip[aria-pressed="true"]') || []).map(chip => chip.textContent);
    document.querySelectorAll(`${scopeSelector} [data-tags]`).forEach(el => {
        const tags = (el.getAttribute('data-tags') || '').split(';').map(s => s.trim());
        const show = active.length === 0 || active.every(a => tags.includes(a));
        el.style.display = show ? '' : 'none';
    });
}

renderChips('experience-filters', '#experience');
renderChips('project-filters', '#personal-projects');

// Experience timeline
function parseDateRange(text) {
    // examples: "Present", "Q2 2021 -- Present", "October 2020 -- December 2022", "June 2020 -- October 2020"
    const present = /present/i.test(text);
    const months = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
    };
    function parsePartial(part) {
        part = part.trim();
        if (/^q[1-4]\s*\d{4}$/i.test(part)) {
            const q = parseInt(part[1], 10);
            const y = parseInt(part.slice(2).trim(), 10);
            const m = (q - 1) * 3 + 1;
            return new Date(y, m - 1, 1);
        }
        const monthMatch = part.toLowerCase().match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/);
        if (monthMatch) return new Date(parseInt(monthMatch[2], 10), months[monthMatch[1]] - 1, 1);
        const yearMatch = part.match(/\b(\d{4})\b/);
        if (yearMatch) return new Date(parseInt(yearMatch[1], 10), 0, 1);
        return null;
    }
    const parts = text.split(/--|–|—/);
    const start = parsePartial(parts[0]);
    const end = present ? new Date() : parsePartial(parts[1] || parts[0]) || start;
    return { start, end, present };
}

function buildTimeline() {
    const list = [];
    document.querySelectorAll('#experience .experience-item').forEach(item => {
        const title = item.querySelector('h3')?.textContent || '';
        const dateText = (title.match(/\b(.*\d{4}.*)$/) || [])[1] || (item.querySelector('.right')?.textContent || '');
        const dates = parseDateRange(dateText);
        if (!dates.start) return;
        list.push({ title: title.replace(/\s+<span[\s\S]*$/,''), start: dates.start, end: dates.end, present: dates.present });
    });
    list.sort((a,b) => b.start - a.start);
    const container = document.getElementById('experience-timeline');
    if (!container) return;
    container.innerHTML = '';
    list.forEach(entry => {
        const el = document.createElement('div');
        el.className = 'timeline-item';
        const durationMonths = Math.max(1, (entry.end.getFullYear() - entry.start.getFullYear()) * 12 + (entry.end.getMonth() - entry.start.getMonth()) + 1);
        const years = (durationMonths / 12).toFixed(1);
        el.innerHTML = `<div class="timeline-title">${entry.title}</div><div class="timeline-meta">${entry.start.getFullYear()} – ${entry.present ? 'Present' : entry.end.getFullYear()} • ~${years}y</div>`;
        container.appendChild(el);
    });
}

buildTimeline();

// Register Service Worker for PWA/offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}