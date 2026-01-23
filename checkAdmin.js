const mongoose = require("mongoose");
const Admin = require("./models/adminSchema");
const { DBConfig } = require("./config");

const MONGO_URI = `${DBConfig.dbURL}/${DBConfig.dbName}`;

async function checkAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const admins = await Admin.find({});
    console.log("📋 Total Admins:", admins.length);
    
    admins.forEach((admin, index) => {
      console.log(`\n👤 Admin ${index + 1}:`);
      console.log("Email:", admin.email);
      console.log("Company Code:", admin.companyCode);
      console.log("Has Plan:", admin.hasPlan);
      console.log("Payment Status:", admin.paymentStatus);
      console.log("Status:", admin.status);
      console.log("Password Set:", !!admin.password);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

checkAdmin();