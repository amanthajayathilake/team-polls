import { Request, Response } from "express";
import { PollService } from "../services/pollService";
import { CreatePollSchema, VoteSchema } from "../types";
import { AuthRequest } from "../middleware/auth";
import { broadcastVoteUpdate } from "../websocket/broadcast";

export class PollController {
  private pollService: PollService;

  constructor() {
    this.pollService = new PollService();
  }

  createPoll = async (req: Request, res: Response) => {
    try {
      const validatedData = CreatePollSchema.parse(req.body);
      const expiresAt = new Date(validatedData.expiresAt);

      const poll = await this.pollService.createPoll(
        validatedData.question,
        validatedData.options,
        expiresAt
      );

      res.status(201).json(poll);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error creating poll:", error);
      res.status(500).json({ error: "Failed to create poll" });
    }
  };

  getPoll = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const results = await this.pollService.getPollResults(id);

      if (!results) {
        return res.status(404).json({ error: "Poll not found" });
      }

      res.json(results);
    } catch (error) {
      console.error("Error getting poll:", error);
      res.status(500).json({ error: "Failed to get poll" });
    }
  };

  castVote = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = VoteSchema.parse(req.body);
      const userId = req.user!.userId;

      const vote = await this.pollService.castVote(
        id,
        userId,
        validatedData.optionIndex
      );

      if (!vote) {
        return res.status(400).json({ error: "Invalid vote or poll closed" });
      }

      // Get updated results and broadcast
      const results = await this.pollService.getPollResults(id);
      if (results) {
        broadcastVoteUpdate(id, results);
      }

      res.json({ success: true, vote });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error casting vote:", error);
      res.status(500).json({ error: "Failed to cast vote" });
    }
  };
}
