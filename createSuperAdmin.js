const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const SuperAdminModel = require("./models/SuperAdminModel");
const { DBConfig } = require("./config");

const MONGO_URI = `${DBConfig.dbURL}/${DBConfig.dbName}`;

async function createSuperAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const email = "superadmin@gmail.com";
    const plainPassword = "superadmin123";

    // Check if superadmin already exists
    const existingSuperAdmin = await SuperAdminModel.findOne({ EMailAddress: email });
    
    if (existingSuperAdmin) {
      console.log("⚠️ SuperAdmin already exists, updating password...");
      
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const token = crypto.randomBytes(20).toString("hex");
      const tokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now
      
      await SuperAdminModel.findOneAndUpdate(
        { EMailAddress: email },
        {
          password: hashedPassword,
          passwordResetToken: token,
          passwordResetExpire: tokenExpiry
        }
      );
      
      console.log("✅ SuperAdmin password updated successfully!");
    } else {
      // Create new superadmin
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const token = crypto.randomBytes(20).toString("hex");
      const tokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now

      const newSuperAdmin = new SuperAdminModel({
        firstName: "Super",
        lastName: "Admin",
        EMailAddress: email,
        password: hashedPassword,
        passwordResetToken: token,
        passwordResetExpire: tokenExpiry,
        role: "Super Admin",
        docs: []
      });

      await newSuperAdmin.save();
      console.log("✅ SuperAdmin created successfully!");
    }

    console.log("\n🔐 SuperAdmin Login Credentials:");
    console.log("Email:", email);
    console.log("Password:", plainPassword);
    console.log("Role: Super Admin");

    // Show all superadmins
    const allSuperAdmins = await SuperAdminModel.find({});
    console.log(`\n📊 Total SuperAdmins in database: ${allSuperAdmins.length}`);
    
    allSuperAdmins.forEach((admin, index) => {
      console.log(`\n👤 SuperAdmin ${index + 1}:`);
      console.log("Name:", `${admin.firstName} ${admin.lastName}`);
      console.log("Email:", admin.EMailAddress);
      console.log("Role:", admin.role);
      console.log("Has Password:", !!admin.password);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

console.log("🚀 Creating SuperAdmin...");
createSuperAdmin();