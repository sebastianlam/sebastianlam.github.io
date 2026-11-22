import React from 'react';
import { m } from 'framer-motion';

const Section = ({
  title,
  children,
  id,
  className = "",
  innerClassName = "",
  hideTitle = false,
  disableReveal = false,
}) => {
  return (
    <m.section
      id={id}
      initial={disableReveal ? false : { opacity: 0, y: 20 }}
      whileInView={disableReveal ? undefined : { opacity: 1, y: 0 }}
      viewport={disableReveal ? undefined : { once: true, margin: "-10%" }}
      transition={disableReveal ? undefined : { duration: 0.7, ease: "easeInOut" }}
      className={`relative scroll-mt-28 md:scroll-mt-12 ${className}`}
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
    </m.section>
  );
};

export default Section;
