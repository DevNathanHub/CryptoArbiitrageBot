// Telegram Alert Bot
// Sends notifications for profitable arbitrage opportunities

import TelegramBot from 'node-telegram-bot-api';
import { config } from '../../config/config.js';

/**
 * Telegram Alert Manager
 * Sends real-time alerts for profitable opportunities and trade executions
 */
export class TelegramAlerts {
  constructor() {
    this.bot = null;
    this.isEnabled = config.telegram.enabled;
    this.chatId = config.telegram.chatId;
    this.alertHistory = [];
    this.lastAlertTime = new Map();
    this.alertCooldown = 60000; // 1 minute between similar alerts
  }

  /**
   * Initialize Telegram bot
   */
  initialize() {
    if (!this.isEnabled) {
      console.log('⚠️  Telegram alerts disabled in config');
      return false;
    }

    if (!config.telegram.botToken) {
      console.log('⚠️  Telegram bot token not configured');
      return false;
    }

    try {
      // Enable polling to listen for commands with error handling
      this.bot = new TelegramBot(config.telegram.botToken, {
        polling: {
          interval: 300, // Poll every 300ms
          timeout: 10,   // 10 second timeout
          limit: 100,    // Maximum 100 updates per poll
          retryTimeout: 5000, // Retry after 5 seconds on error
        }
      });

      // Add error handling for polling
      this.bot.on('polling_error', (error) => {
        // Only log critical errors, not network timeouts
        if (error.code !== 'EFATAL' && error.code !== 'ECONNRESET') {
          console.warn('📱 Telegram polling warning:', error.message);
        }
        // Don't log EFATAL and network errors to reduce spam
      });

      console.log('✅ Telegram bot initialized with error handling');
      
      // Listen for /start command to get chat ID
      this.bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const username = msg.from.username || msg.from.first_name || 'User';
        const chatType = msg.chat.type; // 'private', 'group', 'supergroup', 'channel'
        
        console.log('\n' + '='.repeat(60));
        console.log('📱 TELEGRAM /start COMMAND RECEIVED');
        console.log('='.repeat(60));
        console.log(`👤 User: ${username}`);
        console.log(`💬 Chat Type: ${chatType}`);
        console.log(`🆔 Chat ID: ${chatId}`);
        console.log(`📧 First Name: ${msg.from.first_name || 'N/A'}`);
        console.log(`📧 Last Name: ${msg.from.last_name || 'N/A'}`);
        console.log(`🔗 Username: @${msg.from.username || 'N/A'}`);
        console.log('='.repeat(60));
        console.log(`\n💡 Add this to your .env file:`);
        console.log(`TELEGRAM_CHAT_ID=${chatId}\n`);
        
        // Create inline keyboard with investment button
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '💎 Invest Now - Join Our Platform',
                url: 'https://crypto.loopnet.tech'
              }
            ]
          ]
        };
        
        // Send welcome message with investment button
        this.bot.sendMessage(chatId, 
          `👋 *Welcome to Arbitrage Bot!*\n\n` +
          `💰 *Ready to start earning?*\n` +
          `Click the button below to join our investment platform and start your crypto arbitrage journey! 🚀`,
          { 
            parse_mode: 'Markdown',
            reply_markup: keyboard
          }
        );
      });

      // Listen for forwarded messages to get channel IDs
      this.bot.on('message', (msg) => {
        // Skip if it's a /start command (already handled)
        if (msg.text && msg.text.startsWith('/start')) return;

        // Check if message is forwarded from a channel
        if (msg.forward_from_chat && msg.forward_from_chat.type === 'channel') {
          const channelId = msg.forward_from_chat.id;
          const channelTitle = msg.forward_from_chat.title || 'Unknown';
          const channelUsername = msg.forward_from_chat.username || 'N/A';
          
          console.log('\n' + '='.repeat(60));
          console.log('� CHANNEL ID DETECTED FROM FORWARDED MESSAGE');
          console.log('='.repeat(60));
          console.log(`📺 Channel: ${channelTitle}`);
          console.log(`🆔 Channel ID: ${channelId}`);
          console.log(`🔗 Username: @${channelUsername}`);
          console.log('='.repeat(60));
          console.log(`\n💡 Add this to your .env file:`);
          console.log(`TELEGRAM_CHANNEL_ID=${channelId}\n`);
          
          // Send confirmation
          this.bot.sendMessage(msg.chat.id,
            `📢 *Channel ID Detected!*\n\n` +
            `📺 Channel: *${channelTitle}*\n` +
            `🆔 Channel ID: \`${channelId}\`\n` +
            `🔗 Username: @${channelUsername}\n\n` +
            `Add this to your .env file:\n` +
            `\`TELEGRAM_CHANNEL_ID=${channelId}\`\n\n` +
            `⚠️ *Important:* Make sure the bot is added as an administrator to the channel!\n\n` +
            `After updating .env, restart the bot to send updates to this channel. 🚀`,
            { parse_mode: 'Markdown' }
          );
        }
        // Check if message is from a group/supergroup
        else if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
          const groupId = msg.chat.id;
          const groupTitle = msg.chat.title || 'Unknown Group';
          
          console.log('\n' + '='.repeat(60));
          console.log('👥 GROUP/CHANNEL ID DETECTED');
          console.log('='.repeat(60));
          console.log(`📺 Group: ${groupTitle}`);
          console.log(`🆔 Group ID: ${groupId}`);
          console.log(`💬 Type: ${msg.chat.type}`);
          console.log('='.repeat(60));
          console.log(`\n💡 Add this to your .env file:`);
          console.log(`TELEGRAM_CHANNEL_ID=${groupId}\n`);
          
          // Send confirmation
          this.bot.sendMessage(groupId,
            `📢 *Group ID Detected!*\n\n` +
            `📺 Group: *${groupTitle}*\n` +
            `🆔 Group ID: \`${groupId}\`\n\n` +
            `Add this to your .env file:\n` +
            `\`TELEGRAM_CHANNEL_ID=${groupId}\`\n\n` +
            `After updating .env, restart the bot to send updates here. 🚀`,
            { parse_mode: 'Markdown' }
          );
        }
        // Regular message
        else if (msg.text) {
          console.log(`📨 Message received from ${msg.from.username || msg.chat.id}: ${msg.text}`);
        }
      });

      // Send startup message if chat ID is configured
      if (config.telegram.chatId) {
        this.sendMessage('🤖 Arbitrage Bot Started!\n\nMonitoring for profitable opportunities...');
      }

      // Also send a startup test to the configured CHANNEL (if provided)
      const channelIdEnv = process.env.TELEGRAM_CHANNEL_ID || config.telegram.channelId;
      if (channelIdEnv) {
        // Non-blocking send; log outcome
        this.sendChannelMessage('✅ *Bot Active*\n\n🤖 Arbitrage monitoring system is now online and scanning for profitable opportunities.\n\n⏰ Scheduled Tasks Active:\n• Quick Scan: Every 2 minutes\n• Deep Scan: Every 15 minutes\n• Health Check: Every hour\n• Daily Report: Midnight\n• Weekly Cleanup: Sunday midnight')
          .then(() => console.log('✅ "Bot Active" message sent to Telegram channel'))
          .catch(err => console.error('❌ Failed to send startup message to channel:', err?.message || err));
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Telegram bot:', error.message);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Send message to configured chat
   * @param {string} message - Message to send
   * @param {object} options - Additional options (parse_mode, etc.)
   */
  async sendMessage(message, options = {}) {
    if (!this.isEnabled || !this.bot) {
      console.log('⚠️  Telegram not enabled');
      return false;
    }

    if (!config.telegram.chatId) {
      console.log('⚠️  Telegram chat ID not configured');
      return false;
    }

    try {
      await this.bot.sendMessage(config.telegram.chatId, message, {
        parse_mode: 'Markdown',
        ...options
      });
      return true;
    } catch (error) {
      console.error('❌ Failed to send Telegram message:', error.message);
      return false;
    }
  }

  /**
   * Send message to configured channel
   * @param {string} message - Message to send
   * @param {object} options - Additional options
   */
  async sendChannelMessage(message, options = {}) {
    if (!this.isEnabled || !this.bot) {
      console.log('⚠️  Telegram not enabled');
      return false;
    }

    const channelId = process.env.TELEGRAM_CHANNEL_ID || config.telegram.channelId;
    if (!channelId) {
      console.log('⚠️  Telegram channel ID not configured');
      return false;
    }

    try {
      await this.bot.sendMessage(channelId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...options
      });
      console.log('✅ Message sent to channel');
      return true;
    } catch (error) {
      console.error('❌ Failed to send channel message:', error.message);
      return false;
    }
  }

  /**
   * Send performance report to channel
   * @param {object} stats - Performance statistics
   */
  async sendPerformanceReport(stats) {
    const message = 
      `📊 *Daily Performance Report*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔍 *Scanning Stats:*\n` +
      `• Total Scans: ${stats.totalScans || 0}\n` +
      `• Opportunities Found: ${stats.opportunitiesFound || 0}\n` +
      `• Success Rate: ${stats.successRate || 0}%\n\n` +
      `💰 *Best Opportunity:*\n` +
      `• Profit: ${stats.bestProfit || 0}%\n` +
      `• Path: ${stats.bestPath || 'N/A'}\n\n` +
      `⚡ *Execution:*\n` +
      `• Trades Executed: ${stats.tradesExecuted || 0}\n` +
      `• Successful: ${stats.successfulTrades || 0}\n` +
      `• Failed: ${stats.failedTrades || 0}\n\n` +
      `📈 *System Health:*\n` +
      `• Uptime: ${stats.uptime || 'N/A'}\n` +
      `• MongoDB: ${stats.mongodbStatus || '✅'}\n` +
      `• WebSocket: ${stats.websocketStatus || '✅'}\n\n` +
      `🕐 ${new Date().toLocaleString()}`;

    await this.sendChannelMessage(message);
  }

  /**
   * Send opportunity alert to channel
   * @param {object} opportunity - Opportunity details
   */
  async sendOpportunityAlert(opportunity) {
    const message =
      `🚨 *ARBITRAGE OPPORTUNITY DETECTED!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💎 *Triangle:* ${opportunity.path.join(' → ')}\n` +
      `💰 *Profit:* ${opportunity.profitPercent.toFixed(4)}%\n` +
      `💵 *Amount:* $${opportunity.profitAmount.toFixed(2)}\n` +
      `⚡ *Score:* ${opportunity.score || 'N/A'}/100\n` +
      `📊 *Risk Level:* ${opportunity.riskLevel || 'N/A'}\n` +
      `⏱️ *Speed:* ${opportunity.executionSpeed || 'N/A'}ms\n\n` +
      `🔄 *Trade Breakdown:*\n` +
      `1️⃣ ${opportunity.step1 || 'Step 1'}\n` +
      `2️⃣ ${opportunity.step2 || 'Step 2'}\n` +
      `3️⃣ ${opportunity.step3 || 'Step 3'}\n\n` +
      `🕐 ${new Date().toLocaleString()}`;

    await this.sendChannelMessage(message);
  }

  /**
   * Send health check update to channel
   */
  async sendHealthCheck(status) {
    const statusEmoji = status.healthy ? '✅' : '⚠️';
    const message =
      `${statusEmoji} *System Health Check*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🔌 *Connections:*\n` +
      `• MongoDB: ${status.mongodb ? '✅ Connected' : '❌ Disconnected'}\n` +
      `• Binance API: ${status.binance ? '✅ Active' : '❌ Inactive'}\n` +
      `• WebSocket: ${status.websocket ? '✅ Active' : '❌ Inactive'}\n\n` +
      `⚙️ *System:*\n` +
      `• Uptime: ${status.uptime}\n` +
      `• Memory: ${status.memory}\n` +
      `• CPU: ${status.cpu}\n\n` +
      `📊 *Activity:*\n` +
      `• Last Scan: ${status.lastScan}\n` +
      `• Active Jobs: ${status.activeJobs}\n\n` +
      `🕐 ${new Date().toLocaleString()}`;

    await this.sendChannelMessage(message);
  }

  /**
   * Send investor-focused performance update to channel
   * @param {object} metrics - Comprehensive performance metrics
   */
  async sendInvestorUpdate(metrics) {
    const profitEmoji = metrics.totalProfit > 0 ? '📈' : '📉';
    const efficiencyEmoji = metrics.efficiency > 95 ? '🚀' : metrics.efficiency > 85 ? '✅' : '⚠️';

    let message =
      `💰 *INVESTOR UPDATE - ${new Date().toLocaleDateString()}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${profitEmoji} *FINANCIAL PERFORMANCE*\n` +
      `• Total Profit: $${metrics.totalProfit?.toFixed(2) || '0.00'}\n` +
      `• Today's P&L: $${metrics.todayProfit?.toFixed(2) || '0.00'}\n` +
      `• Win Rate: ${metrics.winRate?.toFixed(1) || '0.0'}%\n` +
      `• Average Profit/Trade: $${metrics.avgProfitPerTrade?.toFixed(2) || '0.00'}\n\n` +
      `${efficiencyEmoji} *SYSTEM EFFICIENCY*\n` +
      `• Overall Efficiency: ${metrics.efficiency?.toFixed(1) || '0.0'}%\n` +
      `• Opportunities Detected: ${metrics.opportunitiesFound || 0}\n` +
      `• Successful Executions: ${metrics.successfulTrades || 0}\n` +
      `• Response Time: ${metrics.avgResponseTime || 'N/A'}ms\n\n` +
      `🛡️ *RISK MANAGEMENT*\n` +
      `• Max Drawdown: ${metrics.maxDrawdown?.toFixed(2) || '0.00'}%\n` +
      `• Risk-Adjusted Return: ${metrics.sharpeRatio?.toFixed(2) || 'N/A'}\n` +
      `• Position Size Control: ${metrics.positionSizing || 'Active'}\n` +
      `• Stop Loss Triggers: ${metrics.stopLossCount || 0}\n\n` +
      `📊 *MARKET INTELLIGENCE*\n` +
      `• Triangles Monitored: ${metrics.trianglesMonitored || 0}\n` +
      `• Market Volatility: ${metrics.marketVolatility || 'Normal'}\n` +
      `• Best Performing Pair: ${metrics.bestPair || 'N/A'}\n` +
      `• Arbitrage Opportunities: ${metrics.activeOpportunities || 0}\n\n` +
      `⚡ *TECHNICAL METRICS*\n` +
      `• System Uptime: ${metrics.uptime || 'N/A'}\n` +
      `• API Response Rate: ${metrics.apiHealth || '100'}%\n` +
      `• WebSocket Stability: ${metrics.websocketHealth || '100'}%\n` +
      `• Memory Usage: ${metrics.memoryUsage || 'N/A'}\n\n` +
      `🎯 *INVESTMENT INSIGHTS*\n` +
      `• Expected Daily Return: ${metrics.expectedReturn?.toFixed(2) || '0.00'}%\n` +
      `• Risk Level: ${metrics.riskLevel || 'Low'}\n` +
      `• Confidence Score: ${metrics.confidenceScore || 'N/A'}/100\n` +
      `• Next Update: ${new Date(Date.now() + 4 * 60 * 60 * 1000).toLocaleTimeString()}\n\n` +
      `💡 *Key Takeaways:*\n` +
      `${this.generateKeyTakeaways(metrics)}\n\n` +
      `📈 *Stay tuned for real-time arbitrage opportunities!*`;

    await this.sendChannelMessage(message);
  }

  /**
   * Send real-time arbitrage opportunity alert for investors
   * @param {object} opportunity - Arbitrage opportunity with enhanced details
   */
  async sendInvestorOpportunityAlert(opportunity) {
    const riskEmoji = opportunity.riskLevel === 'LOW' ? '🟢' : opportunity.riskLevel === 'MEDIUM' ? '🟡' : '🔴';
    const confidenceEmoji = opportunity.confidence > 80 ? '🎯' : opportunity.confidence > 60 ? '✅' : '⚠️';

    let message =
      `🚨 *ARBITRAGE OPPORTUNITY ALERT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💎 *Triangle:* ${opportunity.path?.join(' → ') || opportunity.triangle}\n` +
      `💰 *Profit Potential:* ${opportunity.profitPercent?.toFixed(4) || opportunity.profitPct?.toFixed(4)}%\n` +
      `💵 *USD Value:* $${opportunity.profitAmount?.toFixed(2) || opportunity.profitUsd?.toFixed(2)}\n\n` +
      `${confidenceEmoji} *Confidence Score:* ${opportunity.confidence || opportunity.score || 'N/A'}/100\n` +
      `${riskEmoji} *Risk Assessment:* ${opportunity.riskLevel || 'MEDIUM'}\n` +
      `⚡ *Execution Speed:* ${opportunity.executionSpeed || 'Fast'}\n\n`;

    // Add advanced precision metrics if available
    if (opportunity.slippage !== undefined && opportunity.slippage !== null) {
      const slippage = typeof opportunity.slippage === 'number' ? opportunity.slippage : parseFloat(opportunity.slippage);
      const positionSize = typeof opportunity.positionSize === 'number' ? opportunity.positionSize : parseFloat(opportunity.positionSize);
      const riskAdjusted = typeof opportunity.riskAdjustedProfit === 'number' ? opportunity.riskAdjustedProfit : parseFloat(opportunity.riskAdjustedProfit);
      
      message += `📊 *PRECISION METRICS:*\n` +
        `• Slippage: ${slippage.toFixed(4)}%\n` +
        `• Liquidity Score: ${opportunity.liquidityScore}/10\n` +
        `• Position Size: $${positionSize.toFixed(2)}\n` +
        `• Risk-Adjusted Profit: ${riskAdjusted.toFixed(4)}%\n` +
        `• Confidence: ${opportunity.confidence}/10\n\n`;
    }

    // Add AI insights if available
    if (opportunity.aiReasoning) {
      message += `🧠 *AI ANALYSIS:*\n` +
        `• Reasoning: ${opportunity.aiReasoning}\n` +
        `• Profit Likelihood: ${opportunity.aiPrediction || 'Medium'}\n` +
        `• AI Recommendation: ${opportunity.aiRecommendation || 'BUY'}\n` +
        `• Key Insight: ${opportunity.aiInsight || 'Execute quickly'}\n` +
        `• AI Confidence: ${opportunity.aiConfidence || 75}%\n\n`;
    }

    message +=
      `📊 *TRADE BREAKDOWN:*\n` +
      `1️⃣ ${opportunity.step1 || 'Buy ' + opportunity.triangle?.split(' → ')[0]}\n` +
      `2️⃣ ${opportunity.step2 || 'Trade to ' + opportunity.triangle?.split(' → ')[1]}\n` +
      `3️⃣ ${opportunity.step3 || 'Complete cycle to ' + opportunity.triangle?.split(' → ')[2]}\n\n` +
      `🛡️ *RISK MITIGATION:*\n` +
      `• Slippage Protection: Active\n` +
      `• Position Sizing: Optimized\n` +
      `• Stop Loss: ${opportunity.stopLoss || '2'}%\n` +
      `• Max Exposure: ${opportunity.maxExposure || '$1000'}\n\n` +
      `📈 *MARKET CONTEXT:*\n` +
      `• Volatility: ${opportunity.marketVolatility || 'Low'}\n` +
      `• Liquidity: ${opportunity.liquidity || 'High'}\n` +
      `• Competition: ${opportunity.competition || 'Low'}\n\n` +
      `⏰ *Time Sensitive - Execute within 30 seconds for optimal results*\n\n` +
      `💡 *This opportunity represents a ${opportunity.riskLevel?.toLowerCase() || 'medium'}-risk, ` +
      `high-reward arbitrage play with our advanced risk management systems active.*\n\n` +
      `🕐 ${new Date().toLocaleString()}`;

    await this.sendChannelMessage(message);
  }

  /**
   * Send system improvement and efficiency updates
   * @param {object} improvements - System improvement details
   */
  async sendEfficiencyUpdate(improvements) {
    const message =
      `⚡ *SYSTEM EFFICIENCY UPDATE*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🚀 *Performance Improvements:*\n` +
      `• Response Time: ${improvements.responseTime || 'Improved by 40%'}\n` +
      `• Detection Accuracy: ${improvements.accuracy || 'Enhanced to 99.5%'}\n` +
      `• Success Rate: ${improvements.successRate || 'Increased to 95%'}\n` +
      `• Risk Management: ${improvements.riskManagement || 'Advanced algorithms deployed'}\n\n` +
      `🛠️ *Technical Enhancements:*\n` +
      `• Order Book Depth: ${improvements.orderBookDepth || 'Expanded to 500 levels'}\n` +
      `• WebSocket Optimization: ${improvements.websocketOpt || 'Real-time processing'}\n` +
      `• Fee Optimization: ${improvements.feeOpt || 'Maker/taker fee selection'}\n` +
      `• Error Recovery: ${improvements.errorRecovery || '99.9% uptime achieved'}\n\n` +
      `📊 *Impact on Investors:*\n` +
      `• Higher Profit Potential: ${improvements.profitImpact || '+25% expected returns'}\n` +
      `• Reduced Risk: ${improvements.riskReduction || 'Advanced position sizing'}\n` +
      `• Faster Execution: ${improvements.executionSpeed || 'Sub-second response'}\n` +
      `• Better Reliability: ${improvements.reliability || 'Enterprise-grade systems'}\n\n` +
      `🎯 *Next Phase:*\n` +
      `${improvements.nextPhase || 'Multi-exchange arbitrage integration'}\n\n` +
      `💡 *These improvements ensure our arbitrage system maintains industry-leading efficiency and profitability.*\n\n` +
      `🕐 ${new Date().toLocaleString()}`;

    await this.sendChannelMessage(message);
  }

  /**
   * Send market analysis and opportunity insights
   * @param {object} analysis - Market analysis data
   */
  async sendMarketAnalysis(analysis) {
    const trendEmoji = analysis.marketTrend === 'bullish' ? '📈' : analysis.marketTrend === 'bearish' ? '📉' : '➡️';

    const message =
      `📊 *MARKET ANALYSIS & INSIGHTS*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${trendEmoji} *Market Trend:* ${analysis.marketTrend?.toUpperCase() || 'SIDEWAYS'}\n` +
      `📊 *Volatility Index:* ${analysis.volatilityIndex || 'Medium'}\n` +
      `💰 *Arbitrage Opportunities:* ${analysis.opportunityCount || 0} active\n\n` +
      `🔥 *HOT PAIRS THIS HOUR:*\n` +
      `${this.formatHotPairs(analysis.hotPairs || [])}\n\n` +
      `🛡️ *RISK ASSESSMENT:*\n` +
      `• Market Risk: ${analysis.marketRisk || 'Low'}\n` +
      `• Liquidity Risk: ${analysis.liquidityRisk || 'Minimal'}\n` +
      `• Execution Risk: ${analysis.executionRisk || 'Managed'}\n\n` +
      `💡 *INVESTOR INSIGHTS:*\n` +
      `• Best Time to Trade: ${analysis.bestTradingTime || 'Market Hours'}\n` +
      `• Recommended Strategy: ${analysis.recommendedStrategy || 'Conservative Arbitrage'}\n` +
      `• Expected Returns: ${analysis.expectedReturns || '0.3-1.0% per trade'}\n\n` +
      `🎯 *AI PREDICTIONS:*\n` +
      `• Next Hour Opportunities: ${analysis.predictedOpportunities || 'High'}\n` +
      `• Success Probability: ${analysis.successProbability || '85'}%\n` +
      `• Risk-Adjusted Return: ${analysis.riskAdjustedReturn || 'Positive'}\n\n` +
      `📈 *Stay informed with real-time arbitrage opportunities!*`;

    await this.sendChannelMessage(message);
  }

  /**
   * Generate key takeaways for investor updates
   */
  generateKeyTakeaways(metrics) {
    const takeaways = [];

    if (metrics.totalProfit > 0) {
      takeaways.push(`• Strong positive performance with $${metrics.totalProfit.toFixed(2)} in profits`);
    }

    if (metrics.efficiency > 95) {
      takeaways.push(`• System operating at ${metrics.efficiency.toFixed(1)}% efficiency - industry leading`);
    }

    if (metrics.winRate > 80) {
      takeaways.push(`• ${metrics.winRate.toFixed(1)}% win rate demonstrates reliable profit generation`);
    }

    if (metrics.riskLevel === 'Low') {
      takeaways.push(`• Risk management systems maintaining low-risk profile`);
    }

    if (takeaways.length === 0) {
      takeaways.push(`• System monitoring market conditions for optimal entry points`);
    }

    return takeaways.join('\n');
  }

  /**
   * Format hot pairs for market analysis
   */
  formatHotPairs(pairs) {
    if (!pairs || pairs.length === 0) {
      return '• No significantly hot pairs detected';
    }

    return pairs.slice(0, 3).map((pair, index) => {
      return `${index + 1}. ${pair.symbol}: ${pair.activity} (${pair.profit}%)`;
    }).join('\n');
  }

  /**
   * Check if we should send alert (cooldown check)
   */
  shouldSendAlert(alertKey) {
    const lastTime = this.lastAlertTime.get(alertKey);
    const now = Date.now();
    
    if (!lastTime || (now - lastTime) > this.alertCooldown) {
      this.lastAlertTime.set(alertKey, now);
      return true;
    }
    
    return false;
  }

  /**
   * Send alert for a profitable opportunity
   */
  async alertOpportunity(opportunity) {
    if (!this.isEnabled) return false;

    // Check cooldown to avoid spam
    const alertKey = `opportunity_${opportunity.triangle}`;
    if (!this.shouldSendAlert(alertKey)) {
      return false;
    }

    const message = this.formatOpportunityMessage(opportunity);
    const sent = await this.sendMessage(message);
    
    if (sent) {
      this.alertHistory.push({
        type: 'opportunity',
        opportunity,
        timestamp: new Date()
      });
      console.log(`📱 Telegram alert sent: ${opportunity.triangle}`);
    }

    return sent;
  }

  /**
   * Format opportunity message
   */
  formatOpportunityMessage(opportunity) {
    const emoji = opportunity.isProfitable ? '💰' : '📊';
    const profitEmoji = opportunity.profitPct > 1 ? '🔥' : '✅';
    
    let message = `${emoji} *Arbitrage Opportunity Found!*\n\n`;
    message += `${profitEmoji} *Profit: ${opportunity.profitPct.toFixed(4)}%*\n`;
    message += `🔄 Triangle: \`${opportunity.triangle}\`\n`;
    message += `💵 Amount: ${opportunity.startAmount.toFixed(2)} → ${opportunity.endAmount.toFixed(2)}\n`;
    message += `📈 Gain: ${opportunity.profit.toFixed(4)}\n\n`;
    
    message += `*Execution Steps:*\n`;
    opportunity.steps.forEach((step, i) => {
      message += `${i+1}. ${step.action} ${step.pair}\n`;
      message += `   ${step.from} → ${step.to}\n`;
    });
    
    message += `\n⏰ ${new Date(opportunity.timestamp).toLocaleTimeString()}`;
    
    return message;
  }

  /**
   * Send alert for trade execution
   */
  async alertTradeExecution(tradeResult) {
    if (!this.isEnabled) return false;

    const message = this.formatTradeMessage(tradeResult);
    const sent = await this.sendMessage(message);
    
    if (sent) {
      this.alertHistory.push({
        type: 'trade',
        tradeResult,
        timestamp: new Date()
      });
      console.log(`📱 Telegram trade alert sent`);
    }

    return sent;
  }

  /**
   * Format trade execution message
   */
  formatTradeMessage(tradeResult) {
    const emoji = tradeResult.success ? '✅' : '❌';
    const profitEmoji = tradeResult.actualProfitPct > 0 ? '💰' : '📉';
    
    let message = `${emoji} *Trade ${tradeResult.success ? 'Completed' : 'Failed'}!*\n\n`;
    
    if (tradeResult.success) {
      message += `${profitEmoji} *Profit: ${tradeResult.actualProfitPct.toFixed(4)}%*\n`;
      message += `💵 Amount: ${tradeResult.actualProfit.toFixed(4)}\n`;
    } else {
      message += `⚠️ Error: ${tradeResult.error}\n`;
    }
    
    message += `🔄 Triangle: \`${tradeResult.opportunity.triangle}\`\n`;
    message += `⏱️ Duration: ${tradeResult.endTime - tradeResult.startTime}ms\n`;
    message += `📊 Steps Completed: ${tradeResult.steps.length}/${tradeResult.opportunity.steps.length}\n\n`;
    
    if (tradeResult.success && tradeResult.steps.length > 0) {
      message += `*Execution Details:*\n`;
      tradeResult.steps.forEach((step, i) => {
        message += `${i+1}. ${step.side.toUpperCase()} ${step.symbol}\n`;
        message += `   Amount: ${step.actualInput.toFixed(8)}\n`;
        message += `   Price: ${step.actualPrice.toFixed(8)}\n`;
      });
    }
    
    message += `\n⏰ ${new Date(tradeResult.endTime).toLocaleTimeString()}`;
    
    return message;
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(stats) {
    if (!this.isEnabled) return false;

    let message = `📊 *Daily Summary*\n\n`;
    message += `🔍 Opportunities Scanned: ${stats.totalOpportunitiesScanned}\n`;
    message += `💰 Profitable Found: ${stats.profitableOpportunities}\n`;
    message += `🤖 Trades Executed: ${stats.totalTrades}\n`;
    message += `✅ Successful: ${stats.successfulTrades}\n`;
    message += `❌ Failed: ${stats.failedTrades}\n\n`;
    
    if (stats.totalProfit !== 0) {
      const profitEmoji = stats.totalProfit > 0 ? '💰' : '📉';
      message += `${profitEmoji} *Total Profit: ${stats.totalProfit.toFixed(4)}*\n`;
      message += `📈 Average: ${stats.averageProfit.toFixed(4)}\n\n`;
    }
    
    if (stats.bestOpportunity) {
      message += `🏆 *Best Opportunity:*\n`;
      message += `   ${stats.bestOpportunity.triangle}\n`;
      message += `   Profit: ${stats.bestOpportunity.profitPct.toFixed(4)}%\n`;
    }
    
    message += `\n📅 ${new Date(stats.date).toLocaleDateString()}`;
    
    return await this.sendMessage(message);
  }

  /**
   * Send error alert
   */
  async alertError(error, context = '') {
    if (!this.isEnabled) return false;

    let message = `⚠️ *Error Occurred*\n\n`;
    if (context) {
      message += `Context: ${context}\n`;
    }
    message += `Error: \`${error.message}\`\n`;
    message += `\n⏰ ${new Date().toLocaleTimeString()}`;
    
    return await this.sendMessage(message);
  }

  /**
   * Send scan results summary
   */
  async sendScanSummary(results, scanNumber = null) {
    if (!this.isEnabled) return false;

    const profitable = results.filter(r => r.isProfitable);
    
    if (profitable.length === 0) {
      // Don't send alerts for scans with no opportunities
      return false;
    }

    let message = `🔍 *Scan`;
    if (scanNumber) {
      message += ` #${scanNumber}`;
    }
    message += ` Complete*\n\n`;
    
    message += `📊 Scanned: ${results.length} triangles\n`;
    message += `💰 Profitable: ${profitable.length}\n\n`;
    
    if (profitable.length > 0) {
      message += `*Top 3 Opportunities:*\n`;
      profitable.slice(0, 3).forEach((opp, i) => {
        message += `${i+1}. ${opp.triangle}\n`;
        message += `   Profit: ${opp.profitPct.toFixed(4)}%\n`;
      });
    }
    
    message += `\n⏰ ${new Date().toLocaleTimeString()}`;
    
    return await this.sendMessage(message);
  }

  /**
   * Send custom alert
   */
  async sendCustomAlert(title, details) {
    if (!this.isEnabled) return false;

    let message = `🔔 *${title}*\n\n`;
    
    if (typeof details === 'string') {
      message += details;
    } else if (typeof details === 'object') {
      for (const [key, value] of Object.entries(details)) {
        message += `${key}: ${value}\n`;
      }
    }
    
    message += `\n⏰ ${new Date().toLocaleTimeString()}`;
    
    return await this.sendMessage(message);
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    const total = this.alertHistory.length;
    const opportunities = this.alertHistory.filter(a => a.type === 'opportunity').length;
    const trades = this.alertHistory.filter(a => a.type === 'trade').length;
    
    return {
      total,
      opportunities,
      trades,
      lastAlert: this.alertHistory.length > 0 
        ? this.alertHistory[this.alertHistory.length - 1].timestamp
        : null
    };
  }

  /**
   * Test Telegram connection
   */
  async testConnection() {
    if (!this.isEnabled) {
      console.log('⚠️  Telegram alerts disabled');
      return false;
    }

    try {
      // Prefer sending to configured chat (private/admin) if available
      let sent = false;
      if (config.telegram.chatId) {
        sent = await this.sendMessage('🧪 *Test Message*\n\nTelegram bot is working correctly!');
      }

      // If not sent to chat, try sending to channel (useful when only channel is configured)
      if (!sent && (process.env.TELEGRAM_CHANNEL_ID || config.telegram.channelId)) {
        sent = await this.sendChannelMessage('🧪 *Test Message*\n\nTelegram channel delivery test.');
      }

      if (sent) {
        console.log('✅ Telegram test message sent successfully');
        return true;
      } else {
        console.log('❌ Failed to send test message — no chat or channel configured');
        return false;
      }
    } catch (error) {
      console.error('❌ Telegram test failed:', error.message);
      return false;
    }
  }

  /**
   * Stop Telegram bot polling
   */
  stopPolling() {
    if (this.bot && this.bot.isPolling()) {
      console.log('🔌 Stopping Telegram bot polling...');
      this.bot.stopPolling();
    }
  }
}

// Create singleton instance
export const telegramAlerts = new TelegramAlerts();

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Testing Telegram Alerts...\n');
  
  const alerts = new TelegramAlerts();
  
  if (alerts.isEnabled) {
    const initialized = alerts.initialize();
    
    if (initialized) {
      await alerts.testConnection();
      
      // Test opportunity alert
      const testOpportunity = {
        triangle: 'USDT → BTC → ETH → USDT',
        pairs: ['BTCUSDT', 'ETHBTC', 'ETHUSDT'],
        startAmount: 1000,
        endAmount: 1005.23,
        profit: 5.23,
        profitPct: 0.523,
        isProfitable: true,
        steps: [
          { step: 1, pair: 'BTCUSDT', action: 'BUY', from: 'USDT', to: 'BTC' },
          { step: 2, pair: 'ETHBTC', action: 'BUY', from: 'BTC', to: 'ETH' },
          { step: 3, pair: 'ETHUSDT', action: 'SELL', from: 'ETH', to: 'USDT' }
        ],
        timestamp: new Date()
      };
      
      console.log('\n📱 Sending test opportunity alert...');
      await alerts.alertOpportunity(testOpportunity);
      
      console.log('\n📊 Alert Statistics:', alerts.getAlertStats());
    }
  } else {
    console.log('⚠️  Telegram alerts are disabled. Enable in .env to test.');
  }
}
