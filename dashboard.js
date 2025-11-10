/**
 * Web Dashboard Server for Crypto Arbitrage Bot
 * Provides real-time monitoring UI with PM2 integration
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// Serve static files
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

/**
 * Get PM2 process status
 */
app.get('/api/status', async (req, res) => {
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const processes = JSON.parse(stdout);
    const botProcess = processes.find(p => p.name === 'crypto-arbitrage-bot');
    
    if (botProcess) {
      res.json({
        status: 'online',
        uptime: botProcess.pm2_env.pm_uptime,
        restarts: botProcess.pm2_env.restart_time,
        cpu: botProcess.monit.cpu,
        memory: botProcess.monit.memory,
        pid: botProcess.pid,
        pm_id: botProcess.pm_id
      });
    } else {
      res.json({ status: 'offline' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get bot logs
 */
app.get('/api/logs', async (req, res) => {
  try {
    const { stdout } = await execAsync('pm2 logs crypto-arbitrage-bot --lines 50 --nostream');
    res.json({ logs: stdout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get bot statistics from MongoDB
 */
app.get('/api/stats', async (req, res) => {
  try {
    // Read stats from a stats file if available
    const statsFile = join(__dirname, 'data', 'bot-stats.json');
    if (existsSync(statsFile)) {
      const stats = JSON.parse(readFileSync(statsFile, 'utf8'));
      res.json(stats);
    } else {
      res.json({
        totalScans: 0,
        totalOpportunities: 0,
        totalProfit: 0,
        avgProfitPercent: 0,
        uptime: '0h 0m'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Control commands
 */
app.post('/api/control/:action', async (req, res) => {
  const { action } = req.params;
  
  try {
    let command;
    switch (action) {
      case 'start':
        command = 'pm2 start ecosystem.config.json';
        break;
      case 'stop':
        command = 'pm2 stop crypto-arbitrage-bot';
        break;
      case 'restart':
        command = 'pm2 restart crypto-arbitrage-bot';
        break;
      case 'reload':
        command = 'pm2 reload crypto-arbitrage-bot';
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    const { stdout } = await execAsync(command);
    res.json({ success: true, message: stdout });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get system info
 */
app.get('/api/system', async (req, res) => {
  try {
    const { stdout: cpuInfo } = await execAsync('top -bn1 | grep "Cpu(s)"');
    const { stdout: memInfo } = await execAsync('free -m');
    const { stdout: diskInfo } = await execAsync('df -h /');
    
    res.json({
      cpu: cpuInfo.trim(),
      memory: memInfo.split('\n')[1],
      disk: diskInfo.split('\n')[1]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         📊 CRYPTO ARBITRAGE BOT DASHBOARD 📊                 ║
║                                                               ║
║  Dashboard running at: http://localhost:${PORT}                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
