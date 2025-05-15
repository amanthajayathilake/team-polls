export abstract class CustomError extends Error {
  abstract statusCode: number;
  abstract errorMessage?: string | undefined;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }

  abstract serializeErrors(): {
    message: string;
    details: string | null;
    field?: string | null;
  }[];
}
