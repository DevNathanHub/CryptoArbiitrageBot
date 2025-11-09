// Gemini AI Analyzer
// Provides intelligent market analysis, profit predictions, and reasoning for arbitrage opportunities

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/config.js';

/**
 * Gemini AI Analyzer for Crypto Arbitrage
 * Uses Google's Gemini 2.5 Flash for intelligent market analysis
 */
export class GeminiAnalyzer {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.isEnabled = !!this.apiKey;
    this.genAI = null;
    this.model = null;
    this.analysisCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Initialize Gemini AI
   */
  initialize() {
    if (!this.isEnabled) {
      console.log('⚠️  Gemini AI disabled - no API key provided');
      return false;
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      console.log('✅ Gemini AI initialized (gemini-2.0-flash-exp)');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error.message);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Analyze arbitrage opportunity with AI reasoning
   * @param {object} opportunity - Opportunity object
   * @returns {object} AI analysis with reasoning, predictions, and insights
   */
  async analyzeOpportunity(opportunity) {
    if (!this.isEnabled || !this.model) {
      return this.getFallbackAnalysis(opportunity);
    }

    // Check cache
    const cacheKey = `opp_${opportunity.triangle}_${opportunity.profitPct.toFixed(4)}`;
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.analysis;
      }
    }

    try {
      const prompt = this.buildOpportunityPrompt(opportunity);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const analysis = this.parseOpportunityAnalysis(text, opportunity);
      
      // Cache result
      this.analysisCache.set(cacheKey, {
        analysis,
        timestamp: Date.now()
      });

      return analysis;
    } catch (error) {
      console.error('❌ Gemini AI analysis failed:', error.message);
      return this.getFallbackAnalysis(opportunity);
    }
  }

  /**
   * Build prompt for opportunity analysis
   */
  buildOpportunityPrompt(opportunity) {
    return `You are an expert cryptocurrency arbitrage analyst. Analyze this triangular arbitrage opportunity and provide concise insights.

OPPORTUNITY DETAILS:
- Triangle Path: ${opportunity.triangle}
- Profit Percentage: ${opportunity.profitPct.toFixed(4)}%
- Profit Amount: $${opportunity.profitUsd.toFixed(2)}
- Trade Amount: $${opportunity.startAmount || 1000}
- Pairs: ${opportunity.pairs.join(', ')}

Provide a brief analysis (max 150 words) covering:
1. REASONING: Why this opportunity exists (market inefficiency, volatility, liquidity)
2. PROFIT PREDICTION: Likelihood this profit will hold (High/Medium/Low) and why
3. RISK FACTORS: Key risks (slippage, execution speed, market movement)
4. RECOMMENDATION: Should execute? (STRONG BUY/BUY/HOLD/AVOID)
5. KEY INSIGHT: One critical insight an investor should know

Format your response as JSON:
{
  "reasoning": "Brief explanation",
  "profitPrediction": {
    "likelihood": "High/Medium/Low",
    "explanation": "Why"
  },
  "riskFactors": ["risk1", "risk2", "risk3"],
  "recommendation": "STRONG BUY/BUY/HOLD/AVOID",
  "keyInsight": "Critical insight",
  "confidence": 0-100
}`;
  }

  /**
   * Parse AI response into structured analysis
   */
  parseOpportunityAnalysis(text, opportunity) {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          reasoning: parsed.reasoning || 'Market inefficiency detected',
          profitPrediction: parsed.profitPrediction || { likelihood: 'Medium', explanation: 'Standard arbitrage conditions' },
          riskFactors: parsed.riskFactors || ['Execution speed', 'Slippage', 'Market volatility'],
          recommendation: parsed.recommendation || 'BUY',
          keyInsight: parsed.keyInsight || 'Monitor execution speed for optimal profit',
          confidence: parsed.confidence || 75,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error.message);
    }

    return this.getFallbackAnalysis(opportunity);
  }

  /**
   * Analyze market conditions for arbitrage
   * @param {array} opportunities - Array of opportunities
   * @returns {object} Market analysis
   */
  async analyzeMarketConditions(opportunities) {
    if (!this.isEnabled || !this.model) {
      return this.getFallbackMarketAnalysis(opportunities);
    }

    try {
      const prompt = this.buildMarketPrompt(opportunities);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseMarketAnalysis(text, opportunities);
    } catch (error) {
      console.error('❌ Gemini market analysis failed:', error.message);
      return this.getFallbackMarketAnalysis(opportunities);
    }
  }

  /**
   * Build prompt for market analysis
   */
  buildMarketPrompt(opportunities) {
    const oppSummary = opportunities.slice(0, 5).map(o => 
      `${o.triangle}: ${o.profitPct.toFixed(4)}%`
    ).join('\n');

    return `You are a cryptocurrency market analyst. Analyze current arbitrage market conditions.

CURRENT OPPORTUNITIES (Top 5):
${oppSummary}

Total Opportunities: ${opportunities.length}
Average Profit: ${(opportunities.reduce((sum, o) => sum + o.profitPct, 0) / opportunities.length).toFixed(4)}%

Provide concise market analysis (max 200 words):
1. MARKET TREND: Bullish/Bearish/Sideways and why
2. VOLATILITY: Current volatility level affecting arbitrage
3. BEST STRATEGY: Recommended arbitrage strategy right now
4. TIMING: Best time window to execute (immediate/wait/avoid)
5. PREDICTIONS: Next 1-hour market movement impact on opportunities

Format as JSON:
{
  "marketTrend": "bullish/bearish/sideways",
  "trendReasoning": "Why",
  "volatility": "high/medium/low",
  "volatilityImpact": "How it affects arbitrage",
  "bestStrategy": "Strategy recommendation",
  "timing": "immediate/wait 15min/wait 1hr/avoid",
  "timingReason": "Why",
  "hourlyPrediction": "What to expect",
  "topPairs": ["pair1", "pair2", "pair3"],
  "confidence": 0-100
}`;
  }

  /**
   * Parse market analysis response
   */
  parseMarketAnalysis(text, opportunities) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          marketTrend: parsed.marketTrend || 'sideways',
          trendReasoning: parsed.trendReasoning || 'Normal market conditions',
          volatility: parsed.volatility || 'medium',
          volatilityImpact: parsed.volatilityImpact || 'Standard arbitrage windows',
          bestStrategy: parsed.bestStrategy || 'Conservative triangular arbitrage',
          timing: parsed.timing || 'immediate',
          timingReason: parsed.timingReason || 'Opportunities available',
          hourlyPrediction: parsed.hourlyPrediction || 'Stable conditions expected',
          topPairs: parsed.topPairs || this.extractTopPairs(opportunities),
          confidence: parsed.confidence || 70,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Failed to parse market analysis:', error.message);
    }

    return this.getFallbackMarketAnalysis(opportunities);
  }

  /**
   * Generate daily performance insights
   * @param {object} stats - Performance statistics
   * @returns {object} AI insights
   */
  async generatePerformanceInsights(stats) {
    if (!this.isEnabled || !this.model) {
      return this.getFallbackPerformanceInsights(stats);
    }

    try {
      const prompt = `Analyze this arbitrage bot's daily performance and provide actionable insights.

PERFORMANCE DATA:
- Total Scans: ${stats.totalScans || 0}
- Opportunities Found: ${stats.opportunitiesFound || 0}
- Success Rate: ${stats.successRate || 0}%
- Trades Executed: ${stats.tradesExecuted || 0}
- Best Profit: ${stats.bestProfit || 0}%

Provide brief analysis (max 150 words):
1. PERFORMANCE RATING: Excellent/Good/Average/Poor and why
2. KEY STRENGTH: What's working well
3. IMPROVEMENT AREA: What needs optimization
4. ACTIONABLE ADVICE: 2-3 specific recommendations
5. TOMORROW'S STRATEGY: What to focus on

Format as JSON:
{
  "rating": "excellent/good/average/poor",
  "ratingReason": "Why",
  "keyStrength": "What's working",
  "improvementArea": "What to optimize",
  "recommendations": ["rec1", "rec2", "rec3"],
  "tomorrowStrategy": "Focus areas",
  "confidence": 0-100
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parsePerformanceInsights(text, stats);
    } catch (error) {
      console.error('❌ Gemini performance analysis failed:', error.message);
      return this.getFallbackPerformanceInsights(stats);
    }
  }

  /**
   * Parse performance insights
   */
  parsePerformanceInsights(text, stats) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          rating: parsed.rating || 'average',
          ratingReason: parsed.ratingReason || 'Standard performance metrics',
          keyStrength: parsed.keyStrength || 'Consistent scanning',
          improvementArea: parsed.improvementArea || 'Increase opportunity detection',
          recommendations: parsed.recommendations || ['Monitor more pairs', 'Adjust profit threshold', 'Optimize execution speed'],
          tomorrowStrategy: parsed.tomorrowStrategy || 'Continue monitoring and refine detection algorithms',
          confidence: parsed.confidence || 70,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Failed to parse performance insights:', error.message);
    }

    return this.getFallbackPerformanceInsights(stats);
  }

  /**
   * Generate investor-focused market report
   * @param {object} marketData - Market data
   * @returns {string} Formatted report
   */
  async generateInvestorReport(marketData) {
    if (!this.isEnabled || !this.model) {
      return this.getFallbackInvestorReport(marketData);
    }

    try {
      const prompt = `Create a professional investor report for cryptocurrency arbitrage performance.

DATA:
- Active Opportunities: ${marketData.opportunities || 0}
- Market Trend: ${marketData.trend || 'Sideways'}
- Volatility: ${marketData.volatility || 'Medium'}
- System Efficiency: ${marketData.efficiency || 95}%

Create a 3-paragraph investor report (max 250 words):
1. MARKET OVERVIEW: Current conditions and trends
2. PERFORMANCE METRICS: System efficiency and profitability
3. OUTLOOK: Next 24-hour predictions and recommendations

Write professionally, focus on ROI and risk management.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('❌ Failed to generate investor report:', error.message);
      return this.getFallbackInvestorReport(marketData);
    }
  }

  /**
   * Fallback analysis when AI is unavailable
   */
  getFallbackAnalysis(opportunity) {
    const profitLevel = opportunity.profitPct > 0.5 ? 'High' : opportunity.profitPct > 0.3 ? 'Medium' : 'Low';
    
    return {
      reasoning: `Arbitrage opportunity detected through price inefficiency across ${opportunity.pairs.length} trading pairs`,
      profitPrediction: {
        likelihood: profitLevel,
        explanation: `Based on ${opportunity.profitPct.toFixed(4)}% profit margin and current market conditions`
      },
      riskFactors: ['Execution slippage', 'Network latency', 'Market volatility'],
      recommendation: opportunity.profitPct > 0.5 ? 'STRONG BUY' : opportunity.profitPct > 0.3 ? 'BUY' : 'HOLD',
      keyInsight: `Execute quickly to capture ${opportunity.profitPct.toFixed(4)}% profit before market adjusts`,
      confidence: 75,
      timestamp: new Date().toISOString(),
      aiGenerated: false
    };
  }

  /**
   * Fallback market analysis
   */
  getFallbackMarketAnalysis(opportunities) {
    const avgProfit = opportunities.length > 0 
      ? opportunities.reduce((sum, o) => sum + o.profitPct, 0) / opportunities.length 
      : 0;

    return {
      marketTrend: avgProfit > 0.5 ? 'bullish' : 'sideways',
      trendReasoning: `${opportunities.length} opportunities with ${avgProfit.toFixed(4)}% average profit`,
      volatility: opportunities.length > 10 ? 'high' : opportunities.length > 5 ? 'medium' : 'low',
      volatilityImpact: 'Creates arbitrage windows with varying durations',
      bestStrategy: 'Conservative triangular arbitrage with quick execution',
      timing: opportunities.length > 0 ? 'immediate' : 'wait',
      timingReason: opportunities.length > 0 ? 'Active opportunities available' : 'Wait for better conditions',
      hourlyPrediction: 'Market conditions expected to remain stable',
      topPairs: this.extractTopPairs(opportunities),
      confidence: 70,
      timestamp: new Date().toISOString(),
      aiGenerated: false
    };
  }

  /**
   * Fallback performance insights
   */
  getFallbackPerformanceInsights(stats) {
    const rating = stats.successRate > 80 ? 'excellent' : stats.successRate > 60 ? 'good' : 'average';
    
    return {
      rating,
      ratingReason: `${stats.successRate || 0}% success rate with ${stats.opportunitiesFound || 0} opportunities found`,
      keyStrength: 'Consistent market monitoring and opportunity detection',
      improvementArea: 'Execution speed and profit threshold optimization',
      recommendations: [
        'Monitor additional trading pairs',
        'Optimize profit threshold based on market conditions',
        'Implement faster execution strategies'
      ],
      tomorrowStrategy: 'Focus on high-probability opportunities and refine selection criteria',
      confidence: 70,
      timestamp: new Date().toISOString(),
      aiGenerated: false
    };
  }

  /**
   * Fallback investor report
   */
  getFallbackInvestorReport(marketData) {
    return `**MARKET OVERVIEW**
Current cryptocurrency arbitrage markets show ${marketData.trend || 'sideways'} trends with ${marketData.volatility || 'medium'} volatility. Our automated system has identified ${marketData.opportunities || 0} active arbitrage opportunities across multiple trading pairs.

**PERFORMANCE METRICS**
System efficiency remains strong at ${marketData.efficiency || 95}%, demonstrating reliable opportunity detection and analysis capabilities. Risk management protocols are actively monitoring market conditions to ensure optimal trade execution.

**OUTLOOK**
We anticipate continued arbitrage opportunities over the next 24 hours. Our AI-powered system will continue monitoring market inefficiencies and alert investors to high-probability trades with favorable risk-reward ratios.`;
  }

  /**
   * Extract top pairs from opportunities
   */
  extractTopPairs(opportunities) {
    if (opportunities.length === 0) return ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    
    const pairCounts = new Map();
    opportunities.forEach(opp => {
      opp.pairs.forEach(pair => {
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      });
    });

    return Array.from(pairCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pair]) => pair);
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    console.log('🧹 Gemini AI cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.analysisCache.size,
      cacheTimeout: this.cacheTimeout / 1000 / 60, // minutes
      isEnabled: this.isEnabled
    };
  }

  /**
   * Test Gemini AI connection
   */
  async testConnection() {
    if (!this.isEnabled) {
      console.log('⚠️  Gemini AI disabled');
      return false;
    }

    try {
      console.log('🧪 Testing Gemini AI connection...');
      const result = await this.model.generateContent('Respond with: "Gemini AI is working!"');
      const response = await result.response;
      const text = response.text();
      console.log('✅ Gemini AI response:', text);
      return true;
    } catch (error) {
      console.error('❌ Gemini AI test failed:', error.message);
      return false;
    }
  }
}

// Create singleton instance
export const geminiAnalyzer = new GeminiAnalyzer();

// Test mode
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Testing Gemini AI Analyzer...\n');
  
  const analyzer = new GeminiAnalyzer();
  const initialized = analyzer.initialize();
  
  if (initialized) {
    await analyzer.testConnection();
    
    // Test opportunity analysis
    const testOpportunity = {
      triangle: 'USDT → BTC → ETH → USDT',
      pairs: ['BTCUSDT', 'ETHBTC', 'ETHUSDT'],
      profitPct: 0.523,
      profitUsd: 5.23,
      startAmount: 1000
    };
    
    console.log('\n🔍 Analyzing test opportunity...');
    const analysis = await analyzer.analyzeOpportunity(testOpportunity);
    console.log('\n📊 AI Analysis:', JSON.stringify(analysis, null, 2));
  } else {
    console.log('⚠️  Gemini AI not initialized');
  }
}
