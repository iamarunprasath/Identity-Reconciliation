import cors from "cors";
import express, { Express } from "express";
import { route } from "./routes/routes";

const app: Express = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/api", route);

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
