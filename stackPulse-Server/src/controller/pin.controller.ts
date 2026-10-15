import type { RequestHandler } from "express";
import { currentUserId } from "#middleware/auth.middleware.js";
import type { PinListQuery } from "#schemas/pin.schema.js";
import { pinService } from "#service/pin.service.js";
import { ok } from "#utils/http.js";

const idOf = (params: Record<string, string | string[] | undefined>) => Number(params.id);

export const createPin: RequestHandler = async (req, res) => {
  ok(res, await pinService.create(currentUserId(req), req.body), undefined, 201);
};

export const listPins: RequestHandler = async (req, res) => {
  const { pins, page } = await pinService.list(currentUserId(req), req.query as unknown as PinListQuery);
  ok(res, pins, page);
};

export const getPin: RequestHandler = async (req, res) => {
  ok(res, await pinService.get(currentUserId(req), idOf(req.params)));
};

export const updatePin: RequestHandler = async (req, res) => {
  ok(res, await pinService.update(currentUserId(req), idOf(req.params), req.body));
};

export const deletePin: RequestHandler = async (req, res) => {
  await pinService.remove(currentUserId(req), idOf(req.params));
  res.status(204).end();
};
