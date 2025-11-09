// Advanced Opportunity Selection Strategy
// Evaluates and ranks arbitrage opportunities using multiple criteria

import { config } from '../../config/config.js';

/**
 * Opportunity Scoring System
 * Evaluates opportunities based on multiple factors
 */
export class OpportunitySelector {
  constructor() {
    this.weights = {
      profitPercent: 0.40,      // 40% weight on profit percentage
      profitAmount: 0.25,        // 25% weight on absolute profit
      executionSpeed: 0.15,      // 15% weight on estimated execution speed
      liquidity: 0.10,           // 10% weight on liquidity depth
      volatility: 0.05,          // 5% weight on price stability
      historicalSuccess: 0.05    // 5% weight on past success rate
    };
    this.opportunityHistory = new Map();
    this.executionTimes = new Map();
  }

  /**
   * Score an opportunity based on multiple factors
   * @param {Object} opportunity - Arbitrage opportunity
   * @returns {number} Score (0-100)
   */
  scoreOpportunity(opportunity) {
    const scores = {
      profit: this.scoreProfitability(opportunity),
      execution: this.scoreExecutionSpeed(opportunity),
      liquidity: this.scoreLiquidity(opportunity),
      volatility: this.scoreVolatility(opportunity),
      historical: this.scoreHistoricalSuccess(opportunity)
    };

    // Calculate weighted score
    const totalScore = 
      (scores.profit * this.weights.profitPercent * 2) +  // Profit has 2 components
      (scores.execution * this.weights.executionSpeed) +
      (scores.liquidity * this.weights.liquidity) +
      (scores.volatility * this.weights.volatility) +
      (scores.historical * this.weights.historicalSuccess);

    return {
      totalScore: Math.min(100, totalScore),
      breakdown: scores,
      opportunity
    };
  }

  /**
   * Score based on profitability (profit % and absolute amount)
   */
  scoreProfitability(opportunity) {
    const profitPct = opportunity.profitPct;
    const profitAmount = opportunity.profit;
    
    // Score profit percentage (exponential scale)
    let pctScore = 0;
    if (profitPct >= 1.0) pctScore = 100;
    else if (profitPct >= 0.7) pctScore = 90;
    else if (profitPct >= 0.5) pctScore = 80;
    else if (profitPct >= 0.4) pctScore = 70;
    else if (profitPct >= 0.3) pctScore = 60;
    else pctScore = profitPct * 200; // Linear below threshold

    // Score absolute profit amount
    let amountScore = 0;
    if (profitAmount >= 50) amountScore = 100;
    else if (profitAmount >= 30) amountScore = 85;
    else if (profitAmount >= 20) amountScore = 70;
    else if (profitAmount >= 10) amountScore = 55;
    else if (profitAmount >= 5) amountScore = 40;
    else amountScore = profitAmount * 8;

    return (pctScore + amountScore) / 2;
  }

  /**
   * Score based on estimated execution speed
   */
  scoreExecutionSpeed(opportunity) {
    const stepCount = opportunity.steps.length;
    
    // Fewer steps = faster execution = higher score
    if (stepCount === 3) return 100; // Standard triangle
    if (stepCount === 4) return 75;
    if (stepCount === 5) return 50;
    return Math.max(0, 100 - (stepCount * 10));
  }

  /**
   * Score based on liquidity depth
   */
  scoreLiquidity(opportunity) {
    // Analyze order book depth from simulation steps
    let totalLiquidityScore = 0;
    
    opportunity.steps.forEach(step => {
      const slippage = Math.abs(step.price - (step.input / step.output));
      const slippagePercent = (slippage / step.price) * 100;
      
      // Lower slippage = better liquidity = higher score
      if (slippagePercent < 0.01) totalLiquidityScore += 100;
      else if (slippagePercent < 0.05) totalLiquidityScore += 90;
      else if (slippagePercent < 0.10) totalLiquidityScore += 80;
      else if (slippagePercent < 0.20) totalLiquidityScore += 70;
      else if (slippagePercent < 0.50) totalLiquidityScore += 60;
      else totalLiquidityScore += Math.max(0, 50 - slippagePercent * 100);
    });

    return totalLiquidityScore / opportunity.steps.length;
  }

  /**
   * Score based on price volatility/stability
   */
  scoreVolatility(opportunity) {
    // Check if prices are stable (not moving too fast)
    const history = this.opportunityHistory.get(opportunity.triangle) || [];
    
    if (history.length < 2) return 75; // Neutral score for new triangles

    // Compare current profit with recent history
    const recentProfits = history.slice(-5).map(h => h.profitPct);
    const avgProfit = recentProfits.reduce((a, b) => a + b, 0) / recentProfits.length;
    const variance = recentProfits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / recentProfits.length;
    const stdDev = Math.sqrt(variance);

    // Lower volatility = higher score
    if (stdDev < 0.05) return 100;
    if (stdDev < 0.10) return 90;
    if (stdDev < 0.20) return 80;
    if (stdDev < 0.30) return 70;
    if (stdDev < 0.50) return 60;
    return Math.max(0, 100 - stdDev * 200);
  }

  /**
   * Score based on historical success rate
   */
  scoreHistoricalSuccess(opportunity) {
    const history = this.opportunityHistory.get(opportunity.triangle) || [];
    
    if (history.length === 0) return 70; // Neutral score for new triangles

    // Calculate success rate (how often it stayed profitable)
    const successCount = history.filter(h => h.isProfitable).length;
    const successRate = successCount / history.length;

    // Recent success matters more
    const recentHistory = history.slice(-10);
    const recentSuccessCount = recentHistory.filter(h => h.isProfitable).length;
    const recentSuccessRate = recentSuccessCount / recentHistory.length;

    // Weighted average (70% recent, 30% overall)
    const combinedRate = (recentSuccessRate * 0.7) + (successRate * 0.3);

    return combinedRate * 100;
  }

  /**
   * Select the best opportunity from a list
   * @param {Array} opportunities - List of opportunities
   * @returns {Object} Best opportunity with score
   */
  selectBestOpportunity(opportunities) {
    if (opportunities.length === 0) return null;

    // Score all opportunities
    const scoredOpportunities = opportunities.map(opp => this.scoreOpportunity(opp));

    // Sort by total score (highest first)
    scoredOpportunities.sort((a, b) => b.totalScore - a.totalScore);

    return scoredOpportunities[0];
  }

  /**
   * Select top N opportunities
   * @param {Array} opportunities - List of opportunities
   * @param {number} count - Number to select
   * @returns {Array} Top N opportunities with scores
   */
  selectTopOpportunities(opportunities, count = 3) {
    if (opportunities.length === 0) return [];

    // Score all opportunities
    const scoredOpportunities = opportunities.map(opp => this.scoreOpportunity(opp));

    // Sort by total score (highest first)
    scoredOpportunities.sort((a, b) => b.totalScore - a.totalScore);

    return scoredOpportunities.slice(0, count);
  }

  /**
   * Filter opportunities by minimum quality threshold
   * @param {Array} opportunities - List of opportunities
   * @param {number} minScore - Minimum score threshold (0-100)
   * @returns {Array} Filtered opportunities
   */
  filterByQuality(opportunities, minScore = 60) {
    const scoredOpportunities = opportunities.map(opp => this.scoreOpportunity(opp));
    return scoredOpportunities.filter(scored => scored.totalScore >= minScore);
  }

  /**
   * Record opportunity for historical analysis
   */
  recordOpportunity(opportunity) {
    const triangle = opportunity.triangle;
    
    if (!this.opportunityHistory.has(triangle)) {
      this.opportunityHistory.set(triangle, []);
    }

    const history = this.opportunityHistory.get(triangle);
    history.push({
      timestamp: opportunity.timestamp,
      profitPct: opportunity.profitPct,
      profit: opportunity.profit,
      isProfitable: opportunity.isProfitable
    });

    // Keep only last 100 records per triangle
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Record execution time for a triangle
   */
  recordExecutionTime(triangle, executionTime) {
    if (!this.executionTimes.has(triangle)) {
      this.executionTimes.set(triangle, []);
    }

    const times = this.executionTimes.get(triangle);
    times.push(executionTime);

    // Keep only last 50 execution times
    if (times.length > 50) {
      times.shift();
    }
  }

  /**
   * Get average execution time for a triangle
   */
  getAverageExecutionTime(triangle) {
    const times = this.executionTimes.get(triangle);
    if (!times || times.length === 0) return null;

    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  /**
   * Smart opportunity selection with risk assessment
   * @param {Array} opportunities - List of opportunities
   * @returns {Object} Best opportunity with risk level
   */
  selectWithRiskAssessment(opportunities) {
    const best = this.selectBestOpportunity(opportunities);
    
    if (!best) return null;

    // Determine risk level based on score breakdown
    let riskLevel = 'LOW';
    
    if (best.breakdown.volatility < 50 || best.breakdown.liquidity < 60) {
      riskLevel = 'HIGH';
    } else if (best.breakdown.volatility < 70 || best.breakdown.liquidity < 75) {
      riskLevel = 'MEDIUM';
    }

    return {
      ...best,
      riskLevel,
      recommendation: this.getRecommendation(best, riskLevel)
    };
  }

  /**
   * Get trading recommendation based on score and risk
   */
  getRecommendation(scored, riskLevel) {
    const score = scored.totalScore;
    const profit = scored.opportunity.profitPct;

    if (score >= 85 && profit >= 0.5 && riskLevel === 'LOW') {
      return 'STRONG_BUY';
    } else if (score >= 75 && profit >= 0.4) {
      return 'BUY';
    } else if (score >= 65 && profit >= 0.3) {
      return 'CONSIDER';
    } else if (score >= 50) {
      return 'MONITOR';
    } else {
      return 'SKIP';
    }
  }

  /**
   * Print detailed analysis of an opportunity
   */
  printOpportunityAnalysis(scoredOpportunity) {
    const { totalScore, breakdown, opportunity, riskLevel, recommendation } = scoredOpportunity;

    console.log('\n' + '='.repeat(80));
    console.log('🎯 OPPORTUNITY ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Triangle: ${opportunity.triangle}`);
    console.log(`Profit: ${opportunity.profitPct.toFixed(4)}% (${opportunity.profit.toFixed(4)} ${opportunity.triangle.split(' → ')[0]})`);
    console.log('\n📊 SCORE BREAKDOWN:');
    console.log(`   Total Score: ${totalScore.toFixed(2)}/100`);
    console.log(`   Profitability: ${breakdown.profit.toFixed(2)}/100`);
    console.log(`   Execution Speed: ${breakdown.execution.toFixed(2)}/100`);
    console.log(`   Liquidity: ${breakdown.liquidity.toFixed(2)}/100`);
    console.log(`   Volatility: ${breakdown.volatility.toFixed(2)}/100`);
    console.log(`   Historical Success: ${breakdown.historical.toFixed(2)}/100`);
    
    if (riskLevel) {
      const riskEmoji = riskLevel === 'LOW' ? '🟢' : riskLevel === 'MEDIUM' ? '🟡' : '🔴';
      console.log(`\n${riskEmoji} Risk Level: ${riskLevel}`);
    }
    
    if (recommendation) {
      const recEmoji = 
        recommendation === 'STRONG_BUY' ? '🚀' :
        recommendation === 'BUY' ? '✅' :
        recommendation === 'CONSIDER' ? '🤔' :
        recommendation === 'MONITOR' ? '👀' : '⏭️';
      console.log(`${recEmoji} Recommendation: ${recommendation}`);
    }
    
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Get statistics about opportunity selection
   */
  getSelectionStats() {
    const totalTriangles = this.opportunityHistory.size;
    let totalOpportunities = 0;
    let totalProfitable = 0;

    this.opportunityHistory.forEach((history) => {
      totalOpportunities += history.length;
      totalProfitable += history.filter(h => h.isProfitable).length;
    });

    return {
      totalTriangles,
      totalOpportunities,
      totalProfitable,
      profitableRate: totalOpportunities > 0 ? (totalProfitable / totalOpportunities) * 100 : 0
    };
  }
}

// Create singleton instance
export const opportunitySelector = new OpportunitySelector();

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Testing Opportunity Selector...\n');
  
  // Test with mock opportunities
  const mockOpportunities = [
    {
      triangle: 'USDT → BTC → ETH → USDT',
      pairs: ['BTCUSDT', 'ETHBTC', 'ETHUSDT'],
      startAmount: 1000,
      endAmount: 1004.5,
      profit: 4.5,
      profitPct: 0.45,
      isProfitable: true,
      steps: [
        { step: 1, input: 1000, output: 0.0215, price: 46511.63 },
        { step: 2, input: 0.0215, output: 0.563, price: 0.0382 },
        { step: 3, input: 0.563, output: 1004.5, price: 1784.37 }
      ],
      timestamp: new Date()
    },
    {
      triangle: 'USDT → BTC → BNB → USDT',
      pairs: ['BTCUSDT', 'BNBBTC', 'BNBUSDT'],
      startAmount: 1000,
      endAmount: 1003.2,
      profit: 3.2,
      profitPct: 0.32,
      isProfitable: true,
      steps: [
        { step: 1, input: 1000, output: 0.0215, price: 46511.63 },
        { step: 2, input: 0.0215, output: 1.62, price: 0.0133 },
        { step: 3, input: 1.62, output: 1003.2, price: 619.38 }
      ],
      timestamp: new Date()
    }
  ];

  const selector = new OpportunitySelector();
  
  // Test scoring
  console.log('Testing opportunity scoring...\n');
  mockOpportunities.forEach(opp => {
    const scored = selector.scoreOpportunity(opp);
    console.log(`${opp.triangle}: Score ${scored.totalScore.toFixed(2)}/100`);
  });

  // Test selection
  console.log('\nSelecting best opportunity...\n');
  const best = selector.selectWithRiskAssessment(mockOpportunities);
  if (best) {
    selector.printOpportunityAnalysis(best);
  }
}
