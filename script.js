let marketCaps = {
    bitcoin: 0,
    ethereum: 0,
    solana: 0,
    polkadot: 0,
    litecoin: 0,
    gold: 15800000000000
};

let currentNockPrice = 0;
let currentNockMarketCap = 0;
let circulatingSupply = 0;
let maxSupply = 0;
let selectedMarketCap = 'bitcoin';
let price24hChange = 0;

const formatNumber = (num) => {
    if (!num || num === 0) return '—';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    if (num >= 1) return `$${num.toFixed(2)}`;
    return `$${num.toFixed(6)}`;
};

const formatSupply = (num) => {
    if (!num || num === 0) return '—';
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
};

const formatPrice = (price) => {
    if (!price || price === 0) return '—';
    if (price >= 1000) return `$${price.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
};

const formatMultiplier = (multiple) => {
    if (!multiple || !isFinite(multiple)) return '—';
    if (multiple >= 1000000) return `${(multiple / 1000000).toFixed(1)}M×`;
    if (multiple >= 1000) return `${(multiple / 1000).toFixed(1)}K×`;
    return `${multiple.toFixed(0)}×`;
};

const formatGains = (amount) => {
    if (!amount || amount === 0) return '—';
    const formatted = formatNumber(Math.abs(amount));
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
};

async function fetchMarketCaps() {
    try {
        // Fetch from API endpoint (works with both local server and Netlify Functions)
        const apiUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3000/api/market-data'
            : '/.netlify/functions/market-data';

        const response = await fetch(apiUrl);
        const data = await response.json();

        // Update market caps
        marketCaps = { ...marketCaps, ...data.marketCaps };

        // Update NOCK data
        currentNockPrice = data.nock.price || 0;
        currentNockMarketCap = data.nock.marketCap || 0;
        circulatingSupply = data.nock.circulatingSupply || 0;
        maxSupply = data.nock.maxSupply || 0;
        price24hChange = data.nock.priceChange24h || 0;

        // Update main display
        document.getElementById('currentPriceDisplay').textContent = formatPrice(currentNockPrice);

        // Update ticker bar
        document.getElementById('tickerPrice').textContent = formatPrice(currentNockPrice);
        document.getElementById('tickerMarketCap').textContent = formatNumber(currentNockMarketCap);
        document.getElementById('tickerCirculating').textContent = formatSupply(circulatingSupply);
        document.getElementById('tickerMaxSupply').textContent = formatSupply(maxSupply);

        // Update 24h change
        const changeElement = document.getElementById('ticker24hChange');
        if (price24hChange !== 0) {
            changeElement.textContent = `${price24hChange >= 0 ? '+' : ''}${price24hChange.toFixed(2)}%`;
            changeElement.className = `ticker-change ${price24hChange >= 0 ? 'positive' : 'negative'}`;
        } else {
            changeElement.textContent = '0.00%';
            changeElement.className = 'ticker-change';
        }

        updateHypotheticalPrice();

        if (data.lastUpdated) {
            const updateTime = new Date(data.lastUpdated);
            document.getElementById('updateTime').textContent = updateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    } catch (error) {
        console.error('Error fetching market data:', error);

        // Fallback values if backend is not running
        marketCaps.bitcoin = 1350000000000;
        marketCaps.ethereum = 400000000000;
        marketCaps.solana = 100000000000;
        marketCaps.polkadot = 10000000000;
        marketCaps.litecoin = 5000000000;

        currentNockPrice = 0.001;
        circulatingSupply = 1000000000;

        document.getElementById('currentPriceDisplay').textContent = formatPrice(currentNockPrice);

        // Update ticker with fallback values
        document.getElementById('tickerPrice').textContent = formatPrice(currentNockPrice);
        document.getElementById('tickerMarketCap').textContent = 'Offline';
        document.getElementById('tickerCirculating').textContent = formatSupply(circulatingSupply);
        document.getElementById('tickerMaxSupply').textContent = '—';
        document.getElementById('ticker24hChange').textContent = '—';

        updateHypotheticalPrice();
    }
}

function updateHypotheticalPrice() {
    const supply = maxSupply || circulatingSupply || 1000000000;
    const selectedCap = marketCaps[selectedMarketCap];

    // Update asset name and market cap display
    const assetNames = {
        bitcoin: "Bitcoin's",
        ethereum: "Ethereum's",
        solana: "Solana's",
        polkadot: "Polkadot's",
        litecoin: "Litecoin's",
        gold: "Gold's"
    };

    document.getElementById('selectedAssetName').textContent = assetNames[selectedMarketCap];
    document.getElementById('selectedMarketCap').textContent = formatNumber(selectedCap);

    if (supply > 0 && selectedCap > 0) {
        const hypotheticalPrice = selectedCap / supply;
        document.getElementById('hypotheticalPrice').textContent = formatPrice(hypotheticalPrice);

        if (currentNockPrice > 0) {
            const multiplier = hypotheticalPrice / currentNockPrice;
            document.getElementById('priceMultiplier').textContent = formatMultiplier(multiplier);
        }
    }

    calculatePortfolio();
}

function calculatePortfolio() {
    const userNocks = parseFloat(document.getElementById('userNocks').value) || 0;
    const supply = maxSupply || circulatingSupply || 1000000000;
    const selectedCap = marketCaps[selectedMarketCap];

    const currentPortfolioBox = document.getElementById('currentPortfolioBox');
    const futurePortfolioBox = document.getElementById('futurePortfolioBox');

    if (userNocks > 0) {
        const hypotheticalPrice = selectedCap / supply;
        const currentValue = userNocks * currentNockPrice;
        const futureValue = userNocks * hypotheticalPrice;

        document.getElementById('currentPortfolioValue').textContent = formatNumber(currentValue);
        document.getElementById('futurePortfolioValue').textContent = formatNumber(futureValue);

        currentPortfolioBox.classList.add('visible');
        futurePortfolioBox.classList.add('visible');
    } else {
        currentPortfolioBox.classList.remove('visible');
        futurePortfolioBox.classList.remove('visible');

        document.getElementById('currentPortfolioValue').textContent = '—';
        document.getElementById('futurePortfolioValue').textContent = '—';
    }
}

// Event Listeners
document.getElementById('marketCapSelector').addEventListener('change', (e) => {
    selectedMarketCap = e.target.value;
    updateHypotheticalPrice();
});

document.getElementById('userNocks').addEventListener('input', calculatePortfolio);

// Initial load
fetchMarketCaps();

// Update every 5 minutes (matching server update interval)
setInterval(fetchMarketCaps, 300000);