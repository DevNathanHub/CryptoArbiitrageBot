// MongoDB Logger
// Logs arbitrage opportunities and trade executions to MongoDB

import { MongoClient } from 'mongodb';
import { config } from '../../config/config.js';

/**
 * MongoDB Logger Class
 * Manages database connections and logging operations
 */
export class MongoLogger {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      
      this.client = new MongoClient(config.mongodb.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      await this.client.connect();
      this.db = this.client.db(config.mongodb.database);
      this.isConnected = true;

      console.log(`✅ Connected to MongoDB: ${config.mongodb.database}`);
      
      // Create indexes for better query performance
      await this.createIndexes();
      
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Create database indexes
   */
  async createIndexes() {
    try {
      const opportunitiesCol = this.db.collection(config.mongodb.collections.opportunities);
      const tradesCol = this.db.collection(config.mongodb.collections.trades);
      const performanceCol = this.db.collection(config.mongodb.collections.performance);

      // Opportunities indexes
      await opportunitiesCol.createIndex({ timestamp: -1 });
      await opportunitiesCol.createIndex({ profitPct: -1 });
      await opportunitiesCol.createIndex({ isProfitable: 1 });
      await opportunitiesCol.createIndex({ triangle: 1 });

      // Trades indexes
      await tradesCol.createIndex({ startTime: -1 });
      await tradesCol.createIndex({ success: 1 });
      await tradesCol.createIndex({ actualProfitPct: -1 });

      // Performance indexes
      await performanceCol.createIndex({ date: -1 });

      console.log('✅ Database indexes created');
    } catch (error) {
      console.error('⚠️  Error creating indexes:', error.message);
    }
  }

  /**
   * Log an arbitrage opportunity
   */
  async logOpportunity(opportunity) {
    if (!this.isConnected) {
      console.log('⚠️  MongoDB not connected, skipping log');
      return null;
    }

    try {
      const collection = this.db.collection(config.mongodb.collections.opportunities);
      
      const document = {
        ...opportunity,
        loggedAt: new Date()
      };

      const result = await collection.insertOne(document);
      console.log(`📝 Logged opportunity: ${opportunity.triangle} (${opportunity.profitPct.toFixed(4)}%)`);
      
      return result.insertedId;
    } catch (error) {
      console.error('❌ Error logging opportunity:', error.message);
      return null;
    }
  }

  /**
   * Log multiple opportunities (bulk insert)
   */
  async logOpportunities(opportunities) {
    if (!this.isConnected || opportunities.length === 0) {
      return null;
    }

    try {
      const collection = this.db.collection(config.mongodb.collections.opportunities);
      
      const documents = opportunities.map(opp => ({
        ...opp,
        loggedAt: new Date()
      }));

      const result = await collection.insertMany(documents);
      console.log(`📝 Logged ${result.insertedCount} opportunities`);
      
      return result.insertedIds;
    } catch (error) {
      console.error('❌ Error logging opportunities:', error.message);
      return null;
    }
  }

  /**
   * Log a trade execution
   */
  async logTrade(tradeResult) {
    if (!this.isConnected) {
      console.log('⚠️  MongoDB not connected, skipping log');
      return null;
    }

    try {
      const collection = this.db.collection(config.mongodb.collections.trades);
      
      const document = {
        ...tradeResult,
        loggedAt: new Date()
      };

      const result = await collection.insertOne(document);
      
      const status = tradeResult.success ? '✅' : '❌';
      console.log(`📝 ${status} Logged trade execution: ${tradeResult.opportunity.triangle}`);
      
      return result.insertedId;
    } catch (error) {
      console.error('❌ Error logging trade:', error.message);
      return null;
    }
  }

  /**
   * Get recent profitable opportunities
   */
  async getRecentProfitableOpportunities(limit = 10) {
    if (!this.isConnected) return [];

    try {
      const collection = this.db.collection(config.mongodb.collections.opportunities);
      
      const opportunities = await collection
        .find({ isProfitable: true })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return opportunities;
    } catch (error) {
      console.error('❌ Error fetching opportunities:', error.message);
      return [];
    }
  }

  /**
   * Get opportunities by triangle
   */
  async getOpportunitiesByTriangle(triangle, limit = 100) {
    if (!this.isConnected) return [];

    try {
      const collection = this.db.collection(config.mongodb.collections.opportunities);
      
      const opportunities = await collection
        .find({ triangle })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return opportunities;
    } catch (error) {
      console.error('❌ Error fetching opportunities:', error.message);
      return [];
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(limit = 50) {
    if (!this.isConnected) return [];

    try {
      const collection = this.db.collection(config.mongodb.collections.trades);
      
      const trades = await collection
        .find({})
        .sort({ startTime: -1 })
        .limit(limit)
        .toArray();

      return trades;
    } catch (error) {
      console.error('❌ Error fetching trades:', error.message);
      return [];
    }
  }

  /**
   * Get successful trades
   */
  async getSuccessfulTrades(limit = 50) {
    if (!this.isConnected) return [];

    try {
      const collection = this.db.collection(config.mongodb.collections.trades);
      
      const trades = await collection
        .find({ success: true })
        .sort({ startTime: -1 })
        .limit(limit)
        .toArray();

      return trades;
    } catch (error) {
      console.error('❌ Error fetching successful trades:', error.message);
      return [];
    }
  }

  /**
   * Calculate and log daily performance
   */
  async logDailyPerformance() {
    if (!this.isConnected) return null;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's opportunities
      const opportunitiesCol = this.db.collection(config.mongodb.collections.opportunities);
      const opportunities = await opportunitiesCol
        .find({
          timestamp: { $gte: today, $lt: tomorrow }
        })
        .toArray();

      // Get today's trades
      const tradesCol = this.db.collection(config.mongodb.collections.trades);
      const trades = await tradesCol
        .find({
          startTime: { $gte: today, $lt: tomorrow }
        })
        .toArray();

      const profitableOpportunities = opportunities.filter(o => o.isProfitable);
      const successfulTrades = trades.filter(t => t.success);
      const totalProfit = successfulTrades.reduce((sum, t) => sum + (t.actualProfit || 0), 0);

      const performance = {
        date: today,
        totalOpportunitiesScanned: opportunities.length,
        profitableOpportunities: profitableOpportunities.length,
        totalTrades: trades.length,
        successfulTrades: successfulTrades.length,
        failedTrades: trades.length - successfulTrades.length,
        totalProfit,
        averageProfit: successfulTrades.length > 0 ? totalProfit / successfulTrades.length : 0,
        bestOpportunity: profitableOpportunities.length > 0
          ? profitableOpportunities.reduce((max, o) => o.profitPct > max.profitPct ? o : max)
          : null,
        loggedAt: new Date()
      };

      const performanceCol = this.db.collection(config.mongodb.collections.performance);
      await performanceCol.updateOne(
        { date: today },
        { $set: performance },
        { upsert: true }
      );

      console.log('📊 Daily performance logged');
      return performance;
    } catch (error) {
      console.error('❌ Error logging performance:', error.message);
      return null;
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(days = 7) {
    if (!this.isConnected) return null;

    try {
      const collection = this.db.collection(config.mongodb.collections.performance);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await collection
        .find({ date: { $gte: startDate } })
        .sort({ date: -1 })
        .toArray();

      return stats;
    } catch (error) {
      console.error('❌ Error fetching performance stats:', error.message);
      return null;
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary() {
    if (!this.isConnected) return null;

    try {
      const opportunitiesCol = this.db.collection(config.mongodb.collections.opportunities);
      const tradesCol = this.db.collection(config.mongodb.collections.trades);

      // Total opportunities
      const totalOpportunities = await opportunitiesCol.countDocuments();
      const profitableCount = await opportunitiesCol.countDocuments({ isProfitable: true });

      // Total trades
      const totalTrades = await tradesCol.countDocuments();
      const successfulTrades = await tradesCol.countDocuments({ success: true });

      // Best opportunity
      const bestOpportunity = await opportunitiesCol
        .find({})
        .sort({ profitPct: -1 })
        .limit(1)
        .toArray();

      // Most profitable triangle
      const triangleStats = await opportunitiesCol.aggregate([
        { $match: { isProfitable: true } },
        { $group: {
          _id: '$triangle',
          count: { $sum: 1 },
          avgProfit: { $avg: '$profitPct' },
          maxProfit: { $max: '$profitPct' }
        }},
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).toArray();

      const summary = {
        totalOpportunities,
        profitableOpportunities: profitableCount,
        profitableRate: totalOpportunities > 0 ? (profitableCount / totalOpportunities) * 100 : 0,
        totalTrades,
        successfulTrades,
        successRate: totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0,
        bestOpportunity: bestOpportunity[0] || null,
        topTriangles: triangleStats,
        generatedAt: new Date()
      };

      return summary;
    } catch (error) {
      console.error('❌ Error generating analytics:', error.message);
      return null;
    }
  }

  /**
   * Print analytics summary
   */
  async printAnalytics() {
    const summary = await this.getAnalyticsSummary();
    
    if (!summary) {
      console.log('⚠️  No analytics data available');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 ANALYTICS SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n🔍 Opportunities Scanned:`);
    console.log(`   Total: ${summary.totalOpportunities}`);
    console.log(`   Profitable: ${summary.profitableOpportunities} (${summary.profitableRate.toFixed(2)}%)`);
    
    console.log(`\n🤖 Trade Execution:`);
    console.log(`   Total Trades: ${summary.totalTrades}`);
    console.log(`   Successful: ${summary.successfulTrades} (${summary.successRate.toFixed(2)}%)`);
    
    if (summary.bestOpportunity) {
      console.log(`\n🏆 Best Opportunity:`);
      console.log(`   Triangle: ${summary.bestOpportunity.triangle}`);
      console.log(`   Profit: ${summary.bestOpportunity.profitPct.toFixed(4)}%`);
      console.log(`   Date: ${new Date(summary.bestOpportunity.timestamp).toLocaleString()}`);
    }

    if (summary.topTriangles.length > 0) {
      console.log(`\n📈 Top Performing Triangles:`);
      summary.topTriangles.forEach((t, i) => {
        console.log(`   ${i+1}. ${t._id}`);
        console.log(`      Count: ${t.count} | Avg: ${t.avgProfit.toFixed(4)}% | Max: ${t.maxProfit.toFixed(4)}%`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Clear old data (cleanup)
   */
  async clearOldData(daysToKeep = 30) {
    if (!this.isConnected) return;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const opportunitiesCol = this.db.collection(config.mongodb.collections.opportunities);
      const result1 = await opportunitiesCol.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      const tradesCol = this.db.collection(config.mongodb.collections.trades);
      const result2 = await tradesCol.deleteMany({
        startTime: { $lt: cutoffDate }
      });

      console.log(`🗑️  Cleaned up old data: ${result1.deletedCount + result2.deletedCount} documents deleted`);
    } catch (error) {
      console.error('❌ Error clearing old data:', error.message);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Create singleton instance
export const logger = new MongoLogger();

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Testing MongoDB Logger...\n');
  
  const testLogger = new MongoLogger();
  const connected = await testLogger.connect();
  
  if (connected) {
    // Print analytics
    await testLogger.printAnalytics();
    
    // Disconnect
    await testLogger.disconnect();
  }
}
