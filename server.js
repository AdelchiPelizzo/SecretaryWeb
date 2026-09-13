const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const registerRoute = require("./routes/register");
const loginRoute = require("./routes/login");
const dashboardRoute = require("./routes/dashboard");
const businessRoute = require("./routes/business");
const secretaryRoute = require("./routes/secretary");
const appointmentsRoute = require("./routes/appointments");

app.use(appointmentsRoute);

app.use(secretaryRoute);

app.use(businessRoute);

app.use(dashboardRoute);

app.use(loginRoute);

app.use(registerRoute);

console.log("Register route loaded");

app.listen(PORT, "0.0.0.0", () => {
    console.log(`SecretaryWeb running on port ${PORT}`);
});
