import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { metricsHandler, metricsMiddleware } from "./middleware/metrics";
import { connectRedis } from "./models/redist";
import routes from "./routes";
import { runMigrations } from "./utils/migrate";
import "./websocket/server";
import logger from "./utils/logger";
import setupSwagger from "./config/swagger";

const app = express();

// EXP: Uncaught exception handler
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// EXP:Unhandled rejection handler
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason, promise });
  process.exit(1);
});

// EXP:Security middleware
app.use(helmet());

app.use(
  helmet.hsts({
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true, // Apply HSTS to all subdomains
    preload: true, // Include this domain in the HSTS preload list
  })
);

app.use(cors({ origin: config.cors.origin }));

// EXP:Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(compression());

// EXP:Logging
app.use(morgan("combined"));

// EXP:Metrics
app.use(metricsMiddleware);

// EXP:Routes
app.use("/api", routes);
app.get("/metrics", metricsHandler);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// EXP:Error handling
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
    logger.error(`Internal server error: ${err}`);
  }
);

// EXP:Start server
async function start() {
  try {
    // EXP: Run migrations
    await runMigrations();

    // EXP: Connect to Redis
    await connectRedis();

    // EXP: Start HTTP server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`WebSocket server running on port ${config.wsPort}`);
      console.log(`Server running on port ${config.port}`);
      console.log(`WebSocket server running on port ${config.wsPort}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

// EXP: Swagger setup
setupSwagger(app);

start();
