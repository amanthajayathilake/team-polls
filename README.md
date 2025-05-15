# Team Polls

A real-time polling application for team meetings with anonymous voting, live results, and seamless integration capabilities.

## Features

- Anonymous JWT-based authentication
- Real-time poll creation and voting
- Live updates via WebSockets (Socket.io)
- Data persistence with PostgreSQL
- Redis for caching and rate limiting
- Comprehensive test coverage (>80%)
- Production-ready Docker setup
- Prometheus metrics for monitoring
- Winston logging for error tracking
- Rate limiting to prevent abuse (5 requests/second)
- Swagger for API documentation

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React SPA     │────▶│  Express API    │────▶│  PostgreSQL     │
│   TypeScript    │     │  TypeScript     │     │  Database       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       
         │                       │              ┌─────────────────┐
         └──────────────────────▶│              │     Redis       │
            WebSocket (3001)     │              │  Cache/Pub-Sub  │
                                └──────────────└─────────────────┘
```

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, Vite, TypeScript
- **Database**: PostgreSQL
- **Caching**: Redis
- **Testing**: Jest, Supertest
- **Containerization**: Docker, Docker Compose

## Quick Start (Docker)

The easiest way to run Team Polls is using Docker:

```bash
# Clone the repository
git clone https://github.com/amanthajayathilake/team-polls
cd team-polls

# Copy and configure environment variables
cp .env.example .env
# Edit .env file with your settings if needed

# Start with Docker Compose
docker-compose up

# Application will be available at:
# - Frontend: http://localhost:8080
# - Backend: http://localhost:3000/api
# - WebSocket: ws://localhost:3001
# - Metrics: http://localhost:3000/metrics
```

## Manual Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Setup environment variables
cp ../.env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migrate:dev

# Start development server
npm run dev
```

### Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:5173

## Environment Variables

Configure these in your `.env` file:

```ini
# Backend Configuration
NODE_ENV=development
PORT=3000
WS_PORT=3001

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=team_polls

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=1h

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

## API Endpoints

### Authentication

```
POST /api/auth/anon
Description: Generate anonymous JWT token
Response: { token, userId, expiresIn }
```

### Poll Management

```
POST /api/poll
Description: Create new poll
Auth: Required
Body: { question, options[], expiresAt }
Response: { id, question, options, createdAt, expiresAt, isActive }

GET /api/poll/:id
Description: Get poll results
Auth: Required
Response: { poll, votes[], totalVotes }

POST /api/poll/:id/vote
Description: Cast vote
Auth: Required
Body: { optionIndex }
Response: { success, vote }
```

### Monitoring

```
GET /health
Description: Health check endpoint
Response: { status, timestamp, services }

GET /metrics
Description: Prometheus metrics
Response: Prometheus text format
```

## WebSocket Usage

The application uses Socket.io for real-time updates. Connect to the WebSocket server and subscribe to poll updates:

```javascript
import { io } from "socket.io-client";

const socket = io("ws://localhost:3001", {
  transports: ["websocket"],
  query: { token: "your-jwt-token" }
});

// Subscribe to poll updates
socket.emit("message", JSON.stringify({
  type: "subscribe",
  pollId: "poll-id",
  token: "your-jwt-token"
}));

// Listen for updates
socket.on("message", (data) => {
  const message = JSON.parse(data);
  if (message.type === "vote_update") {
    // Update UI with new vote counts
    updateResults(message.data.votes, message.data.totalVotes);
  }
});
```

## Testing

```bash
# Run all tests
cd backend
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage report
npm run test -- --coverage
```

## Known Issues

- Socket.io client connection may experience issues in certain environments. If real-time updates aren't working, manually refresh to see the latest results.

## Scaling Considerations

This application is designed to scale horizontally:

1. **Stateless Backend**: Any instance can handle any request
2. **Redis Pub/Sub**: Enables cross-instance communication
3. **Database Connection Pooling**: Efficient connection management
4. **Rate Limiting**: Prevents abuse and ensures fair usage
5. **WebSocket Fan-out**: Scales via Redis pub/sub for multiple instances

For production deployment, consider:
- Deploying multiple backend instances behind a load balancer
- Using a managed Redis service with replication
- Setting up database read replicas for heavy read loads

## Security Considerations

1. **JWT Tokens**: Short-lived JWTs with proper secret management
2. **HTTPS**: Always use in production
3. **Rate Limiting**: Prevents API abuse
4. **Input Validation**: All inputs are validated
5. **Helmet.js**: Security headers to prevent common attacks



## Acknowledgments

- Express.js for the backend framework
- React for the frontend
- Socket.io for real-time communication
- PostgreSQL for database
- Redis for caching and pub/sub
- Claude for debugging and code review
