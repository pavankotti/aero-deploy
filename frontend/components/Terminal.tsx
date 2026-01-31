import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon, Copy, ChevronRight, Share2 } from 'lucide-react';
import { LogEntry, DeploymentStatus } from '../types';

interface Props {
  logs: LogEntry[];
  status: DeploymentStatus;
}

export const Terminal: React.FC<Props> = ({ logs, status }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  const getLogStyle = (type: LogEntry['type']) => {
    switch (type) {
      case 'info': return 'text-blue-400 font-bold border-l-2 border-blue-500/50 pl-3';
      case 'error': return 'text-red-400 bg-red-500/5 py-1 px-3 rounded border border-red-500/20';
      case 'warning': return 'text-yellow-400 border-l-2 border-yellow-500/50 pl-3';
      default: return 'text-gray-400 pl-3';
    }
  };

  return (
    <div className="w-full glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[550px] scanlines relative group">
      {/* Terminal Header */}
      <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
          </div>
          <div className="h-4 w-px bg-white/10"></div>
          <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-widest mono">
            <TerminalIcon size={14} className="text-blue-500" />
            aerodeploy_stream_main
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
             <div className={`w-1.5 h-1.5 rounded-full bg-blue-500 ${status === 'deploying' ? 'animate-pulse' : ''}`}></div>
             <span className="text-[10px] font-bold text-blue-500 mono uppercase">
               {status === 'finished' ? 'Complete' : status === 'deploying' ? 'Live' : 'Ready'}
             </span>
          </div>
        </div>
      </div>

      {/* Terminal Body */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-3 mono text-[13px] leading-relaxed relative z-0 bg-black/20"
      >
        <AnimatePresence mode="popLayout">
          {logs.length === 0 && status === 'deploying' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 italic">
              Initializing connection to build cluster...
            </motion.div>
          )}
          {logs.map((entry, index) => (
            <motion.div
              key={entry.id} // Ensure 'id' is unique in App.tsx
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-4 group/log"
            >
              <div className="w-12 text-right select-none text-gray-700 text-[10px] opacity-40 group-hover/log:opacity-100 transition-opacity pt-0.5">
                {(index + 1).toString().padStart(3, '0')}
              </div>
              <div className={`flex-1 break-all ${getLogStyle(entry.type)}`}>
                <span className="text-gray-600 mr-3 text-[10px] tracking-tighter opacity-50 select-none">
                  {entry.timestamp}
                </span>
                {entry.log}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {status === 'deploying' && (
          <div className="flex gap-4 items-center pl-12 text-blue-500 mt-4">
             <ChevronRight size={14} className="animate-pulse" />
             <div className="w-2 h-4 bg-blue-500/50 animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Terminal Footer */}
      <div className="bg-black/40 px-6 py-3 flex items-center justify-between border-t border-white/5 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
           <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mono">Ln {logs.length + 1}, Col 1</span>
           <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mono">UTF-8</span>
        </div>
        <div className="flex items-center gap-2">
           <button className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded transition-all" title="Copy Logs">
             <Copy size={14} />
           </button>
           <button className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded transition-all" title="Share Build">
             <Share2 size={14} />
           </button>
        </div>
      </div>
    </div>
  );
};