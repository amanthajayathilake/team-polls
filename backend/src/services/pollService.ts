import { v4 as uuidv4 } from "uuid";
import { db } from "../models/database";
import { Poll, PollResults, Vote } from "../types";

export class PollService {
  async createPoll(
    question: string,
    options: string[],
    expiresAt: Date
  ): Promise<Poll> {
    const id = uuidv4();
    const query = `
      INSERT INTO polls (id, question, options, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      question,
      JSON.stringify(options),
      expiresAt,
    ]);
    const poll = result.rows[0];

    return {
      id: poll.id,
      question: poll.question,
      options: JSON.parse(poll.options),
      createdAt: poll.created_at,
      expiresAt: poll.expires_at,
      isActive: poll.is_active,
    };
  }

  async getPoll(id: string): Promise<Poll | null> {
    const query = "SELECT * FROM polls WHERE id = $1";
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const poll = result.rows[0];
    return {
      id: poll.id,
      question: poll.question,
      options: JSON.parse(poll.options),
      createdAt: poll.created_at,
      expiresAt: poll.expires_at,
      isActive: poll.is_active,
    };
  }

  async castVote(
    pollId: string,
    userId: string,
    optionIndex: number
  ): Promise<Vote | null> {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // Check if poll exists and is active
      const pollResult = await client.query(
        "SELECT * FROM polls WHERE id = $1 AND is_active = true AND expires_at > NOW()",
        [pollId]
      );

      if (pollResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const poll = pollResult.rows[0];
      const options = JSON.parse(poll.options);

      if (optionIndex < 0 || optionIndex >= options.length) {
        await client.query("ROLLBACK");
        return null;
      }

      // Check for existing vote (idempotency)
      const existingVote = await client.query(
        "SELECT * FROM votes WHERE poll_id = $1 AND user_id = $2",
        [pollId, userId]
      );

      if (existingVote.rows.length > 0) {
        await client.query("ROLLBACK");
        return existingVote.rows[0];
      }

      // Insert new vote
      const voteId = uuidv4();
      const voteResult = await client.query(
        "INSERT INTO votes (id, poll_id, user_id, option_index) VALUES ($1, $2, $3, $4) RETURNING *",
        [voteId, pollId, userId, optionIndex]
      );

      await client.query("COMMIT");

      const vote = voteResult.rows[0];
      return {
        id: vote.id,
        pollId: vote.poll_id,
        userId: vote.user_id,
        optionIndex: vote.option_index,
        createdAt: vote.created_at,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getPollResults(pollId: string): Promise<PollResults | null> {
    const poll = await this.getPoll(pollId);

    if (!poll) {
      return null;
    }

    const query = `
      SELECT option_index, COUNT(*) as count
      FROM votes
      WHERE poll_id = $1
      GROUP BY option_index
    `;

    const result = await db.query(query, [pollId]);

    // Initialize vote counts
    const votes = new Array(poll.options.length).fill(0);
    let totalVotes = 0;

    // Fill in actual counts
    result.rows.forEach((row) => {
      votes[row.option_index] = parseInt(row.count);
      totalVotes += parseInt(row.count);
    });

    return {
      poll,
      votes,
      totalVotes,
    };
  }

  async closePoll(pollId: string): Promise<void> {
    await db.query("UPDATE polls SET is_active = false WHERE id = $1", [
      pollId,
    ]);
  }
}
