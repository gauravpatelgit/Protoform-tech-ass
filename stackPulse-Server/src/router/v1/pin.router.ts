import { Router } from "express";
import { createPin, deletePin, getPin, listPins, updatePin } from "#controller/pin.controller.js";
import { validate } from "#middleware/validation.middleware.js";
import { createPinSchema, pinIdParamSchema, pinListQuerySchema, updatePinSchema } from "#schemas/pin.schema.js";

const pinRouter = Router();

pinRouter.post("/", validate({ body: createPinSchema }), createPin);
pinRouter.get("/", validate({ query: pinListQuerySchema }), listPins);
pinRouter.get("/:id", validate({ params: pinIdParamSchema }), getPin);
pinRouter.patch("/:id", validate({ params: pinIdParamSchema, body: updatePinSchema }), updatePin);
pinRouter.delete("/:id", validate({ params: pinIdParamSchema }), deletePin);

export default pinRouter;
