export class AppError extends Error {
  constructor(status, message, code = "REQUEST_FAILED") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function asyncHandler(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}
