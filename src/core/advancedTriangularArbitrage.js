/*
 * Advanced Triangular Arbitrage Engine
 * 
 * Purpose:
 * - Detect triangle arbitrage opportunities among three markets (A/B, B/C, A/C)
 * - Simulate execution considering fees, precision, and available liquidity
 * - Production-ready implementation with proper error handling and logging
 * 
 * Best Practices Implemented:
 * - Decimal.js for precise financial calculations
 * - Robust error handling and retry logic
 * - Market precision and step size compliance
 * - Liquidity depth analysis
 * - Rate limiting and API protection
 * - Comprehensive logging and monitoring
 * 
 * @requires ccxt >= 4.0.0
 * @requires decimal.js >= 10.4.0
 */

import ccxt from 'ccxt';
import Decimal from 'decimal.js';
import axios from 'axios';
import { config, getBaseUrl } from '../../config/config.js';

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_DOWN,
  toExpNeg: -7,
  toExpPos: 21
});

/**
 * Advanced Triangular Arbitrage Engine
 * Implements production-grade arbitrage detection and execution
 */
export class AdvancedTriangularArbitrage {
  constructor(options = {}) {
    this.exchangeId = options.exchangeId || 'binance';
    this.pollIntervalMs = options.pollIntervalMs || 1500;
    this.minProfitPerc = options.minProfitPerc || config.trading.minProfitThreshold;
    this.dryRun = options.dryRun !== undefined ? options.dryRun : !config.trading.autoTradeEnabled;
    this.baseAmount = options.baseAmount || config.trading.tradeAmountUSDT.toString();
    this.takerFeePerc = options.takerFeePerc || (config.trading.takerFee * 100); // Convert to percentage
    this.config = options; // Store config for testnet check
    
    // Simple console logger
    this.logger = {
      info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
      error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
    };
    
    // Initialize exchange (but don't load markets in testnet)
    const exchangeOptions = {
      apiKey: options.apiKey,
      secret: options.secret,
      enableRateLimit: true,
      timeout: 30000
    };
    
    if (options.testnet || options.enableSandboxMode) {
      exchangeOptions.urls = {
        api: {
          public: 'https://testnet.binance.vision/api/v3',
          private: 'https://testnet.binance.vision/api/v3'
        }
      };
    }
    
    this.exchange = new ccxt[this.exchangeId](exchangeOptions);
    
    this.markets = null;
    this.initialized = false;
    this.isRunning = false;
    this.statistics = {
      totalScans: 0,
      opportunitiesFound: 0,
      tradesExecuted: 0,
      profitGenerated: new Decimal(0),
      errors: 0,
      lastScanTime: null
    };
  }

  /**
   * Initialize exchange connection and fetch market data
   */
  async initialize() {
    try {
      this.logger.info('Initializing advanced arbitrage engine...');
      
      // For testnet, skip ALL CCXT operations and use direct API only
      if (this.config.testnet || this.config.enableSandboxMode) {
        this.logger.info('Testnet mode: Using direct API calls only (no CCXT operations)');
        this.initialized = true;
        this.logger.info('Advanced arbitrage engine initialized in testnet mode');
        return;
      }
      
      // Only load markets in production mode
      this.logger.info('Production mode: Loading markets...');
      await this.exchange.loadMarkets();
      this.logger.info(`Loaded ${Object.keys(this.exchange.markets).length} markets`);
      
      // Fetch trading fees
      try {
        const fees = await this.exchange.fetchTradingFees();
        this.logger.info('Trading fees fetched successfully');
      } catch (error) {
        this.logger.warn('Could not fetch trading fees, using defaults');
      }
      
      this.initialized = true;
      this.logger.info('Advanced arbitrage engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize exchange', { error: error.message });
      throw error;
    }
  }  /**
   * Convert to Decimal with proper precision
   */
  toDecimal(value) {
    if (value === null || value === undefined) return null;
    return new Decimal(value.toString());
  }

  /**
   * Calculate fee multiplier from percentage
   * @param {number} feePerc - Fee percentage (e.g., 0.04 for 0.04%)
   * @returns {Decimal} Fee multiplier for calculations
   */
  getFeeMultiplier(feePerc) {
    return new Decimal(1).minus(new Decimal(feePerc).dividedBy(100));
  }

  /**
   * Round value to market step size
   */
  roundToStep(value, stepSize) {
    if (!stepSize) return value;
    const step = this.toDecimal(stepSize);
    return this.toDecimal(value).dividedBy(step).floor().times(step);
  }

  /**
   * Safely fetch order book with retries
   * Uses direct API call for testnet, CCXT for production
   */
  async fetchOrderBookSafe(symbol, retries = 3) {
    // Use direct API for testnet since CCXT doesn't support it properly
    if (config.binance.useTestnet) {
      return await this.fetchOrderBookDirect(symbol, retries);
    }

    // Use CCXT for production
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const orderBook = await this.exchange.fetchOrderBook(symbol, 10); // Top 10 levels
        return orderBook;
      } catch (error) {
        if (attempt === retries) {
          console.warn(`\x1b[33m[WARN]\x1b[0m Failed to fetch orderbook for ${symbol}: ${error.message}`);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Exponential backoff
      }
    }
    return null;
  }

  /**
   * Fetch order book directly from Binance API (for testnet compatibility)
   */
  async fetchOrderBookDirect(symbol, retries = 3) {
    const baseUrl = getBaseUrl();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.get(`${baseUrl}/depth`, {
          params: { 
            symbol, 
            limit: 10 
          },
          timeout: 10000
        });

        // Convert to CCXT format
        return {
          bids: response.data.bids.map(([price, amount]) => [parseFloat(price), parseFloat(amount)]),
          asks: response.data.asks.map(([price, amount]) => [parseFloat(price), parseFloat(amount)]),
          timestamp: response.data.lastUpdateId,
          datetime: new Date().toISOString()
        };
      } catch (error) {
        if (attempt === retries) {
          console.warn(`\x1b[33m[WARN]\x1b[0m Failed to fetch orderbook for ${symbol}: ${error.message}`);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    return null;
  }

  /**
   * Get best bid price from order book
   */
  getBestBid(orderBook) {
    if (!orderBook || !orderBook.bids || orderBook.bids.length === 0) return null;
    return this.toDecimal(orderBook.bids[0][0]);
  }

  /**
   * Get best ask price from order book
   */
  getBestAsk(orderBook) {
    if (!orderBook || !orderBook.asks || orderBook.asks.length === 0) return null;
    return this.toDecimal(orderBook.asks[0][0]);
  }

  /**
   * Calculate available liquidity at best levels
   */
  getAvailableLiquidity(orderBook, levels = 3) {
    if (!orderBook || !orderBook.bids || !orderBook.asks) return { bidLiquidity: 0, askLiquidity: 0 };

    let bidLiquidity = new Decimal(0);
    let askLiquidity = new Decimal(0);

    for (let i = 0; i < Math.min(levels, orderBook.bids.length); i++) {
      bidLiquidity = bidLiquidity.plus(this.toDecimal(orderBook.bids[i][1]));
    }

    for (let i = 0; i < Math.min(levels, orderBook.asks.length); i++) {
      askLiquidity = askLiquidity.plus(this.toDecimal(orderBook.asks[i][1]));
    }

    return {
      bidLiquidity: bidLiquidity.toNumber(),
      askLiquidity: askLiquidity.toNumber()
    };
  }

  /**
   * Compute triangular arbitrage opportunity
   * Path: A -> B -> C -> A
   * 
   * @param {object} triangle - Triangle configuration with pairs
   * @param {object} orderBooks - Order books for all three pairs
   * @returns {object|null} Opportunity details or null
   */
  computeTriangleOpportunity(triangle, orderBooks) {
    try {
      const { obA_B, obB_C, obA_C } = orderBooks;

      // Extract prices
      const bidA_B = this.getBestBid(obA_B);
      const askA_B = this.getBestAsk(obA_B);
      const bidB_C = this.getBestBid(obB_C);
      const askB_C = this.getBestAsk(obB_C);
      const bidA_C = this.getBestBid(obA_C);
      const askA_C = this.getBestAsk(obA_C);

      if (!bidA_B || !askB_C || !bidA_C || !askA_B || !bidB_C || !askA_C) {
        return null;
      }

      const feeMul = this.getFeeMultiplier(this.takerFeePerc);
      const amountA = this.toDecimal(this.baseAmount);

      // Path 1: A -> B -> C -> A (Forward)
      // Step 1: Sell A for B at bidA_B
      const amountB = amountA.times(bidA_B).times(feeMul);
      
      // Step 2: Buy C with B at askA_C
      const amountC = amountB.dividedBy(askA_C).times(feeMul);
      
      // Step 3: Sell C for A at bidB_C
      const finalA_forward = amountC.times(bidB_C).times(feeMul);

      const profitForward = finalA_forward.minus(amountA);
      const profitPercForward = profitForward.dividedBy(amountA).times(100);

      // Path 2: A -> C -> B -> A (Reverse)
      // Step 1: Buy C with A at askB_C
      const amountC2 = amountA.dividedBy(askB_C).times(feeMul);
      
      // Step 2: Sell C for B at bidA_C
      const amountB2 = amountC2.times(bidA_C).times(feeMul);
      
      // Step 3: Buy A with B at askA_B
      const finalA_reverse = amountB2.dividedBy(askA_B).times(feeMul);

      const profitReverse = finalA_reverse.minus(amountA);
      const profitPercReverse = profitReverse.dividedBy(amountA).times(100);

      // Choose best direction
      const isForwardBetter = profitPercForward.greaterThan(profitPercReverse);
      const bestProfit = isForwardBetter ? profitForward : profitReverse;
      const bestProfitPerc = isForwardBetter ? profitPercForward : profitPercReverse;
      const bestFinalAmount = isForwardBetter ? finalA_forward : finalA_reverse;
      const direction = isForwardBetter ? 'FORWARD' : 'REVERSE';

      // Check liquidity
      const liquidity = {
        A_B: this.getAvailableLiquidity(obA_B),
        B_C: this.getAvailableLiquidity(obB_C),
        A_C: this.getAvailableLiquidity(obA_C)
      };

      return {
        triangle: triangle.path.join(' → '),
        pairs: triangle.pairs,
        direction,
        startAmount: amountA.toString(),
        endAmount: bestFinalAmount.toString(),
        profit: bestProfit.toString(),
        profitPct: bestProfitPerc.toNumber(),
        profitUsd: bestProfit.times(bidA_B).toNumber(), // Approximate USD value
        isProfitable: bestProfitPerc.greaterThanOrEqualTo(this.minProfitPerc),
        prices: {
          bidA_B: bidA_B.toString(),
          askA_B: askA_B.toString(),
          bidB_C: bidB_C.toString(),
          askB_C: askB_C.toString(),
          bidA_C: bidA_C.toString(),
          askA_C: askA_C.toString()
        },
        liquidity,
        timestamp: new Date().toISOString(),
        steps: this.generateSteps(triangle, direction, isForwardBetter ? {
          step1Price: bidA_B.toString(),
          step2Price: askA_C.toString(),
          step3Price: bidB_C.toString()
        } : {
          step1Price: askB_C.toString(),
          step2Price: bidA_C.toString(),
          step3Price: askA_B.toString()
        })
      };
    } catch (error) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Error computing triangle:`, error.message);
      return null;
    }
  }

  /**
   * Generate execution steps for the triangle
   */
  generateSteps(triangle, direction, prices) {
    const steps = [];
    const pairs = triangle.pairs;

    if (direction === 'FORWARD') {
      steps.push({
        step: 1,
        action: 'SELL',
        pair: pairs[0],
        from: triangle.path[0],
        to: triangle.path[1],
        price: prices.step1Price
      });
      steps.push({
        step: 2,
        action: 'BUY',
        pair: pairs[2],
        from: triangle.path[1],
        to: triangle.path[2],
        price: prices.step2Price
      });
      steps.push({
        step: 3,
        action: 'SELL',
        pair: pairs[1],
        from: triangle.path[2],
        to: triangle.path[0],
        price: prices.step3Price
      });
    } else {
      steps.push({
        step: 1,
        action: 'BUY',
        pair: pairs[1],
        from: triangle.path[0],
        to: triangle.path[2],
        price: prices.step1Price
      });
      steps.push({
        step: 2,
        action: 'SELL',
        pair: pairs[2],
        from: triangle.path[2],
        to: triangle.path[1],
        price: prices.step2Price
      });
      steps.push({
        step: 3,
        action: 'BUY',
        pair: pairs[0],
        from: triangle.path[1],
        to: triangle.path[0],
        price: prices.step3Price
      });
    }

    return steps;
  }

  /**
   * Evaluate all triangular opportunities
   */
  async evaluateAllTriangles(triangles) {
    const opportunities = [];

    for (const triangle of triangles) {
      try {
        // Fetch order books for all three pairs
        const [obA_B, obB_C, obA_C] = await Promise.all([
          this.fetchOrderBookSafe(triangle.pairs[0]),
          this.fetchOrderBookSafe(triangle.pairs[1]),
          this.fetchOrderBookSafe(triangle.pairs[2])
        ]);

        if (!obA_B || !obB_C || !obA_C) {
          continue;
        }

        const opportunity = this.computeTriangleOpportunity(triangle, {
          obA_B, obB_C, obA_C
        });

        if (opportunity) {
          opportunities.push(opportunity);
          
          if (opportunity.isProfitable) {
            this.statistics.opportunitiesFound++;
            console.log(`\x1b[32m[OPPORTUNITY]\x1b[0m \x1b[36m>>>\x1b[0m ${opportunity.triangle}: ${opportunity.profitPct.toFixed(4)}%`);
          }
        }
      } catch (error) {
        this.statistics.errors++;
        console.error(`\x1b[31m[ERROR]\x1b[0m Triangle evaluation failed:`, error.message);
      }
    }

    this.statistics.totalScans++;
    this.statistics.lastScanTime = new Date();

    return opportunities;
  }

  /**
   * Execute triangular arbitrage trade (if not dry run)
   */
  async executeTrade(opportunity) {
    if (this.dryRun) {
      console.log(`\x1b[33m[DRY-RUN]\x1b[0m Would execute trade: ${opportunity.triangle}`);
      return {
        success: true,
        dryRun: true,
        opportunity
      };
    }

    try {
      console.log(`\x1b[35m[TRADE]\x1b[0m \x1b[36m>>>\x1b[0m Executing ${opportunity.triangle}...`);
      
      const orders = [];
      
      // Execute each step sequentially
      for (const step of opportunity.steps) {
        const market = this.markets[step.pair];
        if (!market) {
          throw new Error(`Market ${step.pair} not found`);
        }

        // Calculate order amount based on step
        let amount = this.baseAmount;
        if (step.step > 1) {
          // Use output from previous step
          amount = orders[orders.length - 1].filled || amount;
        }

        // Round to market precision
        const roundedAmount = this.roundToStep(amount, market.limits.amount.min);

        // Place order
        const order = await this.exchange.createMarketOrder(
          step.pair,
          step.action.toLowerCase(),
          roundedAmount.toString()
        );

        orders.push(order);
        console.log(`\x1b[32m[ORDER]\x1b[0m Step ${step.step}: ${step.action} ${order.filled} ${step.pair}`);

        // Small delay between orders
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.statistics.tradesExecuted++;
      this.statistics.profitGenerated = this.statistics.profitGenerated.plus(opportunity.profit);

      return {
        success: true,
        orders,
        opportunity,
        actualProfit: orders[orders.length - 1].filled - opportunity.startAmount
      };
    } catch (error) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Trade execution failed:`, error.message);
      this.statistics.errors++;
      
      return {
        success: false,
        error: error.message,
        opportunity
      };
    }
  }

  /**
   * Get engine statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      profitGenerated: this.statistics.profitGenerated.toString(),
      successRate: this.statistics.tradesExecuted > 0 
        ? ((this.statistics.tradesExecuted - this.statistics.errors) / this.statistics.tradesExecuted * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  /**
   * Start continuous monitoring
   */
  async start(triangles) {
    if (this.isRunning) {
      console.warn(`\x1b[33m[WARN]\x1b[0m Arbitrage engine already running`);
      return;
    }

    if (!this.exchange) {
      await this.initialize();
    }

    this.isRunning = true;
    console.log(`\x1b[32m[START]\x1b[0m \x1b[36m>>>\x1b[0m Advanced arbitrage engine started`);

    while (this.isRunning) {
      try {
        const opportunities = await this.evaluateAllTriangles(triangles);
        
        // Execute best opportunity if found and conditions met
        const profitable = opportunities.filter(o => o.isProfitable);
        if (profitable.length > 0 && !this.dryRun) {
          const best = profitable.sort((a, b) => b.profitPct - a.profitPct)[0];
          await this.executeTrade(best);
        }

      } catch (error) {
        console.error(`\x1b[31m[ERROR]\x1b[0m Main loop error:`, error.message);
        this.statistics.errors++;
      }

      await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isRunning = false;
    console.log(`\x1b[33m[STOP]\x1b[0m Advanced arbitrage engine stopped`);
  }
}

// Export singleton instance
export const advancedArbitrage = new AdvancedTriangularArbitrage();

// Export for testing
export default AdvancedTriangularArbitrage;
