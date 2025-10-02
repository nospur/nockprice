# Nock Price

A web app that shows what NOCK cryptocurrency would be worth at different market caps.

## Features

- Compare NOCK price at Bitcoin, Ethereum, Solana, Polkadot, Litecoin, and Gold market caps
- Portfolio calculator to see potential values
- Real-time data from CoinGecko API
- Clean, responsive design

## Local Development

```bash
npm install
npm start
```

Open http://localhost:3000

## Deployment

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Add your custom domain in Vercel dashboard

### Environment Variables

No environment variables required - the app fetches public data from CoinGecko.

## Tech Stack

- Frontend: Vanilla JavaScript, HTML, CSS
- Backend: Node.js, Express
- Data: CoinGecko API