// Memory Agent
// Maintains long-term memory of market patterns, successful strategies, and historical insights

import { EventEmitter } from 'events';
import { config } from '../../config/config.js';

/**
 * Memory Agent
 * Manages long-term memory for pattern recognition and historical insights
 */
export class MemoryAgent extends EventEmitter {
  constructor() {
    super();
    this.isActive = false;
    this.memory = {
      marketPatterns: new Map(),
      successfulTrades: [],
      failedTrades: [],
      strategyPerformance: new Map(),
      marketConditions: new Map(),
      temporalPatterns: new Map(),
      correlationPatterns: new Map()
    };

    this.memoryConfig = {
      maxSuccessfulTrades: 1000,
      maxFailedTrades: 500,
      patternRetentionDays: 30,
      correlationThreshold: 0.7,
      confidenceThreshold: 75
    };

    // Memory indices for fast lookup
    this.indices = {
      byTriangle: new Map(),
      byTime: new Map(),
      byProfit: new Map(),
      byMarketCondition: new Map()
    };
  }

  /**
   * Initialize the memory agent
   */
  async initialize() {
    console.log('🧠 Initializing Memory Agent...');

    // Initialize memory structures
    this.initializeMemoryStructures();

    this.isActive = true;
    console.log('✅ Memory Agent initialized');
  }

  /**
   * Initialize memory structures
   */
  initializeMemoryStructures() {
    // Initialize temporal patterns (hourly, daily, weekly)
    const timeFrames = ['hourly', 'daily', 'weekly', 'monthly'];
    timeFrames.forEach(frame => {
      this.memory.temporalPatterns.set(frame, {
        patterns: new Map(),
        statistics: new Map(),
        predictions: new Map()
      });
    });

    // Initialize market condition patterns
    const conditions = ['bullish', 'bearish', 'sideways', 'volatile', 'calm'];
    conditions.forEach(condition => {
      this.memory.marketConditions.set(condition, {
        trades: [],
        successRate: 0,
        avgProfit: 0,
        frequency: 0
      });
    });
  }

  /**
   * Receive message from orchestrator
   */
  receiveMessage(message) {
    switch (message.action) {
      case 'store_trade':
        this.storeTrade(message.data);
        break;
      case 'store_pattern':
        this.storePattern(message.data);
        break;
      case 'retrieve_patterns':
        this.retrievePatterns(message.data);
        break;
      case 'analyze_correlations':
        this.analyzeCorrelations(message.data);
        break;
      case 'predict_outcome':
        this.predictFromMemory(message.data);
        break;
      case 'goals_updated':
        this.adjustMemoryForGoals(message.data);
        break;
      case 'consensus_request':
        this.respondToConsensus(message.data);
        break;
      default:
        console.log(`🧠 Memory Agent: Unknown action ${message.action}`);
    }
  }

  /**
   * Store trade in memory
   */
  storeTrade(tradeData) {
    const trade = {
      ...tradeData,
      storedAt: new Date(),
      memoryId: this.generateMemoryId()
    };

    // Categorize trade
    if (trade.success) {
      this.memory.successfulTrades.push(trade);
      if (this.memory.successfulTrades.length > this.memoryConfig.maxSuccessfulTrades) {
        this.memory.successfulTrades.shift(); // Remove oldest
      }
    } else {
      this.memory.failedTrades.push(trade);
      if (this.memory.failedTrades.length > this.memoryConfig.maxFailedTrades) {
        this.memory.failedTrades.shift();
      }
    }

    // Update indices
    this.updateIndices(trade);

    // Extract and store patterns
    this.extractPatternsFromTrade(trade);

    // Update strategy performance
    this.updateStrategyPerformance(trade);

    // Clean old memories
    this.cleanOldMemories();

    this.emit('trade_stored', { trade });
  }

  /**
   * Generate unique memory ID
   */
  generateMemoryId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update memory indices for fast lookup
   */
  updateIndices(trade) {
    const { triangle, timestamp, profitPct } = trade;

    // Index by triangle
    if (!this.indices.byTriangle.has(triangle)) {
      this.indices.byTriangle.set(triangle, []);
    }
    this.indices.byTriangle.get(triangle).push(trade);

    // Index by time (hourly)
    const hour = new Date(timestamp).getHours();
    if (!this.indices.byTime.has(hour)) {
      this.indices.byTime.set(hour, []);
    }
    this.indices.byTime.get(hour).push(trade);

    // Index by profit range
    const profitRange = this.categorizeProfit(profitPct);
    if (!this.indices.byProfit.has(profitRange)) {
      this.indices.byProfit.set(profitRange, []);
    }
    this.indices.byProfit.get(profitRange).push(trade);
  }

  /**
   * Categorize profit into ranges
   */
  categorizeProfit(profitPct) {
    if (profitPct >= 1.0) return 'excellent';
    if (profitPct >= 0.5) return 'good';
    if (profitPct >= 0.2) return 'moderate';
    if (profitPct >= 0.1) return 'low';
    if (profitPct >= 0) return 'minimal';
    if (profitPct >= -0.1) return 'small_loss';
    if (profitPct >= -0.5) return 'moderate_loss';
    return 'large_loss';
  }

  /**
   * Extract patterns from trade
   */
  extractPatternsFromTrade(trade) {
    // Extract market condition pattern
    const marketCondition = this.identifyMarketCondition(trade);
    this.updateMarketConditionPattern(marketCondition, trade);

    // Extract temporal pattern
    this.updateTemporalPattern(trade);

    // Extract triangle-specific pattern
    this.updateTrianglePattern(trade);

    // Extract correlation patterns
    this.extractCorrelationPatterns(trade);
  }

  /**
   * Identify market condition from trade context
   */
  identifyMarketCondition(trade) {
    // This would analyze price movements, volatility, etc.
    // For now, use simple heuristics
    if (trade.volatility > 0.05) return 'volatile';
    if (trade.profitPct > 0.3) return 'bullish';
    if (trade.profitPct < -0.2) return 'bearish';
    return 'sideways';
  }

  /**
   * Update market condition pattern
   */
  updateMarketConditionPattern(condition, trade) {
    const pattern = this.memory.marketConditions.get(condition);
    pattern.trades.push(trade);
    pattern.frequency++;

    // Recalculate statistics
    const successfulTrades = pattern.trades.filter(t => t.success);
    pattern.successRate = successfulTrades.length / pattern.trades.length;
    pattern.avgProfit = pattern.trades.reduce((sum, t) => sum + t.profitPct, 0) / pattern.trades.length;
  }

  /**
   * Update temporal pattern
   */
  updateTemporalPattern(trade) {
    const timestamp = new Date(trade.timestamp);
    const hour = timestamp.getHours();
    const day = timestamp.getDay();
    const month = timestamp.getMonth();

    // Update hourly pattern
    this.updateTimePattern('hourly', hour, trade);

    // Update daily pattern
    this.updateTimePattern('daily', day, trade);

    // Update monthly pattern
    this.updateTimePattern('monthly', month, trade);
  }

  /**
   * Update time-based pattern
   */
  updateTimePattern(timeFrame, timeKey, trade) {
    const pattern = this.memory.temporalPatterns.get(timeFrame);

    if (!pattern.patterns.has(timeKey)) {
      pattern.patterns.set(timeKey, {
        trades: [],
        successRate: 0,
        avgProfit: 0,
        frequency: 0
      });
    }

    const timePattern = pattern.patterns.get(timeKey);
    timePattern.trades.push(trade);
    timePattern.frequency++;

    // Recalculate statistics
    const successfulTrades = timePattern.trades.filter(t => t.success);
    timePattern.successRate = successfulTrades.length / timePattern.trades.length;
    timePattern.avgProfit = timePattern.trades.reduce((sum, t) => sum + t.profitPct, 0) / timePattern.trades.length;
  }

  /**
   * Update triangle-specific pattern
   */
  updateTrianglePattern(trade) {
    const { triangle } = trade;

    if (!this.memory.marketPatterns.has(triangle)) {
      this.memory.marketPatterns.set(triangle, {
        trades: [],
        successRate: 0,
        avgProfit: 0,
        avgExecutionTime: 0,
        bestHour: null,
        worstHour: null,
        volatility: 0,
        frequency: 0
      });
    }

    const pattern = this.memory.marketPatterns.get(triangle);
    pattern.trades.push(trade);
    pattern.frequency++;

    // Recalculate statistics
    const successfulTrades = pattern.trades.filter(t => t.success);
    pattern.successRate = successfulTrades.length / pattern.trades.length;
    pattern.avgProfit = pattern.trades.reduce((sum, t) => sum + t.profitPct, 0) / pattern.trades.length;
    pattern.avgExecutionTime = pattern.trades.reduce((sum, t) => sum + (t.executionTime || 0), 0) / pattern.trades.length;

    // Find best and worst hours
    this.calculateBestWorstHours(pattern);
  }

  /**
   * Calculate best and worst trading hours for a triangle
   */
  calculateBestWorstHours(pattern) {
    const hourlyStats = new Map();

    pattern.trades.forEach(trade => {
      const hour = new Date(trade.timestamp).getHours();
      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, { profits: [], count: 0 });
      }
      const stats = hourlyStats.get(hour);
      stats.profits.push(trade.profitPct);
      stats.count++;
    });

    let bestHour = null;
    let bestAvgProfit = -Infinity;
    let worstHour = null;
    let worstAvgProfit = Infinity;

    hourlyStats.forEach((stats, hour) => {
      const avgProfit = stats.profits.reduce((sum, p) => sum + p, 0) / stats.profits.length;

      if (avgProfit > bestAvgProfit) {
        bestAvgProfit = avgProfit;
        bestHour = hour;
      }

      if (avgProfit < worstAvgProfit) {
        worstAvgProfit = avgProfit;
        worstHour = hour;
      }
    });

    pattern.bestHour = bestHour;
    pattern.worstHour = worstHour;
  }

  /**
   * Extract correlation patterns between different factors
   */
  extractCorrelationPatterns(trade) {
    // Analyze correlations between profit and various factors
    const factors = ['volatility', 'executionTime', 'marketCondition', 'hour'];

    factors.forEach(factor1 => {
      factors.forEach(factor2 => {
        if (factor1 !== factor2) {
          this.updateCorrelation(factor1, factor2, trade);
        }
      });
    });
  }

  /**
   * Update correlation between two factors
   */
  updateCorrelation(factor1, factor2, trade) {
    const key = `${factor1}_${factor2}`;

    if (!this.memory.correlationPatterns.has(key)) {
      this.memory.correlationPatterns.set(key, {
        samples: [],
        correlation: 0,
        strength: 0
      });
    }

    const correlation = this.memory.correlationPatterns.get(key);
    correlation.samples.push({
      factor1: trade[factor1],
      factor2: trade[factor2],
      profit: trade.profitPct
    });

    // Recalculate correlation if we have enough samples
    if (correlation.samples.length >= 10) {
      correlation.correlation = this.calculateCorrelation(correlation.samples);
      correlation.strength = Math.abs(correlation.correlation);
    }
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  calculateCorrelation(samples) {
    if (samples.length < 2) return 0;

    const n = samples.length;
    const sumX = samples.reduce((sum, s) => sum + s.factor1, 0);
    const sumY = samples.reduce((sum, s) => sum + s.factor2, 0);
    const sumXY = samples.reduce((sum, s) => sum + s.factor1 * s.factor2, 0);
    const sumX2 = samples.reduce((sum, s) => sum + s.factor1 * s.factor1, 0);
    const sumY2 = samples.reduce((sum, s) => sum + s.factor2 * s.factor2, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Update strategy performance tracking
   */
  updateStrategyPerformance(trade) {
    const strategy = trade.strategy || 'default';

    if (!this.memory.strategyPerformance.has(strategy)) {
      this.memory.strategyPerformance.set(strategy, {
        trades: [],
        successRate: 0,
        avgProfit: 0,
        totalProfit: 0,
        bestTrade: null,
        worstTrade: null
      });
    }

    const perf = this.memory.strategyPerformance.get(strategy);
    perf.trades.push(trade);

    // Recalculate statistics
    const successfulTrades = perf.trades.filter(t => t.success);
    perf.successRate = successfulTrades.length / perf.trades.length;
    perf.avgProfit = perf.trades.reduce((sum, t) => sum + t.profitPct, 0) / perf.trades.length;
    perf.totalProfit = perf.trades.reduce((sum, t) => sum + (t.profit || 0), 0);

    // Update best/worst trades
    perf.bestTrade = perf.trades.reduce((best, t) =>
      !best || t.profitPct > best.profitPct ? t : best, null);
    perf.worstTrade = perf.trades.reduce((worst, t) =>
      !worst || t.profitPct < worst.profitPct ? t : worst, null);
  }

  /**
   * Clean old memories based on retention policy
   */
  cleanOldMemories() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.memoryConfig.patternRetentionDays);

    // Clean successful trades
    this.memory.successfulTrades = this.memory.successfulTrades.filter(
      trade => new Date(trade.timestamp) > cutoffDate
    );

    // Clean failed trades
    this.memory.failedTrades = this.memory.failedTrades.filter(
      trade => new Date(trade.timestamp) > cutoffDate
    );

    // Clean indices (simplified - in production would be more sophisticated)
    this.rebuildIndices();
  }

  /**
   * Rebuild indices after cleanup
   */
  rebuildIndices() {
    this.indices = {
      byTriangle: new Map(),
      byTime: new Map(),
      byProfit: new Map(),
      byMarketCondition: new Map()
    };

    const allTrades = [...this.memory.successfulTrades, ...this.memory.failedTrades];
    allTrades.forEach(trade => this.updateIndices(trade));
  }

  /**
   * Store custom pattern
   */
  storePattern(patternData) {
    const { type, pattern, metadata } = patternData;

    // Store in appropriate memory structure
    switch (type) {
      case 'market_pattern':
        this.memory.marketPatterns.set(pattern.id, pattern);
        break;
      case 'temporal_pattern':
        const temporal = this.memory.temporalPatterns.get(pattern.timeframe);
        if (temporal) {
          temporal.patterns.set(pattern.key, pattern);
        }
        break;
      case 'correlation':
        this.memory.correlationPatterns.set(pattern.key, pattern);
        break;
    }

    this.emit('pattern_stored', { type, pattern, metadata });
  }

  /**
   * Retrieve patterns based on criteria
   */
  retrievePatterns(criteria) {
    const { type, filters, limit = 10 } = criteria;
    let results = [];

    switch (type) {
      case 'triangle_patterns':
        results = this.getTrianglePatterns(filters, limit);
        break;
      case 'temporal_patterns':
        results = this.getTemporalPatterns(filters, limit);
        break;
      case 'correlation_patterns':
        results = this.getCorrelationPatterns(filters, limit);
        break;
      case 'successful_trades':
        results = this.getSimilarSuccessfulTrades(filters, limit);
        break;
    }

    this.emit('patterns_retrieved', { criteria, results });
    return results;
  }

  /**
   * Get triangle patterns
   */
  getTrianglePatterns(filters, limit) {
    const patterns = Array.from(this.memory.marketPatterns.values());

    return patterns
      .filter(pattern => this.matchesFilters(pattern, filters))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }

  /**
   * Get temporal patterns
   */
  getTemporalPatterns(filters, limit) {
    const { timeframe = 'hourly' } = filters;
    const temporal = this.memory.temporalPatterns.get(timeframe);

    if (!temporal) return [];

    const patterns = Array.from(temporal.patterns.values());

    return patterns
      .filter(pattern => this.matchesFilters(pattern, filters))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }

  /**
   * Get correlation patterns
   */
  getCorrelationPatterns(filters, limit) {
    const patterns = Array.from(this.memory.correlationPatterns.values());

    return patterns
      .filter(pattern => this.matchesFilters(pattern, filters))
      .filter(pattern => pattern.strength >= this.memoryConfig.correlationThreshold)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, limit);
  }

  /**
   * Get similar successful trades
   */
  getSimilarSuccessfulTrades(filters, limit) {
    return this.memory.successfulTrades
      .filter(trade => this.matchesFilters(trade, filters))
      .sort((a, b) => b.profitPct - a.profitPct)
      .slice(0, limit);
  }

  /**
   * Check if item matches filters
   */
  matchesFilters(item, filters) {
    if (!filters) return true;

    for (const [key, value] of Object.entries(filters)) {
      if (item[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Analyze correlations between factors
   */
  analyzeCorrelations(analysisRequest) {
    const { factors, minSamples = 10 } = analysisRequest;
    const correlations = [];

    factors.forEach(factor1 => {
      factors.forEach(factor2 => {
        if (factor1 !== factor2) {
          const key = `${factor1}_${factor2}`;
          const pattern = this.memory.correlationPatterns.get(key);

          if (pattern && pattern.samples.length >= minSamples) {
            correlations.push({
              factor1,
              factor2,
              correlation: pattern.correlation,
              strength: pattern.strength,
              samples: pattern.samples.length,
              significance: this.assessCorrelationSignificance(pattern)
            });
          }
        }
      });
    });

    // Sort by strength
    correlations.sort((a, b) => b.strength - a.strength);

    this.emit('correlations_analyzed', { analysisRequest, correlations });
    return correlations;
  }

  /**
   * Assess correlation significance
   */
  assessCorrelationSignificance(pattern) {
    const { correlation, samples } = pattern;
    const absCorr = Math.abs(correlation);

    // Simple significance assessment based on correlation strength and sample size
    if (absCorr >= 0.8 && samples >= 50) return 'very_strong';
    if (absCorr >= 0.6 && samples >= 30) return 'strong';
    if (absCorr >= 0.4 && samples >= 20) return 'moderate';
    if (absCorr >= 0.2 && samples >= 10) return 'weak';
    return 'insignificant';
  }

  /**
   * Predict outcome using memory patterns
   */
  predictFromMemory(predictionRequest) {
    const { trade, context } = predictionRequest;

    // Gather predictions from different memory types
    const predictions = {
      triangle: this.predictFromTriangleMemory(trade),
      temporal: this.predictFromTemporalMemory(trade),
      marketCondition: this.predictFromMarketConditionMemory(trade),
      correlation: this.predictFromCorrelationMemory(trade)
    };

    // Combine predictions
    const combinedPrediction = this.combinePredictions(predictions);

    this.emit('prediction_made', {
      request: predictionRequest,
      predictions,
      combinedPrediction
    });

    return combinedPrediction;
  }

  /**
   * Predict using triangle memory
   */
  predictFromTriangleMemory(trade) {
    const pattern = this.memory.marketPatterns.get(trade.triangle);
    if (!pattern || pattern.trades.length < 5) {
      return { confidence: 0, expectedProfit: 0 };
    }

    return {
      confidence: Math.min(100, pattern.successRate * 100),
      expectedProfit: pattern.avgProfit,
      basedOn: pattern.trades.length
    };
  }

  /**
   * Predict using temporal memory
   */
  predictFromTemporalMemory(trade) {
    const hour = new Date(trade.timestamp).getHours();
    const hourlyPattern = this.memory.temporalPatterns.get('hourly').patterns.get(hour);

    if (!hourlyPattern || hourlyPattern.trades.length < 3) {
      return { confidence: 0, expectedProfit: 0 };
    }

    return {
      confidence: Math.min(100, hourlyPattern.successRate * 100),
      expectedProfit: hourlyPattern.avgProfit,
      basedOn: hourlyPattern.trades.length
    };
  }

  /**
   * Predict using market condition memory
   */
  predictFromMarketConditionMemory(trade) {
    const condition = this.identifyMarketCondition(trade);
    const pattern = this.memory.marketConditions.get(condition);

    if (!pattern || pattern.trades.length < 5) {
      return { confidence: 0, expectedProfit: 0 };
    }

    return {
      confidence: Math.min(100, pattern.successRate * 100),
      expectedProfit: pattern.avgProfit,
      basedOn: pattern.trades.length
    };
  }

  /**
   * Predict using correlation memory
   */
  predictFromCorrelationMemory(trade) {
    // Use strong correlations to predict outcome
    const strongCorrelations = Array.from(this.memory.correlationPatterns.values())
      .filter(p => p.strength >= this.memoryConfig.correlationThreshold);

    if (strongCorrelations.length === 0) {
      return { confidence: 0, expectedProfit: 0 };
    }

    // Simple prediction based on correlations
    let totalWeight = 0;
    let weightedProfit = 0;

    strongCorrelations.forEach(corr => {
      // This is a simplified approach - in practice would be more sophisticated
      const weight = corr.strength;
      totalWeight += weight;
      weightedProfit += weight * corr.samples[corr.samples.length - 1].profit;
    });

    return {
      confidence: Math.min(100, (totalWeight / strongCorrelations.length) * 100),
      expectedProfit: totalWeight > 0 ? weightedProfit / totalWeight : 0,
      basedOn: strongCorrelations.length
    };
  }

  /**
   * Combine multiple predictions
   */
  combinePredictions(predictions) {
    const validPredictions = Object.values(predictions).filter(p => p.confidence > 0);

    if (validPredictions.length === 0) {
      return {
        willProfit: false,
        confidence: 0,
        expectedProfit: 0,
        reasoning: 'Insufficient historical data'
      };
    }

    // Weighted average based on confidence
    let totalWeight = 0;
    let weightedProfit = 0;
    let totalConfidence = 0;

    validPredictions.forEach(pred => {
      const weight = pred.confidence / 100;
      totalWeight += weight;
      weightedProfit += weight * pred.expectedProfit;
      totalConfidence += pred.confidence;
    });

    const avgConfidence = totalConfidence / validPredictions.length;
    const expectedProfit = totalWeight > 0 ? weightedProfit / totalWeight : 0;

    return {
      willProfit: expectedProfit > 0,
      confidence: Math.round(avgConfidence),
      expectedProfit: Math.round(expectedProfit * 10000) / 10000, // Round to 4 decimals
      reasoning: `Based on ${validPredictions.length} memory patterns`,
      components: predictions
    };
  }

  /**
   * Adjust memory based on new goals
   */
  adjustMemoryForGoals(goals) {
    console.log('🧠 Adjusting memory for new goals:', goals);

    // Adjust retention and focus based on goals
    if (goals.riskLevel === 'low') {
      this.memoryConfig.correlationThreshold = 0.8; // Require stronger correlations
      this.memoryConfig.maxFailedTrades = 200; // Keep fewer failed trades
    } else if (goals.riskLevel === 'high') {
      this.memoryConfig.correlationThreshold = 0.5; // Accept weaker correlations
      this.memoryConfig.maxFailedTrades = 1000; // Keep more failed trades for learning
    }
  }

  /**
   * Respond to consensus requests
   */
  respondToConsensus(data) {
    const { topic, options, requestingAgent } = data;

    let decision;
    let confidence = 50;

    switch (topic) {
      case 'pattern_recognition':
        decision = this.consensusOnPattern(options);
        confidence = 80;
        break;
      case 'memory_based_decision':
        decision = this.consensusOnMemoryDecision(options);
        confidence = 75;
        break;
      default:
        decision = options[0];
    }

    this.emit('consensus_response', {
      from: 'memory_agent',
      topic,
      decision,
      confidence,
      reasoning: `Memory-based decision with ${confidence}% confidence`
    });
  }

  /**
   * Consensus on pattern recognition
   */
  consensusOnPattern(options) {
    // Choose pattern with strongest historical support
    return options.reduce((best, current) => {
      const bestSupport = this.getPatternSupport(best);
      const currentSupport = this.getPatternSupport(current);
      return currentSupport > bestSupport ? current : best;
    });
  }

  /**
   * Get historical support for a pattern
   */
  getPatternSupport(pattern) {
    // Simplified - would analyze actual historical data
    const similarPatterns = this.memory.marketPatterns.get(pattern.id);
    return similarPatterns ? similarPatterns.frequency : 0;
  }

  /**
   * Consensus on memory-based decision
   */
  consensusOnMemoryDecision(options) {
    // Choose option with best historical performance
    return options.reduce((best, current) => {
      const bestPerf = this.getHistoricalPerformance(best);
      const currentPerf = this.getHistoricalPerformance(current);
      return currentPerf > bestPerf ? current : best;
    });
  }

  /**
   * Get historical performance for a decision
   */
  getHistoricalPerformance(decision) {
    // Simplified - would analyze actual historical outcomes
    const similarTrades = this.findSimilarTrades(decision);
    if (similarTrades.length === 0) return 0;

    const successRate = similarTrades.filter(t => t.success).length / similarTrades.length;
    const avgProfit = similarTrades.reduce((sum, t) => sum + t.profitPct, 0) / similarTrades.length;

    return successRate * avgProfit;
  }

  /**
   * Find similar trades in memory
   */
  findSimilarTrades(tradeCriteria) {
    // Simplified similarity matching
    return this.memory.successfulTrades.filter(trade =>
      trade.triangle === tradeCriteria.triangle ||
      Math.abs(trade.profitPct - tradeCriteria.profitPct) < 0.1
    );
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    return {
      successfulTrades: this.memory.successfulTrades.length,
      failedTrades: this.memory.failedTrades.length,
      marketPatterns: this.memory.marketPatterns.size,
      temporalPatterns: {
        hourly: this.memory.temporalPatterns.get('hourly').patterns.size,
        daily: this.memory.temporalPatterns.get('daily').patterns.size,
        weekly: this.memory.temporalPatterns.get('weekly').patterns.size,
        monthly: this.memory.temporalPatterns.get('monthly').patterns.size
      },
      correlationPatterns: this.memory.correlationPatterns.size,
      strategyPerformance: this.memory.strategyPerformance.size,
      indices: {
        byTriangle: this.indices.byTriangle.size,
        byTime: this.indices.byTime.size,
        byProfit: this.indices.byProfit.size,
        byMarketCondition: this.indices.byMarketCondition.size
      }
    };
  }

  /**
   * Shutdown the memory agent
   */
  async shutdown() {
    console.log('🧠 Shutting down Memory Agent...');
    this.isActive = false;
    console.log('✅ Memory Agent shutdown complete');
  }
}

// Create singleton instance
export const memoryAgent = new MemoryAgent();