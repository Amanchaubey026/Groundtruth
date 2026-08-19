import { Router } from "express";
import { asyncHandler } from "../lib/errors.js";
import { parseIngestInput } from "../lib/validation.js";
import { ingest } from "../services/ingestion.js";

export const ingestRouter = Router();

ingestRouter.post(
  "/ingest",
  asyncHandler(async (req, res) => {
    const input = parseIngestInput(req.body);
    const item = await ingest(input, req.requestId);
    res.status(201).json(item);
  }),
);
