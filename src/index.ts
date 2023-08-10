import express, { Express } from "express";
import { route } from "./routes/routes";
import cors from "cors";
import * as dotenv from "dotenv";
import { config } from "./Common/Config";
dotenv.config();

const app: Express = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/api", route);

const PORT = config.port || 5002;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
