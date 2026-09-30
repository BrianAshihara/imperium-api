import { Request, Response } from "express";

import { sendSuccess } from "../../utils/response";

import { healthService } from "./health.service";

export const healthController = {
  check: async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, req, healthService.getStatus());
  }
};
