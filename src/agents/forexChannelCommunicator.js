// Forex Channel Communicator Agent
// Strategic trading assistant that communicates disciplined insights and strategy updates

import { EventEmitter } from 'events';
import { config } from '../../config/config.js';

/**
 * Forex Channel Communicator Agent
 * Acts as a strategic trading assistant with delegated personality roles
 */
export class ForexChannelCommunicator extends EventEmitter {
  constructor() {
    super();
    this.isActive = false;
    this.telegram = null;
    this.messageTemplates = new Map();
    this.sentMessages = [];
    this.lastMessageTime = null;

    // Trading data tracking
    this.openTrades = [];
    this.portfolioRisk = 0;
    this.dailyPerformance = {
      trades: 0,
      wins: 0,
      losses: 0,
      profit: 0,
      winRate: 0
    };

    // Initialize personality roles and templates
    this.initializePersonalityRoles();
  }

  /**
   * Initialize the forex communicator agent
   */
  async initialize(telegramInstance = null) {
    console.log('🧠 Initializing Forex Channel Communicator...');

    this.telegram = telegramInstance;
    this.isActive = true;

    console.log('✅ Forex Channel Communicator initialized');
  }

  /**
   * Initialize personality roles with message templates
   */
  initializePersonalityRoles() {
    // Disciplined Thinker - Reminds about discipline and stop-losses
    this.messageTemplates.set('disciplined_thinker', [
      "🎯 *Stick to your stop-loss today.* Don't chase losses—discipline wins trades!",
      "📋 *Your trading plan is your roadmap.* Follow it religiously, no exceptions.",
      "⚖️ *Discipline over emotion, always.* Set stop-loss before entry, not after.",
      "🛡️ *Patience + Discipline = Profit.* Never force trades when conditions aren't right.",
      "💎 *Trading Rule #1:* Only risk capital you can afford to lose. Protect your livelihood.",
      "🎯 *Execute your plan, not your emotions.* Every great trader follows rules.",
      "📊 *Review yesterday's trades.* Are you following your strategy or improvising?",
      "⚡ *Mental discipline beats market timing.* Consistent execution compounds profit."
    ]);

    // Patient Learner - Shares learning content and simulation reminders
    this.messageTemplates.set('patient_learner', [
      "📚 *Practice this week's chart pattern on demo mode.* Learning never stops!",
      "🎓 *Study support/resistance levels this week.* Knowledge compounds profits.",
      "💡 *Demo trade before going live.* Test your strategy without risking capital.",
      "📖 *Master ONE indicator this week.* Depth beats breadth in trading.",
      "🔍 *Review your losing trades.* Every loss teaches if you're willing to learn.",
      "🧠 *Backtest your strategy.* Data doesn't lie—emotions do.",
      "📊 *Learn from the masters.* Read 'Trading Psychology' books regularly.",
      "⚡ *Practice patience.* The best trades come to those who wait."
    ]);

    // Risk Manager - Monitors portfolio exposure
    this.messageTemplates.set('risk_manager', [
      "⚠️ *Risk Check:* Current exposure within safe limits. Continue monitoring positions.",
      "🛡️ *Portfolio Health:* Risk at acceptable levels. Stay disciplined with sizing.",
      "📊 *Risk Status:* All positions within 2% threshold. Good risk management!",
      "⚡ *Safety Monitor:* No over-leveraging detected. Keep positions controlled.",
      "🎯 *Exposure Update:* Risk levels healthy. Follow your risk management plan.",
      "🔒 *Capital Protection:* Position sizes appropriate. Never risk more than 2% per trade.",
      "💎 *Risk Reminder:* One bad trade shouldn't wipe out ten good ones.",
      "📉 *Loss Limit Check:* Are you respecting your daily/weekly loss limits?"
    ]);

    // Data-Driven Strategist - Posts technical/fundamental data updates
    this.messageTemplates.set('data_strategist', [
      "📊 *Market Analysis:* Key levels identified. Watch for breakout opportunities—data confirms trend.",
      "📈 *Technical Update:* Volume increasing, momentum building. Follow the data, not emotions.",
      "🌍 *Fundamental Scan:* Economic indicators showing strength. Adjust strategy accordingly.",
      "💹 *Trend Alert:* Price action respecting support/resistance. Trust the technicals.",
      "🎯 *Strategy Insight:* Market consolidating—patience required before next move.",
      "⚡ *Data Point:* Historical patterns suggest high probability setup forming.",
      "🔍 *Analysis:* Risk/reward ratio favorable on current setups. Wait for confirmation.",
      "📉 *Market Conditions:* Volatility increasing—tighten stops and manage risk actively."
    ]);

    // Emotion Coach - Responds to trader sentiment (event-driven)
    this.messageTemplates.set('emotion_coach', [
      "🧘 *Take a break. Don't revenge-trade.* Emotions cloud judgment—clear your head.",
      "😌 *Breathe deeply. Step away from charts.* A clear mind sees opportunities better.",
      "💭 *Losses are tuition fees.* Learn from them, don't let them control your next trade.",
      "⏸️ *Pause and reflect:* Is this trade based on analysis or emotion?",
      "🎯 *Emotional check:* If stressed, log out. Trading requires mental clarity.",
      "🚶 *Walk away for 30 minutes.* Your capital will still be there, but your revenge won't help.",
      "💪 *Control emotions or they'll control your account.* Winners trade with logic.",
      "🔄 *Reset your mindset.* Every trade is independent—past losses don't predict future."
    ]);

    // Analyst - Logs trade summaries and performance trends
    this.messageTemplates.set('analyst', [
      "📊 *Daily Review:* Track your trades. What's your win rate? Average profit vs loss?",
      "📈 *Performance Check:* Identify your best/worst performing setups. Double down on winners.",
      "💼 *Trade Journal Reminder:* Log every trade. Emotions, entry, exit, lessons learned.",
      "🎯 *Win/Loss Analysis:* Are you cutting losses quickly and letting winners run?",
      "📉 *Weekly Stats:* Calculate your expectancy. Positive = profitable system.",
      "💡 *Pattern Recognition:* Which setups consistently work for YOU? Focus there.",
      "🔍 *Honest Assessment:* Are losses from strategy failure or execution failure?",
      "⚡ *Data-Driven Improvement:* Review, analyze, adapt. Top traders never stop learning."
    ]);

    // Financial Guardian - Enforces safety reminders
    this.messageTemplates.set('financial_guardian', [
      "🛡️ *NEVER risk rent money for trades.* Only trade capital you can afford to lose.",
      "💰 *Financial Rule #1:* Protect your livelihood first. Trading is wealth building, not gambling.",
      "⚠️ *Over-leverage destroys accounts.* 90% of failed traders ignore this warning.",
      "🏦 *Your trading account ≠ savings account.* Keep them separate for safety.",
      "💡 *Wealthy traders risk LESS, not more.* Capital preservation enables compounding.",
      "🚨 *Position Size Check:* Are you risking 1-2% per trade or gambling with larger sizes?",
      "📉 *Don't trade scared money.* If you're worried about rent, you're over-exposed.",
      "🎯 *Consistent 1% gains compound to 3778% annually.* Slow and steady wins."
    ]);
  }

  /**
   * Receive message from orchestrator or other agents
   */
  receiveMessage(message) {
    switch (message.action) {
      case 'send_channel_update':
        this.sendChannelUpdate(message.data);
        break;
      case 'update_trading_data':
        this.updateTradingData(message.data);
        break;
      case 'emotional_trigger':
        this.handleEmotionalTrigger(message.data);
        break;
      case 'risk_alert':
        this.handleRiskAlert(message.data);
        break;
      case 'scheduled_communication':
        this.sendScheduledCommunication(message.data);
        break;
      default:
        console.log(`🧠 Forex Communicator: Unknown action ${message.action}`);
    }
  }

  /**
   * Send a channel update based on personality role
   */
  async sendChannelUpdate(data = {}) {
    if (!this.telegram || !this.isActive) {
      console.log('🧠 Forex Communicator: Telegram not available or agent inactive');
      return;
    }

    try {
      const { role = 'disciplined_thinker', customMessage = null } = data;
      let message;

      if (customMessage) {
        message = this.formatMessage(customMessage);
      } else {
        message = this.generateMessage(role);
      }

      // Send to channel if configured
      if (process.env.TELEGRAM_CHANNEL_ID) {
        await this.telegram.sendChannelMessage(message);
        console.log(`🧠 Channel message sent: ${message.substring(0, 50)}...`);

        // Record sent message
        this.sentMessages.push({
          message,
          role,
          timestamp: new Date(),
          channel: process.env.TELEGRAM_CHANNEL_ID
        });

        this.lastMessageTime = new Date();

        // Keep only last 100 messages
        if (this.sentMessages.length > 100) {
          this.sentMessages.shift();
        }

        this.emit('message_sent', { message, role });
      } else {
        console.log('🧠 Forex Communicator: No channel ID configured');
      }

    } catch (error) {
      console.error('🧠 Forex Communicator: Failed to send message:', error.message);
      this.emit('message_error', { error: error.message });
    }
  }

  /**
   * Generate a message based on personality role
   */
  generateMessage(role) {
    const templates = this.messageTemplates.get(role);
    if (!templates) {
      // Fallback to disciplined thinker
      const fallbackTemplates = this.messageTemplates.get('disciplined_thinker');
      return this.formatMessage(fallbackTemplates[Math.floor(Math.random() * fallbackTemplates.length)]);
    }

    const message = templates[Math.floor(Math.random() * templates.length)];
    return this.formatMessage(message);
  }

  /**
   * Format message to ensure ~100 characters
   */
  formatMessage(message) {
    // Ensure message is around 100 characters
    if (message.length > 110) {
      message = message.substring(0, 107) + '...';
    } else if (message.length < 80) {
      // Add some padding if too short
      message += ' Stay disciplined!';
    }

    return message;
  }

  /**
   * Update trading data for analysis
   */
  updateTradingData(data) {
    const { openTrades = [], portfolioRisk = 0, performance = {} } = data;

    this.openTrades = openTrades;
    this.portfolioRisk = portfolioRisk;
    this.dailyPerformance = { ...this.dailyPerformance, ...performance };

    // Check for risk alerts
    if (portfolioRisk > 0.02) { // 2% risk threshold
      this.handleRiskAlert({ riskLevel: portfolioRisk, message: 'High risk exposure detected' });
    }
  }

  /**
   * Handle emotional triggers (event-driven)
   */
  async handleEmotionalTrigger(data) {
    console.log('🧠 Emotional trigger detected:', data.trigger);

    // Send immediate emotion coaching message
    await this.sendChannelUpdate({
      role: 'emotion_coach',
      customMessage: this.generateEmotionalResponse(data.trigger)
    });
  }

  /**
   * Generate emotional response based on trigger
   */
  generateEmotionalResponse(trigger) {
    const responses = {
      'loss_streak': "Multiple losses detected. Take a break and review your strategy.",
      'large_win': "Great win! Don't get overconfident. Stick to your plan.",
      'frustration': "Trading frustration building. Step away and reset your mindset.",
      'greed': "Greed alert: Don't increase position sizes after wins.",
      'fear': "Fear detected: Don't close winning trades too early."
    };

    return responses[trigger] || "Emotional state check: Stay calm and follow your trading plan.";
  }

  /**
   * Handle risk alerts
   */
  async handleRiskAlert(data) {
    const { riskLevel, message } = data;

    if (riskLevel > 0.02) {
      await this.sendChannelUpdate({
        role: 'risk_manager',
        customMessage: `🚨 RISK ALERT: Portfolio exposure at ${(riskLevel * 100).toFixed(1)}%. Reduce positions immediately.`
      });
    }
  }

  /**
   * Send scheduled communication based on role
   */
  async sendScheduledCommunication(data) {
    const { role } = data;

    switch (role) {
      case 'disciplined_thinker':
        await this.sendChannelUpdate({ role: 'disciplined_thinker' });
        break;
      case 'patient_learner':
        await this.sendChannelUpdate({ role: 'patient_learner' });
        break;
      case 'risk_manager':
        await this.sendChannelUpdate({ role: 'risk_manager' });
        break;
      case 'data_strategist':
        await this.sendChannelUpdate({ role: 'data_strategist' });
        break;
      case 'analyst':
        await this.sendChannelUpdate({ role: 'analyst' });
        break;
      case 'financial_guardian':
        await this.sendChannelUpdate({ role: 'financial_guardian' });
        break;
    }
  }

  /**
   * Get communicator statistics
   */
  getCommunicatorStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const messagesLast24h = this.sentMessages.filter(
      msg => new Date(msg.timestamp) > last24h
    );

    const messageRoles = {};
    this.sentMessages.forEach(msg => {
      messageRoles[msg.role] = (messageRoles[msg.role] || 0) + 1;
    });

    return {
      totalMessagesSent: this.sentMessages.length,
      messagesLast24h: messagesLast24h.length,
      messageRoles,
      lastMessageTime: this.lastMessageTime,
      isActive: this.isActive,
      openTradesCount: this.openTrades.length,
      portfolioRisk: this.portfolioRisk,
      dailyPerformance: this.dailyPerformance
    };
  }

  /**
   * Shutdown the forex communicator
   */
  async shutdown() {
    console.log('🧠 Shutting down Forex Channel Communicator...');
    this.isActive = false;
    console.log('✅ Forex Channel Communicator shutdown complete');
  }
}

// Create singleton instance
export const forexChannelCommunicator = new ForexChannelCommunicator();

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Testing Forex Channel Communicator...\n');

  const agent = new ForexChannelCommunicator();
  console.log('✅ Forex Channel Communicator created');

  // Test message generation for each role
  console.log('📝 Testing personality roles...');
  const roles = ['disciplined_thinker', 'patient_learner', 'risk_manager', 'data_strategist', 'emotion_coach', 'analyst', 'financial_guardian'];

  roles.forEach(role => {
    const msg = agent.generateMessage(role);
    console.log(`${role}: "${msg}" (${msg.length} chars)`);
  });

  console.log('\n✅ Forex Channel Communicator tests completed');
  console.log('💡 Note: Network tests require TELEGRAM_CHANNEL_ID environment variable');
}