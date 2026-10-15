import type { Response } from "express";

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export const ok = <T>(res: Response, data: T, meta?: object, status = 200) => {
  res.status(status).json({ success: true, data, ...(meta !== undefined && { meta }) });
};
