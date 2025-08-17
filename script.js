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
        // Explicitly mark light so the toggle can detect it reliably
        root.setAttribute('data-theme', 'light');
    }
}

const savedTheme = localStorage.getItem('theme');
const savedThemeSelection = localStorage.getItem('themeSelection');
if (savedTheme && (!savedThemeSelection && savedTheme === 'hc')) {
    // Migration: previous default forced HC; switch to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemTheme = prefersDark ? 'dark' : 'light';
    applyTheme(systemTheme);
    localStorage.setItem('theme', systemTheme);
    localStorage.setItem('themeSelection', 'auto');
} else if (savedTheme) {
    applyTheme(savedTheme);
} else {
    // Default to system preference (auto)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemTheme = prefersDark ? 'dark' : 'light';
    applyTheme(systemTheme);
    localStorage.setItem('theme', systemTheme);
    localStorage.setItem('themeSelection', 'auto');
}

// Sync browser UI theme color meta with current theme
function syncThemeColorMeta() {
    const meta = document.getElementById('meta-theme-color');
    if (!meta) return;
    const current = root.getAttribute('data-theme');
    const color = current === 'dark' || current === 'hc' ? '#0b0b0b' : '#ffffff';
    meta.setAttribute('content', color);
}
syncThemeColorMeta();

themeToggleButton?.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || localStorage.getItem('theme') || 'hc';
    let newTheme;
    if (current === 'hc') newTheme = 'light';
    else if (current === 'light') newTheme = 'dark';
    else newTheme = 'hc';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    syncThemeColorMeta();
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
    // Use attribute to satisfy CSP without inline styles
    document.documentElement.setAttribute('data-font-scale', String(scalePercent));
}

function openSettings() {
    settingsOverlay?.removeAttribute('hidden');
    settingsOverlay?.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onSettingsKeydown);
    previouslyFocusedElement = document.activeElement;
    // Inert background while dialog is open
    document.getElementById('app-root')?.setAttribute('inert', '');
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
    document.getElementById('app-root')?.removeAttribute('inert');
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
    syncThemeColorMeta();
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
const focusExitButton = document.getElementById('focus-exit');
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

// Visible exit in focus mode
focusExitButton?.addEventListener('click', () => {
    setFocusMode(false);
    if (focusModeToggle) focusModeToggle.setAttribute('aria-pressed', 'false');
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
        // Toggle settings — if open, close; if closed, open
        const isSettingsOpen = !settingsOverlay?.hasAttribute('hidden');
        if (isSettingsOpen) {
            closeSettings();
        } else {
            openSettings();
        }
    } else if (e.key === 'Escape') {
        // Close mobile sidebar if open
        if (document.body.classList.contains('sidebar-open')) {
            closeSidebar();
        }
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
        el.setAttribute('role', 'option');
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
        chip.type = 'button';
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
        el.classList.toggle('is-hidden', !show);
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
        const h3 = item.querySelector('h3');
        const rawTitle = h3?.textContent || '';
        const dateText = h3?.querySelector('.right')?.textContent || item.querySelector('.right')?.textContent || '';
        const cleanTitle = dateText ? rawTitle.replace(dateText, '').trim().replace(/[\-–—]\s*$/, '').trim() : rawTitle.trim();
        const dates = parseDateRange(dateText);
        if (!dates.start) return;
        list.push({ title: cleanTitle, start: dates.start, end: dates.end, present: dates.present });
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
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (isLocalhost) {
        // Avoid SW cache during local dev for accurate iteration
        navigator.serviceWorker.getRegistrations?.().then(regs => regs.forEach(reg => reg.unregister())).catch(() => {});
    } else {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    }
}

// Read aloud using Speech Synthesis API
const readAloudBtn = document.getElementById('read-aloud');
function getReadableText() {
    const active = document.elementFromPoint(window.innerWidth / 2, 120);
    const section = active ? active.closest('section') : document.querySelector('main section');
    const nodes = section ? Array.from(section.querySelectorAll('h2, h3, p, li')) : [];
    return nodes.map(n => n.textContent.trim()).filter(Boolean).slice(0, 10).join('. ');
}

readAloudBtn?.addEventListener('click', () => {
    try {
        const text = getReadableText() || 'Hello! I am Jim. Welcome to my page.';
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.05;
        utter.pitch = 1.1;
        speechSynthesis.cancel();
        speechSynthesis.speak(utter);
    } catch {}
});

// ------- Skills Graphs / Tree -------
function getSkillsSource() {
    const container = document.getElementById('skills-original');
    if (!container) return null;
    const items = Array.from(container.querySelectorAll('ul > li'));
    const categories = [];
    items.forEach(li => {
        const strong = li.querySelector('strong');
        const categoryName = strong ? strong.textContent.replace(/:$/, '').trim() : 'Other';
        let tail = li.textContent || '';
        if (strong) tail = tail.replace(strong.textContent, '');
        tail = tail.replace(/^\s*:\s*/, '');

        function normalizeToken(s) {
            let t = (s || '').replace(/[()]/g, ' ');
            t = t.replace(/\band\b/gi, ' ');
            t = t.replace(/\s+/g, ' ').trim();
            t = t.replace(/[.;:,]$/g, '');
            if (/^clojure\s*script$/i.test(t) || /^clojurescript$/i.test(t)) t = 'ClojureScript';
            return t;
        }

        function shouldSkipInner(base, inner) {
            const ib = inner.toLowerCase();
            const bb = base.toLowerCase();
            if (!inner) return true;
            // Skip acronym duplicates like TDD, etc., when base is a phrase
            if (inner.length <= 5 && /\b(development|design)\b/.test(bb)) return true;
            // Skip 'Script' when base is Clojure
            if (/^clojure$/i.test(base) && /^script$/i.test(inner)) return true;
            return false;
        }

        const tokenSet = new Set();
        // First, handle groups with parentheses "Base (a, b, c)"
        const groupRegex = /([^,()]+?)\s*\(([^)]*)\)/g;
        let match;
        const consumed = [];
        while ((match = groupRegex.exec(tail)) !== null) {
            const baseRaw = normalizeToken(match[1]);
            const innerRaw = match[2];
            // Special-case Clojure(Script)
            if (/^clojure$/i.test(baseRaw) && /script/i.test(innerRaw)) {
                tokenSet.add('ClojureScript');
            } else {
                if (baseRaw) tokenSet.add(baseRaw);
                innerRaw.split(',').map(normalizeToken).forEach(tok => {
                    if (!tok) return;
                    if (shouldSkipInner(baseRaw, tok)) return;
                    tokenSet.add(tok);
                });
            }
            consumed.push(match[0]);
        }
        // Remove consumed groups to avoid broken comma splits
        let rest = tail;
        consumed.forEach(seg => { rest = rest.replace(seg, ''); });
        rest = rest.replace(/\([^)]*\)/g, ''); // any stragglers
        rest = rest.replace(/\band\b/gi, ',');
        rest.split(',').map(normalizeToken).forEach(tok => {
            if (!tok) return;
            // Avoid tokens that are just aliases already captured
            if (/^tdd$/i.test(tok) && Array.from(tokenSet).some(t => /test-?driven\s+development/i.test(t))) return;
            tokenSet.add(tok);
        });

        // Final clean pass and sort by label length then alpha for nicer layout
        const unique = Array.from(tokenSet)
            .map(t => t.replace(/\s+/g, ' ').trim())
            .filter(Boolean);
        unique.sort((a, b) => a.localeCompare(b));
        categories.push({ name: categoryName, count: unique.length, items: unique });
    });
    // Languages line
    const languagesP = Array.from(container.querySelectorAll('p')).find(p => /languages:/i.test(p.textContent || ''));
    const languageEntries = [];
    if (languagesP) {
        const text = languagesP.textContent.replace(/^[^:]*:/, '').trim();
        // Split by commas not inside parentheses
        const parts = text.split(/,(?![^()]*\))/).map(s => s.trim()).filter(Boolean);
        parts.forEach(part => {
            const m = part.match(/^([^()]+?)(?:\s*\(([^)]+)\))?$/);
            if (!m) return;
            const name = m[1].trim();
            const qualifier = (m[2] || '').trim();
            languageEntries.push({ name, qualifier });
        });
    }
    return { categories, languages: languageEntries };
}

function mapLanguageQualifierToLevel(q) {
    if (!q) return 50;
    const lower = q.toLowerCase();
    if (/(native|mother\s*tongue)/i.test(lower)) return 100;
    if (/fluent|c2\b/.test(lower)) return 92;
    if (/advanced|c1\b/.test(lower)) return 85;
    if (/upper\s*intermediate|b2\b/.test(lower)) return 72;
    if (/intermediate|b1\b/.test(lower)) return 60;
    if (/elementary|a2\b/.test(lower)) return 45;
    const ielts = lower.match(/ielts\s*([0-9]+(?:\.[0-9])?)/);
    if (ielts) {
        const score = parseFloat(ielts[1]);
        return Math.max(30, Math.min(100, Math.round((score / 9) * 100)));
    }
    return 65;
}

function createSvg(width, height, viewBox) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-hidden', 'false');
    return svg;
}

function polarToCartesian(cx, cy, r, angle) {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildTreeHierarchy() {
    const source = getSkillsSource();
    if (!source) return null;
    const root = { name: 'Skills', children: [] };
    // Technical categories
    const tech = { name: 'Technical', children: [] };
    source.categories.forEach(cat => {
        tech.children.push({ name: cat.name, children: cat.items.map(it => ({ name: it })) });
    });
    // Languages
    const lang = { name: 'Languages', children: source.languages.map(l => ({ name: l.name + (l.qualifier ? ` (${l.qualifier})` : '') })) };
    root.children.push(tech);
    root.children.push(lang);
    return root;
}

function layoutTree(root, options) {
    // Simple tidy tree layout (top-down), deterministic and compact
    const nodeSizeY = (options && options.nodeHeight) || 28;
    const nodeSizeX = (options && options.nodeWidth) || 120;
    const nodes = [];
    const links = [];

    // Compute depth-first, assign preliminary x positions by traversal order per depth
    const depthToLeaves = new Map();
    function walk(node, depth, parent) {
        const current = { node, depth, x: 0, y: depth * nodeSizeY, parent: null };
        if (parent) current.parent = parent;
        if (!node.children || node.children.length === 0) {
            const idx = (depthToLeaves.get(depth) || 0);
            depthToLeaves.set(depth, idx + 1);
            current.x = idx * nodeSizeX;
        } else {
            const children = node.children.map(child => walk(child, depth + 1, current));
            const minX = Math.min(...children.map(c => c.x));
            const maxX = Math.max(...children.map(c => c.x));
            current.x = (minX + maxX) / 2;
        }
        nodes.push(current);
        if (current.parent) links.push({ source: current.parent, target: current });
        return current;
    }
    const rootPlaced = walk(root, 0, null);
    // Normalize X to start at padding
    const minX = Math.min(...nodes.map(n => n.x));
    const shift = (options && options.paddingX) || 16;
    nodes.forEach(n => n.x = n.x - minX + shift);
    return { nodes, links, root: rootPlaced };
}

function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#999';
}

// Cache theme-derived colors and refresh only when theme changes
let __cachedTheme = document.documentElement.getAttribute('data-theme');
let __cachedColors = null;
function __readColors() {
    return {
        border: getCssVar('--border'),
        text: getCssVar('--text'),
        bg: getCssVar('--bg'),
        primary: getCssVar('--primary'),
        accent: getCssVar('--accent')
    };
}
function getThemeColors() {
    const t = document.documentElement.getAttribute('data-theme');
    if (!__cachedColors || t !== __cachedTheme) {
        __cachedTheme = t;
        __cachedColors = __readColors();
    }
    return __cachedColors;
}

function renderForceTree(container) {
    const data = buildTreeHierarchy();
    if (!data) return;
    const layout = layoutTree(data, { nodeWidth: 140, nodeHeight: 40, paddingX: 16 });
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const dpr = window.devicePixelRatio || 1;
    function resize() {
        const rect = container.getBoundingClientRect();
        const cssWidth = rect.width || 600;
        const baseHeight = Math.max(320, Math.min(520, (layout.root.depth + 6) * 60));
        const cssHeight = baseHeight * 2; // make canvas twice as tall
        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
    }
    resize();

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const baseFont = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    ctx.font = baseFont;

    function measureLabelWidth(label) {
        const padding = 16; // 8 left + 8 right
        // Ensure font is set before measuring
        const prev = ctx.font;
        ctx.font = baseFont;
        const w = Math.ceil(ctx.measureText(label).width);
        ctx.font = prev;
        const minW = 80; const maxW = 220;
        return Math.max(minW, Math.min(maxW, w + padding));
    }

    // Pin the root ("Skills") to a fixed world position
    const rootFixed = { x: 140, y: 80 };

    const nodes = layout.nodes.map(n => {
        const isRoot = n.depth === 0;
        const labelBase = String(n.node.name || '');
        const label = (isRoot || n.depth === 1) ? labelBase.toUpperCase() : labelBase;
        const width = isRoot ? Math.max(120, measureLabelWidth(label) + 12) : measureLabelWidth(label);
        return {
            ref: { ...n.node, name: label },
            lref: n,
            depth: n.depth,
            isRoot,
            x: isRoot ? rootFixed.x : (n.x + 60),
            y: isRoot ? rootFixed.y : (n.y + 40),
            vx: 0,
            vy: 0,
            fx: isRoot ? rootFixed.x : null,
            fy: isRoot ? rootFixed.y : null,
            width,
            height: isRoot ? 32 : 28
        };
    });

    // Start nodes extremely close together for an explosive unfold
    nodes.forEach(n => {
        if (!n.isRoot) {
            n.x = rootFixed.x + (Math.random() - 0.5) * 2;
            n.y = rootFixed.y + (Math.random() - 0.5) * 2;
            n.vx = 0; n.vy = 0;
        }
    });
    const links = layout.links.map(l => {
        const s = nodes[layout.nodes.indexOf(l.source)];
        const t = nodes[layout.nodes.indexOf(l.target)];
        const base = 150; // larger base separation
        const extra = l.source.depth === 0 ? 70 : l.source.depth * 20; // more space near root and gradually more by depth
        return { source: s, target: t, rest: base + extra };
    });

    // Color mapping for Technical categories
    const src = getSkillsSource();
    const palette = ['#2e7bff', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#94a3b8'];
    const languagesColor = '#a3e635'; // unique color for Languages group
    const categoryColor = {};
    (src?.categories || []).forEach((cat, i) => { categoryColor[cat.name] = palette[i % palette.length]; });

    function colorForNode(layoutNode) {
        // Assign colors:
        // - Technical category families (depth 2 under Technical) use palette
        // - Languages group and its children use a unique languagesColor
        let p = layoutNode;
        while (p && p.depth > 2) p = p.parent;
        if (!p) return null;
        if (p.depth === 2 && p.parent && p.parent.node && p.parent.node.name === 'Technical') {
            return categoryColor[p.node.name] || null;
        }
        if ((p.depth === 1 && p.node && p.node.name === 'Languages') || (p.depth === 2 && p.parent && p.parent.node && p.parent.node.name === 'Languages')) {
            return languagesColor;
        }
        return null;
    }
    nodes.forEach((n, idx) => { n.color = colorForNode(layout.nodes[idx]) || null; });

    function roleFor(layoutNode) {
        if (layoutNode.depth === 0) return 'root';
        if (layoutNode.depth === 1) {
            if (layoutNode.node && /technical/i.test(layoutNode.node.name)) return 'groupTechnical';
            if (layoutNode.node && /languages/i.test(layoutNode.node.name)) return 'groupLanguages';
        }
        if (layoutNode.depth === 2) {
            if (layoutNode.parent && layoutNode.parent.node && /technical/i.test(layoutNode.parent.node.name)) return 'familyTechnical';
            if (layoutNode.parent && layoutNode.parent.node && /languages/i.test(layoutNode.parent.node.name)) return 'familyLanguages';
        }
        return 'leaf';
    }
    // assign roles and tweak dimensions
    nodes.forEach((n, idx) => {
        const role = roleFor(layout.nodes[idx]);
        n.role = role;
        if (role === 'groupTechnical' || role === 'groupLanguages') {
            n.height = 30;
            n.width = Math.max(n.width + 8, 140);
        } else if (role === 'familyTechnical' || role === 'familyLanguages') {
            n.height = 28;
            n.width = Math.max(n.width, 120);
        }
    });

    function hexToRgba(hex, alpha) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!m) return `rgba(0,0,0,${alpha})`;
        const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // Physics constants
    const springK = 0.008; // slightly stiffer for faster response
    const damping = 0.90;  // less damping → higher velocity
    const charge = 1200;   // reduced repulsion strength
    const centerK = 0.004; // gentler centering
    const maxVelocity = 6.0; // allow faster movement
    const groupRepel = { cross: 6.0, mixed: 2.4, same: 1.0 }; // stronger cross-category separation

    // View transform with spring-like fit-to-bounds
    const view = { x: 0, y: 0, scale: 1, vx: 0, vy: 0, vs: 0 };
    const viewSpringK = 0.006; // snappier view response
    const viewDamping = 0.90;
    function computeWorldBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of nodes) {
            const left = n.x - n.width / 2;
            const right = n.x + n.width / 2;
            const top = n.y - n.height / 2;
            const bottom = n.y + n.height / 2;
            if (left < minX) minX = left;
            if (right > maxX) maxX = right;
            if (top < minY) minY = top;
            if (bottom > maxY) maxY = bottom;
        }
        if (!isFinite(minX) || !isFinite(minY)) {
            minX = 0; minY = 0; maxX = 100; maxY = 100;
        }
        return { minX, minY, maxX, maxY };
    }

    function step() {
        const rect = container.getBoundingClientRect();
        const W = rect.width;
        const H = parseFloat(canvas.style.height);

        // Reset accelerations
        for (const a of nodes) { a.ax = 0; a.ay = 0; }

        // Springs
        for (const e of links) {
            const dx = e.target.x - e.source.x;
            const dy = e.target.y - e.source.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const force = springK * (dist - e.rest);
            const ux = dx / dist; const uy = dy / dist;
            const fx = force * ux; const fy = force * uy;
            e.source.ax += fx; e.source.ay += fy;
            e.target.ax -= fx; e.target.ay -= fy;
        }

        // Repulsion (treat nodes as circles roughly by width)
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                const dx = b.x - a.x; const dy = b.y - a.y;
                const dist2 = Math.max(36, dx*dx + dy*dy);
                const pairFactor = (a.color && b.color)
                    ? (a.color !== b.color ? groupRepel.cross : groupRepel.same)
                    : groupRepel.mixed;
                const force = (charge * pairFactor) / dist2;
                const dist = Math.sqrt(dist2);
                const ux = dx / dist; const uy = dy / dist;
                const fx = force * ux; const fy = force * uy;
                a.ax -= fx; a.ay -= fy; b.ax += fx; b.ay += fy;
            }
        }

        // Lightweight rectangle collision resolution to avoid label overlap
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                const halfW = (a.width + b.width) / 2;
                const halfH = (a.height + b.height) / 2;
                const dx = b.x - a.x; const dy = b.y - a.y;
                const ox = halfW - Math.abs(dx);
                const oy = halfH - Math.abs(dy);
                if (ox > 0 && oy > 0) {
                    if (ox < oy) {
                        const push = (dx < 0 ? -ox : ox) * 0.6;
                        if (a.fx == null) a.x -= push / 2;
                        if (b.fx == null) b.x += push / 2;
                    } else {
                        const push = (dy < 0 ? -oy : oy) * 0.6;
                        if (a.fy == null) a.y -= push / 2;
                        if (b.fy == null) b.y += push / 2;
                    }
                }
            }
        }

        // Centering and bounds
        const cx = W / 2; const cy = H / 2;
        for (const n of nodes) {
            n.ax += (cx - n.x) * centerK;
            n.ay += (cy - n.y) * centerK;
            if (n.isRoot) { n.fx = rootFixed.x; n.fy = rootFixed.y; }
            if (n.fx != null) { n.x = n.fx; n.vx = 0; }
            if (n.fy != null) { n.y = n.fy; n.vy = 0; }
            n.vx = (n.vx + n.ax) * damping;
            n.vy = (n.vy + n.ay) * damping;
            // Clamp velocity to reduce oscillation
            if (n.vx > maxVelocity) n.vx = maxVelocity; else if (n.vx < -maxVelocity) n.vx = -maxVelocity;
            if (n.vy > maxVelocity) n.vy = maxVelocity; else if (n.vy < -maxVelocity) n.vy = -maxVelocity;
            if (n.fx == null) n.x += n.vx;
            if (n.fy == null) n.y += n.vy;
        }

        // View spring towards fit-to-bounds
        const bounds = computeWorldBounds();
        const margin = 40;
        const worldW = Math.max(60, bounds.maxX - bounds.minX);
        const worldH = Math.max(40, bounds.maxY - bounds.minY);
        const scaleX = (W - margin * 2) / worldW;
        const scaleY = (H - margin * 2) / worldH;
        const targetScale = Math.max(0.6, Math.min(2.0, Math.min(scaleX, scaleY)));
        const worldCx = (bounds.minX + bounds.maxX) / 2;
        const worldCy = (bounds.minY + bounds.maxY) / 2;
        const targetX = W / 2 - targetScale * worldCx;
        const targetY = H / 2 - targetScale * worldCy;

        view.vx = (view.vx + (targetX - view.x) * viewSpringK) * viewDamping;
        view.vy = (view.vy + (targetY - view.y) * viewSpringK) * viewDamping;
        view.vs = (view.vs + (targetScale - view.scale) * viewSpringK) * viewDamping;
        view.x += view.vx; view.y += view.vy; view.scale += view.vs;
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // Offscreen buffer for edge blur compositing
    const edgeBuffer = document.createElement('canvas');
    const edgeCtx = edgeBuffer.getContext('2d');

    function draw() {
        const rect = container.getBoundingClientRect();
        const W = rect.width; const H = parseFloat(canvas.style.height);
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(view.x, view.y);
        ctx.scale(view.scale, view.scale);

        const { border, text, bg, primary, accent } = getThemeColors();

        // Links
        ctx.strokeStyle = border;
        ctx.lineWidth = Math.max(1, 1 / view.scale);
        for (const e of links) {
            // Connect from node centers
            const x1 = e.source.x;
            const y1 = e.source.y;
            const x2 = e.target.x;
            const y2 = e.target.y;
            const dx = x2 - x1; const dy = y2 - y1;
            const stretch = Math.min(1.8, Math.max(0.6, Math.hypot(dx, dy) / (e.rest || 150)));
            const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
            const nx = -dy; const ny = dx;
            const norm = Math.hypot(nx, ny) || 1;
            const bend = (stretch - 1) * 12; // less perceived tension
            const cx1 = mx + (nx / norm) * bend;
            const cy1 = my + (ny / norm) * bend;
            ctx.strokeStyle = e.target.color ? hexToRgba(e.target.color, 0.5) : border;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(cx1, cy1, x2, y2);
            ctx.stroke();
        }

        // Nodes
        ctx.font = baseFont;
        for (const n of nodes) {
            const x = n.x - n.width / 2;
            const y = n.y - n.height / 2;
            const isGroup = n.role === 'groupTechnical' || n.role === 'groupLanguages';
            const isFamily = n.role === 'familyTechnical' || n.role === 'familyLanguages';
            // Fancy fills
            if (n.isRoot) {
                ctx.fillStyle = accent;
            } else if (isFamily && (n.color || n.role === 'familyLanguages')) {
                const col = n.color || languagesColor;
                const grad = ctx.createLinearGradient(x, y, x, y + n.height);
                grad.addColorStop(0, hexToRgba(col, 0.14));
                grad.addColorStop(1, hexToRgba(col, 0.06));
                ctx.fillStyle = grad;
            } else if (isGroup) {
                ctx.fillStyle = hexToRgba(primary || '#000000', 0.06);
            } else {
                ctx.fillStyle = bg;
            }
            ctx.strokeStyle = n.isRoot ? primary : (n.color || (n.role === 'groupLanguages' ? languagesColor : border));
            ctx.lineWidth = (n.isRoot ? 2 : isGroup ? 1.8 : 1.5) / view.scale;
            if (n.isRoot || isGroup) {
                ctx.shadowColor = hexToRgba(primary || '#000000', 0.25);
                ctx.shadowBlur = 8;
            }
            roundRect(ctx, x, y, n.width, n.height, 8);
            ctx.fill();
            ctx.stroke();
            if (n.isRoot || isGroup) { ctx.shadowBlur = 0; }
            // Left color strip to reinforce grouping
            if (n.color && !isFamily) {
                ctx.fillStyle = hexToRgba(n.color, 0.15);
                roundRect(ctx, x, y, Math.min(6, n.width), n.height, 8);
                ctx.fill();
            }
            // Small colored dot for family nodes
            if (isFamily) {
                ctx.beginPath();
                ctx.arc(x + 10, y + n.height / 2, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = n.color || languagesColor;
                ctx.fill();
            }
            ctx.fillStyle = text;
            if (n.isRoot || isGroup) {
                const prev = ctx.font;
                ctx.font = 'bold 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
                ctx.fillText(n.ref.name, x + 10, y + n.height / 2 + 5);
                ctx.font = prev;
            } else {
                const textOffset = isFamily ? 18 : 8; // room for dot
                ctx.fillText(n.ref.name, x + textOffset, y + n.height / 2 + 4);
            }
        }

        ctx.restore();

        // --- Progressive radial blur ---
        // Build a spatially varying blur: near center ~unblurred, edges strongly blurred.
        // Uses multiple blurred layers composited with concentric radial masks.
        try {
            const supportsFilter = (typeof edgeCtx.filter === 'string');
            if (supportsFilter) {
                const w = canvas.width; const h = canvas.height;
                if (edgeBuffer.width !== w || edgeBuffer.height !== h) {
                    edgeBuffer.width = w; edgeBuffer.height = h;
                }
                // Reuse additional offscreen buffers for compositing
                if (!renderForceTree.__srcBuffer) {
                    renderForceTree.__srcBuffer = document.createElement('canvas');
                    renderForceTree.__srcCtx = renderForceTree.__srcBuffer.getContext('2d');
                    renderForceTree.__layerBuffer = document.createElement('canvas');
                    renderForceTree.__layerCtx = renderForceTree.__layerBuffer.getContext('2d');
                    renderForceTree.__finalBuffer = document.createElement('canvas');
                    renderForceTree.__finalCtx = renderForceTree.__finalBuffer.getContext('2d');
                }
                const srcBuffer = renderForceTree.__srcBuffer;
                const srcCtx = renderForceTree.__srcCtx;
                const layerBuffer = renderForceTree.__layerBuffer;
                const layerCtx = renderForceTree.__layerCtx;
                const finalBuffer = renderForceTree.__finalBuffer;
                const finalCtx = renderForceTree.__finalCtx;

                // Ensure sizes
                if (srcBuffer.width !== w || srcBuffer.height !== h) { srcBuffer.width = w; srcBuffer.height = h; }
                if (layerBuffer.width !== w || layerBuffer.height !== h) { layerBuffer.width = w; layerBuffer.height = h; }
                if (finalBuffer.width !== w || finalBuffer.height !== h) { finalBuffer.width = w; finalBuffer.height = h; }

                // Snapshot current canvas content as source
                srcCtx.setTransform(1,0,0,1,0,0);
                srcCtx.clearRect(0,0,w,h);
                srcCtx.drawImage(canvas, 0, 0);

                finalCtx.setTransform(1,0,0,1,0,0);
                finalCtx.clearRect(0,0,w,h);

                const cxPix = w / 2, cyPix = h / 2;
                const minDim = Math.min(w, h);

                // Concentric rounded-rectangle bands, biased toward the edge
                // Generate insets procedurally with an easing to push most transition near the edges
                // Resource-friendly approach: 3 blurred levels + masks, computed at reduced resolution
                const feather = Math.max(8, Math.round(minDim * 0.04));
                const cornerRadius = Math.max(8, Math.round(minDim * 0.03));

                // Insets pushed toward edges (center stays sharp longer)
                const inset0 = Math.round(minDim * 0.14); // center unblurred
                const inset1 = Math.round(minDim * 0.08); // low blur band start
                const inset2 = Math.round(minDim * 0.04); // medium blur band start
                const inset3 = 0;                          // heavy blur to edge

                // Downscale factor for blurred computations
                const blurScale = 0.5; // 50% resolution
                const sw = Math.max(1, Math.round(w * blurScale));
                const sh = Math.max(1, Math.round(h * blurScale));

                // Level buffers (full-size) and a small working buffer
                if (!renderForceTree.__smallBuffer) {
                    renderForceTree.__smallBuffer = document.createElement('canvas');
                    renderForceTree.__smallCtx = renderForceTree.__smallBuffer.getContext('2d');
                    renderForceTree.__blurLow = document.createElement('canvas');
                    renderForceTree.__blurLowCtx = renderForceTree.__blurLow.getContext('2d');
                    renderForceTree.__blurMed = document.createElement('canvas');
                    renderForceTree.__blurMedCtx = renderForceTree.__blurMed.getContext('2d');
                    renderForceTree.__blurHigh = document.createElement('canvas');
                    renderForceTree.__blurHighCtx = renderForceTree.__blurHigh.getContext('2d');
                }
                const smallBuffer = renderForceTree.__smallBuffer;
                const smallCtx = renderForceTree.__smallCtx;
                const blurLow = renderForceTree.__blurLow;
                const blurLowCtx = renderForceTree.__blurLowCtx;
                const blurMed = renderForceTree.__blurMed;
                const blurMedCtx = renderForceTree.__blurMedCtx;
                const blurHigh = renderForceTree.__blurHigh;
                const blurHighCtx = renderForceTree.__blurHighCtx;
                if (smallBuffer.width !== sw || smallBuffer.height !== sh) { smallBuffer.width = sw; smallBuffer.height = sh; }
                if (blurLow.width !== w || blurLow.height !== h) { blurLow.width = w; blurLow.height = h; }
                if (blurMed.width !== w || blurMed.height !== h) { blurMed.width = w; blurMed.height = h; }
                if (blurHigh.width !== w || blurHigh.height !== h) { blurHigh.width = w; blurHigh.height = h; }

                function computeBlurLevel(dstCtx, radiusFullPx) {
                    const rSmall = Math.max(0, Math.round(radiusFullPx * blurScale));
                    smallCtx.setTransform(1,0,0,1,0,0);
                    smallCtx.clearRect(0,0,sw,sh);
                    smallCtx.filter = rSmall > 0 ? `blur(${rSmall}px)` : 'none';
                    smallCtx.drawImage(srcBuffer, 0, 0, w, h, 0, 0, sw, sh);
                    smallCtx.filter = 'none';
                    dstCtx.setTransform(1,0,0,1,0,0);
                    dstCtx.clearRect(0,0,w,h);
                    dstCtx.drawImage(smallBuffer, 0, 0, sw, sh, 0, 0, w, h);
                }

                // Compute three blur levels (low/med/high)
                computeBlurLevel(blurLowCtx, 16);
                computeBlurLevel(blurMedCtx, 48);
                computeBlurLevel(blurHighCtx, 140);

                // Offscreen for alpha masks
                if (!renderForceTree.__maskBuffer) {
                    renderForceTree.__maskBuffer = document.createElement('canvas');
                    renderForceTree.__maskCtx = renderForceTree.__maskBuffer.getContext('2d');
                }
                const maskBuffer = renderForceTree.__maskBuffer;
                const maskCtx = renderForceTree.__maskCtx;
                if (maskBuffer.width !== w || maskBuffer.height !== h) { maskBuffer.width = w; maskBuffer.height = h; }

                function drawRoundedRectMask(ctxMask, insetPxOuter, insetPxInner) {
                    ctxMask.setTransform(1,0,0,1,0,0);
                    ctxMask.clearRect(0,0,w,h);
                    ctxMask.globalCompositeOperation = 'source-over';
                    // Outer rounded rect (white)
                    ctxMask.fillStyle = 'rgba(255,255,255,1)';
                    const ox = insetPxOuter;
                    const oy = insetPxOuter;
                    const ow = w - insetPxOuter * 2;
                    const oh = h - insetPxOuter * 2;
                    roundRect(ctxMask, ox, oy, Math.max(0, ow), Math.max(0, oh), cornerRadius);
                    ctxMask.fill();
                    // Punch inner hole (make band)
                    if (insetPxInner > insetPxOuter) {
                        ctxMask.globalCompositeOperation = 'destination-out';
                        const ix = insetPxInner;
                        const iy = insetPxInner;
                        const iw = w - insetPxInner * 2;
                        const ih = h - insetPxInner * 2;
                        roundRect(ctxMask, ix, iy, Math.max(0, iw), Math.max(0, ih), cornerRadius);
                        ctxMask.fillStyle = 'rgba(255,255,255,1)';
                        ctxMask.fill();
                        ctxMask.globalCompositeOperation = 'source-over';
                    }
                }

                // Compose: center (sharp) + low + medium + heavy bands
                finalCtx.setTransform(1,0,0,1,0,0);
                finalCtx.clearRect(0,0,w,h);

                // 1) Center sharp region
                layerCtx.setTransform(1,0,0,1,0,0);
                layerCtx.clearRect(0,0,w,h);
                layerCtx.drawImage(srcBuffer, 0, 0);
                drawRoundedRectMask(maskCtx, inset0, inset0);
                layerCtx.globalCompositeOperation = 'destination-in';
                if (feather > 0) layerCtx.filter = `blur(${Math.max(1, Math.round(feather * 0.8))}px)`;
                layerCtx.drawImage(maskBuffer, 0, 0);
                layerCtx.filter = 'none';
                layerCtx.globalCompositeOperation = 'source-over';
                finalCtx.drawImage(layerBuffer, 0, 0);

                // 2) Low blur band
                layerCtx.clearRect(0,0,w,h);
                layerCtx.drawImage(blurLow, 0, 0);
                drawRoundedRectMask(maskCtx, inset1, inset0);
                layerCtx.globalCompositeOperation = 'destination-in';
                if (feather > 0) layerCtx.filter = `blur(${feather}px)`;
                layerCtx.drawImage(maskBuffer, 0, 0);
                layerCtx.filter = 'none';
                layerCtx.globalCompositeOperation = 'source-over';
                finalCtx.drawImage(layerBuffer, 0, 0);

                // 3) Medium blur band
                layerCtx.clearRect(0,0,w,h);
                layerCtx.drawImage(blurMed, 0, 0);
                drawRoundedRectMask(maskCtx, inset2, inset1);
                layerCtx.globalCompositeOperation = 'destination-in';
                if (feather > 0) layerCtx.filter = `blur(${feather}px)`;
                layerCtx.drawImage(maskBuffer, 0, 0);
                layerCtx.filter = 'none';
                layerCtx.globalCompositeOperation = 'source-over';
                finalCtx.drawImage(layerBuffer, 0, 0);

                // 4) Heavy blur to edge
                layerCtx.clearRect(0,0,w,h);
                layerCtx.drawImage(blurHigh, 0, 0);
                drawRoundedRectMask(maskCtx, inset3, inset2);
                layerCtx.globalCompositeOperation = 'destination-in';
                if (feather > 0) layerCtx.filter = `blur(${feather}px)`;
                layerCtx.drawImage(maskBuffer, 0, 0);
                layerCtx.filter = 'none';
                layerCtx.globalCompositeOperation = 'source-over';
                finalCtx.drawImage(layerBuffer, 0, 0);

                // Replace main canvas with progressive blur composite
                ctx.save();
                ctx.setTransform(1,0,0,1,0,0);
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(finalBuffer, 0, 0);
                ctx.restore();
            }
        } catch (e) {
            // Skip progressive blur on error
        }
    }

    // Interaction
    let dragging = null;
    function getPointer(evt) {
        const rect = canvas.getBoundingClientRect();
        const x = (evt.clientX - rect.left);
        const y = (evt.clientY - rect.top);
        return { x, y };
    }
    function toWorld(p) { return { x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale }; }
    function hit(x, y) {
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            const left = n.x - n.width / 2;
            const top = n.y - n.height / 2;
            if (x >= left && x <= left + n.width && y >= top && y <= top + n.height) return n;
        }
        return null;
    }
    canvas.addEventListener('pointerdown', (e) => {
        const p = toWorld(getPointer(e));
        const n = hit(p.x, p.y);
        if (n) {
            if (n.isRoot) return; // root is pinned, do not drag
            dragging = n;
            n.fx = p.x; n.fy = p.y;
            canvas.setPointerCapture(e.pointerId);
            showSkillDetails(n.ref.name);
        }
    });
    canvas.addEventListener('pointermove', (e) => {
        const p = toWorld(getPointer(e));
        if (dragging) {
            dragging.fx = p.x; dragging.fy = p.y;
        } else {
            const n = hit(p.x, p.y);
            showSkillDetails(n ? n.ref.name : '');
        }
    });
    canvas.addEventListener('pointerup', (e) => {
        if (dragging) {
            dragging.fx = null; dragging.fy = null;
            dragging = null;
            canvas.releasePointerCapture(e.pointerId);
            showSkillDetails('');
        }
    });
    window.addEventListener('resize', () => { resize(); });

    function tick() { step(); draw(); requestAnimationFrame(tick); }
    tick();
}

function showSkillDetails(text) {
    const el = document.getElementById('skill-details');
    if (!el) return;
    el.textContent = text || '';
}

function initSkillsGraphs() {
    const rootSection = document.getElementById('skills');
    const orig = document.getElementById('skills-original');
    const graph = document.getElementById('skills-graph');
    const btnGraph = document.getElementById('skills-view-graph');
    const btnList = document.getElementById('skills-view-list');
    if (!rootSection || !orig || !graph || !btnGraph || !btnList) return;

    // Toggle behavior
    function setView(mode) {
        const isGraph = mode === 'graph';
        graph.hidden = !isGraph;
        orig.hidden = isGraph;
        btnGraph.setAttribute('aria-pressed', String(isGraph));
        btnList.setAttribute('aria-pressed', String(!isGraph));
    }
    btnGraph.addEventListener('click', () => setView('graph'));
    btnList.addEventListener('click', () => setView('list'));

    // Render tree
    try {
        const treeContainer = graph.querySelector('.skill-tree');
        if (treeContainer) renderForceTree(treeContainer);
        setView('graph');
    } catch {}
}

// Defer to next frame to ensure DOM is ready
requestAnimationFrame(initSkillsGraphs);

// Copy-on-click for emails
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const a = target.closest('a.copy-on-click');
    if (!a) return;
    const text = a.getAttribute('data-copy-text') || a.textContent || '';
    if (!text) return;
    e.preventDefault();
    try {
        navigator.clipboard.writeText(text).then(() => {
            showCopyToast(e.clientX, e.clientY);
        }).catch(() => {
            // Fallback using a temporary textarea
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch {}
            document.body.removeChild(ta);
            showCopyToast(e.clientX, e.clientY);
        });
    } catch {}
});

function showCopyToast(x, y) {
    const el = document.createElement('div');
    el.className = 'copy-cursor-toast';
    el.textContent = 'Copied';
    // Offset to the right of the cursor with slight upward shift
    const offsetX = 0;
    const offsetY = -12;
    el.style.left = `${Math.round(x + offsetX)}px`;
    el.style.top = `${Math.round(y + offsetY)}px`;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 1300);
}

// ---- Mobile sidebar (off-canvas) ----
const sidebarOpenBtn = document.getElementById('sidebar-open');
const sidebarCloseBtn = document.getElementById('sidebar-close');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function openSidebar() {
    document.body.classList.add('sidebar-open');
    sidebarOverlay?.removeAttribute('hidden');
    sidebarOpenBtn?.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    sidebarOverlay?.setAttribute('hidden', '');
    sidebarOpenBtn?.setAttribute('aria-expanded', 'false');
}

sidebarOpenBtn?.addEventListener('click', openSidebar);
sidebarCloseBtn?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// Close drawer when a TOC link is tapped
document.querySelectorAll('.toc a').forEach(a => {
    a.addEventListener('click', () => {
        if (window.innerWidth <= 900) closeSidebar();
    });
});

// Close sidebar when switching to desktop
window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeSidebar();
});