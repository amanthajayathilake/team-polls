import rateLimit from "express-rate-limit";
import { config } from "../config";
import { redis } from "../models/redist";

// Custom Redis store for rate limiting
class RedisStore {
  windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  async increment(
    key: string
  ): Promise<{ totalHits: number; resetTime: Date }> {
    const multi = redis.multi();
    const redisKey = `rate-limit:${key}`;

    multi.incr(redisKey);
    multi.expire(redisKey, Math.ceil(this.windowMs / 1000));

    const results = await multi.exec();
    const totalHits = (results?.[0] as unknown as number) || 1;

    return {
      totalHits,
      resetTime: new Date(Date.now() + this.windowMs),
    };
  }

  async decrement(key: string): Promise<void> {
    await redis.decr(`rate-limit:${key}`);
  }

  async resetKey(key: string): Promise<void> {
    await redis.del(`rate-limit:${key}`);
  }
}

export const voteLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  store: new RedisStore(config.rateLimit.windowMs),
  keyGenerator: (req) => {
    return (req as any).user?.userId || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests",
      retryAfter: config.rateLimit.windowMs / 1000,
    });
  },
});
