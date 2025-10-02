// Cache data with fallback values
let cachedData = {
    marketCaps: {
        bitcoin: 2370000000000,
        ethereum: 525000000000,
        solana: 120000000000,
        polkadot: 6300000000,
        litecoin: 8900000000,
        gold: 15800000000000
    },
    nock: {
        price: 0.0171,
        marketCap: 20870000,
        circulatingSupply: 1220000000,
        maxSupply: 4290000000,
        priceChange24h: 2.5
    },
    lastUpdated: null
};

// Store last fetch time
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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
            cachedData.marketCaps.bitcoin = cryptoData.bitcoin.usd_market_cap || cachedData.marketCaps.bitcoin;
            cachedData.marketCaps.ethereum = cryptoData.ethereum.usd_market_cap || cachedData.marketCaps.ethereum;
            cachedData.marketCaps.solana = cryptoData.solana.usd_market_cap || cachedData.marketCaps.solana;
            cachedData.marketCaps.polkadot = cryptoData.polkadot.usd_market_cap || cachedData.marketCaps.polkadot;
            cachedData.marketCaps.litecoin = cryptoData.litecoin.usd_market_cap || cachedData.marketCaps.litecoin;
        }

        // Fetch NOCK data
        try {
            const nockResponse = await fetch(
                'https://api.coingecko.com/api/v3/coins/nockchain?localization=false&tickers=false&community_data=false&developer_data=false'
            );
            const nockData = await nockResponse.json();

            if (nockData && nockData.market_data) {
                cachedData.nock.price = nockData.market_data.current_price?.usd || cachedData.nock.price;
                cachedData.nock.marketCap = nockData.market_data.market_cap?.usd || cachedData.nock.marketCap;
                cachedData.nock.circulatingSupply = nockData.market_data.circulating_supply || cachedData.nock.circulatingSupply;
                cachedData.nock.maxSupply = nockData.market_data.max_supply || nockData.market_data.total_supply || cachedData.nock.maxSupply;
                cachedData.nock.priceChange24h = nockData.market_data.price_change_percentage_24h || cachedData.nock.priceChange24h;
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
                cachedData.nock.price = nockSimpleData.nockchain.usd || cachedData.nock.price;
                cachedData.nock.marketCap = nockSimpleData.nockchain.usd_market_cap || cachedData.nock.marketCap;
                cachedData.nock.priceChange24h = nockSimpleData.nockchain.usd_24h_change || cachedData.nock.priceChange24h;

                // Estimate supply if we have price and market cap
                if (cachedData.nock.marketCap && cachedData.nock.price) {
                    cachedData.nock.circulatingSupply = cachedData.nock.marketCap / cachedData.nock.price;
                }
            }
        }

        cachedData.lastUpdated = new Date().toISOString();
        console.log('Data updated successfully');

    } catch (error) {
        console.error('Error fetching market data:', error);
        // Keep using cached data
    }
}

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Check if we need to fetch fresh data
    const now = Date.now();
    if (now - lastFetchTime > CACHE_DURATION) {
        await fetchMarketData();
        lastFetchTime = now;
    }

    return {
        statusCode: 200,
        headers: {
            ...headers,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(cachedData)
    };
};