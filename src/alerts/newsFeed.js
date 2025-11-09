import axios from 'axios';
import { config } from '../../config/config.js';

/**
 * NewsFeed - fetches live crypto news and formats messages for Telegram
 * Supports CoinGecko (news from /events) and CryptoPanic (if API key provided)
 */
export class NewsFeed {
  constructor(options = {}) {
    this.provider = options.provider || config.news.provider || 'coingecko';
    this.apiKey = options.apiKey || config.news.apiKey || '';
    this.pollIntervalMinutes = options.pollIntervalMinutes || config.news.pollIntervalMinutes || 5;
    this.maxItems = options.maxItems || config.news.maxItems || 5;
    this.lastSeen = new Set(); // track sent article ids/links
  }

  async tryFetch(url, opts = {}) {
    try {
      const resp = await axios.get(url, { timeout: opts.timeout || 10000 });
      return resp.data;
    } catch (err) {
      // Return the error so caller can decide, include status if available
      err.status = err.response?.status;
      err.url = url;
      throw err;
    }
  }

  async fetchFromCoinGecko() {
    // Try multiple CoinGecko endpoints (some instances change)
    const candidates = [
      'https://api.coingecko.com/api/v3/events',
      'https://api.coingecko.com/api/v3/status_updates',
      'https://api.coingecko.com/api/v3/events?per_page=100'
    ];

    for (const url of candidates) {
      try {
        const data = await this.tryFetch(url);
        // Normalize different response shapes
        if (!data) continue;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.status_updates)) return data.status_updates;
        if (Array.isArray(data.events)) return data.events;
      } catch (err) {
        // If 404 try next, otherwise log and continue
        if (err.status === 404) {
          this._log && this._log(`CoinGecko endpoint not found: ${err.url}`);
          continue;
        }
        // transient errors: continue to next provider
        console.warn(`[NEWS] CoinGecko fetch failed (${err.url}): ${err.message}`);
        continue;
      }
    }

    // Nothing found on CoinGecko
    return [];
  }

  async fetchFromCryptoPanic() {
    if (!this.apiKey) throw new Error('CryptoPanic API key not provided');
    const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${this.apiKey}&public=true`;
    const data = await this.tryFetch(url);
    return data?.results || [];
  }

  async fetchNews() {
    // Try providers in order, with graceful fallback
    const tried = [];

    // Helper to normalize items from different providers
    const normalize = (raw, providerName) => {
      if (!raw || !Array.isArray(raw)) return [];
      if (providerName === 'cryptopanic') {
        return raw.map(i => ({
          id: i.id || i.guid || i.url,
          title: i.title || i?.domain || 'News',
          url: i.url,
          source: i.source?.title || 'CryptoPanic',
          published_at: i.published_at || i.created_at,
          body: i.body || i?.excerpt || ''
        }));
      }

      // CoinGecko / generic events
      return raw.map(i => ({
        id: i.id || i.title || i.description || i.type || i.url || JSON.stringify(i),
        title: i.title || i.description || i.type || (i.post && i.post.title) || 'Crypto Event',
        url: i.url || i.website || i.link || (i.post && i.post.url) || '',
        source: i.source || i.source_name || 'CoinGecko',
        published_at: i.start_date || i.published_at || i.published_at || i.created_at || new Date().toISOString(),
        body: i.description || i.body || (i.post && i.post.excerpt) || ''
      }));
    };

    // If explicit provider requested, try it first
    const providersToTry = this.provider === 'cryptopanic'
      ? ['cryptopanic', 'coingecko', 'cryptocompare']
      : [this.provider, 'coingecko', 'cryptocompare', 'cryptopanic'];

    for (const p of providersToTry) {
      if (!p) continue;
      try {
        let raw = [];
        if (p === 'cryptopanic') raw = await this.fetchFromCryptoPanic();
        else if (p === 'coingecko') raw = await this.fetchFromCoinGecko();
        else if (p === 'cryptocompare') {
          // CryptoCompare public news endpoint
          try {
            const cc = await this.tryFetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
            raw = cc?.Data || cc?.data || [];
          } catch (e) {
            raw = [];
          }
        }

        const normalized = normalize(raw, p);
        if (normalized.length > 0) return normalized;
        tried.push(p);
      } catch (err) {
        // Log and continue
        console.warn(`[NEWS] Provider ${p} failed: ${err.message || err}`);
        tried.push(p);
        continue;
      }
    }

    // If we got here, nothing returned data
    console.warn(`[NEWS] No news from providers: ${tried.join(', ')}`);
    return [];
  }

  /**
   * Get new items since last call, up to maxItems
   */
  async getNewItems() {
    const all = await this.fetchNews();
    const newItems = [];
    for (const item of all) {
      const id = item.id || item.url || item.title;
      if (!this.lastSeen.has(id)) {
        this.lastSeen.add(id);
        newItems.push(item);
      }
      if (newItems.length >= this.maxItems) break;
    }
    return newItems;
  }

  formatMessage(items) {
    if (!items || items.length === 0) return null;
    let msg = `📰 *Crypto News Update* \n━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    items.forEach((it, idx) => {
      msg += `*${idx + 1}.* ${it.title}\n`;
      if (it.source) msg += `• Source: ${it.source}\n`;
      if (it.published_at) msg += `• Published: ${new Date(it.published_at).toLocaleString()}\n`;
      if (it.url) msg += `• Link: ${it.url}\n`;
      msg += `\n`;
    });
    msg += `🕐 ${new Date().toLocaleString()}`;
    return msg;
  }

  /**
   * Public method to fetch and return formatted update (null if no new items)
   */
  async fetchAndFormatUpdate() {
    try {
      const items = await this.getNewItems();
      if (!items || items.length === 0) return null;
      return this.formatMessage(items);
    } catch (err) {
      console.error('[NEWS] >>> Failed to fetch/send news', err.message || err);
      return null;
    }
  }
}

export default NewsFeed;
