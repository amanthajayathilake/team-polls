import { redis } from "../models/redist";
import { PollResults } from "../types";

export async function broadcastVoteUpdate(
  pollId: string,
  results: PollResults
) {
  const message = {
    type: "vote_update",
    pollId,
    data: {
      votes: results.votes,
      totalVotes: results.totalVotes,
    },
  };

  // EXP: Publish to Redis for other nodes
  await redis.publish("poll-updates", JSON.stringify(message));
}

export async function broadcastPollClosed(pollId: string) {
  const message = {
    type: "poll_closed",
    pollId,
    data: {
      closed: true,
    },
  };

  await redis.publish("poll-updates", JSON.stringify(message));
}
