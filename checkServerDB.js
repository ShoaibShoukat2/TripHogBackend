const mongoose = require("mongoose");
const Admin = require("./models/adminSchema");
const { DBConfig } = require("./config");

async function checkServerDB() {
  try {
    console.log("Connecting to:", DBConfig.dbURL);
    console.log("Database:", DBConfig.dbName);
    
    await mongoose.connect(`${DBConfig.dbURL}/${DBConfig.dbName}`);
    console.log("✅ Connected to MongoDB");

    const admins = await Admin.find({});
    console.log("Total admins:", admins.length);
    
    const targetAdmin = await Admin.findOne({ email: "admin@gmail.com" });
    console.log("Target admin found:", !!targetAdmin);
    
    if (targetAdmin) {
      console.log("Admin details:");
      console.log("- Email:", targetAdmin.email);
      console.log("- Has password:", !!targetAdmin.password);
      console.log("- Has plan:", targetAdmin.hasPlan);
      console.log("- Payment status:", targetAdmin.paymentStatus);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

checkServerDB();