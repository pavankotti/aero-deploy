import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Github, RefreshCcw, AlertCircle, Cpu, Cloud, CheckCircle2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { InputHero } from './components/InputHero';
import { Terminal } from './components/Terminal';
import { SuccessState } from './components/SuccessState';
import { DeploymentStatus, LogEntry } from './types';

const API_BASE = 'http://localhost:9001'; 
const SOCKET_URL = 'http://localhost:11000';

const App: React.FC = () => {
  const [status, setStatus] = useState<DeploymentStatus>('idle');
  const [deployInfo, setDeployInfo] = useState<{ deploymentId: string, subDomain: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);

  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const handleStartDeployment = async (gitURL: string) => {
    setStatus('submitting');
    setError(null);
    setLogs([]);

    try {
      const repoName = gitURL.split('/').pop()?.replace('.git', '') || 'my-project';
      
      const projectRes = await fetch(`${API_BASE}/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: repoName, gitURL }),
      });

      if (!projectRes.ok) throw new Error('Failed to create project');
      
      const projectData = await projectRes.json();
      const projectId = projectData.data.project.id;
      const subDomain = projectData.data.project.subDomain;

      const deployRes = await fetch(`${API_BASE}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!deployRes.ok) throw new Error('Failed to start deployment');

      const deployData = await deployRes.json();
      const deploymentId = deployData.data.deploymentId;

      setDeployInfo({ deploymentId, subDomain });

      const socket = io(SOCKET_URL);
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('subscribe', `logs:${deploymentId}`);
        setStatus('deploying');
        addLog('System', 'Connected to build cluster...');
      });

      socket.on('message', (data: string) => {
        handleIncomingLogData(data);
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
      setStatus('error');
    }
  };

  const handleIncomingLogData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      const logText = parsed.log;

      if (!logText) return;

      addLog('Build-Server', logText);

      if (logText.includes('All files uploaded successfully') || logText.includes('Done')) {
        setStatus('finished');
        setTimeout(() => cleanupSocket(), 2000);
      }
    } catch (e) {
      console.log("Raw log received:", data);
    }
  };

  const addLog = (source: string, text: string) => {
    setLogs(prev => {
      if (prev.length > 0 && prev[prev.length - 1].log === text) return prev;
      
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        log: text,
        timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        type: getLogType(text)
      }];
    });
  };

  const getLogType = (log: string): 'info' | 'error' | 'warning' => {
    const lowerLog = log.toLowerCase();
    if (lowerLog.includes('error') || lowerLog.includes('failed')) return 'error';
    if (lowerLog.includes('warn')) return 'warning';
    return 'info';
  };

  const handleReset = () => {
    cleanupSocket();
    setStatus('idle');
    setDeployInfo(null);
    setLogs([]);
  };

  const previewUrl = deployInfo 
    ? `http://${deployInfo.subDomain}.localhost:8000` 
    : '';

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/40 relative overflow-hidden flex flex-col items-center font-sans text-highlight-none">
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1),rgba(0,0,0,1))]"></div>
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full"
        />
        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
      </div>

      {/* Header */}
      <header className="w-full max-w-7xl px-8 py-8 flex justify-between items-center z-50">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 cursor-pointer" 
          onClick={handleReset}
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500 blur-lg opacity-40 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-2.5 bg-blue-600 rounded-xl shadow-2xl">
              <Rocket className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight">Aero<span className="text-blue-500">Deploy</span></span>
        </motion.div>
        
        {status !== 'idle' && (
          <button onClick={handleReset} className="px-4 py-2 glass rounded-full flex items-center gap-2 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all border border-transparent">
            <RefreshCcw className="w-3.5 h-3.5" />
            New Build
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl px-8 py-12 z-10 flex flex-col items-center flex-1">
        <AnimatePresence mode="wait">
          
          {/* IDLE STATE */}
          {status === 'idle' || status === 'submitting' ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
              className="w-full flex flex-col items-center"
            >
              <InputHero onSubmit={handleStartDeployment} isSubmitting={status === 'submitting'} />
            </motion.div>
          ) : (
            
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8"
            >
              
              {/* Sidebar */}
              <aside className="space-y-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl space-y-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Pipeline Status</h3>
                  <div className="space-y-4">
                    <StatusStep icon={<Cpu />} label="Initialize" active={status !== 'finished'} done={status === 'deploying' || status === 'finished'} />
                    <StatusStep icon={<Cloud />} label="Build Engine" active={status === 'deploying'} done={status === 'finished'} />
                    <StatusStep icon={<CheckCircle2 />} label="Edge Deploy" active={status === 'finished'} done={status === 'finished'} />
                  </div>
                </div>

                {deployInfo && (
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl">
                    <p className="text-xs text-gray-500 mb-2 font-mono">SUBDOMAIN</p>
                    <p className="text-sm font-medium text-blue-400 truncate" title={deployInfo.subDomain}>{deployInfo.subDomain}</p>
                    <div className="h-px bg-white/5 my-4"></div>
                    <p className="text-xs text-gray-500 mb-2 font-mono">DEPLOYMENT ID</p>
                    <p className="text-[10px] font-mono text-gray-500 truncate" title={deployInfo.deploymentId}>{deployInfo.deploymentId}</p>
                  </div>
                )}
              </aside>

              {/* Terminal Area */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Github className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                       <h2 className="font-bold text-lg leading-tight">Live Deployment Stream</h2>
                       <p className="text-xs text-gray-500 font-mono">Cluster: ap-south-1</p>
                    </div>
                  </div>
                  
                  {status === 'finished' && <SuccessState url={previewUrl} />}
                </div>

                <Terminal logs={logs} status={status} />

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full py-8 text-center text-[10px] text-gray-600 font-mono uppercase tracking-[0.4em] opacity-40">
        &copy; 2026 AeroDeploy &bull; System Active
      </footer>
    </div>
  );
};

const StatusStep = ({ icon, label, active, done }: { icon: any, label: string, active: boolean, done: boolean }) => (
  <div className={`flex items-center gap-3 transition-opacity ${done ? 'opacity-100' : active ? 'opacity-100' : 'opacity-30'}`}>
    <div className={`p-2 rounded-lg border transition-all ${done ? 'bg-green-500/10 border-green-500/20 text-green-500' : active ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/5 text-gray-500'}`}>
      {React.cloneElement(icon, { size: 16 })}
    </div>
    <span className={`text-sm font-medium ${done ? 'text-green-500' : active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
    {active && !done && (
      <div className="ml-auto w-1 h-1 rounded-full bg-blue-500 animate-ping"></div>
    )}
  </div>
);

export default App;