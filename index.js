const express = require("express");
const app = express();
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require('path');
const http = require('http');
const { initializeSocket } = require('./io');

const allowedOrigins = [
  'https://triphog.net', 
  'https://www.triphog.net', 
  'https://api.triphog.net', 
  'http://localhost:3000', 
  'http://localhost:3001',
  'http://localhost:5173', // Vite dev server
  'http://127.0.0.1:5173'
];

// Configure CORS properly
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Handle preflight requests
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});


// Add CORS debugging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  
  // Set CORS headers manually for extra safety
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
  
  next();
});

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

// Base API route for health check
app.get("/api/v1", (req, res) => {
  res.json({ 
    status: "success", 
    message: "Triphog API is running",
    version: "1.0.0",
    cors: "enabled",
    origin: req.headers.origin,
    endpoints: {
      auth: "/auth",
      superadmin: "/api/v1/superadmin",
      admin: "/api/v1/admin",
      meeting: "/api/v1/meeting",
      driver: "/api/v1/driver",
      patient: "/api/v1/patient",
      trip: "/api/v1/trip",
      user: "/api/v1/user",
      chat: "/api/v1/chat",
      notification: "/api/v1/notification"
    }
  });
});

// CORS test endpoint
app.get("/api/v1/cors-test", (req, res) => {
  res.json({
    success: true,
    message: "CORS is working correctly",
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

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

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      origin: req.headers.origin
    });
  }
  
  // Other errors
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.use("*", (req, resp) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  resp.status(404).json({ status: "fail", message: "Page Not Found" });
});

module.exports = { app, server };
