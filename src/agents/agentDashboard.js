// Agent Monitoring Dashboard
// Real-time monitoring and visualization of agent performance

import { agentOrchestrator } from './agentOrchestrator.js';
import { learningAgent } from './learningAgent.js';
import { goalOrientedAgent } from './goalOrientedAgent.js';
import { memoryAgent } from './memoryAgent.js';
import { selfOptimizationAgent } from './selfOptimizationAgent.js';

/**
 * Agent Dashboard for monitoring and visualization
 */
export class AgentDashboard {
  constructor() {
    this.updateInterval = 5000; // 5 seconds
    this.isRunning = false;
    this.lastUpdate = null;
  }

  /**
   * Start the dashboard
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('\n🤖 AGENT MONITORING DASHBOARD');
    console.log('=' .repeat(80));
    console.log('Real-time monitoring of Agentic AI Bot performance');
    console.log('Press Ctrl+C to stop\n');

    this.displayDashboard();

    // Update dashboard periodically
    this.interval = setInterval(() => {
      this.displayDashboard();
    }, this.updateInterval);
  }

  /**
   * Stop the dashboard
   */
  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('\n📊 Dashboard stopped\n');
  }

  /**
   * Display the complete dashboard
   */
  displayDashboard() {
    // Clear console for clean display
    console.clear();

    const timestamp = new Date().toLocaleString();
    console.log(`🤖 AGENTIC AI BOT DASHBOARD - ${timestamp}`);
    console.log('='.repeat(80));

    try {
      this.displaySystemHealth();
      this.displayAgentStatuses();
      this.displayGoalProgress();
      this.displayLearningMetrics();
      this.displayMemoryStats();
      this.displayOptimizationStatus();
      this.displayRecentActivity();

      console.log('='.repeat(80));
      console.log(`Last Update: ${new Date().toLocaleTimeString()} | Refresh: ${this.updateInterval/1000}s`);
      console.log('Ctrl+C to exit\n');

    } catch (error) {
      console.error('Dashboard error:', error.message);
    }
  }

  /**
   * Display system health overview
   */
  displaySystemHealth() {
    const health = agentOrchestrator.getHealthStatus();

    console.log('\n🏥 SYSTEM HEALTH');
    console.log('-'.repeat(40));

    const status = health.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE';
    console.log(`Status: ${status}`);
    console.log(`Uptime: ${this.formatUptime(health.uptime || 0)}`);
    console.log(`Agents: ${health.activeAgents}/${health.totalAgents} active`);
    console.log(`Decisions: ${health.recentDecisions}`);
    console.log(`Communications: ${health.communicationVolume}`);
  }

  /**
   * Display individual agent statuses
   */
  displayAgentStatuses() {
    const statuses = agentOrchestrator.getAllAgentStatuses();

    console.log('\n🤖 AGENT STATUSES');
    console.log('-'.repeat(40));

    Object.entries(statuses).forEach(([agentName, status]) => {
      const statusIcon = status.status === 'active' ? '🟢' :
                        status.status === 'error' ? '🔴' : '🟡';
      const lastActivity = status.lastActivity ?
        Math.round((Date.now() - status.lastActivity.getTime()) / 1000) + 's ago' : 'Never';

      console.log(`${statusIcon} ${this.formatAgentName(agentName)}`);
      console.log(`   Status: ${status.status.toUpperCase()}`);
      console.log(`   Performance: ${status.performance || 0}`);
      console.log(`   Confidence: ${status.confidence || 0}%`);
      console.log(`   Last Activity: ${lastActivity}`);
      console.log('');
    });
  }

  /**
   * Display goal progress
   */
  displayGoalProgress() {
    const goalStatus = goalOrientedAgent.getGoalStatus();

    console.log('🎯 GOAL PROGRESS');
    console.log('-'.repeat(40));

    goalStatus.goals.forEach(goal => {
      const progressBar = this.createProgressBar(goal.progress, 20);
      const statusIcon = goal.status === 'achieved' ? '✅' :
                        goal.status === 'active' ? '🔄' : '⏸️';

      console.log(`${statusIcon} ${goal.name}`);
      console.log(`   Progress: ${progressBar} ${goal.progress.toFixed(1)}%`);
      console.log(`   Current: ${goal.current?.toFixed ? goal.current.toFixed(2) : goal.current}`);
      console.log(`   Target: ${goal.target}`);
      console.log(`   Status: ${goal.status.toUpperCase()}`);
      console.log('');
    });
  }

  /**
   * Display learning metrics
   */
  displayLearningMetrics() {
    const learningStats = learningAgent.getLearningStats();

    console.log('🧠 LEARNING METRICS');
    console.log('-'.repeat(40));

    console.log(`Total Samples: ${learningStats.totalSamples}`);
    console.log(`Models: ${learningStats.models.length}`);
    console.log(`Overall Confidence: ${learningStats.confidence}%`);

    learningStats.models.forEach(model => {
      const accuracyBar = this.createProgressBar(model.accuracy * 100, 15);
      console.log(`${model.name}: ${accuracyBar} ${(model.accuracy * 100).toFixed(1)}% (${model.samples} samples)`);
    });
  }

  /**
   * Display memory statistics
   */
  displayMemoryStats() {
    const memoryStats = memoryAgent.getMemoryStats();

    console.log('\n🧠 MEMORY STATISTICS');
    console.log('-'.repeat(40));

    console.log(`Successful Trades: ${memoryStats.successfulTrades}`);
    console.log(`Failed Trades: ${memoryStats.failedTrades}`);
    console.log(`Market Patterns: ${memoryStats.marketPatterns}`);
    console.log(`Correlation Patterns: ${memoryStats.correlationPatterns}`);
    console.log(`Strategy Performance: ${memoryStats.strategyPerformance}`);

    console.log('\nTemporal Coverage:');
    Object.entries(memoryStats.temporalPatterns).forEach(([timeframe, patterns]) => {
      console.log(`   ${timeframe}: ${patterns.patterns} patterns`);
    });
  }

  /**
   * Display optimization status
   */
  displayOptimizationStatus() {
    const optimizationStats = selfOptimizationAgent.getOptimizationStats();

    console.log('\n🔧 OPTIMIZATION STATUS');
    console.log('-'.repeat(40));

    console.log(`Optimization Cycles: ${optimizationStats.totalCycles}`);
    console.log(`Active Experiments: ${optimizationStats.activeExperiments}`);
    console.log(`Completed Experiments: ${optimizationStats.completedExperiments}`);
    console.log(`Average Improvement: ${(optimizationStats.averageImprovement * 100).toFixed(2)}%`);

    if (optimizationStats.recentCycles.length > 0) {
      console.log('\nRecent Optimizations:');
      optimizationStats.recentCycles.slice(0, 3).forEach((cycle, i) => {
        const improvement = cycle.expectedImprovement > 0 ? '+' : '';
        console.log(`   ${i + 1}. ${(improvement + cycle.expectedImprovement * 100).toFixed(2)}% expected improvement`);
      });
    }
  }

  /**
   * Display recent agent activity
   */
  displayRecentActivity() {
    const recentDecisions = agentOrchestrator.getDecisionHistory(5);
    const recentCommunications = agentOrchestrator.getCommunicationLog(3);

    console.log('\n📈 RECENT ACTIVITY');
    console.log('-'.repeat(40));

    if (recentDecisions.length > 0) {
      console.log('Recent Decisions:');
      recentDecisions.forEach(decision => {
        const timeAgo = Math.round((Date.now() - decision.timestamp.getTime()) / 1000);
        console.log(`   ${decision.agent}: ${decision.type} (${timeAgo}s ago)`);
      });
    }

    if (recentCommunications.length > 0) {
      console.log('\nRecent Communications:');
      recentCommunications.forEach(comm => {
        const timeAgo = Math.round((Date.now() - new Date(comm.timestamp).getTime()) / 1000);
        console.log(`   ${comm.from} → ${comm.to || 'broadcast'} (${timeAgo}s ago)`);
      });
    }
  }

  /**
   * Create a progress bar
   */
  createProgressBar(percentage, width) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}]`;
  }

  /**
   * Format agent name for display
   */
  formatAgentName(agentName) {
    const nameMap = {
      'learning_agent': 'Learning Agent',
      'goal_agent': 'Goal-Oriented Agent',
      'memory_agent': 'Memory Agent',
      'optimization_agent': 'Self-Optimization Agent'
    };
    return nameMap[agentName] || agentName;
  }

  /**
   * Format uptime display
   */
  formatUptime(ms) {
    if (!ms) return '0s';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get dashboard data for external use
   */
  getDashboardData() {
    return {
      systemHealth: agentOrchestrator.getHealthStatus(),
      agentStatuses: agentOrchestrator.getAllAgentStatuses(),
      goalStatus: goalOrientedAgent.getGoalStatus(),
      learningStats: learningAgent.getLearningStats(),
      memoryStats: memoryAgent.getMemoryStats(),
      optimizationStats: selfOptimizationAgent.getOptimizationStats(),
      timestamp: new Date()
    };
  }
}

// Create singleton instance
export const agentDashboard = new AgentDashboard();

// Handle graceful shutdown
process.on('SIGINT', () => {
  agentDashboard.stop();
  process.exit(0);
});

// If run directly, start the dashboard
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting Agent Dashboard...');
  agentDashboard.start();
}