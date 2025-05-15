import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";

export class AuthController {
  createAnonymousToken = async (req: Request, res: Response) => {
    try {
      const userId = uuidv4();
      const token = jwt.sign({ userId }, config.jwt.secret as any, {
        expiresIn: config.jwt.expiresIn as any,
      });

      res.json({
        token,
        userId,
        expiresIn: config.jwt.expiresIn,
      });
    } catch (error) {
      console.error("Error creating anonymous token:", error);
      res.status(500).json({ error: "Failed to create token" });
    }
  };
}
