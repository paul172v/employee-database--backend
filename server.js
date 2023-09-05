const mongoose = require("mongoose");
const app = require("./app");

process.on("uncaughtException", (err) => {
  console.log(`❗Uncaught Exception! Shutting down!`);
  console.log(`❌ ${err}`);
  process.exit(1);
});

const db = process.env.DB_URL.replace("<password>", process.env.DB_PASSWORD);
mongoose.connect(db).then(console.log(`Connected to database`));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening to server on port... ${port}`));

process.on("unhandledRejection", (err) => {
  console.log(`❗Unhandled Rejection! Shutting down!`);
  console.log(`❌ ${err}`);
  server.close(() => {
    process.exit(1);
  });
});
