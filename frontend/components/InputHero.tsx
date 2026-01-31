import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface Props {
  onSubmit: (url: string) => void; // Removed slug from props
  isSubmitting: boolean;
}

export const InputHero: React.FC<Props> = ({ onSubmit, isSubmitting }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const validate = (val: string) => {
    if (!val) return 'Please provide a repository URL';
    try {
      new URL(val);
      if (!val.toLowerCase().includes('github.com')) return 'Repository must be on GitHub';
      return '';
    } catch (e) {
      return 'That doesn\'t look like a valid URL';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(url);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    onSubmit(url); // Only sending URL now
  };

  return (
    <div className="w-full max-w-3xl text-center text-select-none">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-8">
          <Sparkles size={12} />
          Ship in seconds
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
          Ship with confidence.
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto font-medium leading-relaxed">
          Zero-config deployments from your GitHub repository to a global edge network in seconds.
        </p>
      </motion.div>

      <div className="relative p-[1px] rounded-[2rem] overflow-hidden group">
        {/* Animated Conic Border */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-transparent to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="absolute inset-[-100%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,#3b82f6_360deg)] opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000"></div>

        <div className="relative glass p-4 md:p-8 rounded-[2rem]">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors">
                <Github size={20} />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="github.com/username/project"
                className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 text-white text-lg placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                disabled={isSubmitting}
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting || !url}
              className="h-16 px-10 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Deploy Now
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
          
          {error && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 text-red-400 text-sm font-medium text-left px-4">
              &bull; {error}
            </motion.p>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-wrap justify-center gap-x-12 gap-y-4 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
             <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
               <div className="w-1 h-1 rounded-full bg-blue-500"></div> Node.js
             </div>
             <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
               <div className="w-1 h-1 rounded-full bg-blue-500"></div> React
             </div>
             <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
               <div className="w-1 h-1 rounded-full bg-blue-500"></div> Next.js
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};