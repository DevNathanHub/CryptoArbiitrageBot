// Self-Optimization Agent
// Automatically tunes parameters, optimizes performance, and adapts bot behavior

import { EventEmitter } from 'events';
import { config } from '../../config/config.js';

/**
 * Self-Optimization Agent
 * Handles automatic parameter tuning and performance optimization
 */
export class SelfOptimizationAgent extends EventEmitter {
  constructor() {
    super();
    this.isActive = false;
    this.optimizationState = {
      currentParameters: {},
      parameterHistory: new Map(),
      optimizationCycles: [],
      performanceMetrics: new Map(),
      adaptationRules: new Map(),
      experimentResults: []
    };

    this.optimizationConfig = {
      adaptationFrequency: 300000, // 5 minutes
      experimentDuration: 3600000, // 1 hour
      minSamplesForOptimization: 20,
      confidenceThreshold: 80,
      maxParameterChange: 0.2, // Maximum 20% change per cycle
      backtestPeriod: 24 * 60 * 60 * 1000 // 24 hours
    };

    // Parameter optimization ranges
    this.parameterRanges = {
      minProfitThreshold: [0.05, 1.0],
      tradeAmountUSDT: [10, 1000],
      maxSlippage: [0.1, 2.0],
      executionTimeout: [1000, 10000],
      scanInterval: [30000, 300000], // 30s to 5min
      websocketUpdateInterval: [1000, 10000]
    };

    // Performance tracking
    this.performanceBaseline = {};
    this.optimizationExperiments = new Map();
  }

  /**
   * Initialize the self-optimization agent
   */
  async initialize() {
    console.log('🔧 Initializing Self-Optimization Agent...');

    // Initialize current parameters from config
    this.initializeCurrentParameters();

    // Setup optimization rules
    this.initializeOptimizationRules();

    this.isActive = true;
    console.log('✅ Self-Optimization Agent initialized');
  }

  /**
   * Initialize current parameters from config
   */
  initializeCurrentParameters() {
    this.optimizationState.currentParameters = {
      minProfitThreshold: config.trading.minProfitThreshold,
      tradeAmountUSDT: config.trading.tradeAmountUSDT,
      maxSlippage: 0.5, // Default
      executionTimeout: 5000, // Default
      scanInterval: 60000, // Default 1 minute
      websocketUpdateInterval: 5000, // Default 5 seconds
      riskMultiplier: 1.0,
      aggressiveness: 0.5 // 0-1 scale
    };

    // Store initial baseline
    this.performanceBaseline = { ...this.optimizationState.currentParameters };
  }

  /**
   * Initialize optimization rules
   */
  initializeOptimizationRules() {
    // Rule: If win rate > 70%, increase trade frequency
    this.optimizationState.adaptationRules.set('high_win_rate', {
      condition: (metrics) => metrics.winRate > 0.7,
      action: (params) => ({
        ...params,
        scanInterval: Math.max(30000, params.scanInterval * 0.8),
        aggressiveness: Math.min(1.0, params.aggressiveness + 0.1)
      }),
      reason: 'High win rate allows more frequent trading'
    });

    // Rule: If win rate < 40%, increase profit threshold and reduce frequency
    this.optimizationState.adaptationRules.set('low_win_rate', {
      condition: (metrics) => metrics.winRate < 0.4,
      action: (params) => ({
        ...params,
        minProfitThreshold: Math.min(1.0, params.minProfitThreshold * 1.2),
        scanInterval: Math.min(300000, params.scanInterval * 1.5),
        aggressiveness: Math.max(0.1, params.aggressiveness - 0.1)
      }),
      reason: 'Low win rate requires more conservative approach'
    });

    // Rule: If average profit > 0.3%, optimize for higher volume
    this.optimizationState.adaptationRules.set('high_profit', {
      condition: (metrics) => metrics.avgProfit > 0.3,
      action: (params) => ({
        ...params,
        tradeAmountUSDT: Math.min(1000, params.tradeAmountUSDT * 1.1),
        riskMultiplier: Math.min(2.0, params.riskMultiplier * 1.05)
      }),
      reason: 'High profits allow increased position sizes'
    });

    // Rule: If drawdown > 2%, implement stricter risk controls
    this.optimizationState.adaptationRules.set('high_drawdown', {
      condition: (metrics) => metrics.drawdown > 0.02,
      action: (params) => ({
        ...params,
        tradeAmountUSDT: Math.max(10, params.tradeAmountUSDT * 0.8),
        riskMultiplier: Math.max(0.5, params.riskMultiplier * 0.9),
        aggressiveness: Math.max(0.1, params.aggressiveness - 0.2)
      }),
      reason: 'High drawdown requires risk reduction'
    });

    // Rule: If execution time > 3000ms, optimize for speed
    this.optimizationState.adaptationRules.set('slow_execution', {
      condition: (metrics) => metrics.avgExecutionTime > 3000,
      action: (params) => ({
        ...params,
        executionTimeout: Math.max(1000, params.executionTimeout * 0.9),
        websocketUpdateInterval: Math.max(1000, params.websocketUpdateInterval * 0.8)
      }),
      reason: 'Slow execution requires timeout optimization'
    });
  }

  /**
   * Receive message from orchestrator
   */
  receiveMessage(message) {
    switch (message.action) {
      case 'optimize_parameters':
        this.optimizeParameters(message.data);
        break;
      case 'run_experiment':
        this.runOptimizationExperiment(message.data);
        break;
      case 'evaluate_performance':
        this.evaluatePerformance(message.data);
        break;
      case 'apply_optimization':
        this.applyOptimization(message.data);
        break;
      case 'goals_updated':
        this.adjustOptimizationForGoals(message.data);
        break;
      case 'consensus_request':
        this.respondToConsensus(message.data);
        break;
      default:
        console.log(`🔧 Self-Optimization Agent: Unknown action ${message.action}`);
    }
  }

  /**
   * Optimize parameters based on performance data
   */
  optimizeParameters(performanceData) {
    console.log('🔧 Running parameter optimization...');

    const { metrics, timeWindow } = performanceData;

    // Calculate optimization suggestions
    const suggestions = this.calculateOptimizationSuggestions(metrics);

    // Validate suggestions against constraints
    const validatedSuggestions = this.validateSuggestions(suggestions);

    // Apply gradual optimization
    const optimizedParameters = this.applyGradualOptimization(validatedSuggestions);

    // Store optimization cycle
    const cycle = {
      timestamp: new Date(),
      inputMetrics: metrics,
      suggestions,
      validatedSuggestions,
      optimizedParameters,
      expectedImprovement: this.estimateImprovement(metrics, optimizedParameters)
    };

    this.optimizationState.optimizationCycles.push(cycle);

    // Emit optimization results
    this.emit('optimization_complete', {
      cycle,
      confidence: this.calculateOptimizationConfidence(cycle)
    });
  }

  /**
   * Calculate optimization suggestions based on metrics
   */
  calculateOptimizationSuggestions(metrics) {
    const suggestions = {};
    const currentParams = this.optimizationState.currentParameters;

    // Apply adaptation rules
    for (const [ruleName, rule] of this.optimizationState.adaptationRules) {
      if (rule.condition(metrics)) {
        const newParams = rule.action(currentParams);
        Object.assign(suggestions, newParams);
        suggestions.appliedRules = suggestions.appliedRules || [];
        suggestions.appliedRules.push({
          rule: ruleName,
          reason: rule.reason
        });
      }
    }

    // Calculate parameter-specific optimizations
    suggestions.parameterOptimizations = this.calculateParameterOptimizations(metrics);

    return suggestions;
  }

  /**
   * Calculate specific parameter optimizations
   */
  calculateParameterOptimizations(metrics) {
    const optimizations = {};
    const currentParams = this.optimizationState.currentParameters;

    // Optimize profit threshold based on win rate and profit distribution
    if (metrics.winRate < 0.5 && metrics.avgProfit < 0.2) {
      optimizations.minProfitThreshold = Math.min(
        currentParams.minProfitThreshold * 1.15,
        this.parameterRanges.minProfitThreshold[1]
      );
    } else if (metrics.winRate > 0.7 && metrics.opportunitiesFound > 10) {
      optimizations.minProfitThreshold = Math.max(
        currentParams.minProfitThreshold * 0.95,
        this.parameterRanges.minProfitThreshold[0]
      );
    }

    // Optimize trade amount based on risk-adjusted returns
    const riskAdjustedReturn = metrics.totalProfit / Math.max(0.01, metrics.maxDrawdown);
    if (riskAdjustedReturn > 5 && metrics.winRate > 0.6) {
      optimizations.tradeAmountUSDT = Math.min(
        currentParams.tradeAmountUSDT * 1.1,
        this.parameterRanges.tradeAmountUSDT[1]
      );
    } else if (riskAdjustedReturn < 2) {
      optimizations.tradeAmountUSDT = Math.max(
        currentParams.tradeAmountUSDT * 0.9,
        this.parameterRanges.tradeAmountUSDT[0]
      );
    }

    // Optimize scan interval based on market volatility and opportunities
    if (metrics.marketVolatility > 0.03 && metrics.opportunitiesFound > 20) {
      optimizations.scanInterval = Math.max(
        currentParams.scanInterval * 0.8,
        this.parameterRanges.scanInterval[0]
      );
    } else if (metrics.opportunitiesFound < 5) {
      optimizations.scanInterval = Math.min(
        currentParams.scanInterval * 1.2,
        this.parameterRanges.scanInterval[1]
      );
    }

    return optimizations;
  }

  /**
   * Validate optimization suggestions
   */
  validateSuggestions(suggestions) {
    const validated = {};
    const currentParams = this.optimizationState.currentParameters;

    Object.entries(suggestions).forEach(([param, value]) => {
      if (typeof value === 'number' && this.parameterRanges[param]) {
        const [min, max] = this.parameterRanges[param];
        const changePercent = Math.abs(value - currentParams[param]) / currentParams[param];

        // Limit change to maximum allowed
        if (changePercent <= this.optimizationConfig.maxParameterChange) {
          validated[param] = Math.max(min, Math.min(max, value));
        } else {
          // Apply maximum allowed change in the right direction
          const direction = value > currentParams[param] ? 1 : -1;
          validated[param] = currentParams[param] * (1 + direction * this.optimizationConfig.maxParameterChange);
          validated[param] = Math.max(min, Math.min(max, validated[param]));
        }
      } else if (param === 'appliedRules' || param === 'parameterOptimizations') {
        validated[param] = value;
      }
    });

    return validated;
  }

  /**
   * Apply gradual optimization to avoid sudden changes
   */
  applyGradualOptimization(validatedSuggestions) {
    const optimized = { ...this.optimizationState.currentParameters };

    // Apply validated suggestions
    Object.entries(validatedSuggestions).forEach(([param, value]) => {
      if (typeof value === 'number') {
        optimized[param] = value;
      }
    });

    // Store parameter history
    Object.keys(optimized).forEach(param => {
      if (!this.optimizationState.parameterHistory.has(param)) {
        this.optimizationState.parameterHistory.set(param, []);
      }

      this.optimizationState.parameterHistory.get(param).push({
        timestamp: new Date(),
        value: optimized[param],
        reason: validatedSuggestions.appliedRules ?
          validatedSuggestions.appliedRules.map(r => r.rule).join(', ') :
          'parameter_optimization'
      });
    });

    return optimized;
  }

  /**
   * Estimate improvement from optimization
   */
  estimateImprovement(currentMetrics, newParameters) {
    // Simple estimation based on historical parameter-performance correlations
    let estimatedImprovement = 0;

    // Estimate profit threshold impact
    if (newParameters.minProfitThreshold !== this.optimizationState.currentParameters.minProfitThreshold) {
      const thresholdChange = newParameters.minProfitThreshold - this.optimizationState.currentParameters.minProfitThreshold;
      // Higher threshold typically reduces opportunities but increases quality
      estimatedImprovement += thresholdChange * 0.1;
    }

    // Estimate trade amount impact
    if (newParameters.tradeAmountUSDT !== this.optimizationState.currentParameters.tradeAmountUSDT) {
      const amountChange = (newParameters.tradeAmountUSDT - this.optimizationState.currentParameters.tradeAmountUSDT) /
                          this.optimizationState.currentParameters.tradeAmountUSDT;
      estimatedImprovement += amountChange * 0.05;
    }

    return estimatedImprovement;
  }

  /**
   * Calculate confidence in optimization
   */
  calculateOptimizationConfidence(cycle) {
    const rulesApplied = cycle.validatedSuggestions.appliedRules?.length || 0;
    const paramsChanged = Object.keys(cycle.validatedSuggestions).filter(
      key => typeof cycle.validatedSuggestions[key] === 'number'
    ).length;

    // Confidence based on number of rules and parameters changed
    const ruleConfidence = Math.min(100, rulesApplied * 25);
    const paramConfidence = Math.min(100, paramsChanged * 20);

    return Math.round((ruleConfidence + paramConfidence) / 2);
  }

  /**
   * Run optimization experiment
   */
  runOptimizationExperiment(experimentConfig) {
    const { parameter, values, duration } = experimentConfig;

    console.log(`🔬 Running optimization experiment for ${parameter}`);

    const experiment = {
      id: `exp_${Date.now()}`,
      parameter,
      values,
      duration: duration || this.optimizationConfig.experimentDuration,
      startTime: new Date(),
      baselineMetrics: this.getCurrentMetrics(),
      results: new Map(),
      status: 'running'
    };

    this.optimizationExperiments.set(experiment.id, experiment);

    // Run experiment for each value
    this.runParameterExperiment(experiment);

    this.emit('experiment_started', { experiment });
  }

  /**
   * Run parameter experiment
   */
  async runParameterExperiment(experiment) {
    const { parameter, values, duration } = experiment;

    for (const value of values) {
      console.log(`Testing ${parameter} = ${value}`);

      // Temporarily set parameter
      const originalValue = this.optimizationState.currentParameters[parameter];
      this.optimizationState.currentParameters[parameter] = value;

      // Wait for experiment duration
      await this.sleep(duration / values.length);

      // Collect metrics
      const metrics = this.getCurrentMetrics();
      experiment.results.set(value, {
        metrics,
        improvement: this.calculateImprovement(metrics, experiment.baselineMetrics)
      });

      // Restore original value
      this.optimizationState.currentParameters[parameter] = originalValue;
    }

    // Analyze results
    this.analyzeExperimentResults(experiment);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics() {
    // This would integrate with actual bot metrics
    // For now, return mock data structure
    return {
      winRate: 0.65,
      avgProfit: 0.25,
      totalProfit: 125.50,
      opportunitiesFound: 45,
      tradesExecuted: 12,
      maxDrawdown: 0.015,
      avgExecutionTime: 2500,
      marketVolatility: 0.025
    };
  }

  /**
   * Calculate improvement over baseline
   */
  calculateImprovement(current, baseline) {
    const profitImprovement = (current.totalProfit - baseline.totalProfit) / Math.max(0.01, baseline.totalProfit);
    const winRateImprovement = current.winRate - baseline.winRate;
    const efficiencyImprovement = (baseline.avgExecutionTime - current.avgExecutionTime) / baseline.avgExecutionTime;

    return {
      profit: profitImprovement,
      winRate: winRateImprovement,
      efficiency: efficiencyImprovement,
      overall: (profitImprovement + winRateImprovement + efficiencyImprovement) / 3
    };
  }

  /**
   * Analyze experiment results
   */
  analyzeExperimentResults(experiment) {
    experiment.status = 'completed';

    // Find best performing value
    let bestValue = null;
    let bestImprovement = -Infinity;

    for (const [value, result] of experiment.results) {
      if (result.improvement.overall > bestImprovement) {
        bestImprovement = result.improvement.overall;
        bestValue = value;
      }
    }

    experiment.bestValue = bestValue;
    experiment.bestImprovement = bestImprovement;

    // Store experiment results
    this.optimizationState.experimentResults.push(experiment);

    this.emit('experiment_completed', {
      experiment,
      recommendation: bestValue
    });
  }

  /**
   * Evaluate current performance
   */
  evaluatePerformance(performanceData) {
    const { metrics, context } = performanceData;

    // Update performance metrics
    this.optimizationState.performanceMetrics.set('current', {
      metrics,
      context,
      timestamp: new Date()
    });

    // Check if optimization is needed
    const needsOptimization = this.checkOptimizationNeeded(metrics);

    if (needsOptimization) {
      this.emit('optimization_needed', {
        metrics,
        reasons: needsOptimization.reasons,
        urgency: needsOptimization.urgency
      });
    }

    // Trigger periodic optimization
    this.checkPeriodicOptimization();
  }

  /**
   * Check if optimization is needed
   */
  checkOptimizationNeeded(metrics) {
    const reasons = [];
    let urgency = 'low';

    // Check win rate
    if (metrics.winRate < 0.4) {
      reasons.push('Low win rate');
      urgency = 'high';
    } else if (metrics.winRate < 0.6) {
      reasons.push('Below average win rate');
      urgency = 'medium';
    }

    // Check profit efficiency
    if (metrics.avgProfit < 0.15) {
      reasons.push('Low average profit');
      urgency = 'medium';
    }

    // Check execution efficiency
    if (metrics.avgExecutionTime > 4000) {
      reasons.push('Slow execution times');
      urgency = 'medium';
    }

    // Check drawdown
    if (metrics.maxDrawdown > 0.03) {
      reasons.push('High drawdown');
      urgency = 'high';
    }

    return reasons.length > 0 ? { reasons, urgency } : false;
  }

  /**
   * Check if periodic optimization should run
   */
  checkPeriodicOptimization() {
    const lastOptimization = this.optimizationState.optimizationCycles[
      this.optimizationState.optimizationCycles.length - 1
    ];

    if (!lastOptimization) return;

    const timeSinceLastOptimization = Date.now() - lastOptimization.timestamp.getTime();

    if (timeSinceLastOptimization > this.optimizationConfig.adaptationFrequency) {
      this.emit('periodic_optimization_due', {
        timeSinceLast: timeSinceLastOptimization,
        lastOptimization
      });
    }
  }

  /**
   * Apply optimization results
   */
  applyOptimization(optimizationData) {
    const { parameters, reason } = optimizationData;

    console.log('🔧 Applying optimization:', reason);

    // Validate and apply parameters
    const validatedParams = {};
    Object.entries(parameters).forEach(([param, value]) => {
      if (this.parameterRanges[param]) {
        const [min, max] = this.parameterRanges[param];
        validatedParams[param] = Math.max(min, Math.min(max, value));
      }
    });

    // Update current parameters
    Object.assign(this.optimizationState.currentParameters, validatedParams);

    // Emit parameter change event
    this.emit('parameters_updated', {
      newParameters: validatedParams,
      reason,
      timestamp: new Date()
    });
  }

  /**
   * Adjust optimization for new goals
   */
  adjustOptimizationForGoals(goals) {
    console.log('🔧 Adjusting optimization for goals:', goals);

    // Adjust optimization aggressiveness based on risk level
    if (goals.riskLevel === 'low') {
      this.optimizationConfig.maxParameterChange = 0.1; // More conservative changes
      this.optimizationConfig.confidenceThreshold = 85; // Require higher confidence
    } else if (goals.riskLevel === 'high') {
      this.optimizationConfig.maxParameterChange = 0.3; // Allow larger changes
      this.optimizationConfig.confidenceThreshold = 70; // Accept lower confidence
    }

    // Adjust optimization frequency
    if (goals.adaptationFrequency) {
      this.optimizationConfig.adaptationFrequency = goals.adaptationFrequency;
    }
  }

  /**
   * Respond to consensus requests
   */
  respondToConsensus(data) {
    const { topic, options, requestingAgent } = data;

    let decision;
    let confidence = 60;

    switch (topic) {
      case 'parameter_optimization':
        decision = this.consensusOnParameterOptimization(options);
        confidence = 85;
        break;
      case 'experiment_design':
        decision = this.consensusOnExperimentDesign(options);
        confidence = 75;
        break;
      default:
        decision = options[0];
    }

    this.emit('consensus_response', {
      from: 'self_optimization_agent',
      topic,
      decision,
      confidence,
      reasoning: `Optimization-based decision with ${confidence}% confidence`
    });
  }

  /**
   * Consensus on parameter optimization
   */
  consensusOnParameterOptimization(options) {
    // Choose optimization with best expected improvement
    return options.reduce((best, current) => {
      const bestImprovement = this.estimateImprovement(this.getCurrentMetrics(), best.parameters);
      const currentImprovement = this.estimateImprovement(this.getCurrentMetrics(), current.parameters);
      return currentImprovement > bestImprovement ? current : best;
    });
  }

  /**
   * Consensus on experiment design
   */
  consensusOnExperimentDesign(options) {
    // Choose experiment with highest potential impact
    return options.reduce((best, current) => {
      const bestImpact = this.calculateExperimentImpact(best);
      const currentImpact = this.calculateExperimentImpact(current);
      return currentImpact > bestImpact ? current : best;
    });
  }

  /**
   * Calculate potential impact of an experiment
   */
  calculateExperimentImpact(experiment) {
    const { parameter, values } = experiment;

    // Estimate impact based on parameter sensitivity
    const sensitivity = {
      minProfitThreshold: 0.8,
      tradeAmountUSDT: 0.6,
      scanInterval: 0.4,
      executionTimeout: 0.3
    };

    const valueRange = Math.max(...values) - Math.min(...values);
    const currentValue = this.optimizationState.currentParameters[parameter];

    return (sensitivity[parameter] || 0.5) * (valueRange / currentValue);
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats() {
    const recentCycles = this.optimizationState.optimizationCycles.slice(-10);

    return {
      totalCycles: this.optimizationState.optimizationCycles.length,
      recentCycles,
      currentParameters: this.optimizationState.currentParameters,
      parameterHistory: Object.fromEntries(
        Array.from(this.optimizationState.parameterHistory.entries()).map(
          ([param, history]) => [param, history.slice(-5)]
        )
      ),
      activeExperiments: Array.from(this.optimizationExperiments.values())
        .filter(exp => exp.status === 'running').length,
      completedExperiments: this.optimizationState.experimentResults.length,
      averageImprovement: recentCycles.length > 0 ?
        recentCycles.reduce((sum, cycle) => sum + cycle.expectedImprovement, 0) / recentCycles.length : 0
    };
  }

  /**
   * Helper function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown the self-optimization agent
   */
  async shutdown() {
    console.log('🔧 Shutting down Self-Optimization Agent...');

    // Stop any running experiments
    for (const [id, experiment] of this.optimizationExperiments) {
      if (experiment.status === 'running') {
        experiment.status = 'cancelled';
      }
    }

    this.isActive = false;
    console.log('✅ Self-Optimization Agent shutdown complete');
  }
}

// Create singleton instance
export const selfOptimizationAgent = new SelfOptimizationAgent();