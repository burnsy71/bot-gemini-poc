
import { BotConfig } from '../types';

// Use relative path so requests go through Vite proxy (which handles the localhost:8010 mapping)
const API_BASE = ''; 

export const api = {
  async getStatus() {
    try {
      const res = await fetch(`${API_BASE}/status`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async getLedger() {
    try {
      const res = await fetch(`${API_BASE}/ledger`);
      if (!res.ok) throw new Error('Network response was not ok');
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async controlBot(botId: string, action: 'start' | 'stop') {
    try {
      const res = await fetch(`${API_BASE}/control/${botId}/${action}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (e) {
      console.error(`Failed to ${action} ${botId}`, e);
      return { message: "Error connecting to backend" };
    }
  },

  async saveConfig(config: BotConfig) {
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return await res.json();
    } catch (e) {
      console.error('Failed to save config', e);
      return { message: "Error saving config" };
    }
  }
};
