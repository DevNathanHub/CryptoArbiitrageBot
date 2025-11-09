// Learning Agent
// Analyzes performance data and adapts trading strategies autonomously

import { EventEmitter } from 'events';
import { config } from '../../config/config.js';

/**
 * Learning Agent
 * Learns from trading performance and adapts strategies
 */
export class LearningAgent extends EventEmitter {
  constructor() {
    super();
    this.isActive = false;
    this.performanceData = [];
    this.strategyAdaptations = new Map();
    this.learningModels = new Map();
    this.confidenceThreshold = 75;
    this.adaptationHistory = [];

    // Learning parameters
    this.learningRate = 0.1;
    this.memorySize = 1000;
    this.minSamplesForLearning = 10;
  }

  /**
   * Initialize the learning agent
   */
  async initialize() {
    console.log('🧠 Initializing Learning Agent...');

    // Initialize learning models
    this.initializeLearningModels();

    this.isActive = true;
    console.log('✅ Learning Agent initialized');
  }

  /**
   * Initialize different learning models
   */
  initializeLearningModels() {
    // Profit prediction model
    this.learningModels.set('profit_prediction', {
      name: 'Profit Prediction',
      model: this.createProfitPredictionModel(),
      accuracy: 0,
      samples: 0
    });

    // Risk assessment model
    this.learningModels.set('risk_assessment', {
      name: 'Risk Assessment',
      model: this.createRiskAssessmentModel(),
      accuracy: 0,
      samples: 0
    });

    // Market timing model
    this.learningModels.set('market_timing', {
      name: 'Market Timing',
      model: this.createMarketTimingModel(),
      accuracy: 0,
      samples: 0
    });

    // Strategy optimization model
    this.learningModels.set('strategy_optimization', {
      name: 'Strategy Optimization',
      model: this.createStrategyOptimizationModel(),
      accuracy: 0,
      samples: 0
    });
  }

  /**
   * Create profit prediction model
   */
  createProfitPredictionModel() {
    return {
      weights: {
        profitPct: 0.4,
        triangle: 0.2,
        marketVolatility: 0.2,
        liquidity: 0.1,
        historicalSuccess: 0.1
      },
      bias: 0,
      learningRate: this.learningRate,
      predictions: [],
      actuals: []
    };
  }

  /**
   * Create risk assessment model
   */
  createRiskAssessmentModel() {
    return {
      riskFactors: {
        slippage: 0.3,
        executionTime: 0.2,
        marketVolatility: 0.2,
        positionSize: 0.15,
        liquidity: 0.15
      },
      thresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.8
      },
      assessments: []
    };
  }

  /**
   * Create market timing model
   */
  createMarketTimingModel() {
    return {
      timingPatterns: new Map(),
      successByHour: new Array(24).fill(0),
      successCountByHour: new Array(24).fill(0),
      bestHours: [],
      worstHours: []
    };
  }

  /**
   * Create strategy optimization model
   */
  createStrategyOptimizationModel() {
    return {
      parameters: {
        minProfitThreshold: config.trading.minProfitThreshold,
        tradeAmountUSDT: config.trading.tradeAmountUSDT,
        maxSlippage: 0.5,
        executionTimeout: 5000
      },
      optimizationHistory: [],
      parameterRanges: {
        minProfitThreshold: [0.1, 1.0],
        tradeAmountUSDT: [10, 1000],
        maxSlippage: [0.1, 2.0],
        executionTimeout: [1000, 10000]
      }
    };
  }

  /**
   * Receive message from orchestrator
   */
  receiveMessage(message) {
    switch (message.action) {
      case 'analyze_performance':
        this.analyzePerformance(message.data);
        break;
      case 'update_strategy':
        this.updateStrategy(message.data);
        break;
      case 'predict_outcome':
        this.predictOutcome(message.data);
        break;
      case 'goals_updated':
        this.adaptToGoals(message.data);
        break;
      case 'consensus_request':
        this.respondToConsensus(message.data);
        break;
      default:
        console.log(`🧠 Learning Agent: Unknown action ${message.action}`);
    }
  }

  /**
   * Analyze trading performance data
   */
  analyzePerformance(performanceData) {
    console.log('🧠 Analyzing performance data...');

    // Store performance data
    this.performanceData.push({
      ...performanceData,
      timestamp: new Date(),
      analyzed: false
    });

    // Keep only recent data
    if (this.performanceData.length > this.memorySize) {
      this.performanceData.shift();
    }

    // Analyze patterns and update models
    this.updateLearningModels();

    // Generate insights
    const insights = this.generateInsights();

    // Emit analysis complete
    this.emit('decision', {
      type: 'performance_analysis',
      insights,
      confidence: this.calculateAnalysisConfidence(),
      recommendations: this.generateRecommendations()
    });
  }

  /**
   * Update learning models with new data
   */
  updateLearningModels() {
    if (this.performanceData.length < this.minSamplesForLearning) {
      return;
    }

    const recentData = this.performanceData.slice(-50);

    // Update profit prediction model
    this.updateProfitPredictionModel(recentData);

    // Update risk assessment model
    this.updateRiskAssessmentModel(recentData);

    // Update market timing model
    this.updateMarketTimingModel(recentData);

    // Update strategy optimization model
    this.updateStrategyOptimizationModel(recentData);
  }

  /**
   * Update profit prediction model
   */
  updateProfitPredictionModel(data) {
    const model = this.learningModels.get('profit_prediction').model;

    data.forEach(trade => {
      if (trade.actualProfit !== undefined) {
        const prediction = this.predictProfit(trade);
        const actual = trade.actualProfit > 0 ? 1 : 0;
        const error = actual - prediction;

        // Update weights using simple gradient descent
        Object.keys(model.weights).forEach(feature => {
          if (trade[feature] !== undefined) {
            model.weights[feature] += this.learningRate * error * trade[feature];
          }
        });

        model.predictions.push(prediction);
        model.actuals.push(actual);
      }
    });

    // Calculate accuracy
    if (model.predictions.length > 0) {
      const correct = model.predictions.reduce((sum, pred, i) => {
        const predicted = pred > 0.5 ? 1 : 0;
        return sum + (predicted === model.actuals[i] ? 1 : 0);
      }, 0);

      this.learningModels.get('profit_prediction').accuracy = correct / model.predictions.length;
      this.learningModels.get('profit_prediction').samples = model.predictions.length;
    }
  }

  /**
   * Update risk assessment model
   */
  updateRiskAssessmentModel(data) {
    const model = this.learningModels.get('risk_assessment').model;

    data.forEach(trade => {
      if (trade.riskLevel && trade.outcome !== undefined) {
        const riskScore = this.calculateRiskScore(trade);
        const actualRisk = trade.outcome === 'failure' ? 1 : 0;

        model.assessments.push({
          predicted: riskScore,
          actual: actualRisk,
          trade
        });
      }
    });
  }

  /**
   * Update market timing model
   */
  updateMarketTimingModel(data) {
    const model = this.learningModels.get('market_timing').model;

    data.forEach(trade => {
      const hour = new Date(trade.timestamp).getHours();
      model.successCountByHour[hour]++;

      if (trade.success) {
        model.successByHour[hour]++;
      }
    });

    // Calculate success rates by hour
    const hourlyRates = model.successByHour.map((success, hour) =>
      model.successCountByHour[hour] > 0 ? success / model.successCountByHour[hour] : 0
    );

    // Find best and worst hours
    const sortedHours = hourlyRates.map((rate, hour) => ({ hour, rate }))
      .sort((a, b) => b.rate - a.rate);

    model.bestHours = sortedHours.slice(0, 3).map(h => h.hour);
    model.worstHours = sortedHours.slice(-3).map(h => h.hour);
  }

  /**
   * Update strategy optimization model
   */
  updateStrategyOptimizationModel(data) {
    const model = this.learningModels.get('strategy_optimization').model;

    // Analyze which parameters led to better performance
    const profitableTrades = data.filter(t => t.success);
    const unprofitableTrades = data.filter(t => !t.success);

    if (profitableTrades.length > 5 && unprofitableTrades.length > 5) {
      // Simple parameter optimization based on success rates
      const optimalParams = this.optimizeParameters(profitableTrades, unprofitableTrades);

      model.optimizationHistory.push({
        timestamp: new Date(),
        currentParams: { ...model.parameters },
        optimalParams,
        performance: profitableTrades.length / data.length
      });

      // Gradually adjust parameters towards optimal
      this.adjustParametersTowardsOptimal(model, optimalParams);
    }
  }

  /**
   * Optimize parameters based on successful vs unsuccessful trades
   */
  optimizeParameters(profitable, unprofitable) {
    const optimal = {};

    // Compare average values for key parameters
    const params = ['profitPct', 'executionTime', 'slippage'];

    params.forEach(param => {
      const profitableAvg = profitable.reduce((sum, t) => sum + (t[param] || 0), 0) / profitable.length;
      const unprofitableAvg = unprofitable.reduce((sum, t) => sum + (t[param] || 0), 0) / unprofitable.length;

      optimal[param] = profitableAvg;
    });

    return optimal;
  }

  /**
   * Gradually adjust parameters towards optimal values
   */
  adjustParametersTowardsOptimal(model, optimal) {
    const adjustmentRate = 0.05; // 5% adjustment per update

    Object.keys(optimal).forEach(param => {
      if (model.parameters[param] !== undefined && optimal[param] !== undefined) {
        const current = model.parameters[param];
        const target = optimal[param];
        const adjustment = (target - current) * adjustmentRate;

        model.parameters[param] = Math.max(
          model.parameterRanges[param][0],
          Math.min(model.parameterRanges[param][1], current + adjustment)
        );
      }
    });
  }

  /**
   * Predict profit for a trade
   */
  predictProfit(trade) {
    const model = this.learningModels.get('profit_prediction').model;
    let prediction = model.bias;

    Object.entries(model.weights).forEach(([feature, weight]) => {
      if (trade[feature] !== undefined) {
        prediction += weight * this.normalizeFeature(trade[feature], feature);
      }
    });

    return this.sigmoid(prediction);
  }

  /**
   * Calculate risk score
   */
  calculateRiskScore(trade) {
    const model = this.learningModels.get('risk_assessment').model;
    let riskScore = 0;

    Object.entries(model.riskFactors).forEach(([factor, weight]) => {
      if (trade[factor] !== undefined) {
        riskScore += weight * this.normalizeRiskFactor(trade[factor], factor);
      }
    });

    return Math.min(1, Math.max(0, riskScore));
  }

  /**
   * Normalize feature values
   */
  normalizeFeature(value, feature) {
    // Simple normalization - can be enhanced
    switch (feature) {
      case 'profitPct':
        return Math.min(1, value / 2); // Assume max 2% profit
      case 'marketVolatility':
        return Math.min(1, value / 100); // Assume max 100% volatility
      case 'liquidity':
        return value; // Already 0-1
      case 'historicalSuccess':
        return value / 100; // Convert percentage to 0-1
      default:
        return Math.min(1, Math.max(0, value));
    }
  }

  /**
   * Normalize risk factors
   */
  normalizeRiskFactor(value, factor) {
    switch (factor) {
      case 'slippage':
        return Math.min(1, value / 5); // Max 5% slippage
      case 'executionTime':
        return Math.min(1, value / 10000); // Max 10 seconds
      case 'marketVolatility':
        return Math.min(1, value / 100);
      case 'positionSize':
        return Math.min(1, value / 10000); // Max $10k position
      case 'liquidity':
        return 1 - value; // Invert (low liquidity = high risk)
      default:
        return Math.min(1, Math.max(0, value));
    }
  }

  /**
   * Sigmoid activation function
   */
  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Generate insights from learned patterns
   */
  generateInsights() {
    const insights = [];

    // Profit prediction insights
    const profitModel = this.learningModels.get('profit_prediction');
    if (profitModel.samples > 10) {
      insights.push({
        type: 'profit_prediction',
        insight: `Profit prediction accuracy: ${(profitModel.accuracy * 100).toFixed(1)}%`,
        confidence: profitModel.accuracy * 100
      });
    }

    // Market timing insights
    const timingModel = this.learningModels.get('market_timing').model;
    if (timingModel.bestHours.length > 0) {
      insights.push({
        type: 'market_timing',
        insight: `Best trading hours: ${timingModel.bestHours.join(', ')}`,
        confidence: 80
      });
    }

    // Strategy insights
    const strategyModel = this.learningModels.get('strategy_optimization').model;
    if (strategyModel.optimizationHistory.length > 0) {
      const latest = strategyModel.optimizationHistory[strategyModel.optimizationHistory.length - 1];
      insights.push({
        type: 'strategy_optimization',
        insight: `Optimal min profit threshold: ${latest.optimalParams.profitPct?.toFixed(3)}%`,
        confidence: 75
      });
    }

    return insights;
  }

  /**
   * Generate recommendations based on learning
   */
  generateRecommendations() {
    const recommendations = [];

    const profitModel = this.learningModels.get('profit_prediction');
    if (profitModel.accuracy < 0.6) {
      recommendations.push({
        type: 'model_improvement',
        action: 'improve_profit_prediction',
        reason: 'Low prediction accuracy suggests need for more training data'
      });
    }

    const timingModel = this.learningModels.get('market_timing').model;
    if (timingModel.bestHours.length > 0) {
      recommendations.push({
        type: 'timing_optimization',
        action: 'schedule_best_hours',
        reason: `Focus trading during hours: ${timingModel.bestHours.join(', ')}`
      });
    }

    const strategyModel = this.learningModels.get('strategy_optimization').model;
    if (strategyModel.optimizationHistory.length > 2) {
      recommendations.push({
        type: 'parameter_adjustment',
        action: 'update_trading_parameters',
        reason: 'Strategy optimization suggests parameter adjustments'
      });
    }

    return recommendations;
  }

  /**
   * Calculate confidence in analysis
   */
  calculateAnalysisConfidence() {
    const models = Array.from(this.learningModels.values());
    const avgAccuracy = models.reduce((sum, model) => sum + model.accuracy, 0) / models.length;
    const dataSize = this.performanceData.length;

    // Confidence increases with more data and higher accuracy
    const dataConfidence = Math.min(1, dataSize / 100);
    const accuracyConfidence = avgAccuracy;

    return Math.round((dataConfidence * 0.3 + accuracyConfidence * 0.7) * 100);
  }

  /**
   * Update trading strategy based on learning
   */
  updateStrategy(strategyData) {
    console.log('🧠 Updating strategy based on learning...');

    const adaptations = this.generateStrategyAdaptations(strategyData);

    adaptations.forEach(adaption => {
      this.strategyAdaptations.set(adaption.parameter, adaption);
      this.adaptationHistory.push({
        ...adaption,
        timestamp: new Date()
      });
    });

    this.emit('decision', {
      type: 'strategy_update',
      adaptations,
      confidence: this.calculateAnalysisConfidence()
    });
  }

  /**
   * Generate strategy adaptations
   */
  generateStrategyAdaptations(strategyData) {
    const adaptations = [];

    // Adapt profit threshold based on learning
    const profitModel = this.learningModels.get('profit_prediction');
    if (profitModel.samples > 20) {
      const optimalThreshold = this.calculateOptimalProfitThreshold();
      if (Math.abs(optimalThreshold - config.trading.minProfitThreshold) > 0.05) {
        adaptations.push({
          parameter: 'minProfitThreshold',
          currentValue: config.trading.minProfitThreshold,
          recommendedValue: optimalThreshold,
          reason: 'Learning model suggests better profit threshold',
          confidence: profitModel.accuracy * 100
        });
      }
    }

    // Adapt trade amount based on risk learning
    const riskModel = this.learningModels.get('risk_assessment');
    if (riskModel.model.assessments.length > 10) {
      const optimalAmount = this.calculateOptimalTradeAmount();
      if (Math.abs(optimalAmount - config.trading.tradeAmountUSDT) > 10) {
        adaptations.push({
          parameter: 'tradeAmountUSDT',
          currentValue: config.trading.tradeAmountUSDT,
          recommendedValue: optimalAmount,
          reason: 'Risk assessment suggests trade amount adjustment',
          confidence: 70
        });
      }
    }

    return adaptations;
  }

  /**
   * Calculate optimal profit threshold
   */
  calculateOptimalProfitThreshold() {
    const profitableTrades = this.performanceData.filter(t => t.success);
    const unprofitableTrades = this.performanceData.filter(t => !t.success);

    if (profitableTrades.length === 0) return config.trading.minProfitThreshold;

    const avgProfitableProfit = profitableTrades.reduce((sum, t) => sum + t.profitPct, 0) / profitableTrades.length;
    const avgUnprofitableProfit = unprofitableTrades.length > 0
      ? unprofitableTrades.reduce((sum, t) => sum + t.profitPct, 0) / unprofitableTrades.length
      : 0;

    // Set threshold at midpoint between profitable and unprofitable
    const optimal = (avgProfitableProfit + avgUnprofitableProfit) / 2;

    return Math.max(0.05, Math.min(1.0, optimal));
  }

  /**
   * Calculate optimal trade amount
   */
  calculateOptimalTradeAmount() {
    const successfulTrades = this.performanceData.filter(t => t.success);
    const failedTrades = this.performanceData.filter(t => !t.success);

    if (successfulTrades.length === 0) return config.trading.tradeAmountUSDT;

    const avgSuccessfulAmount = successfulTrades.reduce((sum, t) => sum + t.amount, 0) / successfulTrades.length;
    const avgFailedAmount = failedTrades.length > 0
      ? failedTrades.reduce((sum, t) => sum + t.amount, 0) / failedTrades.length
      : avgSuccessfulAmount * 2;

    // Prefer amounts that led to successful trades
    const optimal = avgSuccessfulAmount * 0.9; // Slightly conservative

    return Math.max(10, Math.min(1000, optimal));
  }

  /**
   * Predict outcome for a potential trade
   */
  predictOutcome(tradeData) {
    const profitPrediction = this.predictProfit(tradeData);
    const riskScore = this.calculateRiskScore(tradeData);

    const outcome = {
      willProfit: profitPrediction > 0.6,
      riskLevel: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
      confidence: Math.round((profitPrediction * 100 + (1 - riskScore) * 100) / 2),
      reasoning: this.generatePredictionReasoning(profitPrediction, riskScore)
    };

    this.emit('decision', {
      type: 'outcome_prediction',
      prediction: outcome,
      tradeData,
      confidence: outcome.confidence
    });
  }

  /**
   * Generate reasoning for prediction
   */
  generatePredictionReasoning(profitProb, riskScore) {
    const reasons = [];

    if (profitProb > 0.7) {
      reasons.push('High profit probability based on historical patterns');
    } else if (profitProb < 0.3) {
      reasons.push('Low profit probability from learned model');
    }

    if (riskScore > 0.7) {
      reasons.push('High risk detected');
    } else if (riskScore < 0.3) {
      reasons.push('Low risk profile');
    }

    return reasons.join('. ');
  }

  /**
   * Adapt to new goals from orchestrator
   */
  adaptToGoals(goals) {
    console.log('🧠 Adapting to new goals:', goals);

    // Adjust learning parameters based on goals
    if (goals.riskLevel === 'low') {
      this.confidenceThreshold = 85;
      this.learningRate = 0.05; // More conservative learning
    } else if (goals.riskLevel === 'high') {
      this.confidenceThreshold = 60;
      this.learningRate = 0.2; // More aggressive learning
    }

    // Adjust model weights based on goals
    this.adjustModelsForGoals(goals);
  }

  /**
   * Adjust learning models based on goals
   */
  adjustModelsForGoals(goals) {
    if (goals.riskLevel === 'low') {
      // Increase weight on risk factors
      const riskModel = this.learningModels.get('risk_assessment').model;
      riskModel.riskFactors.slippage *= 1.2;
      riskModel.riskFactors.executionTime *= 1.2;
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
      case 'trade_decision':
        decision = this.makeConsensusTradeDecision(options);
        confidence = 75;
        break;
      case 'risk_assessment':
        decision = this.makeConsensusRiskDecision(options);
        confidence = 80;
        break;
      default:
        decision = options[0]; // Default to first option
    }

    this.emit('consensus_response', {
      from: 'learning_agent',
      topic,
      decision,
      confidence,
      reasoning: `Learning-based decision with ${confidence}% confidence`
    });
  }

  /**
   * Make consensus trade decision
   */
  makeConsensusTradeDecision(options) {
    // Use learned model to choose best option
    let bestOption = options[0];
    let bestScore = 0;

    options.forEach(option => {
      const score = this.predictProfit(option);
      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    });

    return bestOption;
  }

  /**
   * Make consensus risk decision
   */
  makeConsensusRiskDecision(options) {
    // Choose lowest risk option
    let bestOption = options[0];
    let bestRisk = 1;

    options.forEach(option => {
      const risk = this.calculateRiskScore(option);
      if (risk < bestRisk) {
        bestRisk = risk;
        bestOption = option;
      }
    });

    return bestOption;
  }

  /**
   * Get learning statistics
   */
  getLearningStats() {
    return {
      totalSamples: this.performanceData.length,
      models: Array.from(this.learningModels.entries()).map(([name, model]) => ({
        name: model.name,
        accuracy: model.accuracy,
        samples: model.samples
      })),
      adaptations: this.adaptationHistory.length,
      confidence: this.calculateAnalysisConfidence()
    };
  }

  /**
   * Shutdown the learning agent
   */
  async shutdown() {
    console.log('🧠 Shutting down Learning Agent...');
    this.isActive = false;
    console.log('✅ Learning Agent shutdown complete');
  }
}

// Create singleton instance
export const learningAgent = new LearningAgent();