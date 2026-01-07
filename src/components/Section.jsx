import React from 'react';
import { motion } from 'framer-motion';

const Section = ({ title, children, id, className = "" }) => {
  return (
    <motion.section 
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.8 }}
      className={`relative ${className}`}
    >
      <div className="flex items-center gap-4 mb-12 overflow-hidden repel-target">
        <h2 className="text-6xl md:text-8xl font-serif italic text-white uppercase select-none leading-none">
          {title}
        </h2>
        <div className="h-[2px] flex-1 bg-white" />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </motion.section>
  );
};

export default Section;

