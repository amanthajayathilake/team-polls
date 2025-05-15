import { createClient } from "redis";
import { config } from "../config";

export const redis = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password,
});

redis.on("error", (err) => {
  console.error("Redis Client Error", err);
});

redis.on("connect", () => {
  console.log("Redis connected successfully");
});

// Connect to Redis
export const connectRedis = async () => {
  await redis.connect();
};
