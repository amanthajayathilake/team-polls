import { RequestHandler, Router } from "express";
import { AuthController } from "../controllers/authController";
import { PollController } from "../controllers/pollController";
import { authenticateToken } from "../middleware/auth";
import { voteLimiter } from "../middleware/rateLimit";

const router = Router();
const authController = new AuthController();
const pollController = new PollController();

// Auth routes
router.post("/auth/anon", authController.createAnonymousToken);

// Poll routes
// router.post('/poll', authenticateToken, pollController.createPoll as RequestHandler);
// router.get('/poll/:id', pollController.getPoll as RequestHandler);router.post('/poll/:id/vote',
//   authenticateToken,
//   voteLimiter,
//   pollController.castVote
// );

router.post("/poll", pollController.createPoll as RequestHandler);
router.get("/poll/:id", pollController.getPoll as RequestHandler);
router.post(
  "/poll/:id/vote",
  authenticateToken as any,
  voteLimiter,
  pollController.castVote as any
);

export default router;
