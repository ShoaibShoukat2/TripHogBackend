const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/adminSchema");
const { DBConfig } = require("./config");

const MONGO_URI = `${DBConfig.dbURL}/${DBConfig.dbName}`;

async function createProdAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to Production MongoDB");
    console.log("Database:", DBConfig.dbName);

    const email = "admin@gmail.com";
    const plainPassword = "test123";

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists, updating...");
      
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      
      await Admin.findOneAndUpdate(
        { email },
        {
          password: hashedPassword,
          hasPlan: true,
          paymentStatus: "paid",
          status: "active"
        }
      );
      
      console.log("✅ Admin updated successfully!");
    } else {
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const uniqueCompanyCode = `ADMIN-${Date.now()}`;

      const newAdmin = new Admin({
        firstName: "Admin",
        lastName: "User",
        email,
        password: hashedPassword,
        phoneNumber: "+1-555-123-4567",
        companyName: "Admin Company",
        companyCode: uniqueCompanyCode,
        docs: [],
        isOnHold: false,
        warningMsg: "",
        frequentlyVisitedPages: [
          { title: "View Trips", path: "/admin/trips" },
          { title: "Schedule Meeting", path: "/admin/meeting" },
          { title: "Billing History", path: "/admin/billing" }
        ],
        photo: "",
        features: ["analytics", "user_management"],
        paymentStatus: "paid",
        status: "active",
        plan: "Ultimate",
        hasPlan: true,
        createdAt: new Date(),
        googleCalendarTokens: {},
        payments: [
          {
            paymentId: `PAY-${Date.now()}`,
            amount: 199.99,
            currency: "USD",
            method: "Credit Card",
            plan: "Ultimate",
            status: "Completed",
            transactionDate: new Date(),
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }
        ],
      });

      await newAdmin.save();
      console.log("✅ Admin created successfully!");
    }

    console.log("🔐 Login credentials:");
    console.log("Email:", email);
    console.log("Password:", plainPassword);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

createProdAdmin();