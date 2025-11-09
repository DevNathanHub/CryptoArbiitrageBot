// Marketing Agent
// Generates and sends marketing messages, news updates, and community engagement content

import { EventEmitter } from 'events';
import { config } from '../../config/config.js';

/**
 * Marketing Agent
 * Handles community engagement, marketing messages, and timely updates
 */
export class MarketingAgent extends EventEmitter {
  constructor() {
    super();
    this.isActive = false;
    this.telegram = null;
    this.messageTemplates = new Map();
    this.sentMessages = [];
    this.contentQueue = [];
    this.lastMessageTime = null;

    // Initialize message templates
    this.initializeMessageTemplates();
  }

  /**
   * Initialize the marketing agent
   */
  async initialize(telegramInstance = null) {
    console.log('📢 Initializing Marketing Agent...');

    this.telegram = telegramInstance;
    this.isActive = true;

    console.log('✅ Marketing Agent initialized');
  }

  /**
   * Initialize message templates
   */
  initializeMessageTemplates() {
    // Welcome messages
    this.messageTemplates.set('welcome', [
      "🚀 Welcome to our arbitrage community! We're hunting profits 24/7 with AI-powered precision.",
      "💰 Join our winning team! Advanced arbitrage strategies delivering consistent returns.",
      "🤖 Meet our AI trading bot - your automated profit generator working around the clock!",
      "📈 Smart arbitrage, smarter profits. Welcome to the future of crypto trading!",
      "⚡ Lightning-fast arbitrage execution with AI intelligence. Welcome aboard!"
    ]);

    // Performance updates
    this.messageTemplates.set('performance', [
      "📊 Our AI bot just executed another profitable trade! Consistent gains, automated precision.",
      "💎 Arbitrage opportunity captured! Our AI system never sleeps, profits never stop.",
      "🎯 Another successful arbitrage cycle completed. AI-driven, profit-focused.",
      "⚡ Fast execution, steady profits. Our bot is crushing the arbitrage game!",
      "📈 Performance update: AI arbitrage system maintaining excellent win rates."
    ]);

    // Market insights
    this.messageTemplates.set('market', [
      "🌟 Crypto markets are active! Our AI is scanning for the best arbitrage opportunities.",
      "📊 Market volatility = arbitrage opportunity. Our AI bot is ready to capitalize!",
      "💡 Smart arbitrage thrives in all conditions. Our AI adapts and profits.",
      "🔍 Scanning multiple pairs across exchanges. AI-powered arbitrage in action!",
      "⚖️ Price inefficiencies detected. Our AI arbitrage system is on the hunt!"
    ]);

    // Community engagement
    this.messageTemplates.set('community', [
      "🤝 Join thousands benefiting from AI-powered arbitrage strategies. Welcome!",
      "🌐 Global arbitrage, local profits. Our AI system works worldwide.",
      "🎓 Learning from every trade. Our AI bot gets smarter with each arbitrage cycle.",
      "🔒 Secure, automated, profitable. The future of crypto arbitrage is here.",
      "⚙️ Advanced algorithms + real-time execution = consistent arbitrage profits."
    ]);

    // News updates
    this.messageTemplates.set('news', [
      "📰 AI arbitrage technology continues to evolve. Stay ahead with our advanced system.",
      "📢 Breaking: New arbitrage opportunities detected across major trading pairs!",
      "🌍 Cross-exchange arbitrage made simple. Our AI handles the complexity.",
      "⏰ 24/7 arbitrage monitoring. Our AI never misses a profitable opportunity.",
      "🎯 Precision arbitrage execution. AI technology delivering reliable profits."
    ]);

    // Motivational messages
    this.messageTemplates.set('motivational', [
      "💪 Consistent profits through intelligent arbitrage. AI makes it possible!",
      "🎉 Celebrating another successful trading day with our AI arbitrage system.",
      "🏆 Excellence in arbitrage execution. Our AI sets the standard.",
      "🚀 Pushing the boundaries of arbitrage technology. Profits follow innovation.",
      "💡 Smart trading, smarter profits. AI arbitrage leading the way."
    ]);
  }

  /**
   * Receive message from orchestrator
   */
  receiveMessage(message) {
    switch (message.action) {
      case 'send_marketing_update':
        this.sendMarketingUpdate(message.data);
        break;
      case 'queue_content':
        this.queueContent(message.data);
        break;
      case 'send_scheduled_update':
        this.sendScheduledUpdate();
        break;
      case 'performance_update':
        this.handlePerformanceUpdate(message.data);
        break;
      default:
        console.log(`📢 Marketing Agent: Unknown action ${message.action}`);
    }
  }

  /**
   * Send a marketing update to Telegram channel
   */
  async sendMarketingUpdate(data = {}) {
    if (!this.telegram || !this.isActive) {
      console.log('📢 Marketing Agent: Telegram not available or agent inactive');
      return;
    }

    try {
      const { type = 'random', customMessage = null } = data;
      let message;

      if (customMessage) {
        message = this.formatMessage(customMessage);
      } else {
        message = this.generateMessage(type);
      }

      // Send to channel if configured
      if (process.env.TELEGRAM_CHANNEL_ID) {
        await this.telegram.sendChannelMessage(message);
        console.log(`📢 Marketing message sent: ${message.substring(0, 50)}...`);

        // Record sent message
        this.sentMessages.push({
          message,
          type,
          timestamp: new Date(),
          channel: process.env.TELEGRAM_CHANNEL_ID
        });

        this.lastMessageTime = new Date();

        // Keep only last 100 messages
        if (this.sentMessages.length > 100) {
          this.sentMessages.shift();
        }

        this.emit('message_sent', { message, type });
      } else {
        console.log('📢 Marketing Agent: No channel ID configured');
      }

    } catch (error) {
      console.error('📢 Marketing Agent: Failed to send message:', error.message);
      this.emit('message_error', { error: error.message });
    }
  }

  /**
   * Generate a message based on type
   */
  generateMessage(type) {
    let templates;

    if (type === 'random') {
      // Randomly select from all template types
      const allTypes = Array.from(this.messageTemplates.keys());
      const randomType = allTypes[Math.floor(Math.random() * allTypes.length)];
      templates = this.messageTemplates.get(randomType);
    } else {
      templates = this.messageTemplates.get(type);
      if (!templates) {
        // Fallback to random if type not found
        templates = this.messageTemplates.get('performance');
      }
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
      message += ' Join our arbitrage community!';
    }

    return message;
  }

  /**
   * Queue content for later sending
   */
  queueContent(content) {
    this.contentQueue.push({
      ...content,
      queuedAt: new Date()
    });

    console.log(`📢 Content queued: ${content.message?.substring(0, 50) || 'Generated content'}...`);
  }

  /**
   * Send scheduled update (called by cron job)
   */
  async sendScheduledUpdate() {
    console.log('📢 Marketing Agent: sendScheduledUpdate called');
    console.log(`   isActive: ${this.isActive}`);
    console.log(`   telegram available: ${!!this.telegram}`);

    if (!this.isActive) {
      console.log('📢 Marketing Agent: Agent not active, skipping scheduled update');
      return;
    }

    if (!this.telegram) {
      console.log('📢 Marketing Agent: Telegram not available, skipping scheduled update');
      return;
    }

    // Check if we sent a message recently (avoid spam)
    if (this.lastMessageTime) {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime.getTime();
      const minInterval = 4 * 60 * 1000; // 4 minutes minimum between messages

      if (timeSinceLastMessage < minInterval) {
        console.log('📢 Marketing Agent: Too soon since last message, skipping');
        return;
      }
    }

    try {
      // Send a random marketing update
      await this.sendMarketingUpdate({ type: 'random' });
    } catch (error) {
      console.error('📢 Marketing Agent: Failed to send scheduled update:', error.message);
      // Don't throw - allow cron job to continue
    }
  }

  /**
   * Handle performance updates to generate relevant marketing content
   */
  handlePerformanceUpdate(performanceData) {
    const { profit, winRate, opportunitiesFound } = performanceData;

    // Generate performance-based marketing message
    let messageType = 'performance';

    if (profit > 50) {
      messageType = 'motivational';
    } else if (opportunitiesFound > 10) {
      messageType = 'market';
    } else if (winRate > 0.8) {
      messageType = 'community';
    }

    // Queue a performance-based message
    this.queueContent({
      type: messageType,
      context: 'performance_update',
      priority: 'high'
    });
  }

  /**
   * Get marketing statistics
   */
  getMarketingStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const messagesLast24h = this.sentMessages.filter(
      msg => new Date(msg.timestamp) > last24h
    );

    const messageTypes = {};
    this.sentMessages.forEach(msg => {
      messageTypes[msg.type] = (messageTypes[msg.type] || 0) + 1;
    });

    return {
      totalMessagesSent: this.sentMessages.length,
      messagesLast24h: messagesLast24h.length,
      messageTypes,
      queueLength: this.contentQueue.length,
      lastMessageTime: this.lastMessageTime,
      isActive: this.isActive
    };
  }

  /**
   * Generate market news update
   */
  generateMarketNews() {
    const newsTemplates = [
      "🌟 Market Update: AI arbitrage system detecting increased opportunities!",
      "📊 Crypto Alert: Price movements creating arbitrage windows. AI system active!",
      "💹 Trading Update: Our AI bot is capitalizing on current market conditions.",
      "🔄 Exchange Update: Cross-exchange inefficiencies spotted. Arbitrage engaged!",
      "⚡ Speed Update: Lightning-fast arbitrage execution protecting profits."
    ];

    return newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
  }

  /**
   * Generate community welcome message
   */
  generateWelcomeMessage() {
    const welcomeTemplates = [
      "👋 Welcome to our arbitrage family! Join the AI-powered profit revolution.",
      "🤝 New members: Experience automated arbitrage profits with our AI system!",
      "🚪 Welcome aboard! Our AI arbitrage bot works 24/7 for your benefit.",
      "🎊 Celebrating new community members! AI arbitrage, automated profits.",
      "🌍 Global community growing! Join our AI-driven arbitrage success story."
    ];

    return welcomeTemplates[Math.floor(Math.random() * welcomeTemplates.length)];
  }

  /**
   * Generate timely news update
   */
  generateTimelyUpdate() {
    const hour = new Date().getHours();
    let timeContext = '';

    if (hour >= 6 && hour < 12) {
      timeContext = 'morning';
    } else if (hour >= 12 && hour < 18) {
      timeContext = 'afternoon';
    } else if (hour >= 18 && hour < 22) {
      timeContext = 'evening';
    } else {
      timeContext = 'night';
    }

    const timelyTemplates = {
      morning: [
        "🌅 Good morning! Our AI arbitrage system started the day strong.",
        "☀️ Morning market watch: AI system scanning for opening opportunities.",
        "🌞 Rise and arbitrage! Our AI bot is active from the early hours."
      ],
      afternoon: [
        "🌤️ Afternoon arbitrage: AI system maintaining steady profit flow.",
        "☀️ Midday update: Our AI arbitrage bot performing optimally.",
        "🌅 Afternoon session: AI-powered arbitrage capturing market moves."
      ],
      evening: [
        "🌆 Evening wind-down: AI arbitrage system securing today's profits.",
        "🌙 Evening update: Our AI bot finishing strong on arbitrage opportunities.",
        "🌃 Night approach: AI system positioned for overnight opportunities."
      ],
      night: [
        "🌙 Night arbitrage: AI system monitoring 24/7 for profit opportunities.",
        "🌌 Midnight markets: Our AI arbitrage bot never sleeps.",
        "🌃 Late night: AI technology ensuring profits around the clock."
      ]
    };

    const templates = timelyTemplates[timeContext];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Shutdown the marketing agent
   */
  async shutdown() {
    console.log('📢 Shutting down Marketing Agent...');
    this.isActive = false;
    console.log('✅ Marketing Agent shutdown complete');
  }
}

// Create singleton instance
export const marketingAgent = new MarketingAgent();

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Testing Marketing Agent...\n');

  const agent = new MarketingAgent();
  console.log('✅ Marketing Agent created');

  // Test message generation
  console.log('📝 Testing message generation...');
  const testMessage = agent.generateMessage('welcome');
  console.log(`Generated message: "${testMessage}"`);
  console.log(`Length: ${testMessage.length} characters`);

  // Test message formatting
  console.log('\n🔧 Testing message formatting...');
  const longMessage = "This is a very long message that should be truncated to fit within the 100 character limit that we want for our marketing updates.";
  const formatted = agent.formatMessage(longMessage);
  console.log(`Original: ${longMessage.length} chars`);
  console.log(`Formatted: ${formatted.length} chars`);
  console.log(`Result: "${formatted}"`);

  // Test different message types
  console.log('\n📊 Testing different message types...');
  const types = ['welcome', 'performance', 'market', 'community', 'news', 'motivational'];
  types.forEach(type => {
    const msg = agent.generateMessage(type);
    console.log(`${type}: "${msg}" (${msg.length} chars)`);
  });

  // Test timely updates
  console.log('\n⏰ Testing timely updates...');
  const timelyMsg = agent.generateTimelyUpdate();
  console.log(`Timely update: "${timelyMsg}" (${timelyMsg.length} chars)`);

  // Test market news
  console.log('\n📰 Testing market news...');
  const newsMsg = agent.generateMarketNews();
  console.log(`Market news: "${newsMsg}" (${newsMsg.length} chars)`);

  console.log('\n✅ Marketing Agent tests completed');
  console.log('💡 Note: Network tests require TELEGRAM_CHANNEL_ID environment variable');
}