import express, { Router, Request, Response } from "express";
import { handleCustomerIdentity } from "../controllers/customers/customers";

const route: Router = express.Router();

route.get("/health", (req: Request, res: Response) => {
  res.send("I'm working");
});

route.post("/identify", handleCustomerIdentity);

export { route };
