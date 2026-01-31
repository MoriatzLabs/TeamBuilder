# TeamBuilder - Cloud9 League of Legends Draft Tool

A data-driven drafting assistant for professional esports teams, powered by GRID's official esports data platform.

## Project Story

From the era of Sneaky, Meteos and Hai to when Blaber flashed for Scuttle on Nidalee at MSI, C9 has shaped how I go about League. So I came into this hackathon planning to build the best Drafting Tool they could use. Something along the lines of the industry standard like Overwolf or ProComps.

Then I found out we only had access to historic data on GRID, and wanted to run it down like pre-reformed Tyler 1.

But here's the thing - coaches don't need another flashy overlay. They need REAL intel. They need to know that when FNC locks in Azir, they're about to prioritize scaling and give up first dragon 70% of the time. They need to see that Blaber on Lee Sin has a 15% higher first blood rate but dies 2.3 more times per game. They need data that WINS DRAFTS.

So I pivoted. Hard.

TeamBuilder isn't just a draft tracker - it's your scouting department compressed into an app. It's the difference between banning Aatrox because "it's strong" vs banning it because their top laner has an 85% win rate on it in the last month and they always pick it red side when it's available.

This is the tool that gets C9 to Worlds. Again.

## Features

### Pre-Draft Intelligence
- **Champion Pool Analysis**: See what each opponent player ACTUALLY plays (last 3 months of data)
- **Team Tendencies**: Objective priority patterns, early game aggression, playstyle classification
- **Meta Analysis**: Tournament-wide champion pick/ban rates, patch-specific win rates
- **Player Profiles**: Role-specific champion mastery, performance trends, playstyle classification

### Live Draft Assistant
- **Real-time Draft Tracking**: WebSocket integration with GRID Series Events API
- **Ban Recommendations**: Top 5 ban priorities based on opponent pool and meta data
- **Pick Recommendations**: Counter-pick suggestions with synergy calculations
- **Win Probability**: Live composition analysis with win rate predictions

### Post-Draft Strategy
- **Game Plan Generator**: Win condition identification and macro strategy recommendations
- **Power Spike Timeline**: Level and item breakpoint analysis
- **Objective Priorities**: Drake/Baron/Herald trade-off analysis
- **Game Style Classification**: Composition type identification (teamfight, split push, poke, dive)

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for ultra-fast build and HMR
- **Apollo Client** for GraphQL queries
- **Zustand** for lightweight state management
- **TanStack Query** for server state caching
- **TailwindCSS** for styling
- **Recharts** for data visualization
- **Radix UI** for accessible components

### Backend
- **NestJS** with TypeScript
- **GraphQL** (Apollo Server) for API
- **Redis** for intelligent caching
- **WebSocket** proxy for real-time events
- **GRID API** for official esports data

### Infrastructure
- **Docker** for Redis and PostgreSQL
- **Docker Compose** for local development

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- GRID API Key (get from https://grid.gg/)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/teambuilder.git
cd teambuilder
```

2. Setup environment variables
```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and add your GRID_API_KEY
```

3. Start infrastructure (Redis, PostgreSQL)
```bash
docker-compose up -d
```

4. Install dependencies
```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install
```

5. Run development servers
```bash
# Terminal 1 - Frontend (port 5173)
cd frontend
npm run dev

# Terminal 2 - Backend (port 3000)
cd backend
npm run start:dev
```

Visit http://localhost:5173 to see the application.

## Project Structure

```
TeamBuilder/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── features/        # Feature modules (draft, scouting, gameplan)
│   │   ├── api/             # GraphQL and WebSocket clients
│   │   ├── shared/          # Utilities, hooks, constants
│   │   └── types/           # TypeScript type definitions
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                  # NestJS application
│   ├── src/
│   │   ├── grid/            # GRID API clients and integration
│   │   ├── cache/           # Redis caching strategies
│   │   ├── draft/           # Draft logic and recommendations
│   │   ├── scouting/        # Team/player analysis
│   │   ├── gameplan/        # Post-draft analysis
│   │   ├── graphql/         # GraphQL API
│   │   └── config/          # Configuration
│   ├── nest-cli.json
│   └── package.json
│
├── docker-compose.yml       # Redis and PostgreSQL services
└── README.md
```

## Caching Strategy

The application uses a 3-tier caching approach to respect GRID's rate limits (20 req/min):

**Tier 1: Long-lived Cache (Redis)**
- Team statistics (3 months): 6 hours TTL
- Player statistics (3 months): 6 hours TTL
- Meta statistics (patch-specific): 24 hours TTL
- Champion data: Never expires

**Tier 2: Medium-lived Cache (Redis)**
- Team statistics (1 month): 1 hour TTL
- Recent match data: 30 minutes TTL

**Tier 3: Short-lived Cache (In-memory)**
- Live draft state: No expiration (WebSocket sync)
- Session data: 5 minutes TTL

## API Documentation

The GRID API documentation is available in the following files:
- `GRID_API_KNOWLEDGE_HUB.md` - Core concepts and best practices
- `GRID_LOL_API_REFERENCE.md` - Central Data API queries
- `GRID_LOL_SERIES_STATE_API.md` - Live match data
- `GRID_LOL_SERIES_EVENTS_API.md` - WebSocket events
- `GRID_LOL_STATS_FEED_API.md` - Aggregated statistics

## Performance Targets

- Initial page load: <2 seconds
- Draft action response: <100ms
- WebSocket latency: <50ms
- Cache hit ratio: >80%
- API rate limit compliance: 100%

## Development

### Build
```bash
# Frontend
cd frontend && npm run build

# Backend
cd backend && npm run build
```

### Testing
```bash
# Backend tests
cd backend && npm run test

# Backend e2e tests
cd backend && npm run test:e2e

# Type checking
cd frontend && npm run type-check
```

### Linting
```bash
# Frontend
cd frontend && npm run lint

# Backend
cd backend && npm run lint
```

## Deployment

The application is designed to be deployed on any modern cloud platform (AWS, GCP, Azure, etc.) using Docker.

```bash
# Build Docker images
docker build -t teambuilder-frontend ./frontend
docker build -t teambuilder-backend ./backend

# Deploy to your platform
```

## Hackathon Info

- **Event**: Cloud9 x JetBrains "Sky's the Limit"
- **Deadline**: February 3, 2026 at 11:00 AM PST
- **Category**: Comprehensive Assistant Coach (AI-powered analytics)
- **Prize**: $6,000 + GDC trip + JetBrains license + swag

## Contributing

This is a hackathon project. Contributors are welcome to submit PRs for improvements and bug fixes.

## License

MIT

## Acknowledgments

- Cloud9 for inspiring competitive excellence
- GRID for providing official esports data
- JetBrains for their excellent development tools
- The open source community for incredible libraries

---

**From Blaber inting for scuttle to Blaber gapping everyone at Worlds. Let's draft the team that gets there.**
