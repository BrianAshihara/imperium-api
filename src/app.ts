import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import "./database/database";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware";
import { requestIdMiddleware } from "./middlewares/request-id.middleware";
import { router } from "./routes";

const app = express();

// Security headers
app.use(helmet());

// Body parsing with size limit to prevent payload abuse
app.use(express.json({ limit: "100kb" }));
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(requestIdMiddleware);

app.use("/api", router);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
