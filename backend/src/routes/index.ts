import { RequestHandler, Router } from "express";
import { AuthController } from "../controllers/authController";
import { PollController } from "../controllers/pollController";
import { authenticateToken } from "../middleware/auth";
import { voteLimiter } from "../middleware/rateLimit";

const router = Router();
const authController = new AuthController();
const pollController = new PollController();

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         userId:
 *           type: string
 *           description: Unique user identifier
 *         expiresIn:
 *           type: string
 *           description: Token expiration time
 *
 *     Poll:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique poll identifier
 *         question:
 *           type: string
 *           description: Poll question
 *         options:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of poll options
 *         createdAt:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 *           description: Whether the poll is currently active
 *
 *     CreatePollRequest:
 *       type: object
 *       required:
 *         - question
 *         - options
 *         - expiresAt
 *       properties:
 *         question:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *         options:
 *           type: array
 *           minItems: 2
 *           maxItems: 10
 *           items:
 *             type: string
 *             minLength: 1
 *             maxLength: 200
 *         expiresAt:
 *           type: string
 *           format: date-time
 *
 *     VoteRequest:
 *       type: object
 *       required:
 *         - optionIndex
 *       properties:
 *         optionIndex:
 *           type: integer
 *           minimum: 0
 *           description: Index of the selected option
 *
 *     PollResults:
 *       type: object
 *       properties:
 *         poll:
 *           $ref: '#/components/schemas/Poll'
 *         votes:
 *           type: array
 *           items:
 *             type: integer
 *           description: Vote count for each option
 *         totalVotes:
 *           type: integer
 *           description: Total number of votes cast
 *
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *         details:
 *           type: object
 *           description: Additional error details (optional)
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: Authentication endpoints
 *   - name: Polls
 *     description: Poll management endpoints
 */

/**
 * @swagger
 * /auth/anon:
 *   post:
 *     summary: Generate anonymous authentication token
 *     tags: [Authentication]
 *     description: Creates a JWT token for anonymous users to participate in polls
 *     responses:
 *       200:
 *         description: Authentication token created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /poll:
 *   post:
 *     summary: Create a new poll
 *     tags: [Polls]
 *     description: Creates a new poll with question, options, and expiration time
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePollRequest'
 *     responses:
 *       201:
 *         description: Poll created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Poll'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /poll/{id}:
 *   get:
 *     summary: Get poll details and results
 *     tags: [Polls]
 *     description: Retrieves poll information including current vote counts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The poll ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Poll results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PollResults'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Poll not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /poll/{id}/vote:
 *   post:
 *     summary: Cast a vote on a poll
 *     tags: [Polls]
 *     description: Submit a vote for a specific option in a poll. Limited to 5 requests per second per user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The poll ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VoteRequest'
 *     responses:
 *       200:
 *         description: Vote cast successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 vote:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     pollId:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     optionIndex:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid vote - poll closed or invalid option
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       429:
 *         description: Too many requests - Rate limit exceeded (5 requests per second)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 retryAfter:
 *                   type: integer
 *                   description: Seconds to wait before retry
 *       500:
 *         description: Internal server error
 */

// Auth routes
router.post("/auth/anon", authController.createAnonymousToken);

// Poll routes
router.post(
  "/poll",
  authenticateToken as any,
  pollController.createPoll as RequestHandler
);
router.get(
  "/poll/:id",
  authenticateToken as any,
  pollController.getPoll as RequestHandler
);
router.post(
  "/poll/:id/vote",
  authenticateToken as any,
  voteLimiter, // Apply rate limiting middleware - 5 requests per second
  pollController.castVote as any
);

export default router;
