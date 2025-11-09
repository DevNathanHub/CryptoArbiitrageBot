// Goal-Oriented Agent
// Manages objectives, tracks progress, and makes goal-directed decisions

import { EventEmitter } from 'events';
import { config } from '../../config/config.js';

/**
 * Goal-Oriented Agent
 * Manages trading objectives and ensures goal-directed behavior
 */
export class GoalOrientedAgent extends EventEmitter {
  constructor() {
    super();
    this.isActive = false;
    this.goals = new Map();
    this.currentObjectives = [];
    this.progressTracking = new Map();
    this.goalHierarchy = new Map();
    this.constraintMonitoring = new Map();

    // Goal types
    this.goalTypes = {
      PROFIT_TARGET: 'profit_target',
      RISK_LIMIT: 'risk_limit',
      PERFORMANCE_MAINTENANCE: 'performance_maintenance',
      MARKET_TIMING: 'market_timing',
      STRATEGY_OPTIMIZATION: 'strategy_optimization'
    };

    // Initialize default goals
    this.initializeDefaultGoals();
  }

  /**
   * Initialize the goal-oriented agent
   */
  async initialize() {
    console.log('🎯 Initializing Goal-Oriented Agent...');

    this.isActive = true;
    console.log('✅ Goal-Oriented Agent initialized');
  }

  /**
   * Initialize default goals
   */
  initializeDefaultGoals() {
    // Daily profit goal
    this.setGoal('daily_profit', {
      type: this.goalTypes.PROFIT_TARGET,
      target: 50, // USD
      current: 0,
      timeframe: 'daily',
      priority: 'high',
      constraints: {
        maxLoss: -20,
        maxTrades: 20
      },
      status: 'active',
      created: new Date()
    });

    // Risk management goal
    this.setGoal('risk_management', {
      type: this.goalTypes.RISK_LIMIT,
      target: 0.02, // 2% max drawdown
      current: 0,
      timeframe: 'daily',
      priority: 'critical',
      constraints: {
        stopLoss: 0.01, // 1% stop loss per trade
        maxPositionSize: 0.1 // 10% of capital per trade
      },
      status: 'active',
      created: new Date()
    });

    // Performance maintenance goal
    this.setGoal('performance_maintenance', {
      type: this.goalTypes.PERFORMANCE_MAINTENANCE,
      target: 0.75, // 75% win rate
      current: 0,
      timeframe: 'rolling_24h',
      priority: 'medium',
      constraints: {
        minTrades: 10,
        maxConsecutiveLosses: 3
      },
      status: 'active',
      created: new Date()
    });

    // Market timing goal
    this.setGoal('market_timing', {
      type: this.goalTypes.MARKET_TIMING,
      target: 'optimal_hours',
      current: 'any',
      timeframe: 'daily',
      priority: 'medium',
      constraints: {
        bestHours: [9, 10, 14, 15], // Example hours
        avoidHours: [2, 3, 4] // Example hours to avoid
      },
      status: 'active',
      created: new Date()
    });
  }

  /**
   * Receive message from orchestrator
   */
  receiveMessage(message) {
    switch (message.action) {
      case 'set_goal':
        this.setGoal(message.data.name, message.data.goal);
        break;
      case 'update_progress':
        this.updateProgress(message.data);
        break;
      case 'check_constraints':
        this.checkConstraints(message.data);
        break;
      case 'evaluate_objectives':
        this.evaluateObjectives();
        break;
      case 'goals_updated':
        this.adjustGoalsToGlobal(message.data);
        break;
      case 'consensus_request':
        this.respondToConsensus(message.data);
        break;
      default:
        console.log(`🎯 Goal Agent: Unknown action ${message.action}`);
    }
  }

  /**
   * Set a new goal
   */
  setGoal(name, goal) {
    console.log(`🎯 Setting goal: ${name}`);

    this.goals.set(name, {
      ...goal,
      name,
      progress: 0,
      lastUpdated: new Date(),
      achievements: [],
      failures: []
    });

    // Initialize progress tracking
    this.progressTracking.set(name, {
      history: [],
      milestones: [],
      alerts: []
    });

    this.emit('goal_set', { name, goal });
  }

  /**
   * Update progress towards goals
   */
  updateProgress(progressData) {
    const { goalName, value, context } = progressData;

    if (!this.goals.has(goalName)) {
      console.warn(`⚠️  Goal ${goalName} not found`);
      return;
    }

    const goal = this.goals.get(goalName);
    const previousValue = goal.current;

    // Update current value
    goal.current = value;
    goal.lastUpdated = new Date();

    // Calculate progress percentage
    goal.progress = this.calculateProgress(goal);

    // Record progress history
    const progressEntry = {
      timestamp: new Date(),
      value,
      previousValue,
      progress: goal.progress,
      context
    };

    this.progressTracking.get(goalName).history.push(progressEntry);

    // Check for milestones
    this.checkMilestones(goal, progressEntry);

    // Check constraints
    this.checkGoalConstraints(goal);

    // Emit progress update
    this.emit('progress_update', {
      goalName,
      goal,
      progressEntry
    });

    // Check if goal is achieved
    if (this.isGoalAchieved(goal)) {
      this.handleGoalAchievement(goal);
    }
  }

  /**
   * Calculate progress percentage for a goal
   */
  calculateProgress(goal) {
    switch (goal.type) {
      case this.goalTypes.PROFIT_TARGET:
        return Math.min(100, (goal.current / goal.target) * 100);

      case this.goalTypes.RISK_LIMIT:
        // For risk limits, progress is how close we are to the limit
        return Math.min(100, Math.abs(goal.current / goal.target) * 100);

      case this.goalTypes.PERFORMANCE_MAINTENANCE:
        return Math.min(100, (goal.current / goal.target) * 100);

      case this.goalTypes.MARKET_TIMING:
        // For timing goals, check if current time is optimal
        return this.evaluateTimingProgress(goal);

      default:
        return 0;
    }
  }

  /**
   * Evaluate timing goal progress
   */
  evaluateTimingProgress(goal) {
    const currentHour = new Date().getHours();
    const bestHours = goal.constraints.bestHours || [];
    const avoidHours = goal.constraints.avoidHours || [];

    if (bestHours.includes(currentHour)) {
      return 100; // Optimal timing
    } else if (avoidHours.includes(currentHour)) {
      return 0; // Poor timing
    } else {
      return 50; // Neutral timing
    }
  }

  /**
   * Check for milestone achievements
   */
  checkMilestones(goal, progressEntry) {
    const milestones = [25, 50, 75, 90, 100];
    const tracking = this.progressTracking.get(goal.name);

    milestones.forEach(milestone => {
      if (progressEntry.progress >= milestone &&
          !tracking.milestones.includes(milestone)) {
        tracking.milestones.push(milestone);

        this.emit('milestone_reached', {
          goalName: goal.name,
          milestone,
          goal,
          progressEntry
        });
      }
    });
  }

  /**
   * Check goal-specific constraints
   */
  checkGoalConstraints(goal) {
    const violations = [];

    if (goal.constraints) {
      // Check profit/loss limits
      if (goal.type === this.goalTypes.PROFIT_TARGET) {
        if (goal.current <= goal.constraints.maxLoss) {
          violations.push({
            type: 'max_loss_exceeded',
            message: `Daily loss limit exceeded: ${goal.current} <= ${goal.constraints.maxLoss}`,
            severity: 'critical'
          });
        }
      }

      // Check risk limits
      if (goal.type === this.goalTypes.RISK_LIMIT) {
        if (Math.abs(goal.current) >= goal.target) {
          violations.push({
            type: 'risk_limit_exceeded',
            message: `Risk limit exceeded: ${Math.abs(goal.current)} >= ${goal.target}`,
            severity: 'critical'
          });
        }
      }

      // Check performance constraints
      if (goal.type === this.goalTypes.PERFORMANCE_MAINTENANCE) {
        // Add performance-specific constraint checks
      }
    }

    if (violations.length > 0) {
      this.handleConstraintViolations(goal, violations);
    }
  }

  /**
   * Handle constraint violations
   */
  handleConstraintViolations(goal, violations) {
    violations.forEach(violation => {
      console.warn(`🚨 Goal constraint violation: ${goal.name} - ${violation.message}`);

      // Record violation
      const tracking = this.progressTracking.get(goal.name);
      tracking.alerts.push({
        timestamp: new Date(),
        violation,
        goal: goal.name
      });

      // Emit violation event
      this.emit('constraint_violation', {
        goalName: goal.name,
        violation,
        goal
      });

      // Take corrective action based on severity
      if (violation.severity === 'critical') {
        this.takeCorrectiveAction(goal, violation);
      }
    });
  }

  /**
   * Take corrective action for critical violations
   */
  takeCorrectiveAction(goal, violation) {
    switch (violation.type) {
      case 'max_loss_exceeded':
        this.emit('decision', {
          type: 'emergency_stop',
          reason: 'Daily loss limit exceeded',
          action: 'halt_trading',
          goal: goal.name,
          confidence: 100
        });
        break;

      case 'risk_limit_exceeded':
        this.emit('decision', {
          type: 'risk_mitigation',
          reason: 'Risk limit exceeded',
          action: 'reduce_position_sizes',
          goal: goal.name,
          confidence: 95
        });
        break;
    }
  }

  /**
   * Check if a goal is achieved
   */
  isGoalAchieved(goal) {
    switch (goal.type) {
      case this.goalTypes.PROFIT_TARGET:
        return goal.current >= goal.target;

      case this.goalTypes.RISK_LIMIT:
        return Math.abs(goal.current) < goal.target;

      case this.goalTypes.PERFORMANCE_MAINTENANCE:
        return goal.current >= goal.target;

      case this.goalTypes.MARKET_TIMING:
        return goal.progress >= 80; // Consider achieved if timing is good

      default:
        return false;
    }
  }

  /**
   * Handle goal achievement
   */
  handleGoalAchievement(goal) {
    console.log(`🎉 Goal achieved: ${goal.name} (${goal.progress.toFixed(1)}%)`);

    goal.status = 'achieved';
    goal.achievedAt = new Date();

    // Record achievement
    goal.achievements.push({
      timestamp: new Date(),
      value: goal.current,
      target: goal.target
    });

    // Emit achievement event
    this.emit('goal_achieved', {
      goalName: goal.name,
      goal,
      achievement: goal.achievements[goal.achievements.length - 1]
    });

    // Set new goal or maintain current level
    this.planNextGoal(goal);
  }

  /**
   * Plan next goal after achievement
   */
  planNextGoal(achievedGoal) {
    switch (achievedGoal.type) {
      case this.goalTypes.PROFIT_TARGET:
        // Increase profit target by 10%
        const newProfitTarget = achievedGoal.target * 1.1;
        this.setGoal(`${achievedGoal.name}_next`, {
          type: this.goalTypes.PROFIT_TARGET,
          target: newProfitTarget,
          current: 0,
          timeframe: 'daily',
          priority: 'high',
          constraints: achievedGoal.constraints,
          status: 'pending'
        });
        break;

      case this.goalTypes.PERFORMANCE_MAINTENANCE:
        // Maintain or slightly increase performance target
        const newPerfTarget = Math.min(0.85, achievedGoal.target + 0.02);
        this.setGoal(`${achievedGoal.name}_maintain`, {
          type: this.goalTypes.PERFORMANCE_MAINTENANCE,
          target: newPerfTarget,
          current: achievedGoal.current,
          timeframe: 'rolling_24h',
          priority: 'medium',
          constraints: achievedGoal.constraints,
          status: 'active'
        });
        break;
    }
  }

  /**
   * Check system-wide constraints
   */
  checkConstraints(constraintData) {
    const { type, value, context } = constraintData;
    let violation = null;

    switch (type) {
      case 'daily_loss':
        const dailyLossGoal = this.goals.get('risk_management');
        if (dailyLossGoal && value <= dailyLossGoal.constraints.maxLoss) {
          violation = {
            type: 'daily_loss_limit',
            message: `Daily loss limit reached: ${value}`,
            severity: 'critical'
          };
        }
        break;

      case 'consecutive_losses':
        const perfGoal = this.goals.get('performance_maintenance');
        if (perfGoal && value >= perfGoal.constraints.maxConsecutiveLosses) {
          violation = {
            type: 'consecutive_losses',
            message: `Too many consecutive losses: ${value}`,
            severity: 'high'
          };
        }
        break;

      case 'market_volatility':
        if (value > 0.05) { // 5% volatility threshold
          violation = {
            type: 'high_volatility',
            message: `High market volatility detected: ${(value * 100).toFixed(2)}%`,
            severity: 'medium'
          };
        }
        break;
    }

    if (violation) {
      this.emit('constraint_violation', {
        type: 'system_constraint',
        violation,
        context
      });
    }
  }

  /**
   * Evaluate current objectives and make decisions
   */
  evaluateObjectives() {
    const activeGoals = Array.from(this.goals.values())
      .filter(goal => goal.status === 'active');

    const objectives = activeGoals.map(goal => ({
      goal: goal.name,
      priority: this.calculateObjectivePriority(goal),
      urgency: this.calculateObjectiveUrgency(goal),
      progress: goal.progress,
      status: goal.status
    }));

    // Sort by priority and urgency
    objectives.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.urgency - a.urgency;
    });

    this.currentObjectives = objectives;

    // Make decisions based on objectives
    const decisions = this.generateObjectiveDecisions(objectives);

    decisions.forEach(decision => {
      this.emit('decision', decision);
    });
  }

  /**
   * Calculate objective priority
   */
  calculateObjectivePriority(goal) {
    const priorityMap = { critical: 100, high: 75, medium: 50, low: 25 };
    let priority = priorityMap[goal.priority] || 50;

    // Increase priority based on progress
    if (goal.progress < 25) {
      priority += 20; // Urgent catch-up
    } else if (goal.progress > 90) {
      priority += 10; // Close to achievement
    }

    return Math.min(100, priority);
  }

  /**
   * Calculate objective urgency
   */
  calculateObjectiveUrgency(goal) {
    const timeSinceUpdate = Date.now() - goal.lastUpdated.getTime();
    const hoursSinceUpdate = timeSinceUpdate / (1000 * 60 * 60);

    let urgency = 50;

    // Increase urgency based on time since last progress
    if (hoursSinceUpdate > 24) {
      urgency += 30;
    } else if (hoursSinceUpdate > 12) {
      urgency += 20;
    } else if (hoursSinceUpdate > 6) {
      urgency += 10;
    }

    // Increase urgency for critical goals
    if (goal.priority === 'critical') {
      urgency += 20;
    }

    return Math.min(100, urgency);
  }

  /**
   * Generate decisions based on objectives
   */
  generateObjectiveDecisions(objectives) {
    const decisions = [];

    // Check if we need to halt trading due to risk
    const riskObjective = objectives.find(obj => obj.goal === 'risk_management');
    if (riskObjective && riskObjective.urgency > 80) {
      decisions.push({
        type: 'risk_control',
        action: 'reduce_trading_activity',
        reason: 'High risk urgency detected',
        confidence: 90,
        objective: riskObjective
      });
    }

    // Check if profit target is achievable
    const profitObjective = objectives.find(obj => obj.goal === 'daily_profit');
    if (profitObjective && profitObjective.progress < 50) {
      const timeLeft = this.calculateTimeLeftInPeriod('daily');
      if (timeLeft < 0.3) { // Less than 30% of day left
        decisions.push({
          type: 'profit_acceleration',
          action: 'increase_aggressive_trading',
          reason: 'Profit target behind schedule with limited time',
          confidence: 75,
          objective: profitObjective
        });
      }
    }

    // Check performance maintenance
    const perfObjective = objectives.find(obj => obj.goal === 'performance_maintenance');
    if (perfObjective && perfObjective.progress < 60) {
      decisions.push({
        type: 'performance_improvement',
        action: 'implement_conservative_strategy',
        reason: 'Performance below target',
        confidence: 80,
        objective: perfObjective
      });
    }

    return decisions;
  }

  /**
   * Calculate time left in current period
   */
  calculateTimeLeftInPeriod(period) {
    const now = new Date();
    const endOfPeriod = new Date(now);

    switch (period) {
      case 'daily':
        endOfPeriod.setHours(23, 59, 59, 999);
        break;
      case 'hourly':
        endOfPeriod.setMinutes(59, 59, 999);
        break;
    }

    const totalPeriod = endOfPeriod.getTime() - (new Date(now.getFullYear(), now.getMonth(), now.getDate())).getTime();
    const timeLeft = endOfPeriod.getTime() - now.getTime();

    return timeLeft / totalPeriod;
  }

  /**
   * Adjust goals based on global orchestrator goals
   */
  adjustGoalsToGlobal(globalGoals) {
    console.log('🎯 Adjusting goals to global objectives:', globalGoals);

    // Adjust risk tolerance
    if (globalGoals.riskLevel) {
      const riskGoal = this.goals.get('risk_management');
      if (riskGoal) {
        switch (globalGoals.riskLevel) {
          case 'low':
            riskGoal.target = 0.01; // 1% max drawdown
            riskGoal.constraints.stopLoss = 0.005; // 0.5% stop loss
            break;
          case 'high':
            riskGoal.target = 0.05; // 5% max drawdown
            riskGoal.constraints.stopLoss = 0.02; // 2% stop loss
            break;
          default: // medium
            riskGoal.target = 0.02; // 2% max drawdown
            riskGoal.constraints.stopLoss = 0.01; // 1% stop loss
        }
      }
    }

    // Adjust profit targets
    if (globalGoals.dailyProfitTarget) {
      const profitGoal = this.goals.get('daily_profit');
      if (profitGoal) {
        profitGoal.target = globalGoals.dailyProfitTarget;
      }
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
      case 'goal_priority':
        decision = this.evaluateGoalPriority(options);
        confidence = 85;
        break;
      case 'risk_decision':
        decision = this.evaluateRiskDecision(options);
        confidence = 90;
        break;
      case 'timing_decision':
        decision = this.evaluateTimingDecision(options);
        confidence = 75;
        break;
      default:
        decision = options[0];
    }

    this.emit('consensus_response', {
      from: 'goal_agent',
      topic,
      decision,
      confidence,
      reasoning: `Goal-oriented decision with ${confidence}% confidence`
    });
  }

  /**
   * Evaluate goal priority for consensus
   */
  evaluateGoalPriority(options) {
    // Choose option that best aligns with current objectives
    return options.reduce((best, current) => {
      const bestPriority = this.calculateObjectivePriority({ name: best, priority: 'medium' });
      const currentPriority = this.calculateObjectivePriority({ name: current, priority: 'medium' });
      return currentPriority > bestPriority ? current : best;
    });
  }

  /**
   * Evaluate risk decision for consensus
   */
  evaluateRiskDecision(options) {
    // Choose most conservative option that still meets objectives
    const riskGoal = this.goals.get('risk_management');
    if (riskGoal && riskGoal.current < riskGoal.target * 0.8) {
      // We're well within risk limits, can be more aggressive
      return options[options.length - 1]; // Most aggressive
    } else {
      // Close to risk limits, be conservative
      return options[0]; // Most conservative
    }
  }

  /**
   * Evaluate timing decision for consensus
   */
  evaluateTimingDecision(options) {
    const timingGoal = this.goals.get('market_timing');
    if (timingGoal) {
      const currentProgress = timingGoal.progress;
      // Choose timing that maximizes goal progress
      return options.reduce((best, current) => {
        // This is a simplified evaluation - in practice would analyze each option
        return current; // For now, return the current option
      });
    }
    return options[0];
  }

  /**
   * Get goal status summary
   */
  getGoalStatus() {
    const goals = Array.from(this.goals.values()).map(goal => ({
      name: goal.name,
      type: goal.type,
      progress: goal.progress,
      status: goal.status,
      priority: goal.priority,
      current: goal.current,
      target: goal.target,
      lastUpdated: goal.lastUpdated
    }));

    return {
      totalGoals: goals.length,
      activeGoals: goals.filter(g => g.status === 'active').length,
      achievedGoals: goals.filter(g => g.status === 'achieved').length,
      goals,
      currentObjectives: this.currentObjectives
    };
  }

  /**
   * Shutdown the goal-oriented agent
   */
  async shutdown() {
    console.log('🎯 Shutting down Goal-Oriented Agent...');
    this.isActive = false;
    console.log('✅ Goal-Oriented Agent shutdown complete');
  }
}

// Create singleton instance
export const goalOrientedAgent = new GoalOrientedAgent();