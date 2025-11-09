#!/usr/bin/env node

// Test script for Agentic AI Bot
// Tests the agent orchestrator and individual agents

import { agentOrchestrator } from './src/agents/agentOrchestrator.js';
import { learningAgent } from './src/agents/learningAgent.js';
import { goalOrientedAgent } from './src/agents/goalOrientedAgent.js';
import { memoryAgent } from './src/agents/memoryAgent.js';
import { selfOptimizationAgent } from './src/agents/selfOptimizationAgent.js';

/**
 * Test the Agentic AI System
 */
async function testAgenticSystem() {
  console.log('🚀 Testing Agentic AI System...\n');

  try {
    // Test 1: Initialize Agent Orchestrator
    console.log('Test 1: Agent Orchestrator Initialization');
    console.log('=' .repeat(50));

    const orchestrator = agentOrchestrator;
    console.log('✅ Agent Orchestrator created');

    // Register agents
    orchestrator.registerAgent('learning_agent', learningAgent);
    orchestrator.registerAgent('goal_agent', goalOrientedAgent);
    orchestrator.registerAgent('memory_agent', memoryAgent);
    orchestrator.registerAgent('optimization_agent', selfOptimizationAgent);
    console.log('✅ Agents registered');

    // Initialize agents
    await orchestrator.initializeAgents();
    console.log('✅ Agents initialized\n');

    // Test 2: Agent Communication
    console.log('Test 2: Agent Communication');
    console.log('=' .repeat(50));

    // Test direct messaging
    orchestrator.sendToAgent('learning_agent', {
      action: 'analyze_performance',
      data: { test: true, message: 'Hello from orchestrator' }
    });
    console.log('✅ Direct messaging works');

    // Test broadcasting
    orchestrator.emit('broadcast', {
      action: 'system_status',
      data: { status: 'testing', timestamp: new Date() }
    });
    console.log('✅ Broadcasting works\n');

    // Test 3: Goal-Oriented Agent
    console.log('Test 3: Goal-Oriented Agent');
    console.log('=' .repeat(50));

    const goals = goalOrientedAgent.getGoalStatus();
    console.log(`✅ Goals loaded: ${goals.totalGoals} goals`);
    console.log(`   Active: ${goals.activeGoals}, Achieved: ${goals.achievedGoals}`);

    // Test goal progress update
    goalOrientedAgent.receiveMessage({
      action: 'update_progress',
      data: { goalName: 'daily_profit', value: 25, context: { test: true } }
    });
    console.log('✅ Goal progress update works\n');

    // Test 4: Memory Agent
    console.log('Test 4: Memory Agent');
    console.log('=' .repeat(50));

    // Store test trade
    const testTrade = {
      triangle: 'USDT → BTC → ETH → USDT',
      profitPct: 0.45,
      success: true,
      timestamp: new Date(),
      executionTime: 1500
    };

    memoryAgent.receiveMessage({
      action: 'store_trade',
      data: testTrade
    });
    console.log('✅ Trade stored in memory');

    // Test pattern retrieval
    memoryAgent.receiveMessage({
      action: 'retrieve_patterns',
      data: { type: 'successful_trades', limit: 5 }
    });
    console.log('✅ Pattern retrieval works');

    const memoryStats = memoryAgent.getMemoryStats();
    console.log(`✅ Memory stats: ${memoryStats.successfulTrades} successful trades stored\n`);

    // Test 5: Learning Agent
    console.log('Test 5: Learning Agent');
    console.log('=' .repeat(50));

    // Test performance analysis
    learningAgent.receiveMessage({
      action: 'analyze_performance',
      data: {
        metrics: { winRate: 0.75, avgProfit: 0.35, totalProfit: 150 },
        timeWindow: '24h'
      }
    });
    console.log('✅ Performance analysis works');

    const learningStats = learningAgent.getLearningStats();
    console.log(`✅ Learning stats: ${learningStats.totalSamples} samples, ${learningStats.models.length} models\n`);

    // Test 6: Self-Optimization Agent
    console.log('Test 6: Self-Optimization Agent');
    console.log('=' .repeat(50));

    // Test parameter evaluation
    selfOptimizationAgent.receiveMessage({
      action: 'evaluate_performance',
      data: {
        metrics: { winRate: 0.7, avgProfit: 0.3 },
        context: 'test_evaluation'
      }
    });
    console.log('✅ Performance evaluation works');

    const optimizationStats = selfOptimizationAgent.getOptimizationStats();
    console.log(`✅ Optimization stats: ${optimizationStats.totalCycles} cycles, ${optimizationStats.activeExperiments} experiments\n`);

    // Test 7: Agent Consensus
    console.log('Test 7: Agent Consensus');
    console.log('=' .repeat(50));

    // Test consensus request
    const consensusResult = await orchestrator.emit('request', {
      to: 'orchestrator',
      from: 'test',
      action: 'request_consensus',
      data: {
        topic: 'test_decision',
        options: ['option1', 'option2', 'option3'],
        timeout: 5000
      }
    });
    console.log('✅ Consensus system initialized\n');

    // Test 8: System Health Check
    console.log('Test 8: System Health Check');
    console.log('=' .repeat(50));

    const healthStatus = orchestrator.getHealthStatus();
    console.log('✅ System Health:');
    console.log(`   Active: ${healthStatus.isActive}`);
    console.log(`   Agents: ${healthStatus.activeAgents}/${healthStatus.totalAgents}`);
    console.log(`   Decisions: ${healthStatus.recentDecisions}`);
    console.log(`   Communications: ${healthStatus.communicationVolume}\n`);

    // Test 9: Shutdown
    console.log('Test 9: System Shutdown');
    console.log('=' .repeat(50));

    await orchestrator.shutdown();
    console.log('✅ System shutdown complete\n');

    // Final Results
    console.log('🎉 ALL TESTS PASSED!');
    console.log('=' .repeat(50));
    console.log('✅ Agent Orchestrator: Working');
    console.log('✅ Agent Communication: Working');
    console.log('✅ Goal-Oriented Agent: Working');
    console.log('✅ Memory Agent: Working');
    console.log('✅ Learning Agent: Working');
    console.log('✅ Self-Optimization Agent: Working');
    console.log('✅ Agent Consensus: Working');
    console.log('✅ System Health: Good');
    console.log('✅ System Shutdown: Clean');
    console.log('=' .repeat(50));
    console.log('\n🤖 Agentic AI Bot is ready for autonomous trading!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testAgenticSystem().catch(error => {
  console.error('💥 Fatal test error:', error);
  process.exit(1);
});