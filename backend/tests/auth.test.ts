import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { config } from "../src/config";
import { AuthController } from "../src/controllers/authController";

const app = express();
app.use(express.json());

const authController = new AuthController();
app.post("/auth/anon", authController.createAnonymousToken);

describe("AuthController", () => {
  describe("POST /auth/anon", () => {
    it("should create an anonymous token", async () => {
      const response = await request(app).post("/auth/anon").expect(200);

      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("userId");
      expect(response.body).toHaveProperty("expiresIn");

      // Verify token is valid
      const decoded = jwt.verify(response.body.token, config.jwt.secret) as any;
      expect(decoded.userId).toBe(response.body.userId);
    });

    it("should create unique tokens for each request", async () => {
      const response1 = await request(app).post("/auth/anon");
      const response2 = await request(app).post("/auth/anon");

      expect(response1.body.token).not.toBe(response2.body.token);
      expect(response1.body.userId).not.toBe(response2.body.userId);
    });
  });
});
