// Agent Orchestrator
// Central coordinator for multiple AI agents in the arbitrage bot

import { EventEmitter } from 'events';
import { config } from '../../config/config.js';

/**
 * Agent Orchestrator
 * Coordinates multiple specialized AI agents for autonomous trading decisions
 */
export class AgentOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.isActive = false;
    this.decisionHistory = [];
    this.agentStates = new Map();
    this.communicationLog = [];
    this.goals = {
      dailyProfitTarget: 50, // USD
      maxDailyLoss: -20, // USD
      riskLevel: 'medium',
      confidenceThreshold: 75,
      adaptationFrequency: 3600000 // 1 hour in ms
    };

    // Initialize agent communication channels
    this.setupCommunicationChannels();
  }

  /**
   * Register a specialized agent
   */
  registerAgent(agentName, agentInstance) {
    this.agents.set(agentName, agentInstance);
    this.agentStates.set(agentName, {
      status: 'registered',
      lastActivity: new Date(),
      performance: 0,
      confidence: 50
    });

    console.log(`🤖 Agent registered: ${agentName}`);

    // Listen for agent messages
    agentInstance.on('message', (message) => {
      this.handleAgentMessage(agentName, message);
    });

    agentInstance.on('decision', (decision) => {
      this.handleAgentDecision(agentName, decision);
    });

    agentInstance.on('error', (error) => {
      this.handleAgentError(agentName, error);
    });
  }

  /**
   * Initialize all registered agents
   */
  async initializeAgents() {
    console.log('\n🤖 Initializing Agent Orchestrator...');

    for (const [agentName, agent] of this.agents) {
      try {
        console.log(`🚀 Initializing ${agentName}...`);
        await agent.initialize();
        this.agentStates.get(agentName).status = 'active';
        console.log(`✅ ${agentName} initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${agentName}:`, error.message);
        this.agentStates.get(agentName).status = 'error';
      }
    }

    this.isActive = true;
    console.log('✅ Agent Orchestrator ready\n');
  }

  /**
   * Setup inter-agent communication channels
   */
  setupCommunicationChannels() {
    this.on('broadcast', (message) => {
      this.broadcastToAgents(message);
    });

    this.on('request', (request) => {
      this.routeRequest(request);
    });
  }

  /**
   * Broadcast message to all agents
   */
  broadcastToAgents(message) {
    const broadcastMessage = {
      type: 'broadcast',
      from: 'orchestrator',
      timestamp: new Date(),
      ...message
    };

    this.communicationLog.push(broadcastMessage);

    for (const [agentName, agent] of this.agents) {
      if (agent.isActive && typeof agent.receiveMessage === 'function') {
        agent.receiveMessage(broadcastMessage);
      }
    }
  }

  /**
   * Send message to specific agent
   */
  sendToAgent(agentName, message) {
    const agent = this.agents.get(agentName);
    if (!agent) {
      console.warn(`⚠️  Agent ${agentName} not found`);
      return;
    }

    const directMessage = {
      type: 'direct',
      from: 'orchestrator',
      to: agentName,
      timestamp: new Date(),
      ...message
    };

    this.communicationLog.push(directMessage);

    if (agent.isActive && typeof agent.receiveMessage === 'function') {
      agent.receiveMessage(directMessage);
    }
  }

  /**
   * Route requests between agents
   */
  routeRequest(request) {
    const { to, from, action, data } = request;

    if (to === 'orchestrator') {
      this.handleRequestFromAgent(from, action, data);
    } else {
      this.sendToAgent(to, {
        action,
        data,
        originalFrom: from
      });
    }
  }

  /**
   * Handle requests from agents
   */
  async handleRequestFromAgent(fromAgent, action, data) {
    switch (action) {
      case 'get_agent_status':
        this.sendToAgent(fromAgent, {
          action: 'status_response',
          data: this.getAgentStatus(data.agentName || fromAgent)
        });
        break;

      case 'update_goals':
        this.updateGoals(data);
        this.broadcastToAgents({
          action: 'goals_updated',
          data: this.goals
        });
        break;

      case 'request_consensus':
        await this.requestAgentConsensus(fromAgent, data);
        break;

      case 'log_decision':
        this.logDecision(data);
        break;

      default:
        console.log(`⚠️  Unknown action from ${fromAgent}: ${action}`);
    }
  }

  /**
   * Request consensus from multiple agents
   */
  async requestAgentConsensus(requestingAgent, data) {
    const { topic, options, timeout = 30000 } = data;
    const responses = new Map();

    // Send request to all agents
    const consensusRequest = {
      action: 'consensus_request',
      data: {
        topic,
        options,
        requestingAgent,
        requestId: Date.now()
      }
    };

    this.broadcastToAgents(consensusRequest);

    // Wait for responses
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(this.calculateConsensus(responses, topic));
      }, timeout);

      const responseHandler = (response) => {
        if (response.topic === topic) {
          responses.set(response.from, response.decision);
          this.removeListener('consensus_response', responseHandler);

          if (responses.size === this.agents.size) {
            clearTimeout(timeoutId);
            resolve(this.calculateConsensus(responses, topic));
          }
        }
      };

      this.on('consensus_response', responseHandler);
    });
  }

  /**
   * Calculate consensus from agent responses
   */
  calculateConsensus(responses, topic) {
    const decisionCounts = new Map();

    for (const decision of responses.values()) {
      decisionCounts.set(decision, (decisionCounts.get(decision) || 0) + 1);
    }

    // Find most common decision
    let maxCount = 0;
    let consensusDecision = null;

    for (const [decision, count] of decisionCounts) {
      if (count > maxCount) {
        maxCount = count;
        consensusDecision = decision;
      }
    }

    const confidence = (maxCount / responses.size) * 100;

    return {
      topic,
      consensus: consensusDecision,
      confidence,
      totalResponses: responses.size,
      breakdown: Object.fromEntries(decisionCounts)
    };
  }

  /**
   * Handle messages from agents
   */
  handleAgentMessage(agentName, message) {
    this.communicationLog.push({
      type: 'agent_message',
      from: agentName,
      timestamp: new Date(),
      message
    });

    // Update agent activity
    this.agentStates.get(agentName).lastActivity = new Date();

    // Emit for external listeners
    this.emit('agent_message', { agentName, message });
  }

  /**
   * Handle decisions from agents
   */
  handleAgentDecision(agentName, decision) {
    const decisionRecord = {
      agent: agentName,
      decision,
      timestamp: new Date(),
      context: decision.context || {}
    };

    this.decisionHistory.push(decisionRecord);

    // Update agent performance based on decision outcomes
    this.updateAgentPerformance(agentName, decision);

    // Emit for external listeners
    this.emit('agent_decision', decisionRecord);
  }

  /**
   * Handle errors from agents
   */
  handleAgentError(agentName, error) {
    console.error(`❌ Agent ${agentName} error:`, error);

    this.agentStates.get(agentName).status = 'error';
    this.agentStates.get(agentName).lastError = error;

    // Emit for external listeners
    this.emit('agent_error', { agentName, error });
  }

  /**
   * Update agent performance metrics
   */
  updateAgentPerformance(agentName, decision) {
    const state = this.agentStates.get(agentName);

    // Simple performance tracking - can be enhanced
    if (decision.confidence > 70) {
      state.performance += 1;
    } else if (decision.confidence < 30) {
      state.performance -= 1;
    }

    state.confidence = decision.confidence || state.confidence;
  }

  /**
   * Get status of specific agent
   */
  getAgentStatus(agentName) {
    return this.agentStates.get(agentName) || null;
  }

  /**
   * Get status of all agents
   */
  getAllAgentStatuses() {
    const statuses = {};
    for (const [name, state] of this.agentStates) {
      statuses[name] = state;
    }
    return statuses;
  }

  /**
   * Update orchestrator goals
   */
  updateGoals(newGoals) {
    Object.assign(this.goals, newGoals);
    console.log('🎯 Goals updated:', this.goals);
  }

  /**
   * Log important decisions
   */
  logDecision(decision) {
    this.decisionHistory.push({
      ...decision,
      loggedBy: 'orchestrator',
      timestamp: new Date()
    });
  }

  /**
   * Get recent decision history
   */
  getDecisionHistory(limit = 10) {
    return this.decisionHistory.slice(-limit);
  }

  /**
   * Get communication log
   */
  getCommunicationLog(limit = 50) {
    return this.communicationLog.slice(-limit);
  }

  /**
   * Shutdown orchestrator and all agents
   */
  async shutdown() {
    console.log('\n🤖 Shutting down Agent Orchestrator...');

    this.isActive = false;

    for (const [agentName, agent] of this.agents) {
      try {
        if (typeof agent.shutdown === 'function') {
          await agent.shutdown();
        }
        this.agentStates.get(agentName).status = 'shutdown';
      } catch (error) {
        console.error(`❌ Error shutting down ${agentName}:`, error.message);
      }
    }

    console.log('✅ Agent Orchestrator shutdown complete\n');
  }

  /**
   * Get orchestrator health status
   */
  getHealthStatus() {
    const activeAgents = Array.from(this.agentStates.values())
      .filter(state => state.status === 'active').length;

    return {
      isActive: this.isActive,
      totalAgents: this.agents.size,
      activeAgents,
      inactiveAgents: this.agents.size - activeAgents,
      goals: this.goals,
      recentDecisions: this.decisionHistory.length,
      communicationVolume: this.communicationLog.length
    };
  }
}

// Create singleton instance
export const agentOrchestrator = new AgentOrchestrator();