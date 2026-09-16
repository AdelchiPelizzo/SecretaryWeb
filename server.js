const express = require("express");
const path = require("path");
require("dotenv").config();

const connectDatabase = require("./config/database");
const sessionMiddleware = require("./config/session");
const registerRoute = require("./routes/register");
const loginRoute = require("./routes/login");
const dashboardRoute = require("./routes/dashboard");
const businessRoute = require("./routes/business");
const secretaryRoute = require("./routes/secretary");
const appointmentsRoute = require("./routes/appointments");

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(appointmentsRoute);
app.use(secretaryRoute);
app.use(businessRoute);
app.use(dashboardRoute);
app.use(loginRoute);
app.use(registerRoute);
app.use("/locales", express.static(path.join(__dirname, "locales")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

console.log("Register route loaded");

connectDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});