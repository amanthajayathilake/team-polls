import { db } from "../models/database";

export async function runMigrations() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Create polls table
    await client.query(`
      CREATE TABLE IF NOT EXISTS polls (
        id VARCHAR(36) PRIMARY KEY,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // Create votes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id VARCHAR(36) PRIMARY KEY,
        poll_id VARCHAR(36) NOT NULL REFERENCES polls(id),
        user_id VARCHAR(36) NOT NULL,
        option_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(poll_id, user_id)
      )
    `);

    // Create indices
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON polls(expires_at)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_polls_is_active ON polls(is_active)"
    );

    await client.query("COMMIT");
    console.log("Migrations completed successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
