import cors from "cors";
import express, { Express, Request, Response } from "express";

const app: Express = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 5002;

app.get("/health", (req: Request, res: Response) => {
  res.send("I'm working");
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
