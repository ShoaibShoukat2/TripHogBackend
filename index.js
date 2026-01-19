const express = require("express");
const app = express();
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require('path');
const http = require('http');
const { initializeSocket } = require('./io');
app.use(cors());

const allowedOrigins = ['https://triphog.net', 'https://www.triphog.net', 'http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));


app.use(morgan("dev"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let server = http.createServer(app);

// Initialize Socket.IO after server setup
initializeSocket(server);

// Import your routes as usual
const googleAuthRoutes = require(`${__dirname}/routes/googleAuthRoutes`);
const superadminRouter = require(`${__dirname}/routes/superAdminRouter`);
const adminRouter = require(`${__dirname}/routes/adminRouter`);
const meetingRouter = require(`${__dirname}/routes/meetingRouter`);
const driverRouter = require(`${__dirname}/routes/driverRouter`);
const patientRouter = require(`${__dirname}/routes/patientRouter`);
const tripRouter = require(`${__dirname}/routes/tripRouter`);
const userRouter = require(`${__dirname}/routes/userRouter`);
const chatRouter = require(`${__dirname}/routes/chatRouter`);
const notificationRouter = require(`${__dirname}/routes/notificationRouter`)


// Add no-cache middleware for API routes
const noCacheMiddleware = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};
// Apply no-cache middleware to all API routes
app.use("/api", noCacheMiddleware);
app.use("/auth", noCacheMiddleware);

app.use("/auth", googleAuthRoutes);
app.use("/api/v1/chat", chatRouter)
app.use("/api/v1/superadmin", superadminRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/meeting", meetingRouter);
app.use("/api/v1/driver", driverRouter);
app.use("/api/v1/patient", patientRouter);
app.use("/api/v1/trip", tripRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/notification", notificationRouter)
// For Create admin password
app.get('/admin/user/createpassword/*', (req, res) => {
  res.redirect('https://triphog.net/admin/create-password/' + req.params[0]);
});
// For Create subadmin password
app.get('/admin/user/createpassword/*', (req, res) => {
  res.redirect('https://triphog.net/admin/user/createpassword/' + req.params[0]);
});
// For Create Driver password
app.get('/driver/createpassword/*', (req, res) => {
  res.redirect('https://triphog.net/driver/createpassword/' + req.params[0]);
});

app.use("*", (req, resp) => {
  resp.status(404).json({ status: "fail", message: "Page Not Found" });
});

module.exports = { app, server };
