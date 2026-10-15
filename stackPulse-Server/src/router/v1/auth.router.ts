import { Router } from "express";
import { login, logout, me, refresh, signup } from "#controller/auth.controller.js";
import { requireAuth } from "#middleware/auth.middleware.js";
import { authLimiter } from "#middleware/rateLimit.middleware.js";
import { validate } from "#middleware/validation.middleware.js";
import { loginSchema, signupSchema } from "#schemas/auth.schema.js";

const authRouter = Router();

authRouter.use(authLimiter);
authRouter.post("/signup", validate({ body: signupSchema }), signup);
authRouter.post("/login", validate({ body: loginSchema }), login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);

export default authRouter;
