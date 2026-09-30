import { app } from "./app";

const port = Number(process.env.PORT) || 3000;

app.listen(port, (err?: Error) => {
  if (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
  console.log(`API listening on http://localhost:${port}`);
});