
export interface BotStatus {
  id: string;
  name: string;
  status: 'active' | 'maintenance' | 'idle' | 'error';
  strategy: 'HFT' | 'Sniper' | 'Maker';
  dailyReturn: number;
  totalProfit: number;
  activePairs: string[];
  color: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'debug';
  message: string;
  source: string;
  signature?: string; // Solana tx signature
}

export interface MarketOpportunity {
  tokenIn: string;
  tokenOut: string;
  expectedProfit: number;
  venue1: string;
  venue2: string;
  probability: number;
}

export interface AtomicTrace {
  step: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  details?: string;
}

export interface BotConfig {
  rpcUrl: string;
  privateKey: string;
  mode: 'dry-run' | 'live';
  risk: {
    maxSlippage: number;
    stopLoss: number;
    takeProfit: number;
    maxComputeUnits: number;
    priorityFee: number; // in microlamports
  };
  autoRestart: boolean;
}
