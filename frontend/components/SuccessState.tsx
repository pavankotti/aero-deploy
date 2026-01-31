
import React from 'react';
import { motion } from 'framer-motion';
import { Globe, ArrowUpRight } from 'lucide-react';

interface Props {
  url: string;
}

export const SuccessState: React.FC<Props> = ({ url }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center"
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center gap-3 bg-white text-black font-bold px-6 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]"
      >
        <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
        <Globe className="w-5 h-5" />
        Visit Preview
        <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </a>
    </motion.div>
  );
};
