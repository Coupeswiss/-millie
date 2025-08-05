import axios from 'axios';

export async function webSearch(query: string): Promise<string> {
  try {
    // Using DuckDuckGo instant answer API (free, no key needed)
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1,
        skip_disambig: 1,
      },
      timeout: 5000,
    });

    const data = response.data;
    let results = '';

    // Check for instant answer
    if (data.Answer) {
      results += `Answer: ${data.Answer}\n`;
    }

    // Check for abstract
    if (data.AbstractText) {
      results += `${data.AbstractText}\n`;
      if (data.AbstractURL) {
        results += `Source: ${data.AbstractURL}\n`;
      }
    }

    // Check for related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      results += '\nRelated info:\n';
      data.RelatedTopics.slice(0, 3).forEach((topic: any, i: number) => {
        if (topic.Text) {
          results += `${i + 1}. ${topic.Text}\n`;
        }
      });
    }

    // If no results, try a fallback search
    if (!results.trim()) {
      // For crypto prices, we can use CoinGecko
      if (query.toLowerCase().includes('price') || query.toLowerCase().includes('pulsechain')) {
        try {
          const priceResponse = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price',
            {
              params: {
                ids: 'pulsechain,hex,pulsex',
                vs_currencies: 'usd',
                include_24hr_change: true,
              },
              timeout: 3000,
            }
          );
          
          const prices = priceResponse.data;
          results = 'Current PulseChain ecosystem prices:\n';
          if (prices.pulsechain) {
            results += `PLS: $${prices.pulsechain.usd} (${prices.pulsechain.usd_24h_change?.toFixed(2)}%)\n`;
          }
          if (prices.hex) {
            results += `HEX: $${prices.hex.usd} (${prices.hex.usd_24h_change?.toFixed(2)}%)\n`;
          }
          if (prices.pulsex) {
            results += `PLSX: $${prices.pulsex.usd} (${prices.pulsex.usd_24h_change?.toFixed(2)}%)\n`;
          }
        } catch (err) {
          console.warn('Price fetch failed:', err);
        }
      }
    }

    return results || 'No specific results found for this query.';
  } catch (error) {
    console.error('Web search failed:', error);
    return '';
  }
}