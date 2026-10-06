import { AppError } from "../utils/errors.js";

export function notFound(_request, _response, next) {
  next(new AppError(404, "The requested API route was not found.", "NOT_FOUND"));
}

export function errorHandler(error, _request, response, _next) {
  if (error?.name === "ValidationError") {
    return response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: error.message },
    });
  }

  if (error?.code === 11000) {
    return response.status(409).json({
      error: { code: "ALREADY_EXISTS", message: "That value is already in use." },
    });
  }

  const status = error instanceof AppError ? error.status : 500;
  const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";
  const message = error instanceof AppError ? error.message : "An unexpected server error occurred.";

  if (status >= 500) console.error(error);
  return response.status(status).json({ error: { code, message } });
}
