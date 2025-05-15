import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { metricsHandler, metricsMiddleware } from "./middleware/metrics";
import { connectRedis } from "./models/redist";
// import routes from './routes';
import { runMigrations } from "./utils/migrate";
import "./websocket/server";

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(compression());

// Logging
app.use(morgan("combined"));

// Metrics
app.use(metricsMiddleware);

// Routes
// app.use('/api', routes);
app.get("/metrics", metricsHandler);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Start server
async function start() {
  try {
    // Run migrations
    await runMigrations();

    // Connect to Redis
    await connectRedis();

    // Start HTTP server
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`WebSocket server running on port ${config.wsPort}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
