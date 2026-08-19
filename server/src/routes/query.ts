import { Router } from "express";
import { asyncHandler } from "../lib/errors.js";
import { parseQuestion } from "../lib/validation.js";
import { answerQuestion } from "../services/rag.js";

export const queryRouter = Router();

queryRouter.post(
  "/query",
  asyncHandler(async (req, res) => {
    const question = parseQuestion(req.body);
    const result = await answerQuestion(question, req.requestId);
    res.status(200).json(result);
  }),
);
