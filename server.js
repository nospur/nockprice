const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('.'));

// Cache data
let cachedData = {
    marketCaps: {
        bitcoin: 0,
        ethereum: 0,
        solana: 0,
        polkadot: 0,
        litecoin: 0,
        gold: 15800000000000
    },
    nock: {
        price: 0,
        marketCap: 0,
        circulatingSupply: 0,
        maxSupply: 0
    },
    lastUpdated: null
};

// Fetch data from CoinGecko
async function fetchMarketData() {
    try {
        console.log('Fetching fresh data from CoinGecko...');

        // Fetch crypto market caps
        const cryptoResponse = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,polkadot,litecoin&vs_currencies=usd&include_market_cap=true'
        );
        const cryptoData = await cryptoResponse.json();

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
            }
        } catch (nockError) {
            console.log('Error fetching NOCK data, trying simple endpoint...');

            // Try simpler endpoint
            const nockSimple = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=nockchain&vs_currencies=usd&include_market_cap=true'
            );
            const nockSimpleData = await nockSimple.json();

            if (nockSimpleData && nockSimpleData.nockchain) {
                cachedData.nock.price = nockSimpleData.nockchain.usd || 0;
                cachedData.nock.marketCap = nockSimpleData.nockchain.usd_market_cap || 0;

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

        // Use fallback values if fetch fails
        if (cachedData.marketCaps.bitcoin === 0) {
            cachedData.marketCaps.bitcoin = 1350000000000;
            cachedData.marketCaps.ethereum = 400000000000;
            cachedData.marketCaps.solana = 100000000000;
            cachedData.marketCaps.polkadot = 10000000000;
            cachedData.marketCaps.litecoin = 5000000000;
            cachedData.nock.price = 0.001;
            cachedData.nock.circulatingSupply = 1000000000;
        }
    }
}

// API endpoint to get market data
app.get('/api/market-data', (req, res) => {
    res.json(cachedData);
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initial fetch
fetchMarketData();

// Update data every 60 seconds
setInterval(fetchMarketData, 60000);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open your browser to http://localhost:3000');
});