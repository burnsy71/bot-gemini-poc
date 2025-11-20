
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LogEntry } from "../types";

// Safe access to environment variable in Vite
const apiKey = (import.meta.env && import.meta.env.VITE_API_KEY) || ''; 
const ai = new GoogleGenAI({ apiKey });

// Schema for generating a structured atomic snipe simulation result
const atomicSimulationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    success: { type: Type.BOOLEAN },
    logs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.STRING, enum: ['info', 'success', 'error', 'debug', 'warning'] },
          message: { type: Type.STRING },
          source: { type: Type.STRING },
          signature: { type: Type.STRING },
        },
        required: ['level', 'message', 'source'],
      },
    },
    profit: { type: Type.NUMBER },
    tokenPair: { type: Type.STRING },
  },
  required: ['success', 'logs', 'profit', 'tokenPair'],
};

export const generateAtomicSnipeSimulation = async (): Promise<{
  logs: Omit<LogEntry, 'id' | 'timestamp'>[];
  profit: number;
  tokenPair: string;
}> => {
  try {
    if (!apiKey) throw new Error("No API Key provided");

    const model = 'gemini-2.5-flash';
    const prompt = `
      Simulate a technical execution log for a Solana arbitrage bot ('sniper_execution.py').
      
      Context:
      - The bot has been upgraded to use the **Jupiter v6 API** for real-time pricing.
      - It includes **robust error handling** (e.g., retrying failed quotes, handling rate limits).
      
      Scenario:
      1. Initialize 'JupiterApiClient' and 'PhoenixAdapter'.
      2. Detect a spread on a pair (e.g., SOL/USDC, Jup/SOL).
      3. Request a quote from Jupiter API (v6).
      4. Simulate a minor issue (e.g., "Quote expired", "High slippage warning", or "API Rate Limit") that is caught and handled/retried successfully.
      5. Build the Atomic VersionedTransaction combining Phoenix Swap and Jupiter Swap.
      6. Execute Dry-Run successfully.
      
      Output Format: JSON matching the schema.
      Profit range: $15.00 - $80.00.
      Logs should be detailed and technical.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: atomicSimulationSchema,
        temperature: 0.6,
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        logs: data.logs,
        profit: data.profit,
        tokenPair: data.tokenPair,
      };
    }
    throw new Error("Empty response from Gemini");
  } catch (error) {
    // Fallback mock data with API integration simulation
    return {
      logs: [
        { level: 'info', message: 'Initializing Jupiter API Client (v6.0.1)...', source: 'sniper_execution.py' },
        { level: 'info', message: 'Connected to Helius RPC (14ms).', source: 'SolanaConnection' },
        { level: 'info', message: 'Market Scan: Monitoring Phoenix orderbooks...', source: 'MarketScanner' },
        { level: 'debug', message: 'Opportunity detected: SOL/USDC spread > 0.8%', source: 'StrategyEngine' },
        { level: 'info', message: 'Fetching quote from https://quote-api.jup.ag/v6...', source: 'JupiterService' },
        { level: 'warning', message: 'Quote valid window tight (150ms). Requesting refresh...', source: 'JupiterService' },
        { level: 'success', message: 'Quote secured. OutAmount: 145.85 USDC. Slippage: 0.1%', source: 'JupiterService' },
        { level: 'info', message: 'Assembling Atomic VersionedTransaction...', source: 'TxBuilder' },
        { level: 'success', message: '✅ ATOMIC SNIPE SUCCESS! Dry Run Verified.', source: 'sniper_execution.py', signature: 'Simulated_Sig_99...' }
      ],
      profit: 42.50,
      tokenPair: 'SOL/USDC'
    };
  }
};

export const analyzeHFTVolume = async (): Promise<string> => {
  try {
    if (!apiKey) throw new Error("No API Key");
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: "Generate a short, single-sentence technical status update for a high-frequency Solana trading bot. Use technical jargon like 'congestion', 'slot latency', 'compute units', or 'priority fees'.",
    });
    return response.text || "System stable. Monitoring slot latency.";
  } catch (e) {
    return "HFT Engine running. Metrics nominal.";
  }
};
