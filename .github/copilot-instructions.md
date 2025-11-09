# Binance Crypto Arbitrage Bot - Copilot Instructions

This is a comprehensive Node.js cryptocurrency arbitrage trading bot for Binance with real-time WebSocket feeds, auto-trading capabilities, and intelligent profit detection.

## Project Type
Node.js / JavaScript crypto trading bot

## Key Technologies
- Node.js (ES Modules)
- Binance API (REST & WebSocket)
- CCXT (Universal crypto exchange library)
- MongoDB (Trade logging)
- Telegram Bot API (Alerts)

## Project Structure
- `/src/core/` - Core arbitrage engine
- `/src/trading/` - Auto-trading execution
- `/src/websocket/` - Real-time price feeds
- `/src/scanner/` - Multi-pair opportunity scanner
- `/src/logger/` - MongoDB integration
- `/src/alerts/` - Telegram notifications
- `/config/` - Configuration files

## Development Guidelines
- Use ES6+ async/await for all async operations
- All API calls should have error handling
- Use environment variables for sensitive data
- Log all trading decisions and opportunities
- Implement rate limiting to respect Binance API limits
- Use testnet for development and testing

## Key Features to Maintain
1. Triangular arbitrage calculation with fee simulation
2. Real-time WebSocket order book updates
3. Multi-pair scanning across BTC/ETH/BNB/USDT
4. Profit threshold detection (>0.3%)
5. Auto-trading on Binance testnet
6. MongoDB logging for analysis
7. Telegram alerts for opportunities
