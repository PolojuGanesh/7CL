import assert from "node:assert/strict";
import test from "node:test";
import { parseObjectId, requireObjectBody } from "../src/middleware/validate.js";
import { AppError } from "../src/utils/errors.js";

test("parseObjectId accepts a 24-character hexadecimal identifier", () => {
  assert.equal(parseObjectId("507f1f77bcf86cd799439011"), "507f1f77bcf86cd799439011");
});

test("parseObjectId rejects malformed identifiers with a client error", () => {
  assert.throws(
    () => parseObjectId("invalid", "roomId"),
    (error) => error instanceof AppError && error.status === 400 && error.code === "INVALID_ID",
  );
});

test("requireObjectBody rejects arrays and absent request bodies", () => {
  for (const body of [undefined, null, [], "string"]) {
    let receivedError;
    requireObjectBody({ body }, null, (error) => { receivedError = error; });
    assert.ok(receivedError instanceof AppError);
    assert.equal(receivedError.status, 400);
  }
});

test("requireObjectBody passes JSON objects through", () => {
  const request = { body: { roomName: "League" } };
  let nextCalled = false;
  requireObjectBody(request, null, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});
