const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = 3000;

// Enable compression
app.use(compression());

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static files with caching headers
app.use(express.static('.', {
    maxAge: '1h',  // Cache static files for 1 hour
    setHeaders: (res, path) => {
        // Set cache headers for different file types
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
        } else if (path.endsWith('.json')) {
            res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
        }
        // Add security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
    }
}));

// Cache data (no fallback values)
let cachedData = {
    marketCaps: {
        bitcoin: 0,
        ethereum: 0,
        solana: 0,
        polkadot: 0,
        litecoin: 0,
        gold: 15800000000000 // Gold market cap is static
    },
    nock: {
        price: 0,
        marketCap: 0,
        circulatingSupply: 0,
        maxSupply: 0,
        priceChange24h: 0
    },
    lastUpdated: null
};

// Fetch data from CoinGecko
async function fetchMarketData() {
    try {
        console.log('Fetching fresh data from CoinGecko...');

        // Fetch crypto market caps
        const cryptoResponse = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,polkadot,litecoin&vs_currencies=usd&include_market_cap=true&include_24hr_change=true'
        );
        const cryptoData = await cryptoResponse.json();

        // Check for rate limit error
        if (cryptoData.status && cryptoData.status.error_code === 429) {
            console.log('Rate limited by CoinGecko API. Using cached data.');
            return;
        }

        if (cryptoData.bitcoin) {
            cachedData.marketCaps.bitcoin = cryptoData.bitcoin.usd_market_cap || 0;
            cachedData.marketCaps.ethereum = cryptoData.ethereum.usd_market_cap || 0;
            cachedData.marketCaps.solana = cryptoData.solana.usd_market_cap || 0;
            cachedData.marketCaps.polkadot = cryptoData.polkadot.usd_market_cap || 0;
            cachedData.marketCaps.litecoin = cryptoData.litecoin.usd_market_cap || 0;
        }

        // Fetch NOCK data
        try {
            const nockResponse = await fetch(
                'https://api.coingecko.com/api/v3/coins/nockchain?localization=false&tickers=false&community_data=false&developer_data=false'
            );
            const nockData = await nockResponse.json();

            if (nockData && nockData.market_data) {
                cachedData.nock.price = nockData.market_data.current_price?.usd || 0;
                cachedData.nock.marketCap = nockData.market_data.market_cap?.usd || 0;
                cachedData.nock.circulatingSupply = nockData.market_data.circulating_supply || 0;
                cachedData.nock.maxSupply = nockData.market_data.max_supply || nockData.market_data.total_supply || 0;
                cachedData.nock.priceChange24h = nockData.market_data.price_change_percentage_24h || 0;
            }
        } catch (nockError) {
            console.log('Error fetching NOCK data, trying simple endpoint...');

            // Try simpler endpoint
            const nockSimple = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=nockchain&vs_currencies=usd&include_market_cap=true&include_24hr_change=true'
            );
            const nockSimpleData = await nockSimple.json();

            // Check for rate limit error
            if (nockSimpleData.status && nockSimpleData.status.error_code === 429) {
                console.log('Rate limited on NOCK data. Using cached data.');
                return;
            }

            if (nockSimpleData && nockSimpleData.nockchain) {
                cachedData.nock.price = nockSimpleData.nockchain.usd || 0;
                cachedData.nock.marketCap = nockSimpleData.nockchain.usd_market_cap || 0;
                cachedData.nock.priceChange24h = nockSimpleData.nockchain.usd_24h_change || 0;

                // Estimate supply if we have price and market cap
                if (cachedData.nock.marketCap && cachedData.nock.price) {
                    cachedData.nock.circulatingSupply = cachedData.nock.marketCap / cachedData.nock.price;
                }
            }
        }

        cachedData.lastUpdated = new Date().toISOString();
        console.log('Data updated successfully:', cachedData);

    } catch (error) {
        console.error('Error fetching market data:', error);
        // Keep existing cached data when fetch fails
    }
}

// API endpoint to get market data
app.get('/api/market-data', (req, res) => {
    // Set CORS and cache headers for API
    res.setHeader('Cache-Control', 'public, max-age=60'); // Cache API responses for 1 minute
    res.json(cachedData);
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initial fetch
fetchMarketData();

// Update data every 5 minutes to avoid rate limits
setInterval(fetchMarketData, 300000);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open your browser to http://localhost:3000');
});