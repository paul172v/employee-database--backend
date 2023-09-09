require("dotenv").config({ path: "./config.env" });
const express = require("express");
const app = express();
const path = require("path");
const morgan = require("morgan");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

app.use(express.json());

app.use("/public", express.static(path.join(__dirname, "public")));

process.env.NODE_ENV === "development" && app.use(morgan("dev"));

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Credentials", "true");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept, Authorization"
//   );
//   res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
//   next();
// });

//// CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    // "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE");

  next();
});

const userRouter = require("./routes/userRoutes");

app.use("/", (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "Test",
  });
});

app.use("/api/v1/users", userRouter);

app.use("*", (req, res, next) => {
  next(
    new AppError(`Can't find route "${req.originalUrl}" on the server!`, 404)
  );
});

app.use(globalErrorHandler);

module.exports = app;
