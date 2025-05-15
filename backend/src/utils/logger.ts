import fs from "fs";
import path from "path";
import winston from "winston";
import { LogFiles } from "../enums/LogFiles";
import { PrependFileTransport } from "./prependFileTransport";

// Ensure logs directory exists
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaInfo = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${stack || ""} ${metaInfo}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports: [
    // Write errors to error.log with newest logs first
    new PrependFileTransport({
      filename: path.join(logDir, LogFiles.ERROR_LOG),
      level: "error",
    }),
    // Write all logs to combined.log with newest logs first
    new PrependFileTransport({
      filename: path.join(logDir, LogFiles.COMBINED_LOG),
    }),
  ],
});

// TODO: CHECK IF WE NEED TO ADD CONSOLE TRANSPORT IN THE PRODUCTION ENV
logger.add(
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), logFormat),
  })
);

export default logger;
