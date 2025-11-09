// WebSocket Real-time Price Feeds
// Connects to Binance WebSocket streams for live order book updates

import WebSocket from 'ws';
import { config, getWebSocketUrl } from '../../config/config.js';

/**
 * Order Book Manager - Maintains local order book from WebSocket updates
 */
export class OrderBookManager {
  constructor() {
    this.orderBooks = new Map();
    this.lastUpdateId = new Map();
  }

  /**
   * Update local order book with diff update
   */
  updateOrderBook(symbol, data) {
    if (!this.orderBooks.has(symbol)) {
      this.orderBooks.set(symbol, {
        bids: new Map(),
        asks: new Map(),
        lastUpdate: data.u
      });
    }

    const book = this.orderBooks.get(symbol);

    // Update bids
    for (const [price, quantity] of data.b) {
      const priceFloat = parseFloat(price);
      const qtyFloat = parseFloat(quantity);
      
      if (qtyFloat === 0) {
        book.bids.delete(priceFloat);
      } else {
        book.bids.set(priceFloat, qtyFloat);
      }
    }

    // Update asks
    for (const [price, quantity] of data.a) {
      const priceFloat = parseFloat(price);
      const qtyFloat = parseFloat(quantity);
      
      if (qtyFloat === 0) {
        book.asks.delete(priceFloat);
      } else {
        book.asks.set(priceFloat, qtyFloat);
      }
    }

    book.lastUpdate = data.u;
  }

  /**
   * Get formatted order book (top N levels)
   */
  getOrderBook(symbol, depth = 50) {
    if (!this.orderBooks.has(symbol)) {
      return null;
    }

    const book = this.orderBooks.get(symbol);
    
    // Convert Maps to arrays and sort
    const bids = Array.from(book.bids.entries())
      .sort((a, b) => b[0] - a[0]) // Highest to lowest
      .slice(0, depth)
      .map(([price, qty]) => [price.toString(), qty.toString()]);

    const asks = Array.from(book.asks.entries())
      .sort((a, b) => a[0] - b[0]) // Lowest to highest
      .slice(0, depth)
      .map(([price, qty]) => [price.toString(), qty.toString()]);

    return {
      bids,
      asks,
      lastUpdateId: book.lastUpdate
    };
  }

  /**
   * Get best bid and ask prices
   */
  getBestPrices(symbol) {
    const book = this.orderBooks.get(symbol);
    if (!book) return null;

    const bestBid = book.bids.size > 0 
      ? Math.max(...book.bids.keys())
      : null;
    
    const bestAsk = book.asks.size > 0
      ? Math.min(...book.asks.keys())
      : null;

    const spread = bestBid && bestAsk ? bestAsk - bestBid : null;
    const spreadPct = spread && bestBid ? (spread / bestBid) * 100 : null;

    return {
      symbol,
      bestBid,
      bestAsk,
      spread,
      spreadPct,
      timestamp: new Date()
    };
  }
}

/**
 * WebSocket Feed Manager
 */
export class WebSocketFeedManager {
  constructor(symbols = []) {
    this.symbols = symbols;
    this.ws = null;
    this.orderBookManager = new OrderBookManager();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.websocket.maxReconnectAttempts;
    this.reconnectDelay = config.websocket.reconnectDelay;
    this.callbacks = {
      onUpdate: [],
      onError: [],
      onConnect: []
    };
  }

  /**
   * Register callback for order book updates
   */
  onUpdate(callback) {
    this.callbacks.onUpdate.push(callback);
  }

  /**
   * Register callback for errors
   */
  onError(callback) {
    this.callbacks.onError.push(callback);
  }

  /**
   * Register callback for connection events
   */
  onConnect(callback) {
    this.callbacks.onConnect.push(callback);
  }

  /**
   * Connect to WebSocket streams
   */
  connect() {
    if (!config.websocket.enabled) {
      console.log('⚠️  WebSocket disabled in config');
      return;
    }

    // Build stream URL for multiple symbols
    const streams = this.symbols.map(s => `${s.toLowerCase()}@depth@100ms`).join('/');
    const wsUrl = `${getWebSocketUrl()}/${streams}`;

    console.log(`🔌 Connecting to WebSocket: ${this.symbols.length} pairs`);

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('✅ WebSocket connected successfully');
      this.reconnectAttempts = 0;
      this.callbacks.onConnect.forEach(cb => cb());
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        // Handle stream data
        if (message.stream) {
          const symbol = message.stream.split('@')[0].toUpperCase();
          this.orderBookManager.updateOrderBook(symbol, message.data);
          
          // Trigger callbacks
          this.callbacks.onUpdate.forEach(cb => cb(symbol, message.data));
        }
        // Handle single stream data
        else if (message.e === 'depthUpdate') {
          const symbol = message.s;
          this.orderBookManager.updateOrderBook(symbol, message);
          
          this.callbacks.onUpdate.forEach(cb => cb(symbol, message));
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error.message);
      }
    });

    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      this.callbacks.onError.forEach(cb => cb(error));
    });

    this.ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      this.attemptReconnect();
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Add new symbols to watch
   */
  addSymbols(newSymbols) {
    const uniqueSymbols = [...new Set([...this.symbols, ...newSymbols])];
    
    if (uniqueSymbols.length > this.symbols.length) {
      this.symbols = uniqueSymbols;
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Need to reconnect with new symbol list
        console.log('🔄 Adding new symbols, reconnecting...');
        this.disconnect();
        this.connect();
      }
    }
  }

  /**
   * Get current order book for a symbol
   */
  getOrderBook(symbol, depth = 50) {
    return this.orderBookManager.getOrderBook(symbol, depth);
  }

  /**
   * Get best prices for a symbol
   */
  getBestPrices(symbol) {
    return this.orderBookManager.getBestPrices(symbol);
  }

  /**
   * Get best prices for all tracked symbols
   */
  getAllBestPrices() {
    return this.symbols.map(symbol => this.getBestPrices(symbol)).filter(p => p !== null);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      console.log('🔌 Disconnecting WebSocket...');
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Create a WebSocket feed for all configured triangular pairs
 */
export function createTriangularFeed() {
  const allPairs = new Set();
  
  config.pairs.triangles.forEach(triangle => {
    triangle.pairs.forEach(pair => allPairs.add(pair));
  });

  const feed = new WebSocketFeedManager(Array.from(allPairs));
  
  // Log updates periodically
  let updateCount = 0;
  feed.onUpdate((symbol, data) => {
    updateCount++;
    if (updateCount % 100 === 0) {
      const prices = feed.getBestPrices(symbol);
      if (prices) {
        console.log(`📊 ${symbol}: Bid ${prices.bestBid?.toFixed(8)} | Ask ${prices.bestAsk?.toFixed(8)} | Spread ${prices.spreadPct?.toFixed(4)}%`);
      }
    }
  });

  feed.onError((error) => {
    console.error('🚨 WebSocket Feed Error:', error.message);
  });

  feed.onConnect(() => {
    console.log(`🎯 Monitoring ${allPairs.size} trading pairs for arbitrage`);
  });

  return feed;
}

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting WebSocket Price Feed Test...\n');
  
  const feed = createTriangularFeed();
  feed.connect();

  // Keep alive and show stats every 10 seconds
  setInterval(() => {
    const allPrices = feed.getAllBestPrices();
    console.log(`\n📈 Live Prices (${allPrices.length} pairs):`);
    allPrices.slice(0, 5).forEach(p => {
      console.log(`  ${p.symbol}: ${p.bestBid?.toFixed(8)} / ${p.bestAsk?.toFixed(8)} (${p.spreadPct?.toFixed(4)}%)`);
    });
  }, 10000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    feed.disconnect();
    process.exit(0);
  });
}
