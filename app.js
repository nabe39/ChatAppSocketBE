const express = require("express"); //web framework for Node.js

const morgan = require("morgan"); // HTTP request logger middleware for node.js
const rateLimit = require("express-rate-limit");
const helmet = require("helmet"); //

const mongosanitize = require("express-mongo-sanitize"); //

const bodyParser = require("body-parser");

const xss = require("xss");
const cors = require("cors");
const app = express();

app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(mongosanitize());
app.use(xss());
app.use(express);
//
app.use(
  cors({
    origin: "*",
    method: ["GET", "PATCH", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10k" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
const limiter = rateLimit({
  max: 3000,
  windowMs: 60 * 60 * 1000, // in one hour
  message: "Too many request from this IP, please try again in an hour",
});

app.use("/tawk", limiter);
module.exports = app;
