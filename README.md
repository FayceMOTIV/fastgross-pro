# Face Media Factory v2.0

AI-powered B2B prospecting platform with multi-providers AI, email enrichment, and 13-platform posting.

## Features

### AI Personalization (492K/month FREE)
- **Groq**: 14,400 req/day, 10x faster (300 tok/sec)
- **OpenRouter**: 1,000 req/day, 18 free models
- **Gemini**: 1,000 req/day, 1M context
- **Puter.js**: Unlimited (user-pays, client-side)

### Email Enrichment (310/month FREE)
- Waterfall: Derrick (200) -> Apollo (60) -> Hunter (50)
- 40-50% success rate
- Batch processing with CSV export

### Multi-Platform Posting (UNLIMITED)
- 13 platforms: Instagram, TikTok, LinkedIn, Twitter, Facebook, Threads, YouTube, Pinterest, Reddit, Bluesky, Mastodon, Dribbble, Discord
- Postiz self-hosted (unlimited)
- Late API fallback (20/month)

### Monitoring & Analytics
- Real-time dashboards
- Charts & graphs (Recharts)
- Cost analysis
- Provider status

## Quick Start

### Auto Setup (Recommended)
```bash
cd ~/Projects/face-media-factory
./scripts/setup.sh
```

### Manual Setup
```bash
# Install dependencies
npm install
cd functions && npm install

# Configure API keys
cp functions/.env.example functions/.env
# Edit functions/.env with your API keys

# Deploy
firebase deploy
```

See [docs/QUICK_START.md](docs/QUICK_START.md) for details.

## Cost

| Item | Cost |
|------|------|
| VPS (Hetzner) | 4 EUR/mo |
| Firebase | 10-20 EUR/mo |
| APIs | 0 EUR |
| **Total** | **14-24 EUR/mo** |

**vs Market**: 423 EUR/month
**Savings**: 94% (399 EUR/month)

## Capacity

| Feature | Monthly Capacity | Cost |
|---------|-----------------|------|
| AI Generation | 492,000 | FREE |
| Email Enrichment | 310 | FREE |
| Multi-Platform Posts | Unlimited | FREE |

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | /app | Overview with quick actions |
| AI Personalization | /app/ai | Generate personalized messages |
| Email Enrichment | /app/enrichment | Enrich emails (single & batch) |
| Multi-Platform | /app/posting | Post to 13 platforms |
| Monitoring | /app/monitoring | Real-time stats & analytics |
| Hunter | /app/hunter | Instagram prospecting |

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Firebase Cloud Functions (Node.js 20)
- **Database**: Cloud Firestore
- **Auth**: Firebase Authentication
- **AI**: Groq, OpenRouter, Gemini, Puter.js
- **Charts**: Recharts
- **Hosting**: Firebase Hosting

## Documentation

- [Quick Start Guide](docs/QUICK_START.md)
- [Setup Guide](docs/SETUP_GUIDE.md)
- [API Documentation](docs/API_DOCS.md)

## API Keys Required

| Service | URL | Free Tier |
|---------|-----|-----------|
| Groq | https://console.groq.com | 14,400/day |
| OpenRouter | https://openrouter.ai | 1,000/day |
| Gemini | https://aistudio.google.com | 1,000/day |
| Derrick (opt) | https://derrick.app | 200/month |
| Apollo (opt) | https://apollo.io | 60/month |
| Hunter (opt) | https://hunter.io | 50/month |

## Contributing

PRs welcome! Please read the contributing guidelines first.

## License

MIT

## Author

Faical Kriouar - Face Media Factory
