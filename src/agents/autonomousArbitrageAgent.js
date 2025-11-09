// Autonomous Triangular Arbitrage Agent
// High-precision, fully autonomous trading agent for Binance spot markets

import axios from 'axios';
import { simulateTriangularCycle, getOrderBook, applyFee } from '../core/triangularArbitrage.js';
import { AutoTrader } from '../trading/autoTrader.js';
import { config, getBaseUrl } from '../../config/config.js';

const BASE_URL = getBaseUrl();

export class AutonomousArbitrageAgent {
  constructor() {
    this.isRunning = false;
    this.symbolCache = new Map();
    this.balanceCache = new Map();
    this.orderBookCache = new Map();
    this.slippageModel = new Map(); // Adaptive slippage tracking
    this.latencyHistory = [];
    this.activeTrades = new Map();
    this.autoTrader = new AutoTrader();
    this.lastMarketFetch = 0;
    this.consecutiveFailures = 0;

    // Agent state
    this.state = {
      lastScanTime: 0,
      totalScans: 0,
      profitableOpportunities: 0,
      executedTrades: 0,
      totalProfit: 0,
      averageLatency: 0,
      currentTradeSize: config.trading.tradeAmountUSDT
    };

    // Safety limits
    this.maxConcurrentTrades = 1; // Per quote currency
    this.maxSlippageTolerance = 0.005; // 0.5%
    this.minProfitThreshold = 1.00; // 1.00%
    this.maxLatencyMs = 1500; // 1.5s
    this.maxConsecutiveFailures = 3;
  }

  /**
   * Initialize the autonomous agent
   */
  async initialize() {
    try {
      console.log('🤖 Initializing Autonomous Arbitrage Agent...');

      // Initialize auto-trader
      const traderInit = await this.autoTrader.initialize();
      if (!traderInit) {
        throw new Error('Failed to initialize auto-trader');
      }

      // Initial market data fetch
      await this.observeMarketData();

      console.log('✅ Autonomous agent initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize autonomous agent:', error.message);
      return false;
    }
  }

  /**
   * Start autonomous operation
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Agent already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting autonomous arbitrage operation...');

    while (this.isRunning) {
      try {
        const cycleStart = Date.now();

        // Execute full reasoning cycle
        await this.executeReasoningCycle();

        const cycleTime = Date.now() - cycleStart;
        this.latencyHistory.push(cycleTime);

        // Keep only last 100 latency measurements
        if (this.latencyHistory.length > 100) {
          this.latencyHistory.shift();
        }

        // Update average latency
        this.state.averageLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;

        // Adaptive delay based on market conditions
        const delay = Math.max(1000, Math.min(5000, cycleTime * 2));
        await this.sleep(delay);

      } catch (error) {
        console.error('❌ Error in reasoning cycle:', error.message);
        this.consecutiveFailures++;

        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          console.error('🚨 Too many consecutive failures, stopping agent');
          this.stop();
          break;
        }

        await this.sleep(5000); // Longer delay on error
      }
    }
  }

  /**
   * Stop autonomous operation
   */
  stop() {
    console.log('🛑 Stopping autonomous arbitrage agent...');
    this.isRunning = false;

    // Cancel any pending orders
    this.cancelAllPendingOrders();

    // Print final statistics
    this.printFinalStatistics();
  }

  /**
   * Execute complete reasoning cycle: OBSERVE → INFER → COMPUTE → RISK → DECIDE → EXECUTE → LEARN
   */
  async executeReasoningCycle() {
    // OBSERVE: Fetch market data
    const marketData = await this.observeMarketData();
    if (!marketData) return;

    // Generate candidate triangles
    const candidates = this.generateCandidates();

    // Filter candidates by basic criteria
    const filteredCandidates = this.filterCandidates(candidates);

    if (filteredCandidates.length === 0) {
      console.log('ℹ️  No viable candidates after filtering');
      return;
    }

    // Process each candidate
    for (const triangle of filteredCandidates) {
      try {
        // INFER: Analyze liquidity
        const liquidityAnalysis = await this.inferLiquidity(triangle, this.state.currentTradeSize);
        if (!liquidityAnalysis.canExecute) continue;

        // COMPUTE: Simulate path with fees and slippage
        const simulation = await this.computePath(triangle, this.state.currentTradeSize, liquidityAnalysis.estimatedSlippage);
        if (!simulation) continue;

        // RISK: Assess risk factors
        const riskAssessment = await this.assessRisk(triangle, simulation, liquidityAnalysis);
        if (riskAssessment.safetyScore < 7) continue;

        // DECIDE: Make execution decision
        const decision = this.makeDecision(simulation, riskAssessment);
        if (!decision.shouldExecute) continue;

        // EXECUTE: Execute the trade
        const executionResult = await this.executeTrade(decision.executionPlan);

        // LEARN: Update models from results
        this.learnFromExecution(executionResult, simulation, liquidityAnalysis);

      } catch (error) {
        console.error(`❌ Error processing triangle ${triangle.path.join('→')}:`, error.message);
      }
    }

    this.state.totalScans++;
  }

  /**
   * OBSERVE: Fetch market data with caching
   */
  async observeMarketData() {
    const now = Date.now();
    if (now - this.lastMarketFetch < 1000) { // Cache for 1 second
      return this.getCachedMarketData();
    }

    try {
      const startTime = Date.now();

      // Fetch bookTicker for all symbols
      const response = await axios.get(`${BASE_URL}/ticker/bookTicker`, {
        timeout: 2000
      });

      const fetchTime = Date.now() - startTime;
      if (fetchTime > this.maxLatencyMs) {
        console.warn(`⚠️  Market fetch latency too high: ${fetchTime}ms`);
        return null;
      }

      // Cache symbol mappings and balances
      this.symbolCache.clear();
      response.data.forEach(ticker => {
        this.symbolCache.set(ticker.symbol, {
          bid: parseFloat(ticker.bidPrice),
          ask: parseFloat(ticker.askPrice),
          bidQty: parseFloat(ticker.bidQty),
          askQty: parseFloat(ticker.askQty),
          timestamp: now
        });
      });

      // Update balance cache
      await this.updateBalanceCache();

      this.lastMarketFetch = now;
      this.consecutiveFailures = 0;

      return {
        symbols: this.symbolCache,
        balances: this.balanceCache,
        timestamp: now,
        fetchLatency: fetchTime
      };

    } catch (error) {
      console.error('❌ Failed to observe market data:', error.message);
      return null;
    }
  }

  /**
   * Get cached market data
   */
  getCachedMarketData() {
    return {
      symbols: this.symbolCache,
      balances: this.balanceCache,
      timestamp: this.lastMarketFetch,
      cached: true
    };
  }

  /**
   * Update balance cache
   */
  async updateBalanceCache() {
    try {
      const balances = await this.autoTrader.getAllBalances();
      this.balanceCache.clear();
      Object.entries(balances).forEach(([currency, amount]) => {
        if (amount > 0) {
          this.balanceCache.set(currency, amount);
        }
      });
    } catch (error) {
      console.warn('⚠️  Failed to update balance cache:', error.message);
    }
  }

  /**
   * Generate candidate triangles from available symbols
   */
  generateCandidates() {
    const candidates = [];
    const symbols = Array.from(this.symbolCache.keys());

    // Generate triangles from configured pairs (for now)
    // In production, this would dynamically generate from all available symbols
    config.pairs.triangles.forEach(triangle => {
      const allSymbolsExist = triangle.pairs.every(pair => symbols.includes(pair));
      if (allSymbolsExist) {
        candidates.push(triangle);
      }
    });

    return candidates;
  }

  /**
   * Filter candidates by basic criteria
   */
  filterCandidates(candidates) {
    return candidates.filter(triangle => {
      // Check if all pairs have sufficient spread and volume
      return triangle.pairs.every(pair => {
        const ticker = this.symbolCache.get(pair);
        if (!ticker) return false;

        const spread = (ticker.ask - ticker.bid) / ticker.bid;
        const minSpread = 0.0001; // 0.01% minimum spread
        const minQty = 1; // Minimum quantity

        return spread > minSpread && ticker.bidQty > minQty && ticker.askQty > minQty;
      });
    });
  }

  /**
   * INFER: Analyze liquidity for a triangle
   */
  async inferLiquidity(triangle, tradeSize) {
    try {
      // Fetch order books for depth analysis
      const [bookA, bookB, bookC] = await Promise.all([
        getOrderBook(triangle.pairs[0]),
        getOrderBook(triangle.pairs[1]),
        getOrderBook(triangle.pairs[2])
      ]);

      // Calculate slippage for each leg
      const slippageA = this.calculateSlippage(bookA, triangle.pairs[0], tradeSize, 'buy');
      const slippageB = this.calculateSlippage(bookB, triangle.pairs[1], tradeSize, 'sell'); // Assume direction
      const slippageC = this.calculateSlippage(bookC, triangle.pairs[2], tradeSize, 'buy');

      const totalSlippage = slippageA + slippageB + slippageC;
      const canExecute = totalSlippage < this.maxSlippageTolerance;

      return {
        canExecute,
        estimatedSlippage: totalSlippage,
        depthAnalysis: { slippageA, slippageB, slippageC },
        orderBooks: { bookA, bookB, bookC }
      };

    } catch (error) {
      console.error('❌ Liquidity inference failed:', error.message);
      return { canExecute: false, estimatedSlippage: 1, depthAnalysis: {}, orderBooks: {} };
    }
  }

  /**
   * Calculate slippage for a trade
   */
  calculateSlippage(orderBook, symbol, tradeSize, side) {
    const levels = side === 'buy' ? orderBook.asks : orderBook.bids;
    let remainingSize = tradeSize;
    let totalCost = 0;
    let weightedPrice = 0;

    for (const [priceStr, qtyStr] of levels) {
      if (remainingSize <= 0) break;

      const price = parseFloat(priceStr);
      const qty = parseFloat(qtyStr);
      const fillQty = Math.min(remainingSize, qty);

      totalCost += fillQty * price;
      weightedPrice += fillQty;
      remainingSize -= fillQty;
    }

    if (weightedPrice === 0) return 1; // 100% slippage if no liquidity

    const avgPrice = totalCost / weightedPrice;
    const midPrice = (parseFloat(orderBook.asks[0][0]) + parseFloat(orderBook.bids[0][0])) / 2;
    const slippage = Math.abs(avgPrice - midPrice) / midPrice;

    return slippage;
  }

  /**
   * COMPUTE: Simulate triangular path with fees and slippage
   */
  async computePath(triangle, startAmount, estimatedSlippage) {
    try {
      const simulation = await simulateTriangularCycle(triangle, startAmount);

      if (!simulation) return null;

      // Add slippage buffer to simulation
      const slippageBuffer = estimatedSlippage * startAmount;
      const netProfit = simulation.profit - slippageBuffer;
      const netProfitPct = (netProfit / startAmount) * 100;

      return {
        ...simulation,
        estimatedSlippage,
        slippageBuffer,
        netProfit,
        netProfitPct,
        isViable: netProfitPct >= this.minProfitThreshold
      };

    } catch (error) {
      console.error('❌ Path computation failed:', error.message);
      return null;
    }
  }

  /**
   * RISK: Assess risk factors
   */
  async assessRisk(triangle, simulation, liquidityAnalysis) {
    const risks = [];

    // Balance risk
    const startCurrency = triangle.path[0];
    const availableBalance = this.balanceCache.get(startCurrency) || 0;
    const requiredAmount = simulation.startAmount * 1.01; // 1% buffer

    if (availableBalance < requiredAmount) {
      risks.push('Insufficient balance');
    }

    // Latency risk
    if (this.state.averageLatency > this.maxLatencyMs) {
      risks.push('High latency detected');
    }

    // Slippage risk
    if (liquidityAnalysis.estimatedSlippage > this.maxSlippageTolerance) {
      risks.push('Excessive slippage risk');
    }

    // Concurrent trades risk
    const activeForQuote = Array.from(this.activeTrades.values())
      .filter(trade => trade.quoteCurrency === startCurrency).length;

    if (activeForQuote >= this.maxConcurrentTrades) {
      risks.push('Too many concurrent trades for quote currency');
    }

    // API failure risk
    if (this.consecutiveFailures > 0) {
      risks.push('Recent API failures');
    }

    // Calculate safety score (1-10)
    const baseScore = 10;
    const riskPenalty = risks.length * 1.5;
    const safetyScore = Math.max(1, baseScore - riskPenalty);

    return {
      safetyScore,
      risks,
      topFailureModes: risks.slice(0, 3),
      mitigationSteps: this.generateMitigationSteps(risks)
    };
  }

  /**
   * Generate mitigation steps for risks
   */
  generateMitigationSteps(risks) {
    const mitigations = [];

    risks.forEach(risk => {
      switch (risk) {
        case 'Insufficient balance':
          mitigations.push('Reduce trade size or wait for balance update');
          break;
        case 'High latency detected':
          mitigations.push('Skip cycle or reduce trade frequency');
          break;
        case 'Excessive slippage risk':
          mitigations.push('Use limit orders or reduce trade size');
          break;
        case 'Too many concurrent trades':
          mitigations.push('Wait for active trades to complete');
          break;
        case 'Recent API failures':
          mitigations.push('Increase retry delays or stop trading');
          break;
        default:
          mitigations.push('Monitor closely and consider manual intervention');
      }
    });

    return mitigations;
  }

  /**
   * DECIDE: Make execution decision
   */
  makeDecision(simulation, riskAssessment) {
    const shouldExecute = simulation.isViable &&
                         riskAssessment.safetyScore >= 7 &&
                         this.consecutiveFailures === 0;

    if (!shouldExecute) {
      const reasons = [];
      if (!simulation.isViable) reasons.push(`Net profit ${simulation.netProfitPct.toFixed(2)}% below ${this.minProfitThreshold}% threshold`);
      if (riskAssessment.safetyScore < 7) reasons.push(`Safety score ${riskAssessment.safetyScore.toFixed(1)} too low`);
      if (this.consecutiveFailures > 0) reasons.push(`${this.consecutiveFailures} consecutive failures`);

      return {
        shouldExecute: false,
        reason: reasons.join('; '),
        suggestedAdjustments: this.generateAdjustments(simulation, riskAssessment)
      };
    }

    // Generate execution plan
    const executionPlan = {
      triangle: simulation.triangle,
      tradeSize: simulation.startAmount,
      orderTypes: ['market', 'market', 'market'], // Prefer speed
      priceLimits: [], // Market orders
      acceptableSlippage: Math.min(this.maxSlippageTolerance, simulation.estimatedSlippage * 1.5),
      steps: simulation.steps.map(step => ({
        pair: step.pair,
        action: step.action,
        expectedAmount: step.output
      }))
    };

    return {
      shouldExecute: true,
      executionPlan,
      confidence: riskAssessment.safetyScore / 10
    };
  }

  /**
   * Generate parameter adjustments when decision is negative
   */
  generateAdjustments(simulation, riskAssessment) {
    const adjustments = [];

    if (simulation.netProfitPct < this.minProfitThreshold) {
      adjustments.push(`Increase min profit threshold to ${simulation.netProfitPct.toFixed(2)}%`);
    }

    if (riskAssessment.safetyScore < 7) {
      adjustments.push('Review risk parameters or increase safety thresholds');
    }

    if (simulation.estimatedSlippage > this.maxSlippageTolerance) {
      adjustments.push(`Reduce trade size from ${simulation.startAmount} to ${simulation.startAmount * 0.8}`);
    }

    return adjustments;
  }

  /**
   * EXECUTE: Execute the trade with monitoring
   */
  async executeTrade(executionPlan) {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Reserve funds
    const startCurrency = executionPlan.triangle.split(' → ')[0];
    this.reserveFunds(startCurrency, executionPlan.tradeSize);

    // Track active trade
    this.activeTrades.set(tradeId, {
      id: tradeId,
      triangle: executionPlan.triangle,
      quoteCurrency: startCurrency,
      startTime,
      status: 'executing',
      steps: []
    });

    try {
      console.log(`\n🤖 EXECUTING TRADE ${tradeId}`);
      console.log(`Triangle: ${executionPlan.triangle}`);
      console.log(`Size: ${executionPlan.tradeSize} ${startCurrency}`);

      // Execute each step
      let currentAmount = executionPlan.tradeSize;

      for (let i = 0; i < executionPlan.steps.length; i++) {
        const step = executionPlan.steps[i];
        const symbol = this.autoTrader.formatSymbolForCCXT(step.pair);
        const side = step.action.toLowerCase();

        // Calculate amount with buffer
        const amount = i === 0 ? currentAmount : currentAmount * 0.99;

        console.log(`Step ${i + 1}: ${side.toUpperCase()} ${amount} ${symbol}`);

        const order = await this.autoTrader.executeMarketOrder(symbol, side, amount);

        // Record step
        const stepResult = {
          step: i + 1,
          symbol,
          side,
          amount: order.amount,
          filled: order.filled,
          cost: order.cost,
          price: order.average,
          fee: order.fee,
          orderId: order.id
        };

        this.activeTrades.get(tradeId).steps.push(stepResult);

        // Check for partial fills that create exposure
        if (order.filled < order.amount * 0.95) { // Less than 95% fill
          console.warn(`⚠️  Partial fill detected: ${order.filled}/${order.amount}`);
          // Could implement unwind logic here
        }

        currentAmount = order.filled;

        // Small delay between orders
        if (i < executionPlan.steps.length - 1) {
          await this.sleep(200);
        }
      }

      // Mark as completed
      const trade = this.activeTrades.get(tradeId);
      trade.status = 'completed';
      trade.endTime = Date.now();
      trade.duration = trade.endTime - trade.startTime;

      console.log(`✅ Trade ${tradeId} completed in ${trade.duration}ms`);

      this.state.executedTrades++;
      this.activeTrades.delete(tradeId);

      // Release fund reservation
      this.releaseFunds(startCurrency, executionPlan.tradeSize);

      return {
        success: true,
        tradeId,
        duration: trade.duration,
        steps: trade.steps,
        finalAmount: currentAmount
      };

    } catch (error) {
      console.error(`❌ Trade ${tradeId} failed:`, error.message);

      // Mark as failed
      const trade = this.activeTrades.get(tradeId);
      trade.status = 'failed';
      trade.error = error.message;
      trade.endTime = Date.now();
      trade.duration = trade.endTime - trade.startTime;

      // Implement unwind logic for failed trades
      await this.unwindFailedTrade(trade);

      this.activeTrades.delete(tradeId);

      // Release fund reservation
      this.releaseFunds(startCurrency, executionPlan.tradeSize);

      return {
        success: false,
        tradeId,
        error: error.message,
        duration: trade.duration,
        steps: trade.steps || []
      };
    }
  }

  /**
   * Reserve funds for trade execution
   */
  reserveFunds(currency, amount) {
    const current = this.balanceCache.get(currency) || 0;
    this.balanceCache.set(currency, current - amount);
  }

  /**
   * Release fund reservation
   */
  releaseFunds(currency, amount) {
    const current = this.balanceCache.get(currency) || 0;
    this.balanceCache.set(currency, current + amount);
  }

  /**
   * Unwind failed trade positions
   */
  async unwindFailedTrade(trade) {
    console.log(`🔄 Unwinding failed trade ${trade.id}`);

    // Implementation would reverse any completed steps
    // For now, just log the need
    console.warn('⚠️  Unwind logic not fully implemented - manual intervention may be required');
  }

  /**
   * Cancel all pending orders
   */
  cancelAllPendingOrders() {
    console.log('🔄 Cancelling all pending orders...');
    // Implementation would cancel any open orders
  }

  /**
   * LEARN: Update models from execution results
   */
  learnFromExecution(executionResult, simulation, liquidityAnalysis) {
    // Update slippage model
    const triangleKey = simulation.triangle;
    const realizedSlippage = executionResult.success ?
      (simulation.profit - (executionResult.finalAmount - simulation.startAmount)) / simulation.startAmount :
      liquidityAnalysis.estimatedSlippage;

    const currentModel = this.slippageModel.get(triangleKey) || { samples: [], average: 0 };
    currentModel.samples.push(realizedSlippage);

    // Keep only last 10 samples
    if (currentModel.samples.length > 10) {
      currentModel.samples.shift();
    }

    currentModel.average = currentModel.samples.reduce((a, b) => a + b, 0) / currentModel.samples.length;
    this.slippageModel.set(triangleKey, currentModel);

    // Update trade size based on success/failure
    if (executionResult.success) {
      // Gradually increase on success
      this.state.currentTradeSize = Math.min(
        this.state.currentTradeSize * 1.05,
        config.trading.tradeAmountUSDT * 2
      );
    } else {
      // Reduce on failure
      this.state.currentTradeSize = Math.max(
        this.state.currentTradeSize * 0.9,
        config.trading.tradeAmountUSDT * 0.1
      );
    }

    // Update profit tracking
    if (executionResult.success) {
      const actualProfit = executionResult.finalAmount - simulation.startAmount;
      this.state.totalProfit += actualProfit;
    }

    console.log(`📚 Learned: Updated slippage model for ${triangleKey}, new avg: ${(currentModel.average * 100).toFixed(3)}%`);
  }

  /**
   * Print final statistics
   */
  printFinalStatistics() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUTONOMOUS AGENT FINAL STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total Scans: ${this.state.totalScans}`);
    console.log(`Executed Trades: ${this.state.executedTrades}`);
    console.log(`Total Profit: ${this.state.totalProfit.toFixed(4)} USDT`);
    console.log(`Average Latency: ${this.state.averageLatency.toFixed(0)}ms`);
    console.log(`Current Trade Size: ${this.state.currentTradeSize.toFixed(2)} USDT`);
    console.log(`Success Rate: ${this.state.totalScans > 0 ? ((this.state.executedTrades / this.state.totalScans) * 100).toFixed(1) : 0}%`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Helper function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
export const autonomousAgent = new AutonomousArbitrageAgent();

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Testing Autonomous Arbitrage Agent...\n');

  const agent = new AutonomousArbitrageAgent();
  const initialized = await agent.initialize();

  if (initialized) {
    console.log('✅ Agent initialized, starting test cycle...');

    // Run one reasoning cycle for testing
    await agent.executeReasoningCycle();

    console.log('✅ Test cycle completed');
  } else {
    console.error('❌ Agent initialization failed');
  }
}