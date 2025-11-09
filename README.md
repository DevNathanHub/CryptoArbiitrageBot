# 🤖 Agentic AI Binance Triangular Arbitrage Bot

A comprehensive Node.js cryptocurrency arbitrage trading bot for Binance featuring an advanced **Agentic AI System** with autonomous decision-making, learning capabilities, and self-optimization. Includes real-time WebSocket feeds, automated trading, and intelligent profit detection.

![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## ✨ Features

### 🎯 Core Arbitrage Features
- **Triangular Arbitrage Detection** - Automatically detects profitable triangular arbitrage opportunities
- **Real-time Order Book Analysis** - Simulates trades against actual order book depth
- **Fee Calculation** - Accounts for Binance taker fees (0.1%) in profit calculations
- **Multi-pair Scanning** - Scans 8+ predefined triangular cycles across BTC/ETH/BNB/USDT
- **🆕 Advanced Opportunity Selection** - Multi-factor scoring system for best opportunity picking
- **🆕 Smart Risk Assessment** - Evaluates opportunities based on profitability, liquidity, volatility, and historical success

### ⏰ Cron Job Scheduling
- **🆕 Automated Scheduling** - Runs scans on configurable cron schedules
- **🆕 Quick Scans** - Every 2 minutes for fast opportunity detection
- **🆕 Deep Analysis** - Every 15 minutes for comprehensive market analysis
- **🆕 Daily Reports** - Automated performance summaries at midnight
- **🆕 Health Checks** - Hourly system health monitoring
- **🆕 Weekly Cleanup** - Automatic database maintenance

### 🎯 Advanced Strategy Engine
- **Multi-Factor Scoring** - Scores opportunities on:
  - Profit percentage (40% weight)
  - Absolute profit amount (25% weight)
  - Execution speed (15% weight)
  - Liquidity depth (10% weight)
  - Price volatility (5% weight)
  - Historical success rate (5% weight)
- **Risk-Based Recommendations** - STRONG_BUY, BUY, CONSIDER, MONITOR, SKIP
- **Historical Analysis** - Tracks opportunity patterns over time
- **Quality Filtering** - Only trades high-scoring opportunities

### 🌐 Real-time WebSocket Feeds
- **Live Price Updates** - WebSocket connections for instant order book updates
- **Best Bid/Ask Tracking** - Real-time spread monitoring
- **Auto-reconnection** - Handles connection drops with exponential backoff
- **Multi-symbol Streams** - Monitors all trading pairs simultaneously

### 🤖 Automated Trading
- **CCXT Integration** - Universal exchange API support
- **Testnet Support** - Safe testing on Binance testnet before going live
- **Market Order Execution** - Fast execution for time-sensitive arbitrage
- **Trade History Tracking** - Comprehensive logging of all executed trades
- **Profit/Loss Reporting** - Detailed trade statistics and performance metrics

### 📊 Multi-Triangle Scanner
- **Parallel Scanning** - Scans all opportunities simultaneously for speed
- **Profit Ranking** - Automatically sorts opportunities by profitability
- **Threshold Filtering** - Only reports opportunities above configured profit threshold (default 0.3%)
- **Continuous Mode** - Run indefinite scans at configurable intervals

### 💾 MongoDB Integration
- **Opportunity Logging** - Stores all detected arbitrage opportunities
- **Trade Execution Logs** - Complete record of all trade executions
- **Performance Analytics** - Daily/weekly performance summaries
- **Historical Analysis** - Query past opportunities and trends

### 📱 Telegram Alerts
- **Real-time Notifications** - Instant alerts for profitable opportunities
- **Trade Confirmations** - Execution results sent directly to Telegram
- **Daily Summaries** - Automated performance reports
- **Error Alerts** - Immediate notification of any issues
- **🆕 Marketing Updates** - Automated community engagement messages every 5 minutes
- **🆕 Channel Broadcasting** - Send timely news, welcome messages, and market insights to channels

### 🧠 Agentic AI System (⭐ NEW!)
- **🤖 Agent Orchestrator** - Central coordinator managing multiple AI agents
- **🧠 Learning Agent** - Analyzes performance and adapts trading strategies autonomously
- **🎯 Goal-Oriented Agent** - Sets and tracks profit/risk objectives with intelligent decision-making
- **🧠 Memory Agent** - Maintains long-term memory of market patterns and successful trades
- **🔧 Self-Optimization Agent** - Automatically tunes parameters for optimal performance
- **📊 Agent Dashboard** - Real-time monitoring of all agent activities and performance
- **🔄 Multi-Agent Communication** - Inter-agent messaging and consensus decision-making
- **🎯 Autonomous Trading** - Bot makes intelligent decisions without human intervention

## 🚀 Quick Start

### Prerequisites

- Node.js v18 or higher
- MongoDB (optional, for logging)
- Binance account with API keys
- Telegram bot token (optional, for alerts)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd Crypto
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
nano .env  # Edit with your API keys and settings
```

4. **Get Binance Testnet API Keys**
   - Visit [Binance Testnet](https://testnet.binance.vision/)
   - Generate API key and secret
   - Add to `.env` file

5. **Create Telegram Bot (Optional)**
   - Message [@BotFather](https://t.me/BotFather) on Telegram
   - Create new bot with `/newbot`
   - Copy bot token to `.env`
   - **To get your Chat ID:**
     - Set `TELEGRAM_ENABLED=true` and add your bot token to `.env`
     - Run the bot: `npm start`
     - Send `/start` to your bot on Telegram
     - Your Chat ID will be displayed in the console
     - Copy the Chat ID to `.env` and restart the bot

## 📖 Usage

### Basic Commands

```bash
# Run bot with cron scheduling (RECOMMENDED - default)
npm start

# Run in cron mode explicitly
npm run cron

# Run single scan test
npm test

# Run continuous scanner (old mode)
npm run scan

# Test WebSocket feeds
npm run websocket

# Test opportunity selector
npm run test-selector

# Test cron scheduler
npm run test-cron

# Test auto-trader
npm run trade

# Test agentic AI system
npm run test-agents

# Start agent monitoring dashboard
npm run dashboard

# Start in WebSocket mode
node index.js --websocket

# Start in hybrid mode
node index.js --hybrid

# Custom scan interval (120 seconds)
node index.js --scan --interval=120000
```

### Running Modes

#### 1. **Cron Mode** (⭐ RECOMMENDED - Default)
Intelligent scheduled scans with advanced opportunity selection:
```bash
npm start
# or
node index.js --cron
```

**Schedule:**
- Quick scans every 2 minutes
- Deep analysis every 15 minutes
- Daily reports at midnight UTC
- Health checks every hour
- Weekly cleanup on Sundays

#### 2. **Scan Mode**
Periodic full scans at configurable intervals:
```bash
node index.js --scan --interval=60000
```

#### 3. **WebSocket Mode**
Real-time monitoring using live WebSocket feeds:
```bash
node index.js --websocket
```

#### 4. **Hybrid Mode**
WebSocket monitoring + periodic full scans:
```bash
node index.js --hybrid --interval=300000
```

## ⚙️ Configuration

Edit `.env` file:

```env
# Binance API Configuration
BINANCE_API_KEY=your_testnet_api_key
BINANCE_API_SECRET=your_testnet_api_secret
USE_TESTNET=true

# Trading Settings
MIN_PROFIT_THRESHOLD=0.3        # Minimum profit % to trigger alert/trade
TRADE_AMOUNT_USDT=1000          # Amount to trade per opportunity
AUTO_TRADE_ENABLED=false        # Enable automatic trade execution

# MongoDB (Optional)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=arbitrage_bot

# Telegram (Optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_ENABLED=false

# WebSocket Settings
WEBSOCKET_ENABLED=true
UPDATE_INTERVAL_MS=1000
```

### Configuring Trading Pairs

Edit `config/config.js` to add/remove triangular cycles:

```javascript
triangles: [
  { 
    path: ['USDT', 'BTC', 'ETH', 'USDT'], 
    pairs: ['BTCUSDT', 'ETHBTC', 'ETHUSDT'] 
  },
  // Add more triangles here
]
```

## 📊 Example Output

### Scan Results
```
================================================================================
📊 TRIANGULAR ARBITRAGE SCAN RESULTS
================================================================================

💰 Total Profitable: 3/8
⚙️  Profit Threshold: 0.3%
💵 Trade Amount: 1000 USDT

--------------------------------------------------------------------------------
🏆 TOP OPPORTUNITIES:
--------------------------------------------------------------------------------

✅ #1 USDT → BTC → ETH → USDT
   Pairs: BTCUSDT → ETHBTC → ETHUSDT
   Start: 1000.00 | End: 1004.52
   Profit: 4.52 (0.4520%)

✅ #2 USDT → BTC → BNB → USDT
   Pairs: BTCUSDT → BNBBTC → BNBUSDT
   Start: 1000.00 | End: 1003.21
   Profit: 3.21 (0.3210%)
```

### Trade Execution
```
================================================================================
🤖 EXECUTING TRIANGULAR ARBITRAGE TRADE
================================================================================
Triangle: USDT → BTC → ETH → USDT
Expected Profit: 4.5200 (0.4520%)
--------------------------------------------------------------------------------

🔄 Step 1/3: BUY BTC/USDT
✅ Order executed: 0.02145000 BTC @ 46600.50

🔄 Step 2/3: BUY ETH/BTC
✅ Order executed: 0.56234000 ETH @ 0.03816

🔄 Step 3/3: SELL ETH/USDT
✅ Order executed: 1004.52 USDT @ 1786.32

================================================================================
✅ TRADE EXECUTION COMPLETED
================================================================================
💰 Final USDT balance: 1004.52
📊 Actual Profit: 4.52 (0.4520%)
⏱️  Execution Time: 2341ms
================================================================================
```

## 🏗️ Project Structure

```
binance-arbitrage-bot/
├── config/
│   └── config.js                 # Configuration management
├── src/
│   ├── agents/                   # 🆕 Agentic AI System
│   │   ├── agentOrchestrator.js      # Central agent coordinator
│   │   ├── learningAgent.js          # Performance learning & adaptation
│   │   ├── goalOrientedAgent.js      # Goal setting & tracking
│   │   ├── memoryAgent.js            # Long-term pattern memory
│   │   ├── selfOptimizationAgent.js  # Parameter optimization
│   │   ├── marketingAgent.js         # Community engagement & updates
│   │   └── agentDashboard.js         # Real-time monitoring dashboard
│   ├── core/
│   │   └── triangularArbitrage.js    # Core arbitrage logic
│   ├── websocket/
│   │   └── websocketFeeds.js         # Real-time WebSocket feeds
│   ├── scanner/
│   │   └── multiTriangleScanner.js   # Multi-pair opportunity scanner
│   ├── trading/
│   │   └── autoTrader.js             # Automated trade execution
│   ├── logger/
│   │   └── mongoLogger.js            # MongoDB integration
│   ├── alerts/
│   │   └── telegramBot.js            # Telegram notifications
│   └── strategies/
│       └── opportunitySelector.js    # Advanced opportunity selection
├── index.js                      # Main bot orchestrator
├── test_agents.js                # 🆕 Agent system test suite
├── package.json                  # Dependencies
├── .env.example                  # Environment template
└── README.md                     # This file
```

## 🔬 Testing

### Test Individual Components

```bash
# Test triangular arbitrage engine
node src/core/triangularArbitrage.js

# Test multi-triangle scanner
node src/scanner/multiTriangleScanner.js

# Test WebSocket feeds
node src/websocket/websocketFeeds.js

# Test auto-trader connection
node src/trading/autoTrader.js

# Test MongoDB logger
node src/logger/mongoLogger.js

# Test Telegram alerts
node src/alerts/telegramBot.js

# 🆕 Test Agentic AI System
npm run test-agents

# 🆕 Test Marketing Agent
npm run test-marketing

# 🆕 Start Agent Monitoring Dashboard
npm run dashboard
```

### Continuous Scanner Test
```bash
# Run continuous scanner with custom interval
node src/scanner/multiTriangleScanner.js --continuous --interval=30000
```

## 💡 Strategy Explanation

### Triangular Arbitrage

The bot exploits price discrepancies across three trading pairs to generate risk-free profit:

**Example: USDT → BTC → ETH → USDT**

1. **Step 1**: Buy BTC with USDT (using BTCUSDT pair)
2. **Step 2**: Buy ETH with BTC (using ETHBTC pair)
3. **Step 3**: Sell ETH for USDT (using ETHUSDT pair)

If the final USDT amount > initial USDT (after fees), there's a profit opportunity!

### Profit Calculation

```
Net Profit = (Final Amount - Initial Amount) - Trading Fees
Profit % = (Net Profit / Initial Amount) × 100

Minimum Profitable = Profit % > Fee % (typically > 0.3%)
```

### Order Book Simulation

The bot walks through real order book levels to:
- Calculate realistic execution prices (not just mid-market)
- Account for slippage on larger orders
- Ensure sufficient liquidity exists

## ⚠️ Important Notes

### Risk Disclaimer

- **Use testnet first!** Always test thoroughly before using real funds
- Cryptocurrency trading carries significant risk
- Past performance does not guarantee future results
- This bot is for educational purposes
- Always start with small amounts

### Best Practices

1. **Always use testnet initially**
2. **Monitor bot closely** when first deployed
3. **Start with conservative profit thresholds** (0.5%+)
4. **Use reasonable trade amounts** (don't over-leverage)
5. **Keep API keys secure** (never commit .env)
6. **Monitor API rate limits**
7. **Regular database cleanup** to manage storage

### Common Issues

**No opportunities found?**
- Lower the `MIN_PROFIT_THRESHOLD` (but be aware of fees)
- Market conditions may not favor arbitrage
- Try different trading pairs in config

**WebSocket disconnections?**
- Normal - auto-reconnection is built-in
- Check your internet connection
- Binance may have rate limits

**Trade execution failures?**
- Ensure sufficient balance in testnet/account
- Check API key permissions (trading enabled)
- Opportunity may have disappeared (price moved)

## 📈 Performance Tips

### Optimization Strategies

1. **Use WebSocket mode** for fastest detection
2. **Run on VPS** for low latency to Binance servers
3. **Optimize scan intervals** based on market volatility
4. **Filter low-liquidity pairs** to reduce false positives
5. **Set realistic profit thresholds** (account for slippage)

### Scaling Up

- Deploy multiple bots for different triangle sets
- Use dedicated server in same region as Binance
- Implement advanced order types (limit orders)
- Add cross-exchange arbitrage
- Integrate machine learning for opportunity prediction

## 🛠️ Development

### Adding New Features

1. **New Trading Pairs**: Edit `config/config.js`
2. **Custom Strategies**: Extend `src/core/triangularArbitrage.js`
3. **Additional Alerts**: Modify `src/alerts/telegramBot.js`
4. **Analytics**: Enhance `src/logger/mongoLogger.js`

### Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test thoroughly
4. Submit a pull request

## 📚 Resources

- [Binance API Documentation](https://binance-docs.github.io/apidocs/spot/en/)
- [CCXT Documentation](https://docs.ccxt.com/)
- [Triangular Arbitrage Explained](https://www.investopedia.com/terms/t/triangulararbitrage.asp)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 📄 License

MIT License - feel free to use for personal or commercial projects

## 🙏 Acknowledgments

- Binance for providing testnet and comprehensive APIs
- CCXT team for universal exchange library
- Node.js community for excellent packages

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review Binance API status

---

**⚡ Happy Arbitraging! May your trades be profitable and your latency be low! ⚡**

---

## 🎯 Quick Reference

### Essential Commands
```bash
npm install              # Install dependencies
npm start               # Run bot in scan mode
npm test                # Run single scan
node index.js --websocket    # WebSocket mode
node index.js --hybrid       # Hybrid mode
```

### Safety Checklist
- [ ] Using testnet API keys
- [ ] `.env` file properly configured
- [ ] Profit threshold > 0.3%
- [ ] Trade amount is reasonable
- [ ] Auto-trading disabled for initial tests
- [ ] MongoDB connected (optional)
- [ ] Telegram alerts working (optional)
- [ ] Tested all individual modules

### Go Live Checklist
- [ ] Thoroughly tested on testnet
- [ ] Understand all risks
- [ ] Production API keys configured
- [ ] `USE_TESTNET=false` in `.env`
- [ ] Conservative profit thresholds set
- [ ] Start with small trade amounts
- [ ] Monitor closely for first 24 hours
- [ ] Have stop-loss strategy
- [ ] Regular balance checks enabled

---

**Built with ❤️ for the crypto community**
# CryptoArbiitrageBot
