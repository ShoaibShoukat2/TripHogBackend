#!/usr/bin/env node

const { server } = require("./index");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { DBConfig, AppConfig } = require("./config");

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Connect to MongoDB
mongoose
  .connect(DBConfig.dbURL, { 
    dbName: DBConfig.dbName,
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("MongoDB connected successfully.");
  })
  .catch((err) => {
    console.log("MONGO DB ERROR", err.message);
    console.log("Database Connection Failed ", err);
  });

// Start server
const PORT = process.env.PORT || 21098;
server.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});