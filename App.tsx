
import React, { useState, useEffect } from 'react';
import { BotStatus, LogEntry, BotConfig } from './types';
import BotCard from './components/BotCard';
import Terminal from './components/Terminal';
import { api } from './services/api';
import { Play, StopCircle, Activity, Settings, Server, Code, Save, Eye, EyeOff, Zap, Shield } from 'lucide-react';

const INITIAL_BOTS: BotStatus[] = [
  {
    id: 'bot-1',
    name: 'HFT Volume Engine',
    status: 'idle',
    strategy: 'HFT',
    dailyReturn: 0.0,
    totalProfit: 0.0,
    activePairs: ['SOL-USDC', 'JUP-SOL'],
    color: '#facc15' 
  },
  {
    id: 'bot-2',
    name: 'High-Margin Sniper',
    status: 'idle',
    strategy: 'Sniper',
    dailyReturn: 0.0,
    totalProfit: 0.0,
    activePairs: ['SOL-USDC'],
    color: '#22d3ee' 
  },
  {
    id: 'bot-3',
    name: 'Maker Module',
    status: 'idle',
    strategy: 'Maker',
    dailyReturn: 0.0,
    totalProfit: 0.0,
    activePairs: ['SOL-USDC'],
    color: '#c084fc' 
  }
];

export default function App() {
  const [bots, setBots] = useState<BotStatus[]>(INITIAL_BOTS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config'>('dashboard');
  const [showSecret, setShowSecret] = useState(false);
  const [serverHealthy, setServerHealthy] = useState(false);
  
  // Configuration State
  const [config, setConfig] = useState<BotConfig>({
    rpcUrl: '',
    privateKey: '',
    mode: 'dry-run',
    risk: {
      maxSlippage: 1.0,
      stopLoss: 5.0,
      takeProfit: 12.0,
      maxComputeUnits: 200000,
      priorityFee: 50000,
    },
    autoRestart: true
  });

  const addLog = (level: LogEntry['level'], message: string, source: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    
    if (!message || message.length < 2) return; // Filter empty keep-alives

    setLogs(prev => [...prev.slice(-100), {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: `${timeStr}.${ms}`,
      level,
      message: message.replace('data: ', '').trim(),
      source
    }]);
  };

  // 1. Poll Server Status & Ledger
  useEffect(() => {
    const poll = async () => {
      const status = await api.getStatus();
      if (status) {
        setServerHealthy(true);
        const ledger = await api.getLedger();
        
        setBots(prev => prev.map(b => {
          const s = status[b.id]?.status || 'idle';
          
          // Update Profit from Ledger
          if (b.id === 'bot-1' && ledger) {
             return { ...b, status: s, totalProfit: ledger.realized_usdc || 0 };
          }
          return { ...b, status: s };
        }));
      } else {
        setServerHealthy(false);
        // Set all to idle if server is down
        setBots(prev => prev.map(b => ({...b, status: 'idle'})));
      }
    };
    const interval = setInterval(poll, 2000);
    poll();
    return () => clearInterval(interval);
  }, []);

  // 2. Connect to Log Stream
  useEffect(() => {
    const connectStream = (botId: string, source: string) => {
      // Using native EventSource to connect to Python SSE stream
      // Use relative path /logs/... so it goes through Vite Proxy -> Localhost:8010
      const evt = new EventSource(`/logs/${botId}`);
      evt.onmessage = (e) => {
        addLog('info', e.data, source);
      };
      evt.onerror = () => {
        evt.close();
      };
      return evt;
    };

    const s1 = connectStream('bot-1', 'HFT');
    const s2 = connectStream('bot-2', 'Sniper');
    const s3 = connectStream('bot-3', 'Maker');

    return () => { s1.close(); s2.close(); s3.close(); };
  }, []);

  const toggleBot = async (botId: string, currentStatus: string) => {
    if (!serverHealthy) {
      addLog('error', 'Cannot control bots: Backend disconnected', 'System');
      return;
    }
    const action = currentStatus === 'active' ? 'stop' : 'start';
    addLog('info', `Sending ${action} command to ${botId}...`, 'System');
    await api.controlBot(botId, action);
  };

  const handleSaveConfig = async () => {
    await api.saveConfig(config);
    addLog('success', 'Configuration saved to .env', 'System');
    setActiveTab('dashboard');
  };

  const handleConfigChange = (key: string, value: any) => {
     setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleRiskChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, risk: { ...prev.risk, [key]: parseFloat(value) } }));
  };

  const currentSniperBot = bots.find(b => b.id === 'bot-2');

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
           <div className={`w-8 h-8 rounded flex items-center justify-center shadow-lg transition-colors duration-500 ${serverHealthy ? 'bg-gradient-to-br from-blue-600 to-cyan-400 shadow-blue-500/20' : 'bg-zinc-800'}`}>
             <Server className={`w-5 h-5 ${serverHealthy ? 'text-white' : 'text-zinc-500'}`} />
           </div>
           <div>
             <h1 className="font-bold text-lg tracking-tight text-zinc-100">DeFi Arb Command Center</h1>
             <div className="flex items-center gap-2 text-xs text-zinc-500">
               <span className={`w-2 h-2 rounded-full transition-colors duration-500 ${serverHealthy ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
               {serverHealthy ? 'Backend Connected' : 'Disconnected (Run: python3 server.py)'}
             </div>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="text-xs text-zinc-500">Est. Daily Yield</span>
              <span className="text-sm font-mono font-bold text-green-400">3.85%</span>
           </div>
           <button 
             onClick={() => setActiveTab('dashboard')}
             className={`p-2 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
           >
             <Activity className="w-5 h-5" />
           </button>
           <button 
             onClick={() => setActiveTab('config')}
             className={`p-2 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
           >
             <Settings className="w-5 h-5" />
           </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        
        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Stats & Bots */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                  {bots.map((bot) => (
                    <div key={bot.id} onClick={() => toggleBot(bot.id, bot.status)} className="cursor-pointer transform transition-all hover:scale-[1.02]">
                       <BotCard bot={bot} data={[]} />
                    </div>
                  ))}
              </div>

              {/* Bot 2 Focus Panel (Sniper Execution) */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none">
                    <Activity className="w-48 h-48 text-cyan-500" />
                  </div>
                  
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                        <Code className="w-5 h-5 text-cyan-400" />
                        Atomic Sniper Control
                      </h2>
                      <p className="text-sm text-zinc-400 mt-1">
                        Strategy: Jupiter v6 + Phoenix | Target: $1.00+
                      </p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleBot('bot-2', currentSniperBot?.status || 'idle'); }}
                      disabled={!serverHealthy}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all
                        ${!serverHealthy ? 'opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-500' : 
                          currentSniperBot?.status === 'active'
                             ? 'bg-red-900/30 text-red-400 border border-red-900 hover:bg-red-900/50'
                             : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]'
                        }
                      `}
                    >
                      {currentSniperBot?.status === 'active' ? (
                        <>
                          <StopCircle className="w-4 h-4" />
                          STOP PROCESS
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          START MONITOR
                        </>
                      )}
                    </button>
                  </div>

                  {/* Running Indicator */}
                  {currentSniperBot?.status === 'active' && (
                    <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded text-cyan-300 text-sm font-mono flex items-center gap-3 animate-pulse">
                       <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                       Monitor active. Scanning for arbitrage opportunities...
                    </div>
                  )}
                  {currentSniperBot?.status === 'idle' && (
                    <div className="mt-4 p-3 bg-zinc-800/50 border border-zinc-800 rounded text-zinc-500 text-sm font-mono flex items-center gap-3">
                       <div className="w-2 h-2 bg-zinc-600 rounded-full"></div>
                       System standby. Click Start to begin scanning.
                    </div>
                  )}
              </div>
            </div>

            {/* Right Column: Terminal */}
            <div className="h-[calc(100vh-8rem)] sticky top-24">
              <Terminal logs={logs} />
            </div>
          </div>
        ) : (
          // CONFIGURATION TAB
          <div className="max-w-3xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
             <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
               <div className="p-3 bg-zinc-800 rounded-lg">
                 <Settings className="w-6 h-6 text-zinc-300" />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-white">Bot Configuration</h2>
                 <p className="text-sm text-zinc-400">Manage global parameters, keys, and safety switches.</p>
               </div>
             </div>

             {/* MODE TOGGLE */}
             <div className="mb-8 bg-black/40 rounded-xl p-4 border border-zinc-800 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 {config.mode === 'live' ? <Zap className="w-6 h-6 text-red-500" /> : <Shield className="w-6 h-6 text-green-500" />}
                 <div>
                   <h3 className="font-bold text-zinc-200">Operating Mode</h3>
                   <p className="text-xs text-zinc-500">Current: {config.mode === 'live' ? 'Live Trading (Real Funds)' : 'Dry-Run (Simulation)'}</p>
                 </div>
               </div>
               <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-700 flex">
                  <button 
                    onClick={() => handleConfigChange('mode', 'dry-run')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${config.mode === 'dry-run' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Dry Run
                  </button>
                  <button 
                    onClick={() => handleConfigChange('mode', 'live')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${config.mode === 'live' ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    LIVE
                  </button>
               </div>
             </div>

             {/* FORM GRID */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* RPC Config */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Connection</h3>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">Solana RPC Endpoint</label>
                    <input 
                      type="text" 
                      value={config.rpcUrl}
                      onChange={(e) => handleConfigChange('rpcUrl', e.target.value)}
                      placeholder="https://api.mainnet-beta.solana.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-cyan-500 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5">Private Key Path (Base58)</label>
                    <div className="relative">
                      <input 
                        type={showSecret ? "text" : "password"}
                        value={config.privateKey}
                        onChange={(e) => handleConfigChange('privateKey', e.target.value)}
                        placeholder="secrets/sol_sk.txt"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-cyan-500 focus:outline-none transition-colors font-mono pr-10"
                      />
                      <button 
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Risk Config */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Risk Parameters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5">Max Slippage (%)</label>
                      <input 
                        type="number" 
                        value={config.risk.maxSlippage}
                        onChange={(e) => handleRiskChange('maxSlippage', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-cyan-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5">Priority Fee (uLamports)</label>
                      <input 
                        type="number" 
                        value={config.risk.priorityFee}
                        onChange={(e) => handleRiskChange('priorityFee', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:border-cyan-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

             </div>

             <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-end gap-4">
                <button 
                  className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                  onClick={() => setActiveTab('dashboard')}
                >
                  Cancel
                </button>
                <button 
                  className="flex items-center gap-2 px-6 py-2 bg-zinc-100 text-zinc-900 rounded-lg font-bold hover:bg-white transition-colors"
                  onClick={handleSaveConfig}
                >
                  <Save className="w-4 h-4" />
                  Save Configuration
                </button>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
