import dotenv from "dotenv";

dotenv.config();

type AppConfig = {
  port: number;
  wsPort: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
};

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  wsPort: parseInt(process.env.WS_PORT || "3001", 10),
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5433", 10),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "team_polls",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  },
  cors: {
    // origin: process.env.CORS_ORIGIN || "*",
    origin: "*",
  },
  rateLimit: {
    windowMs: 1000,
    max: 5,
  },
};
