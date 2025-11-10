# 🚀 PM2 & Dashboard Setup Guide

## Quick Start (Ubuntu/Debian)

### 1. Install Dependencies
```bash
# Install Express for dashboard
npm install express

# Make setup script executable
chmod +x setup-pm2.sh
```

### 2. Run PM2 Setup (One Command)
```bash
npm run pm2:setup
```

This will automatically:
- ✅ Install PM2 globally
- ✅ Start your bot with PM2
- ✅ Configure auto-start on system boot
- ✅ Save PM2 configuration

---

## 📊 Launch Web Dashboard

### Start Dashboard Server
```bash
npm run ui
```

**Access at:** http://localhost:3000

### Or Run Dashboard with PM2 (Persistent)
```bash
npm run ui:start
```

Dashboard will run in background and auto-restart if it crashes.

---

## 🎮 PM2 Commands (via npm)

### Bot Control
```bash
npm run pm2:start      # Start bot
npm run pm2:stop       # Stop bot
npm run pm2:restart    # Restart bot
npm run pm2:status     # Show status
npm run pm2:logs       # View live logs
npm run pm2:monit      # Resource monitor
```

### Dashboard Control
```bash
npm run ui:start       # Start dashboard with PM2
npm run ui:stop        # Stop dashboard
```

---

## 🎯 Direct PM2 Commands

### Bot Management
```bash
pm2 start ecosystem.config.json          # Start bot
pm2 stop crypto-arbitrage-bot            # Stop bot
pm2 restart crypto-arbitrage-bot         # Restart bot
pm2 reload crypto-arbitrage-bot          # Zero-downtime reload
pm2 delete crypto-arbitrage-bot          # Remove from PM2
```

### Monitoring
```bash
pm2 status                               # List all processes
pm2 logs crypto-arbitrage-bot            # Live logs
pm2 logs crypto-arbitrage-bot --lines 100 # Last 100 lines
pm2 monit                                # Real-time monitoring
pm2 show crypto-arbitrage-bot            # Detailed info
```

### Log Management
```bash
pm2 flush                                # Clear all logs
pm2 logs crypto-arbitrage-bot --err      # Only errors
```

---

## ⚙️ Configuration (ecosystem.config.json)

```json
{
  "apps": [{
    "name": "crypto-arbitrage-bot",
    "script": "./index.js",
    "args": "--cron",
    "instances": 1,
    "autorestart": true,              // Auto-restart on crash
    "max_restarts": 10,                // Max restarts before giving up
    "min_uptime": "10s",               // Min uptime to consider stable
    "restart_delay": 4000,             // Wait 4s before restart
    "max_memory_restart": "500M",      // Restart if memory > 500MB
    "cron_restart": "0 4 * * *",       // Daily restart at 4 AM
    "error_file": "./logs/pm2-error.log",
    "out_file": "./logs/pm2-out.log"
  }]
}
```

---

## 🔄 Auto-Start on System Boot

### Ubuntu/Debian (systemd)
PM2 setup script already configured this! Verify with:

```bash
systemctl status pm2-$USER
```

### Manual Configuration (if needed)
```bash
pm2 startup systemd -u $USER --hp $HOME
# Copy and run the command it outputs (requires sudo)
pm2 save
```

### Test Reboot Persistence
```bash
sudo reboot
# After reboot, check:
pm2 status
```

---

## 📊 Dashboard Features

### Real-time Monitoring
- ✅ Bot status (Online/Offline)
- ✅ Uptime tracking
- ✅ CPU and memory usage
- ✅ Restart count
- ✅ Process ID

### Performance Metrics
- ✅ Total profit
- ✅ Scans performed
- ✅ Opportunities found
- ✅ Average profit percentage

### Control Panel
- ▶️ Start bot
- ⏹️ Stop bot
- 🔄 Restart bot
- ♻️ Reload bot

### Live Logs
- 📋 Real-time log streaming
- 🔄 Manual refresh
- Last 50 log entries

### Auto-Refresh
- Refreshes every 5 seconds
- No manual refresh needed

---

## 🛡️ Monitoring & Alerts

### Check if Bot is Running
```bash
pm2 status crypto-arbitrage-bot
```

### Auto-Restart on Crash
PM2 automatically restarts if:
- Process crashes
- Memory exceeds 500MB
- Process runs for less than 10s (unstable)

### Daily Automatic Restart
Configured to restart at 4 AM daily (prevents memory leaks)

Edit in `ecosystem.config.json`:
```json
"cron_restart": "0 4 * * *"  // Change time here
```

---

## 📁 Log Files

### Location
- **Output logs:** `./logs/pm2-out.log`
- **Error logs:** `./logs/pm2-error.log`

### View Logs
```bash
# Live logs
pm2 logs crypto-arbitrage-bot

# Last 100 lines
tail -n 100 logs/pm2-out.log

# Error logs only
tail -n 100 logs/pm2-error.log

# Real-time error monitoring
tail -f logs/pm2-error.log
```

### Clear Logs
```bash
pm2 flush
# or
rm -rf logs/*.log
```

---

## 🔧 Advanced PM2 Features

### Zero-Downtime Reload
```bash
pm2 reload crypto-arbitrage-bot
```
Restarts bot without downtime (useful for updates)

### Watch Mode (Auto-restart on file changes)
```bash
pm2 start ecosystem.config.json --watch
```

### Environment Variables
Add to `ecosystem.config.json`:
```json
"env": {
  "NODE_ENV": "production",
  "CUSTOM_VAR": "value"
}
```

### Cluster Mode (Multiple Instances)
```json
"instances": 4,           // Run 4 instances
"exec_mode": "cluster"    // Enable cluster mode
```

---

## 🐛 Troubleshooting

### Bot Won't Start
```bash
# Check logs for errors
pm2 logs crypto-arbitrage-bot --err

# Check detailed info
pm2 show crypto-arbitrage-bot

# Try manual start
node index.js --cron
```

### Bot Keeps Restarting
```bash
# Check if unstable (crashes immediately)
pm2 status

# View error logs
pm2 logs crypto-arbitrage-bot --err --lines 50

# Increase min_uptime in ecosystem.config.json
"min_uptime": "30s"
```

### Dashboard Not Loading
```bash
# Check if dashboard is running
pm2 status crypto-dashboard

# Start manually to see errors
node dashboard.js

# Check port availability
lsof -i :3000
```

### Permission Denied on Setup
```bash
# Make script executable
chmod +x setup-pm2.sh

# Run with bash
bash setup-pm2.sh
```

### PM2 Not Found After Reboot
```bash
# Re-run startup configuration
pm2 startup systemd -u $USER --hp $HOME
# Run the sudo command it outputs
pm2 save
```

---

## 📱 Remote Monitoring (Optional)

### PM2 Plus (Free Tier)
```bash
pm2 link <secret_key> <public_key>
```
Get keys from: https://app.pm2.io/

Features:
- Web-based monitoring
- Mobile app
- Email alerts
- Performance metrics

---

## 🎯 Production Best Practices

### 1. Regular Backups
```bash
# Backup PM2 config
pm2 save

# Backup ecosystem file
cp ecosystem.config.json ecosystem.config.json.backup
```

### 2. Log Rotation
Install PM2 log rotate module:
```bash
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. Resource Limits
Set in `ecosystem.config.json`:
```json
"max_memory_restart": "500M",  // Restart if memory > 500MB
"max_restarts": 10             // Give up after 10 restarts
```

### 4. Health Monitoring
```bash
# Check daily
pm2 status

# Monitor resources
pm2 monit

# Check logs for errors
pm2 logs crypto-arbitrage-bot --err --lines 20
```

---

## 📋 Quick Reference

| Action | Command |
|--------|---------|
| Setup PM2 | `npm run pm2:setup` |
| Start bot | `npm run pm2:start` |
| Stop bot | `npm run pm2:stop` |
| Restart bot | `npm run pm2:restart` |
| View logs | `npm run pm2:logs` |
| Check status | `npm run pm2:status` |
| Monitor resources | `npm run pm2:monit` |
| Start dashboard | `npm run ui` |
| Dashboard persistent | `npm run ui:start` |

---

## ✅ Verification Checklist

After setup, verify:
- [ ] Bot starts successfully: `pm2 status`
- [ ] Logs are clean: `pm2 logs crypto-arbitrage-bot`
- [ ] Auto-start configured: `systemctl status pm2-$USER`
- [ ] Dashboard accessible: http://localhost:3000
- [ ] Restarts on crash (kill process and watch PM2 restart it)
- [ ] Survives reboot: `sudo reboot` then check `pm2 status`

---

## 🎉 You're All Set!

Your bot is now:
- ✅ Running with PM2 process manager
- ✅ Auto-restarts on crash
- ✅ Starts automatically on system boot
- ✅ Has a beautiful web dashboard
- ✅ Monitored and logged

**Access Dashboard:** http://localhost:3000

**Need help?** Check logs: `pm2 logs crypto-arbitrage-bot`
