require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const MongoStore = require("connect-mongo");

require("./Config/passport")(passport);
const authRoutes = require("./Routes/auth");
const commentRoutes = require("./Routes/comments");
const paymentRoutes = require("./Routes/gateway");
const mailRoutes = require("./Routes/mail");
const newsletterRoutes = require("./Routes/newsletter");
const gamesAccessRoutes = require("./Routes/games");
const scoresRoutes = require("./Routes/scores");
const payfastRoutes = require("./Routes/payfast");
const supervisionRoutes = require("./Routes/supervision");
const boardRoutes = require("./Routes/boards");
const app = express();
// Behind nginx/Cloudflare: use real visitor IP from X-Forwarded-For
app.set("trust proxy", 1);

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tlsAllowInvalidCertificates: false,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log("Mongo DB connected successfully"));

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
// app.use(
//   "/gateway/webhook",
//   express.raw({ type: "application/json" }),
//   paymentRoutes.webhookRouter
// );

app.use(express.json()); // Now safe
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    secret: process.env.MONGODB_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 👈 7 days
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Use routes
// All other normal JSON routes
app.use("/auth", authRoutes);
app.use("/comments", commentRoutes);
app.use("/paypal", paymentRoutes);
app.use("/mail", mailRoutes);
app.use("/newsletter", newsletterRoutes);
app.use("/games", gamesAccessRoutes);
app.use("/scores", scoresRoutes);
app.use("/payfast", payfastRoutes);
app.use("/supervision", supervisionRoutes);
app.use("/boards", boardRoutes);
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
