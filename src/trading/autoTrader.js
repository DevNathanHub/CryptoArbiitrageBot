// Auto-Trading Engine
// Executes triangular arbitrage trades automatically on Binance (testnet or production)

import ccxt from 'ccxt';
import { config } from '../../config/config.js';

/**
 * Auto-Trader Class
 * Manages automated trade execution for arbitrage opportunities
 */
export class AutoTrader {
  constructor() {
    this.exchange = null;
    this.isInitialized = false;
    this.tradeHistory = [];
    this.activePositions = new Map();
  }

  /**
   * Initialize the CCXT exchange connection
   */
  async initialize() {
    try {
      const exchangeConfig = {
        apiKey: config.binance.apiKey,
        secret: config.binance.apiSecret,
        enableRateLimit: true,
        options: {
          defaultType: 'spot',
          adjustForTimeDifference: true
        }
      };

      // Set testnet URLs if configured
      if (config.binance.useTestnet) {
        exchangeConfig.urls = {
          api: {
            public: 'https://testnet.binance.vision/api',
            private: 'https://testnet.binance.vision/api'
          }
        };
        console.log('⚠️  Using TESTNET for trading');
      } else {
        console.log('🚨 Using PRODUCTION for trading - BE CAREFUL!');
      }

      this.exchange = new ccxt.binance(exchangeConfig);
      
      // Test connection
      await this.exchange.loadMarkets();
      const balance = await this.exchange.fetchBalance();
      
      console.log('✅ Auto-trader initialized successfully');
      console.log(`💰 Account balances:`, {
        USDT: balance.free.USDT || 0,
        BTC: balance.free.BTC || 0,
        ETH: balance.free.ETH || 0,
        BNB: balance.free.BNB || 0
      });

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize auto-trader:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Check if auto-trading is enabled and initialized
   */
  canTrade() {
    if (!config.trading.autoTradeEnabled) {
      console.log('⚠️  Auto-trading is disabled in config');
      return false;
    }

    if (!this.isInitialized) {
      console.log('⚠️  Auto-trader not initialized');
      return false;
    }

    if (!config.binance.apiKey || !config.binance.apiSecret) {
      console.log('⚠️  API keys not configured');
      return false;
    }

    return true;
  }

  /**
   * Execute a market order
   * @param {string} symbol - Trading pair (e.g., 'BTC/USDT')
   * @param {string} side - 'buy' or 'sell'
   * @param {number} amount - Amount to trade
   * @returns {Promise<Object>} Order result
   */
  async executeMarketOrder(symbol, side, amount) {
    try {
      console.log(`🔄 Executing ${side.toUpperCase()} order: ${amount} ${symbol}`);
      
      const order = await this.exchange.createMarketOrder(symbol, side, amount);
      
      console.log(`✅ Order executed:`, {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        amount: order.amount,
        filled: order.filled,
        cost: order.cost,
        price: order.average
      });

      return order;

    } catch (error) {
      console.error(`❌ Order execution failed:`, error.message);
      throw error;
    }
  }

  /**
   * Execute a complete triangular arbitrage trade cycle
   * @param {Object} opportunity - Arbitrage opportunity from scanner
   * @returns {Promise<Object>} Trade execution result
   */
  async executeTriangularArbitrage(opportunity) {
    if (!this.canTrade()) {
      console.log('⚠️  Cannot execute trade - trading disabled or not initialized');
      return null;
    }

    // Safety check - only trade if profitable
    if (!opportunity.isProfitable) {
      console.log('⚠️  Opportunity not profitable, skipping trade');
      return null;
    }

    console.log('\n' + '='.repeat(80));
    console.log('🤖 EXECUTING TRIANGULAR ARBITRAGE TRADE');
    console.log('='.repeat(80));
    console.log(`Triangle: ${opportunity.triangle}`);
    console.log(`Expected Profit: ${opportunity.profit.toFixed(4)} (${opportunity.profitPct.toFixed(4)}%)`);
    console.log('-'.repeat(80));

    const tradeResult = {
      opportunity,
      steps: [],
      startTime: new Date(),
      endTime: null,
      success: false,
      actualProfit: 0,
      error: null
    };

    try {
      // Get initial balance
      const initialBalance = await this.getBalance(opportunity.steps[0].from);
      console.log(`💰 Initial ${opportunity.steps[0].from} balance: ${initialBalance}`);

      // Execute each step of the triangle
      for (let i = 0; i < opportunity.steps.length; i++) {
        const step = opportunity.steps[i];
        
        // Convert pair format (BTCUSDT -> BTC/USDT for CCXT)
        const ccxtSymbol = this.formatSymbolForCCXT(step.pair);
        
        // Determine if we're buying or selling
        const side = step.action.toLowerCase();
        
        // Calculate amount to trade
        let amount;
        if (i === 0) {
          // First trade - use configured amount or balance
          amount = Math.min(
            config.trading.tradeAmountUSDT,
            initialBalance * 0.95 // Use 95% of balance for safety
          );
        } else {
          // Subsequent trades - use output from previous trade
          const prevOutput = tradeResult.steps[i - 1].actualOutput;
          amount = prevOutput * 0.99; // 99% for slippage/fee buffer
        }

        console.log(`\n🔄 Step ${i + 1}/${opportunity.steps.length}: ${step.action} ${ccxtSymbol}`);
        
        // Execute the order
        const order = await this.executeMarketOrder(ccxtSymbol, side, amount);

        // Record step result
        const stepResult = {
          step: i + 1,
          symbol: ccxtSymbol,
          side,
          expectedInput: step.input,
          actualInput: order.amount,
          expectedOutput: step.output,
          actualOutput: order.filled,
          expectedPrice: step.price,
          actualPrice: order.average,
          fee: order.fee,
          orderId: order.id,
          timestamp: order.timestamp
        };

        tradeResult.steps.push(stepResult);

        // Small delay between trades to avoid rate limits
        if (i < opportunity.steps.length - 1) {
          await this.sleep(100);
        }
      }

      // Get final balance
      const finalBalance = await this.getBalance(opportunity.steps[0].from);
      tradeResult.actualProfit = finalBalance - initialBalance;
      tradeResult.actualProfitPct = (tradeResult.actualProfit / initialBalance) * 100;
      tradeResult.success = true;
      tradeResult.endTime = new Date();

      console.log('\n' + '='.repeat(80));
      console.log('✅ TRADE EXECUTION COMPLETED');
      console.log('='.repeat(80));
      console.log(`💰 Final ${opportunity.steps[0].from} balance: ${finalBalance}`);
      console.log(`📊 Actual Profit: ${tradeResult.actualProfit.toFixed(4)} (${tradeResult.actualProfitPct.toFixed(4)}%)`);
      console.log(`⏱️  Execution Time: ${tradeResult.endTime - tradeResult.startTime}ms`);
      console.log('='.repeat(80) + '\n');

      this.tradeHistory.push(tradeResult);
      return tradeResult;

    } catch (error) {
      tradeResult.error = error.message;
      tradeResult.endTime = new Date();
      
      console.error('\n❌ TRADE EXECUTION FAILED');
      console.error('Error:', error.message);
      console.error('Completed steps:', tradeResult.steps.length);
      
      this.tradeHistory.push(tradeResult);
      return tradeResult;
    }
  }

  /**
   * Format symbol from Binance format (BTCUSDT) to CCXT format (BTC/USDT)
   */
  formatSymbolForCCXT(binanceSymbol) {
    // Common quote currencies
    const quotes = ['USDT', 'BUSD', 'BTC', 'ETH', 'BNB'];
    
    for (const quote of quotes) {
      if (binanceSymbol.endsWith(quote)) {
        const base = binanceSymbol.slice(0, -quote.length);
        return `${base}/${quote}`;
      }
    }
    
    return binanceSymbol; // Return as-is if format unknown
  }

  /**
   * Get balance for a specific currency
   */
  async getBalance(currency) {
    try {
      const balance = await this.exchange.fetchBalance();
      return balance.free[currency] || 0;
    } catch (error) {
      console.error(`❌ Error fetching ${currency} balance:`, error.message);
      return 0;
    }
  }

  /**
   * Get all balances
   */
  async getAllBalances() {
    try {
      const balance = await this.exchange.fetchBalance();
      return balance.free;
    } catch (error) {
      console.error('❌ Error fetching balances:', error.message);
      return {};
    }
  }

  /**
   * Get trade history
   */
  getTradeHistory() {
    return this.tradeHistory;
  }

  /**
   * Get successful trades
   */
  getSuccessfulTrades() {
    return this.tradeHistory.filter(t => t.success);
  }

  /**
   * Get total profit from all trades
   */
  getTotalProfit() {
    return this.tradeHistory
      .filter(t => t.success)
      .reduce((sum, t) => sum + t.actualProfit, 0);
  }

  /**
   * Print trade statistics
   */
  printStatistics() {
    const total = this.tradeHistory.length;
    const successful = this.getSuccessfulTrades().length;
    const failed = total - successful;
    const totalProfit = this.getTotalProfit();
    const avgProfit = successful > 0 ? totalProfit / successful : 0;

    console.log('\n' + '='.repeat(80));
    console.log('📊 AUTO-TRADER STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total Trades: ${total}`);
    console.log(`Successful: ${successful} (${((successful/total)*100).toFixed(1)}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Profit: ${totalProfit.toFixed(4)}`);
    console.log(`Average Profit: ${avgProfit.toFixed(4)}`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Helper function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection and permissions
   */
  async testConnection() {
    try {
      console.log('🧪 Testing exchange connection...');
      
      const balance = await this.exchange.fetchBalance();
      console.log('✅ Balance fetch successful');
      
      const ticker = await this.exchange.fetchTicker('BTC/USDT');
      console.log('✅ Ticker fetch successful:', ticker.last);
      
      console.log('✅ Connection test passed!');
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
  }
}

// Create singleton instance
export const autoTrader = new AutoTrader();

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Testing Auto-Trader...\n');
  
  const trader = new AutoTrader();
  const initialized = await trader.initialize();
  
  if (initialized) {
    await trader.testConnection();
    const balances = await trader.getAllBalances();
    console.log('\n💰 Current Balances:', balances);
  }
}
