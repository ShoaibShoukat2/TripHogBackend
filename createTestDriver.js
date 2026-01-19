const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const DriverModel = require("./models/DriverModel");
const { DBConfig } = require("./config");

const MONGO_URI = `${DBConfig.dbURL}/${DBConfig.dbName}`;

async function createTestDriver() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if test driver already exists
    const existing = await DriverModel.findOne({ EMailAddress: "testdriver@example.com" });
    if (existing) {
      console.log("⚠️  Test driver already exists!");
      console.log("\n📱 Login Credentials:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📧 Email:    testdriver@example.com`);
      console.log(`🔑 Password: driver123`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      return process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("driver123", salt);

    // Create test driver
    const testDriver = new DriverModel({
      firstName: "Test",
      lastName: "Driver",
      EMailAddress: "testdriver@example.com",
      phoneNumber: "+92-300-1234567",
      location: "Karachi, Pakistan",
      vehicleName: "Toyota Corolla",
      gender: "Male",
      hourlyPay: 500,
      paymentType: "hourly",
      password: hashedPassword,
      status: "active",
      isApproved: true,
      addedBy: "690895184e7688d54225fe39", // Super admin ID
      latitude: 24.8607,
      longitude: 67.0011,
    });

    await testDriver.save();

    console.log("\n✅ Test driver created successfully!");
    console.log("\n📱 Mobile App Login Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`👤 Name:     Test Driver`);
    console.log(`📧 Email:    testdriver@example.com`);
    console.log(`🔑 Password: driver123`);
    console.log(`🚗 Vehicle:  Toyota Corolla`);
    console.log(`📍 Location: Karachi (24.8607, 67.0011)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n💡 Ab mobile app mein in credentials se login karein!");
    console.log("🗺️  Web app pe map page open karke live location dekh sakte hain!");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

createTestDriver();
