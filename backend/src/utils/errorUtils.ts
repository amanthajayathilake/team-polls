import { NextFunction, Request, Response } from "express";
import { CustomError } from "../errors/CustomError";
import logger from "./logger";

export const processError = (error: Error, context?: Record<string, any>) => {
  if (error instanceof CustomError) {
    logger.error(`${error.errorMessage || error.message}`, {
      statusCode: error.statusCode,
      errors: error.serializeErrors(),
      context,
      stack: error.stack,
    });
    return;
  }

  logger.error(`${error.message}`, {
    context,
    stack: error.stack,
  });
};

export const errorResponseLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const originalSend = res.send;
  let responseBody: any;

  res.send = function (this: Response, body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  } as any;

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode}  ${responseBody?.message || ""} ${duration}ms`;

    const parsedResponse = responseBody
      ? (() => {
          try {
            return JSON.parse(responseBody);
          } catch {
            return {};
          }
        })()
      : {};

    if (res.statusCode >= 500) {
      logger.error(message, parsedResponse?.responseObject);
    } else if (res.statusCode >= 400) {
      logger.warn(message, parsedResponse?.responseObject);
    } else {
      logger.info(message, parsedResponse?.responseObject);
    }
  });

  next();
};
