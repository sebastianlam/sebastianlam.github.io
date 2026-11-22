# Jim Lam - Portfolio

A zero-runtime-dependency personal portfolio and interactive CV: pre-rendered static HTML from structured data, paired with a deferred GPU-native WebGL skills graph.

## Tech Stack

- **Architecture**: Pre-rendered static HTML via custom Vite plugin (works with JavaScript disabled) + vanilla JS interactive island
- **Build Tool**: [Vite 6](https://vite.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Visuals**: GPU-native WebGL analytic SDF Bézier ribbons + separable 2-pass radial depth-of-field blur (0% idle CPU/GPU)

## Key Features

- **Zero Framework Overhead**: No client UI framework or scroll hijack library; main JS entry is ~2 KB.
- **GPU-Native Skills Graph**: Analytic SDF antialiasing for smooth curves at any DPI, separable 2-pass bokeh blur, and automatic idle sleep.
- **Focus Mode**: Distraction-free reading mode that collapses the desktop sidebar.
- **CI-Gated Deployment**: GitHub Pages deployment is gated on Lighthouse CI, `axe`, `html-validate`, and `linkinator`.

## Getting Started

```bash
npm install
npm run dev
```

### Building for Production

```bash
npm run build
npm run preview
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
