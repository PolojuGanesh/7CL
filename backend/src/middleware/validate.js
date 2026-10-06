import { AppError } from "../utils/errors.js";

export function requireObjectBody(request, _response, next) {
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
    return next(new AppError(400, "A JSON object body is required.", "INVALID_BODY"));
  }
  return next();
}

export function parseObjectId(value, field = "id") {
  if (!/^[a-f\d]{24}$/i.test(value)) {
    throw new AppError(400, `${field} must be a valid identifier.`, "INVALID_ID");
  }
  return value;
}
