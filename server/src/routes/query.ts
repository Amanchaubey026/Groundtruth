import { Router } from "express";
import { AppError, asyncHandler } from "../lib/errors.js";
import { openSse } from "../lib/sse.js";
import { parseQuestion } from "../lib/validation.js";
import { answerQuestion, streamQuestion } from "../services/rag.js";

export const queryRouter = Router();

queryRouter.post(
  "/query",
  asyncHandler(async (req, res) => {
    const question = parseQuestion(req.body);
    const stream = req.body?.stream === true;

    if (!stream) {
      const result = await answerQuestion(question, req.requestId);
      res.status(200).json(result);
      return;
    }

    const controller = new AbortController();
    const onClose = () => {
      if (!res.writableEnded) controller.abort();
    };
    res.on("close", onClose);

    const sse = openSse(res);
    try {
      for await (const event of streamQuestion(question, req.requestId, controller.signal)) {
        if (controller.signal.aborted) break;
        sse.send(event.type, event);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const appError =
          error instanceof AppError
            ? error
            : new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred");
        sse.send("error", {
          message: appError.message,
          code: appError.code,
        });
      }
    } finally {
      res.off("close", onClose);
      sse.close();
    }
  }),
);
