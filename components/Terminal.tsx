import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal as TerminalIcon, XCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface TerminalProps {
  logs: LogEntry[];
}

const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error': return <XCircle className="w-3 h-3 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case 'debug': return <span className="text-[10px] text-purple-500 font-bold">DBG</span>;
      default: return <Info className="w-3 h-3 text-blue-500" />;
    }
  };

  const getColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'debug': return 'text-zinc-500';
      default: return 'text-zinc-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e] border border-zinc-800 rounded-lg overflow-hidden shadow-inner shadow-black/50">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-mono text-zinc-400">EXECUTION LOGS (python3 sniper_execution.py)</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
        {logs.length === 0 && (
          <div className="text-zinc-600 italic">Waiting for execution command...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 group hover:bg-zinc-900/50 p-0.5 rounded">
            <span className="text-zinc-600 shrink-0 min-w-[70px]">{log.timestamp}</span>
            <span className="shrink-0 mt-0.5">{getIcon(log.level)}</span>
            <span className={`font-semibold shrink-0 min-w-[80px] ${log.level === 'debug' ? 'text-purple-400' : 'text-cyan-600'}`}>
              [{log.source}]
            </span>
            <span className={`break-all ${getColor(log.level)}`}>
              {log.message}
              {log.signature && (
                <span className="block text-zinc-600 mt-0.5 ml-2 text-[10px]">Sig: {log.signature}</span>
              )}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Terminal;