import React, { useEffect, useRef, useState } from 'react';

const Section = ({
  title,
  children,
  id,
  className = "",
  innerClassName = "",
  hideTitle = false,
  disableReveal = false,
}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(disableReveal);

  useEffect(() => {
    if (disableReveal || visible) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [disableReveal, visible]);

  const revealClasses = disableReveal
    ? ''
    : visible
      ? 'opacity-100 translate-y-0 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none'
      : 'opacity-0 translate-y-5 motion-reduce:opacity-100 motion-reduce:translate-y-0';

  return (
    <section
      ref={ref}
      id={id}
      className={`relative scroll-mt-28 md:scroll-mt-12 ${revealClasses} ${className}`}
    >
      {!hideTitle && (
        <div className="flex items-center gap-3 sm:gap-4 mb-8 md:mb-12">
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-serif text-white uppercase select-none leading-[1.1] py-1 md:py-2">
            {title}
          </h2>
          <div className="h-[2px] flex-1 bg-white/80 min-w-[24px]" />
        </div>
      )}
      <div className={`relative z-10 ${innerClassName}`}>
        {children}
      </div>
    </section>
  );
};

export default Section;
