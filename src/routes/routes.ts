import express, { Router, Request, Response } from "express";

const route: Router = express.Router();

route.get("/health", (req: Request, res: Response) => {
  res.send("I'm working");
});

route.post("/identify", (req: Request, res: Response) => {
  res.send("This is Identity API");
});

export { route };
