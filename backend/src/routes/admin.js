import { Router } from "express";
import { Player } from "../models/Player.js";
import { asyncHandler } from "../utils/errors.js";
import { normalizePlayerInput } from "../utils/playerInput.js";

const router = Router();

router.post("/players", asyncHandler(async (request, response) => {
  const player = await Player.create(normalizePlayerInput(request.body));
  response.status(201).json({ player });
}));

export default router;
