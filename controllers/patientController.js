const PatientModel = require('../models/PatientModel')
const TripModel = require('../models/TripModel')
const Admin = require("../models/adminSchema");
const nodemailer = require('nodemailer')
const { createEmailTransporter } = require("../utils/emailConfig");
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const fs = require('fs');
const path = require('path');
const { DateTime } = require("luxon");
const JWT_SECRET = "sdfd345ef_dfdf";
const jwt = require("jsonwebtoken");
const moment = require("moment");
exports.deleteSelected = async (req, res) => {
  try {
    await PatientModel.deleteMany({
      _id: { $in: req.body.selectedPatientsIds },
    });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.forgotPassword = async (req, res) => {
  let EMailAddress = req.body.EMailAddress;
  console.log("Forgot Password Implementation");
  try {
    let patient = await PatientModel.findOne({ EMailAddress: EMailAddress });
    console.log("Patient", patient);
    if (!patient) {
      res.json({ success: false, message: "Patient Not Found" });
    } else {
      const transport = createEmailTransporter();
      const token = crypto.randomBytes(20).toString("hex");

      patient.passwordResetToken = token;

      await patient.save(); //updating admin token and expire time

      const resetURL = `https://triphog.net/patient/reset-password/${token}`;
      const message = `Click on the link to reset your password will be expired  after 1 hour: ${resetURL}`;
      await transport.sendMail({
        from: "admin@triphog.com",
        to: patient.EMailAddress,
        subject: "Reset Your Patient Password",
        text: message,
      });
      res.json({ success: true });
    }
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.resetPassword = async (req, res) => {
  console.log("Reseting PassWord");
  try {
    const patient = await PatientModel.findOne({
      passwordResetToken: req.params.token,
    });
    console.log("Patient", patient);

    if (!patient) {
      return res.json({ success: false, message: "Patient Not Found!" });
    }
    console.log("password to set", req.body.password);
    const salt = await bcrypt.genSalt(10);
    console.log("Admin Updated Encrypted PassWord");
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    patient.password = hashedPassword;
    patient.passwordResetToken = undefined;

    await patient.save();

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
exports.getStatistics = async (req, res) => {
  try {
    let trips = await TripModel.find({ patientRef: req.patientId });
    let cancelledTrips = trips.filter((trip) => {
      return trip.status == "Cancelled";
    });
    let completedTrips = trips.filter((trip) => {
      return trip.status == "Completed";
    });
    console.log("My Trips", trips);
    console.log("Completed Trips", completedTrips);
    let completionRate = (completedTrips.length * 100) / trips.length;
    res.json({
      success: true,
      totalTrips: trips.length,
      cancelledTrips: cancelledTrips.length,
      completionRate,
    });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.getPatientsByDate = async (req, res) => {
  let date = req.params.date;
  try {
    const limit = parseInt(req.query.limit) || 25; // Number of records per page, default to 25
    const page = parseInt(req.query.page) || 1; // Page number, default to 1

    // Set the start and end of the day based on the date provided
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Find patients created on the given date, filter by the logged-in user
    let patients = await PatientModel.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      addedBy: req.userId,
    })
      .limit(limit) // Limit the number of patients per page
      .skip((page - 1) * limit); // Skip patients based on the page number

    // Count the total number of patients matching the query without pagination
    const totalPatients = await PatientModel.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      addedBy: req.userId,
    });

    const totalPages = Math.ceil(totalPatients / limit); // Calculate total pages

    // Return response with pagination info
    res.json({
      success: true,
      patients, // Patients for the current page
      totalPatients, // Total patients count matching the query
      totalPages, // Total number of pages
      currentPage: page, // Current page number
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.getFilteredPatients = async (req, res) => {
  const { filter } = req.params;
  let startDate;
  let endDate = moment().endOf("day").toDate(); // End of the current day

  if (filter === "today") {
    startDate = moment().startOf("day").toDate(); // Start of the current day
  } else if (filter === "week") {
    startDate = moment().subtract(7, "days").startOf("day").toDate(); // 7 days ago
  } else if (filter === "month") {
    startDate = moment().subtract(30, "days").startOf("day").toDate(); // 30 days ago
  } else {
    return res.status(400).json({ error: "Invalid filter type" });
  }

  try {
    let filteredPatients = await PatientModel.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });
    filteredPatients = filteredPatients.filter((patient) => {
      return patient.addedBy == req.userId;
    });
    res.json(filteredPatients);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
exports.changePassword = async (req, res) => {
  const { oldPassword, EMailAddress, newPassword } = req.body;
  console.log("Changing Patient Password");
  console.log(req.body);
  try {
    let patient = await PatientModel.findOne({ EMailAddress });
    console.log("Patient Found", patient);
    if (!patient) {
      res.json({ success: false, message: "Not Found!" });
    } else {
      let isMatched = await bcrypt.compare(oldPassword, patient.password);
      if (isMatched) {
        console.log("Has Matched Patient Password");
        let salt = await bcrypt.genSalt(10);
        let hashedPassword = await bcrypt.hash(newPassword, salt);
        patient.password = hashedPassword;
        await patient.save();
        res.json({ success: true });
      } else {
        res.json({ success: false, message: "InCorrect Old Password" });
      }
    }
  } catch (e) {
    res.json({ success: false });
  }
};
exports.getMyTrips = async (req, res) => {
  try {
    let allTrips = await TripModel.find();
    let MyTrips = allTrips.filter((trip) => {
      return trip.patientRef == req.patientId;
    });
    console.log(allTrips);
    res.json({ success: true, MyTrips });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.login = async (req, res) => {
  try {
    let patients = await PatientModel.find();
    console.log("All Patients", patients);
    let patient = await PatientModel.findOne({
      EMailAddress: req.body.EMailAddress,
    });
    console.log("Patient Found!", patient);
    console.log(req.body);
    if (!patient) {
      res.json({ success: false, message: "Patient Not Found!" });
    } else {
      let isMatched = await bcrypt.compare(req.body.password, patient.password);
      console.log("Matching Password", isMatched);
      const admin = await Admin.findOne({
        companyCode: patient.companyCode ? patient.companyCode : "CompanyCode",
      });
      if (isMatched) {
        const admin = await Admin.findOne({ companyCode: patient.companyCode });
        const token = jwt.sign(
          {
            id: patient._id,
            role: "Patient",
            admin: admin
              ? admin
              : { _id: "AdminId", firstName: "Wahab", lastName: "Mazhar" },
          },
          JWT_SECRET,
          {
            expiresIn: "6d",
          }
        );
        res.json({
          success: true,
          patient,
          token,
          admin: admin
            ? admin
            : { _id: "AdminId", firstName: "Wahab", lastName: "Mazhar" },
        });
      } else {
        res.json({ success: false, message: "Incorrect Password" });
      }
    }
  } catch (e) {
    res.json({ success: false });
  }
};
exports.signUp = async (req, res) => {
  const allAdmins = await Admin.find();
  const {
    firstName,
    lastName,
    EMailAddress,
    phoneNumber,
    location,
    password,
    companyCode,
    gender,
    age,
  } = req.body;
  let foundAdmins = allAdmins.filter((admin) => {
    return admin.companyCode == companyCode;
  });
  console.log("Sign up  for patient");
  console.log("file Path", req.files);
  let profilePhotoUrl = "";
  let signatureUrl =
    req.files && req.files.signature
      ? "https://api.triphog.net/" + req.files.signature[0].path
      : "https://tse2.mm.bing.net/th?id=OIP.NFarNt0hAOdooIWgaScQ2QHaHa&pid=Api&P=0&h=220";
  if (req.files && req.files.profilePhoto) {
    profilePhotoUrl =
      "https://api.triphog.net/" + req.files.profilePhoto[0].path;
  } else {
    profilePhotoUrl =
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6THPf2g9_WpHppDKnduSodFwztd-apK7DxA&s";
  }

  console.log(signatureUrl);
  console.log(profilePhotoUrl);

  console.log("Found Admins", foundAdmins);

  console.log("Patient Data For Sign UP", req.body);

  // Validate input (you might want to add more validation)
  if (!firstName || !lastName || !EMailAddress || !password) {
    console.log("Error While Adding Patient");
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check if user already exists
    const existingPatient = await PatientModel.findOne({ EMailAddress });
    if (existingPatient) {
      return res.status(400).json({ error: "Email already in use" });
    }
    let salt = await bcrypt.genSalt(10);

    // Encrypt the password
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new patient
    const newPatient = new PatientModel({
      firstName,
      lastName,
      EMailAddress,
      phoneNumber: phoneNumber ? phoneNumber : "",
      location: location ? location : "",
      password: hashedPassword,
      companyCode: companyCode ? companyCode : "",
      gender,
      age,
      signatureUrl,
      profilePhotoUrl,
    });

    // Save the patient to the database
    await newPatient.save();

    res
      .status(201)
      .json({ message: "Patient registered successfully", newPatient });
  } catch (error) {
    console.error("Error registering patient:", error);
    res.status(500).json({ error: "Server error", message: error.message });
  }
};
exports.addPatient = async (req, res) => {
  console.log(req.body);
  let admin = await Admin.findOne({ _id: req.userId });
  console.log("Admin", admin);
  try {
    req.body.addedBy = req.userId;
    if (req.files) {
      if (req.files.profilePhoto) {
        req.body.profilePhotoUrl =
          "https://api.triphog.net/" + req.files.profilePhoto[0].path;
      } else {
        req.body.profilePhotoUrl =
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6THPf2g9_WpHppDKnduSodFwztd-apK7DxA&s";
      }
      if (req.files.signature) {
        req.body.signatureUrl =
          "https://api.triphog.net/" + req.files.signature[0].path;
      }
    }
    req.body.companyCode = admin.companyCode;
    console.log("Patient Body", req.body);

    let patient = new PatientModel(req.body);
    console.log(patient);
    let token = Math.random().toString() + req.body.EMailAddress;
    patient.token = token;

    let passwordCreationLink = `https://triphog.net/patient/createpassword/${token}`;

    console.log("Password Creation For Patient");

    function replacePlaceholders(template, data) {
      let result = template;
      for (const key in data) {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), data[key]);
      }
      return result;
    }

    // Create a transport
    const transporter = createEmailTransporter();

    // Function to send the email
    async function sendEmail(to, subject, data) {
      // Read the HTML template
      const templatePath = path.join(__dirname, "../templates/template.html");
      const template = fs.readFileSync(templatePath, "utf8");

      // Replace placeholders in the template with actual data
      const htmlContent = replacePlaceholders(template, data);

      // Set up email options
      const mailOptions = {
        from: "admin@triphog.com",
        to: to,
        subject: subject,
        html: htmlContent,
      };

      // Send the email
      try {
        console.log("Sending Mail");
        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
      } catch (error) {
        console.error("Error sending email:", error);
      }
    }

    // Usage example
    const recipientEmail = patient.EMailAddress;
    const emailSubject = "Welcome to TripHog!";
    const emailData = {
      name: patient.firstName + " " + patient.lastName,
      passwordCreationLink: passwordCreationLink,
    };

    sendEmail(recipientEmail, emailSubject, emailData);

    await patient.save();
    res.json({ success: true, patient });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.createPassword = async (req, res) => {
  console.log("YourPassword", req.body.password);
  try {
    let patient = await PatientModel.findOne({ token: req.params.token });
    console.log("Patient", patient);
    if (!patient) {
      console.log("Not found!");
      res.json({ success: false, notFound: true });
    } else {
      console.log("Encrypting Password");
      let salt = await bcrypt.genSalt(10);
      console.log("Salt Value", salt);
      let hashedPassword = await bcrypt.hash(req.body.password, salt);
      console.log("Hashed Password", hashedPassword);
      patient.password = hashedPassword;
      patient.status = "active";
      patient.token = "_sd__sdfd_0%34@_3454545";
      await patient.save();
      let _patient = await PatientModel.findById(patient._id);
      console.log(_patient);
      res.json({ success: true });
    }
  } catch (error) {
    res.json({ success: false });
  }
};
exports.getPatients = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25; // Number of records per page, default to 25
    const page = parseInt(req.query.page) || 1; // Page number, default to 1
    const filter = req.query.filter || "all time"; // Filter, default to "all time"
    const timezone = req.query.timezone || "UTC";

    // Find the current admin based on the logged-in user ID
    let admin = await Admin.findOne({ _id: req.userId });
    if (Object.keys(req.query).length == 0) {
      let patients = await PatientModel.find({
        $or: [
          { addedBy: req.userId }, // Filter by patients added by the current user
          { companyCode: admin.companyCode }, // Filter by companyCode
        ],
      });
      res.json({ success: true, patients });
    } else {
      // Date filtering logic
      let dateFilter = {}; // Default to an empty object, no date filter for "all time"

      if (filter !== "all") {
        const now = DateTime.now().setZone(timezone);

        switch (filter) {
          case "today":
            dateFilter.createdAt = {
              $gte: now.startOf("day").toUTC().toJSDate(),
              $lte: now.endOf("day").toUTC().toJSDate(),
            };
            break;

          case "weekly":
            dateFilter.createdAt = {
              $gte: now.startOf("week").toUTC().toJSDate(),
              $lte: now.endOf("week").toUTC().toJSDate(),
            };
            break;

          case "monthly":
            dateFilter.createdAt = {
              $gte: now.startOf("month").toUTC().toJSDate(),
              $lte: now.endOf("month").toUTC().toJSDate(),
            };
            break;

          case "all time":
            // No date filter needed
            break;

          default:
            return res.status(400).json({
              success: false,
              message:
                "Invalid filter type. Use 'today', 'weekly', 'monthly', or 'all time'",
            });
        }
      }

      // Fetch patients, apply filters for user/companyCode and the createdAt date filter
      let patients = await PatientModel.find({
        $and: [
          {
            $or: [
              { addedBy: req.userId }, // Filter by patients added by the current user
              { companyCode: admin.companyCode }, // Filter by companyCode
            ],
          },
          dateFilter, // Apply the date filter based on the selected filter
        ],
      })
        .limit(limit) // Limit the number of results based on the page size
        .skip((page - 1) * limit); // Skip the records according to the page

      // Count the total number of patients that match the filter, without pagination
      const totalPatients = await PatientModel.countDocuments({
        $and: [
          {
            $or: [
              { addedBy: req.userId }, // Filter by patients added by the current user
              { companyCode: admin.companyCode }, // Filter by companyCode
            ],
          },
          dateFilter, // Apply the date filter for total count
        ],
      });

      const totalPages = Math.ceil(totalPatients / limit); // Calculate total pages

      // Return the response with the patients and pagination details
      res.json({
        success: true,
        patients, // Patients for the current page
        currentPage: page, // Current page number
        totalPatients, // Total number of patients that match the filters
        totalPages, // Total number of pages based on the limit
      });
    }
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.getPatient = async (req, res) => {
  try {
    let patient = await PatientModel.findById(req.params.Id);
    res.json({ success: true, patient });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.updatePatient = async (req, res) => {
  try {
    if (req.files) {
      if (req.files.signature) {
        req.body.signatureUrl =
          "https://api.triphog.net/" + req.files.signature[0].path;
      }
      if (req.files.profilePhoto) {
        req.body.profilePhotoUrl =
          "https://api.triphog.net/" + req.files.profilePhoto[0].path;
      }
    }
    const updatedPatient = await PatientModel.findByIdAndUpdate(
      req.params.Id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({ success: true, updatedPatient });
  } catch (error) {
    res.json({ success: false });
  }
};
exports.deletePatient = async (req, res) => {
  console.log("Deleting Patient By id");
  try {
    await PatientModel.findByIdAndDelete(req.params.Id);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
};

exports.getPatientStats = async (req, res) => {
  try {
    const { timezone = "UTC" } = req.query;
    const userId = req.userId; // From auth middleware

    // Validate timezone
    if (!Intl.supportedValuesOf("timeZone").includes(timezone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid timezone provided",
      });
    }

    // Get today's date range in the specified timezone
    const now = new Date();
    const todayStart = new Date(
      now.toLocaleString("en-US", { timeZone: timezone })
    );
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    // Convert to UTC for database query
    const utcTodayStart = new Date(todayStart.toISOString());
    const utcTodayEnd = new Date(todayEnd.toISOString());

    // Get all counts in parallel
    const [
      totalPatients,
      repeatedPatients,
      todaysBookings,
      todaysCancellations,
    ] = await Promise.all([
      // Total patients count (only for this user, no time filter)
      PatientModel.countDocuments({ addedBy: userId }),

      // Repeated patients (only for this user, no time filter)
      PatientModel.aggregate([
        {
          $match: { addedBy: userId },
        },
        {
          $lookup: {
            from: "trips",
            localField: "_id",
            foreignField: "patientRef",
            as: "trips",
          },
        },
        {
          $match: {
            "trips.1": { $exists: true }, // At least 2 trips
            "trips.addedBy": userId, // Ensure trips belong to this user
          },
        },
        { $count: "count" },
      ]),

      // Today's bookings (time-based)
      TripModel.countDocuments({
        addedBy: userId,
        createdAt: { $gte: utcTodayStart, $lte: utcTodayEnd },
        status: { $nin: ["Cancelled"] },
      }),

      // Today's cancellations (time-based)
      TripModel.countDocuments({
        addedBy: userId,
        createdAt: { $gte: utcTodayStart, $lte: utcTodayEnd },
        status: "Cancelled",
      }),
    ]);

    res.json({
      success: true,
      stats: {
        totalPatients,
        repeatedPatients: repeatedPatients[0]?.count || 0,
        todaysBookings,
        todaysCancellations,
        timezoneUsed: timezone,
        dateRange: {
          start: todayStart.toISOString(),
          end: todayEnd.toISOString(),
        },
      },
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};