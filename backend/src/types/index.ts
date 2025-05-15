import { z } from "zod";

// EXP: Validation schemas
export const CreatePollSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  expiresAt: z.string().datetime(),
});

export const VoteSchema = z.object({
  optionIndex: z.number().int().min(0),
});

// EXP: Types
export interface Poll {
  id: string;
  question: string;
  options: string[];
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface Vote {
  id: string;
  pollId: string;
  userId: string;
  optionIndex: number;
  createdAt: Date;
}

export interface PollResults {
  poll: Poll;
  votes: number[];
  totalVotes: number;
}

export interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

export interface WSMessage {
  type: "vote_update" | "poll_closed";
  pollId: string;
  data: any;
}
