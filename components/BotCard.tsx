import React from 'react';
import { BotStatus } from '../types';
import { Activity, Zap, PenTool, AlertOctagon } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

interface BotCardProps {
  bot: BotStatus;
  data: { profit: number; time: string }[];
}

const BotCard: React.FC<BotCardProps> = ({ bot, data }) => {
  const getIcon = () => {
    switch (bot.strategy) {
      case 'HFT': return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'Sniper': return <Activity className="w-5 h-5 text-cyan-400" />;
      case 'Maker': return <PenTool className="w-5 h-5 text-purple-400" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
      case 'maintenance': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm flex flex-col gap-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-zinc-800 border border-zinc-700`}>
            {getIcon()}
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">{bot.name}</h3>
            <p className="text-xs text-zinc-400">{bot.strategy} Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(bot.status)}`} />
          <span className="text-xs font-medium text-zinc-300 uppercase tracking-wider">{bot.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
          <div className="text-xs text-zinc-500 mb-1">Daily Return</div>
          <div className="text-lg font-mono font-bold text-green-400">+{bot.dailyReturn.toFixed(2)}%</div>
        </div>
        <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
          <div className="text-xs text-zinc-500 mb-1">Total Profit</div>
          <div className="text-lg font-mono font-bold text-zinc-200">${bot.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Mini Chart */}
      <div className="h-24 w-full mt-2 -ml-2">
         <ResponsiveContainer width="100%" height="100%">
           <AreaChart data={data}>
             <defs>
               <linearGradient id={`color-${bot.id}`} x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor={bot.color} stopOpacity={0.3}/>
                 <stop offset="95%" stopColor={bot.color} stopOpacity={0}/>
               </linearGradient>
             </defs>
             <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                itemStyle={{ color: '#e4e4e7' }}
                labelStyle={{ display: 'none' }}
                cursor={{ stroke: '#52525b' }}
             />
             <Area 
                type="monotone" 
                dataKey="profit" 
                stroke={bot.color} 
                strokeWidth={2}
                fillOpacity={1} 
                fill={`url(#color-${bot.id})`} 
              />
           </AreaChart>
         </ResponsiveContainer>
      </div>

      {bot.status === 'maintenance' && (
         <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-xs text-yellow-200 mt-auto">
            <AlertOctagon className="w-3 h-3" />
            <span>Dep Error: phoenix_maker.js path</span>
         </div>
      )}
    </div>
  );
};

export default BotCard;