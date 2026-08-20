import { Router } from "express";
import { asyncHandler } from "../lib/errors.js";
import { getLlmStatus } from "../services/llm.js";

export const llmRouter = Router();

llmRouter.get(
  "/llm",
  asyncHandler(async (_req, res) => {
    const status = await getLlmStatus();
    res.status(200).json(status);
  }),
);
