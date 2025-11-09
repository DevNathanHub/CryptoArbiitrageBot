// Triangular Arbitrage Core Engine
// Simulates triangular arbitrage with real order book data

import axios from 'axios';
import { config, getBaseUrl } from '../../config/config.js';

const BASE_URL = getBaseUrl();
const TAKER_FEE = config.trading.takerFee;
const MAKER_FEE = 0.00075; // 0.075% maker fee for limit orders
const ORDER_BOOK_DEPTH = 100; // Reduced from 500 to improve API response time

/**
 * Fetch order book from Binance with enhanced error handling and retries
 * @param {string} symbol - Trading pair symbol (e.g., 'BTCUSDT')
 * @param {number} limit - Order book depth (default 500 for better accuracy)
 * @param {number} retries - Number of retry attempts (default 3)
 * @returns {Promise<Object>} Order book with bids and asks
 */
export async function getOrderBook(symbol, limit = ORDER_BOOK_DEPTH, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(`${BASE_URL}/depth`, {
        params: { symbol, limit },
        timeout: 15000 // Increased to 15 second timeout for testnet reliability
      });

      // Validate response structure
      if (!response.data || !response.data.bids || !response.data.asks) {
        throw new Error('Invalid order book response structure');
      }

      return response.data;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      
      // Only log warnings on retry attempts, not the final failure
      if (!isLastAttempt) {
        console.warn(`⚠️  Order book fetch attempt ${attempt}/${retries} failed for ${symbol}: ${error.message}`);
      }

      if (isLastAttempt) {
        console.error(`❌ Failed to fetch order book for ${symbol} after ${retries} attempts`);
        throw error;
      }

      // Exponential backoff with jitter
      const backoffMs = 1000 * attempt + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

/**
 * Simulate buying base asset with quote currency
 * Walks through the ask side of the order book
 * @param {number} quoteAmount - Amount of quote currency to spend
 * @param {Array} asks - Ask orders [[price, qty], ...]
 * @returns {Object} { baseAcquired, spent, averagePrice }
 */
export function simulateBuyWithQuote(quoteAmount, asks) {
  let remainingQuote = quoteAmount;
  let baseAcquired = 0;
  let totalSpent = 0;

  for (const [priceStr, qtyStr] of asks) {
    if (remainingQuote <= 0) break;

    const price = parseFloat(priceStr);
    const qty = parseFloat(qtyStr);
    const maxQuoteHere = price * qty;

    if (remainingQuote >= maxQuoteHere) {
      // Buy all available at this price level
      baseAcquired += qty;
      remainingQuote -= maxQuoteHere;
      totalSpent += maxQuoteHere;
    } else {
      // Partial fill at this price level
      const qtyToBuy = remainingQuote / price;
      baseAcquired += qtyToBuy;
      totalSpent += remainingQuote;
      remainingQuote = 0;
    }
  }

  const spent = quoteAmount - remainingQuote;
  const averagePrice = baseAcquired > 0 ? spent / baseAcquired : 0;

  return { baseAcquired, spent, averagePrice };
}

/**
 * Simulate selling base asset for quote currency
 * Walks through the bid side of the order book
 * @param {number} baseAmount - Amount of base asset to sell
 * @param {Array} bids - Bid orders [[price, qty], ...]
 * @returns {Object} { quoteAcquired, sold, averagePrice }
 */
export function simulateSellBaseForQuote(baseAmount, bids) {
  let remainingBase = baseAmount;
  let quoteAcquired = 0;

  for (const [priceStr, qtyStr] of bids) {
    if (remainingBase <= 0) break;

    const price = parseFloat(priceStr);
    const qty = parseFloat(qtyStr);

    if (remainingBase >= qty) {
      // Sell all available at this price level
      quoteAcquired += price * qty;
      remainingBase -= qty;
    } else {
      // Partial fill at this price level
      quoteAcquired += price * remainingBase;
      remainingBase = 0;
    }
  }

  const sold = baseAmount - remainingBase;
  const averagePrice = sold > 0 ? quoteAcquired / sold : 0;

  return { quoteAcquired, sold, averagePrice };
}

/**
 * Apply trading fee to an amount
 * @param {number} amount - Amount before fee
 * @returns {number} Amount after fee deduction
 */
export function applyFee(amount) {
  return amount * (1 - TAKER_FEE);
}

/**
 * Simulate a complete triangular arbitrage cycle
 * @param {Object} triangle - Triangle configuration { path, pairs }
 * @param {number} startAmount - Starting amount in first currency
 * @returns {Promise<Object>} Simulation results with profit calculation
 */
export async function simulateTriangularCycle(triangle, startAmount = null) {
  const { path, pairs } = triangle;
  const initialAmount = startAmount || config.trading.tradeAmountUSDT;

  try {
    // Fetch all order books in parallel
    const [bookA, bookB, bookC] = await Promise.all([
      getOrderBook(pairs[0]),
      getOrderBook(pairs[1]),
      getOrderBook(pairs[2])
    ]);

    const steps = [];
    let currentAmount = initialAmount;
    const startCurrency = path[0];

    // Step 1: First trade
    let result;
    if (pairs[0].endsWith(startCurrency)) {
      // Buying base with quote (e.g., USDT -> BTC in BTCUSDT)
      result = simulateBuyWithQuote(currentAmount, bookA.asks);
      currentAmount = applyFee(result.baseAcquired);
      steps.push({
        step: 1,
        pair: pairs[0],
        action: 'BUY',
        from: startCurrency,
        to: path[1],
        input: initialAmount,
        output: currentAmount,
        price: result.averagePrice,
        fee: result.baseAcquired - currentAmount
      });
    } else {
      // Selling base for quote
      result = simulateSellBaseForQuote(currentAmount, bookA.bids);
      currentAmount = applyFee(result.quoteAcquired);
      steps.push({
        step: 1,
        pair: pairs[0],
        action: 'SELL',
        from: startCurrency,
        to: path[1],
        input: initialAmount,
        output: currentAmount,
        price: result.averagePrice,
        fee: result.quoteAcquired - currentAmount
      });
    }

    // Step 2: Second trade
    const inputStep2 = currentAmount;
    if (pairs[1].endsWith(path[1])) {
      // Buying (e.g., BTC -> ETH in ETHBTC means buying ETH with BTC)
      result = simulateBuyWithQuote(currentAmount, bookB.asks);
      currentAmount = applyFee(result.baseAcquired);
      steps.push({
        step: 2,
        pair: pairs[1],
        action: 'BUY',
        from: path[1],
        to: path[2],
        input: inputStep2,
        output: currentAmount,
        price: result.averagePrice,
        fee: result.baseAcquired - currentAmount
      });
    } else {
      result = simulateSellBaseForQuote(currentAmount, bookB.bids);
      currentAmount = applyFee(result.quoteAcquired);
      steps.push({
        step: 2,
        pair: pairs[1],
        action: 'SELL',
        from: path[1],
        to: path[2],
        input: inputStep2,
        output: currentAmount,
        price: result.averagePrice,
        fee: result.quoteAcquired - currentAmount
      });
    }

    // Step 3: Final trade back to start currency
    const inputStep3 = currentAmount;
    if (pairs[2].endsWith(startCurrency)) {
      result = simulateSellBaseForQuote(currentAmount, bookC.bids);
      currentAmount = applyFee(result.quoteAcquired);
      steps.push({
        step: 3,
        pair: pairs[2],
        action: 'SELL',
        from: path[2],
        to: startCurrency,
        input: inputStep3,
        output: currentAmount,
        price: result.averagePrice,
        fee: result.quoteAcquired - currentAmount
      });
    } else {
      result = simulateBuyWithQuote(currentAmount, bookC.bids);
      currentAmount = applyFee(result.baseAcquired);
      steps.push({
        step: 3,
        pair: pairs[2],
        action: 'BUY',
        from: path[2],
        to: startCurrency,
        input: inputStep3,
        output: currentAmount,
        price: result.averagePrice,
        fee: result.baseAcquired - currentAmount
      });
    }

    const finalAmount = currentAmount;
    const profit = finalAmount - initialAmount;
    const profitPct = (profit / initialAmount) * 100;
    const isProfitable = profitPct > config.trading.minProfitThreshold;

    return {
      triangle: path.join(' → '),
      pairs,
      startAmount: initialAmount,
      endAmount: finalAmount,
      profit,
      profitPct,
      isProfitable,
      steps,
      timestamp: new Date()
    };

  } catch (error) {
    console.error(`❌ Error simulating cycle ${path.join(' → ')}:`, error.message);
    return null;
  }
}

/**
 * Print simulation results in a formatted way
 * @param {Object} result - Simulation result
 */
export function printSimulationResult(result) {
  if (!result) return;

  console.log('\n' + '='.repeat(60));
  console.log('🔄 TRIANGULAR ARBITRAGE SIMULATION');
  console.log('='.repeat(60));
  console.log(`📊 Triangle: ${result.triangle}`);
  console.log(`💰 Start: ${result.startAmount.toFixed(2)} ${result.triangle.split(' → ')[0]}`);
  console.log(`💵 End:   ${result.endAmount.toFixed(2)} ${result.triangle.split(' → ')[0]}`);
  console.log(`${result.isProfitable ? '✅' : '❌'} Profit: ${result.profit.toFixed(4)} (${result.profitPct.toFixed(4)}%)`);
  console.log('-'.repeat(60));
  
  result.steps.forEach(step => {
    console.log(`Step ${step.step}: ${step.action} ${step.pair}`);
    console.log(`  ${step.from} → ${step.to}`);
    console.log(`  Input: ${step.input.toFixed(8)} | Output: ${step.output.toFixed(8)}`);
    console.log(`  Price: ${step.price.toFixed(8)} | Fee: ${step.fee.toFixed(8)}`);
  });
  
  console.log('='.repeat(60) + '\n');
}

// If run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Testing Triangular Arbitrage Engine...\n');
  
  const testTriangle = config.pairs.triangles[0];
  const result = await simulateTriangularCycle(testTriangle);
  printSimulationResult(result);
}
