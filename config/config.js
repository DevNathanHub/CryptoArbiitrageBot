import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Binance API Configuration
  binance: {
    apiKey: process.env.BINANCE_API_KEY || '',
    apiSecret: process.env.BINANCE_API_SECRET || '',
    useTestnet: process.env.USE_TESTNET === 'true',
    testnetBaseUrl: 'https://testnet.binance.vision/api/v3',
    productionBaseUrl: 'https://api.binance.com/api/v3',
    websocketTestnet: 'wss://testnet.binance.vision/ws',
    websocketProduction: 'wss://stream.binance.com:9443/ws'
  },

  // Trading Configuration
  trading: {
    minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD) || 0.3, // 0.3%
    tradeAmountUSDT: parseFloat(process.env.TRADE_AMOUNT_USDT) || 1000,
    autoTradeEnabled: process.env.AUTO_TRADE_ENABLED === 'true',
    takerFee: 0.001, // 0.1% Binance taker fee
    slippageTolerance: 0.002, // 0.2% slippage tolerance
    useAdvancedEngine: process.env.USE_ADVANCED_ENGINE !== 'false', // Use advanced precision engine by default
    riskAppetite: parseFloat(process.env.RISK_APPETITE) || 0.3 // Risk appetite for position sizing (0-1)
  },

  // Trading Pairs Configuration
  pairs: {
    bases: ['BTC', 'ETH', 'BNB'],
    quotes: ['USDT', 'BUSD'],
    // Predefined triangular cycles
    triangles: [
      { path: ['USDT', 'BTC', 'ETH', 'USDT'], pairs: ['BTCUSDT', 'ETHBTC', 'ETHUSDT'] },
      { path: ['USDT', 'BTC', 'BNB', 'USDT'], pairs: ['BTCUSDT', 'BNBBTC', 'BNBUSDT'] },
      { path: ['USDT', 'ETH', 'BNB', 'USDT'], pairs: ['ETHUSDT', 'BNBETH', 'BNBUSDT'] },
      { path: ['USDT', 'BTC', 'ADA', 'USDT'], pairs: ['BTCUSDT', 'ADABTC', 'ADAUSDT'] },
      { path: ['USDT', 'ETH', 'ADA', 'USDT'], pairs: ['ETHUSDT', 'ADAETH', 'ADAUSDT'] },
      { path: ['USDT', 'BTC', 'XRP', 'USDT'], pairs: ['BTCUSDT', 'XRPBTC', 'XRPUSDT'] },
      { path: ['USDT', 'ETH', 'XRP', 'USDT'], pairs: ['ETHUSDT', 'XRPETH', 'XRPUSDT'] },
      { path: ['USDT', 'BNB', 'ADA', 'USDT'], pairs: ['BNBUSDT', 'ADABNB', 'ADAUSDT'] }
    ]
  },

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'arbitrage_bot',
    collections: {
      opportunities: 'opportunities',
      trades: 'trades',
      performance: 'performance'
    }
  },

  // Telegram configuration
  telegram: {
    enabled: process.env.TELEGRAM_ENABLED === 'true',
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    channelId: process.env.TELEGRAM_CHANNEL_ID, // For channel updates
  },

  // Gemini AI Configuration
  gemini: {
    enabled: !!process.env.GEMINI_API_KEY,
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-2.0-flash-exp',
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3
  },

  // WebSocket Configuration
  websocket: {
    enabled: process.env.WEBSOCKET_ENABLED !== 'false',
    updateIntervalMs: parseInt(process.env.UPDATE_INTERVAL_MS) || 1000,
    reconnectDelay: 5000,
    maxReconnectAttempts: 10
  },

  // News feed configuration
  news: {
    enabled: process.env.NEWS_ENABLED !== 'false',
    provider: process.env.NEWS_PROVIDER || 'coingecko', // coingecko | cryptopanic
    apiKey: process.env.NEWS_API_KEY || '',
    pollIntervalMinutes: parseInt(process.env.NEWS_POLL_MINUTES) || 5,
    maxItems: parseInt(process.env.NEWS_MAX_ITEMS) || 5
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logToFile: process.env.LOG_TO_FILE === 'true',
    logFilePath: './logs/bot.log'
  }
};

// Helper to get the appropriate base URL
export function getBaseUrl() {
  return config.binance.useTestnet 
    ? config.binance.testnetBaseUrl 
    : config.binance.productionBaseUrl;
}

// Helper to get the appropriate WebSocket URL
export function getWebSocketUrl() {
  return config.binance.useTestnet
    ? config.binance.websocketTestnet
    : config.binance.websocketProduction;
}

export default config;
