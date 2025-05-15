import jwt from "jsonwebtoken";
import WebSocket from "ws";
import { config } from "../config";
import { redis } from "../models/redist";

export const wss = new WebSocket.Server({ port: config.wsPort });

// Map to track client subscriptions
const clientSubscriptions = new Map<WebSocket, Set<string>>();

wss.on("connection", (ws: WebSocket, req) => {
  console.log("New WebSocket connection");

  const subscriptions = new Set<string>();
  clientSubscriptions.set(ws, subscriptions);

  ws.on("message", async (message: string) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "subscribe") {
        const { pollId, token } = data;

        // Verify token (optional but recommended)
        try {
          jwt.verify(token, config.jwt.secret);
        } catch (error) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
          return;
        }

        subscriptions.add(pollId);
        await redis.sAdd(`poll:${pollId}:subscribers`, ws.url || "anonymous");

        ws.send(JSON.stringify({ type: "subscribed", pollId }));
      } else if (data.type === "unsubscribe") {
        const { pollId } = data;
        subscriptions.delete(pollId);
        await redis.sRem(`poll:${pollId}:subscribers`, ws.url || "anonymous");

        ws.send(JSON.stringify({ type: "unsubscribed", pollId }));
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
      ws.send(
        JSON.stringify({ type: "error", message: "Invalid message format" })
      );
    }
  });

  ws.on("close", async () => {
    // Clean up subscriptions
    for (const pollId of subscriptions) {
      await redis.sRem(`poll:${pollId}:subscribers`, ws.url || "anonymous");
    }
    clientSubscriptions.delete(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

// Redis subscription for inter-process communication
async function setupRedisSubscription() {
  const subscriber = redis.duplicate();
  await subscriber.connect();

  await subscriber.subscribe("poll-updates", (message) => {
    const data = JSON.parse(message);
    broadcastToSubscribers(data.pollId, data);
  });
}

function broadcastToSubscribers(pollId: string, data: any) {
  clientSubscriptions.forEach((subscriptions, client) => {
    if (subscriptions.has(pollId) && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

setupRedisSubscription().catch(console.error);
