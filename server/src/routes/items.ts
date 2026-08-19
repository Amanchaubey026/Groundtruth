import { Router } from "express";
import { listItemRows } from "../db/client.js";
import { asyncHandler } from "../lib/errors.js";
import type { ItemSummary } from "../types.js";

const PREVIEW_LENGTH = 140;

export const itemsRouter = Router();

itemsRouter.get(
  "/items",
  asyncHandler(async (_req, res) => {
    const items: ItemSummary[] = listItemRows().map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      title: row.title,
      sourceUrl: row.source_url,
      preview: preview(row.cleaned_content),
      createdAt: row.created_at,
    }));
    res.status(200).json({ items });
  }),
);

function preview(content: string): string {
  const collapsed = content.replace(/\s+/g, " ").trim();
  if (collapsed.length <= PREVIEW_LENGTH) return collapsed;
  return `${collapsed.slice(0, PREVIEW_LENGTH).trimEnd()}…`;
}
