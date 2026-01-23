const { default: mongoose } = require("mongoose");
const DriverModel = require("../models/DriverModel");
const fs = require("fs");
const path = require("path");
const Admin = require("../models/adminSchema");
const TripModel = require("../models/TripModel");
const nodemailer = require("nodemailer");
const { createEmailTransporter } = require("../utils/emailConfig");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { DateTime } = require("luxon");
const JWT_SECRET = "sdfd345ef_dfdf";
const jwt = require("jsonwebtoken");
exports.addDoc = async (req, res) => {
  console.log("ADDING Document");
  console.log(req.file);
  console.log("REQ PARAMS", req.params);
  console.log("REQ BODY", req.body);
  try {
    let driver = await DriverModel.findOne({ _id: req.params.driverId });
    let docUrl = "https://api.triphog.net/" + req.file.path;
    if (driver) {
      let _docs = driver.docs;
      let doc = {
        url: docUrl,
        title: req.file.originalname,
        type: req.body.documentType || "Other",
        Id: Math.random().toString(),
        uploadedAt: new Date(),
      };
      _docs = _docs.concat(doc);
      console.log("Docs", _docs);
      await DriverModel.findByIdAndUpdate(
        req.params.driverId,
        { docs: _docs },
        { new: true, runValidators: true }
      );
      res.json({ success: true, doc });
    } else {
      res.json({ success: false });
    }
  } catch (e) {
    console.log("ERROR WHILE ADDING DOC", e.message);
    res.json({ success: false });
  }
};
exports.deleteDoc = async (req, res) => {
  try {
    let driver = await DriverModel.findOne({ _id: req.params.driverId });
    if (driver) {
      console.log("Deleting Doc With Id", req.params.docId);

      let _docs = driver.docs;
      _docs = _docs.filter((doc) => {
        return doc.Id != req.params.docId;
      });
      console.log("Latest Docs After Deleting", _docs);
      await DriverModel.findByIdAndUpdate(
        req.params.driverId,
        { docs: _docs },
        { new: true, runValidators: true }
      );
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.getDocs = async (req, res) => {
  try {
    let driver = await DriverModel.findOne({ _id: req.params.driverId });
    if (driver) {
      let docs = driver.docs;
      res.json({ success: true, docs });
    } else {
      res.json({ success: false });
    }
  } catch (e) {
    res.json({ success: false });
  }
};
exports.deleteSelected = async (req, res) => {
  try {
    await DriverModel.deleteMany({ _id: { $in: req.body.selectedDriversIds } });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.forgotPassword = async (req, res) => {
  let EMailAddress = req.body.EMailAddress;
  console.log("Forgot Password Implementation");
  try {
    let driver = await DriverModel.findOne({ EMailAddress: EMailAddress });
    console.log("Admin", driver);
    if (!driver) {
      res.json({ success: false, message: "Driver Not Found" });
    } else {
      const transport = createEmailTransporter();
      const token = crypto.randomBytes(20).toString("hex");

      driver.passwordResetToken = token;

      await driver.save(); //updating admin token and expire time

      const resetURL = `https://triphog.net/driver/reset-password/${token}`;
      const message = `Click on the link to reset your password will be expired  after 1 hour: ${resetURL}`;
      await transport.sendMail({
        from: "admin@triphog.com",
        to: driver.EMailAddress,
        subject: "Reset Your Driver Password",
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
    const driver = await DriverModel.findOne({
      passwordResetToken: req.params.token,
    });
    console.log("Driver", driver);

    if (!driver) {
      return res.json({ success: false, message: "Driver Not Found" });
    }
    console.log("password to set", req.body.password);
    const salt = await bcrypt.genSalt(10);
    console.log("Admin Updated Encrypted PassWord");
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    driver.password = hashedPassword;
    driver.passwordResetToken = undefined;

    await driver.save();

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
exports.getProfileStatistics = async (req, res) => {
  try {
    let totalTrips = await TripModel.find({ driverRef: req.params.driverId });
    let completedTrips = totalTrips.filter((trip) => {
      return trip.status == "Completed";
    });
    let cancelledTrips = totalTrips.filter((trip) => {
      return trip.status == "Cancelled";
    });
    let nonResponsiveTrips = totalTrips.filter((trip) => {
      return trip.status == "Non Responsive";
    });
    let noShowTrips = totalTrips.filter((trip) => {
      return trip.status == "No Show";
    });
    res.json({
      success: true,
      completedTrips: completedTrips.length,
      totalTrips: totalTrips.length,
      cancelledTrips: cancelledTrips.length,
      nonResponsiveTrips: nonResponsiveTrips.length,
      noShowTrips: noShowTrips.length,
    });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.getStatistics = async (req, res) => {
  try {
    const now = new Date();
    let allTrips = await TripModel.find();

    let startDate = new Date(now.setHours(0, 0, 0, 0));
    let todayTrips = await TripModel.find({ createdAt: { $gte: startDate } });

    startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    let weeklyTrips = await TripModel.find({ createdAt: { $gte: startDate } });

    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    let monthlyTrips = await TripModel.find({ createdAt: { $gte: startDate } });

    let MyTrips = allTrips.filter((trip) => trip.driverRef == req.driverId);
    let completedTrips = MyTrips.filter((trip) => trip.status == "Completed");
    let cancelledTrips = MyTrips.filter((trip) => trip.status == "Cancelled");

    let hoursDriven = completedTrips.reduce(
      (total, trip) => total + trip.timeTaken,
      0
    );

    let allTimeMileage = 0;
    for (let trip of completedTrips) {
      allTimeMileage = allTimeMileage + Number(trip.mileage);
    }

    let MyWeeklyTrips = weeklyTrips.filter(
      (trip) => trip.driverRef == req.driverId
    );
    let weeklyCompletedTrips = MyWeeklyTrips.filter(
      (trip) => trip.status == "Completed"
    );
    let weeklyCancelledTrips = MyWeeklyTrips.filter(
      (trip) => trip.status == "Cancelled"
    );

    let weeklyHoursDriven = weeklyCompletedTrips.reduce(
      (total, trip) => total + trip.timeTaken,
      0
    );
    let weeklyMileage = 0;
    for (let trip of weeklyCompletedTrips) {
      weeklyMileage = weeklyMileage + Number(trip.mileage);
    }

    let MyMonthlyTrips = monthlyTrips.filter(
      (trip) => trip.driverRef == req.driverId
    );
    let monthlyCompletedTrips = MyMonthlyTrips.filter(
      (trip) => trip.status == "Completed"
    );
    let monthlyCancelledTrips = MyMonthlyTrips.filter(
      (trip) => trip.status == "Cancelled"
    );
    let monthlyMileage = 0;

    for (let trip of monthlyCompletedTrips) {
      monthlyMileage = monthlyMileage + Number(trip.mileage);
    }

    let monthlyHoursDriven = monthlyCompletedTrips.reduce(
      (total, trip) => total + trip.timeTaken,
      0
    );

    let MyTodaysTrips = todayTrips.filter(
      (trip) => trip.driverRef == req.driverId
    );
    let todaysCompletedTrips = MyTodaysTrips.filter(
      (trip) => trip.status == "Completed"
    );
    let todaysCancelledTrips = MyTodaysTrips.filter(
      (trip) => trip.status == "Cancelled"
    );

    let todaysHoursDriven = todaysCompletedTrips.reduce(
      (total, trip) => total + trip.timeTaken,
      0
    );
    let todaysMileage = 0;
    for (let trip of todaysCompletedTrips) {
      todaysMileage = todaysMileage + Number(trip.mileage);
    }

    console.log("Getting Driver Statistics");
    console.log("All Time Mileage", allTimeMileage);
    console.log("Monlthy Mileage", monthlyMileage);
    res.json({
      success: true,
      all: {
        myTrips: MyTrips.length,
        completedTrips: completedTrips.length,
        cancelledTrips: cancelledTrips.length,
        hoursDriven,
        tripsLeft: MyTrips.length - completedTrips.length,
        mileage: allTimeMileage,
      },
      today: {
        myTrips: MyTodaysTrips.length,
        completedTrips: todaysCompletedTrips.length,
        cancelledTrips: todaysCancelledTrips.length,
        hoursDriven: todaysHoursDriven,
        tripsLeft: MyTodaysTrips.length - todaysCompletedTrips.length,
        mileage: todaysMileage,
      },
      weekly: {
        myTrips: MyWeeklyTrips.length,
        completedTrips: weeklyCompletedTrips.length,
        cancelledTrips: weeklyCancelledTrips.length,
        hoursDriven: weeklyHoursDriven,
        tripsLeft: MyWeeklyTrips.length - weeklyCompletedTrips.length,
        mileage: weeklyMileage,
      },
      monthly: {
        myTrips: MyMonthlyTrips.length,
        completedTrips: monthlyCompletedTrips.length,
        cancelledTrips: monthlyCancelledTrips.length,
        hoursDriven: monthlyHoursDriven,
        tripsLeft: MyMonthlyTrips.length - monthlyCompletedTrips.length,
        mileage: monthlyMileage,
      },
    });
  } catch (e) {
    console.log("Stats Error", e.message);
    res.json({ success: false, message: e.message });
  }
};
const moment = require("moment");
exports.pay = async (req, res) => {
  try {
    let driver = await DriverModel.findById(req.params.driverId);
    if (!driver) {
      res.json({ success: false, message: "Not Driver Found!" });
    } else {
      let paymentHistory = driver.paymentHistory;
      let currentDate = new Date();
      const _date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        0,
        0,
        0
      );

      let _paymentHistory = paymentHistory.concat({
        date: _date,
        amount: req.body.amount,
        status: "Paid",
        type: req.body.type,
      });
      await DriverModel.findByIdAndUpdate(
        req.params.driverId,
        { paymentHistory: _paymentHistory },
        { new: true, runValidators: true }
      );
      res.json({ success: true });
    }
  } catch (e) {
    res.json({ success: false });
  }
};
exports.updateLocation = async (req, res) => {
  try {
    await DriverModel.findByIdAndUpdate(
      req.driverId,
      { longitude: req.body.longitude, latitude: req.body.latitude },
      { new: true, runValidators: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.getDrivenDrivers = async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    console.log(startDate.slice(4, 15));
    let startingDate = new Date(startDate.slice(4, 15));
    let endingDate = new Date(endDate.slice(4, 15));
    console.log("Starting Date", startingDate);
    console.log("Ending Date", endingDate);
    let adminId = req.userId;
    console.log("Admin Id For Getting Drivers", adminId);

    let allTrips = await TripModel.find();
    let allDrivers = await DriverModel.find({ addedBy: adminId });

    let driversWhoDrove = [];

    let drivers = allDrivers.filter((driver) => {
      let driverTrips = allTrips.filter((trip) => {
        return trip.status == "Completed" && trip.driverRef == driver._id;
      });
      console.log("Driver Trips", driverTrips);

      let filteredTrips = driverTrips.filter((trip) => {
        console.log("Is Within Range");
        console.log(
          new Date(trip.completedAt) >= startingDate &&
            new Date(trip.completedAt) <= endingDate
        );
        return (
          new Date(trip.completedAt) >= startingDate &&
          new Date(trip.completedAt) <= endingDate
        );
      });
      console.log("Completed Trips By Driver", filteredTrips);

      if (filteredTrips.length > 0) {
        console.log("Driver Found With Trips", driver);
        if (driver.paymentType == "hourly") {
          console.log("Getting Driven Drivers Whose Type Is Hourly");

          let hoursRidden = 0;
          let amountPaid = 0;
          for (let trip of driverTrips) {
            hoursRidden = hoursRidden + Number(trip.timeTaken);
          }
          for (let payment of driver.paymentHistory) {
            if (payment.type == "hourly") {
              amountPaid += payment.amount;
            }
          }
          console.log("Hours Ridden", hoursRidden);
          console.log("Amount Paid", amountPaid);
          const Driver = { ...driver.toObject(), hoursRidden, amountPaid };

          console.log("Driver", Driver);
          driversWhoDrove.push(Driver);
          return driver;
        } else if (driver.paymentType == "mileage") {
          console.log("Getting Driven Drivers Whose Payment Type Is Mileage");

          let milesDriven = 0;
          console.log("Miles Driven", milesDriven);
          let amountPaid = 0;
          for (let trip of driverTrips) {
            if (trip.mileage && isNaN(trip.mileage) == false) {
              console.log("Adding To Miles", trip.mileage);

              milesDriven = milesDriven + Number(trip.mileage);
              console.log("Miles Driven ADding ", milesDriven);
            }
          }
          for (let payment of driver.paymentHistory) {
            if (payment.type == "mileage") {
              amountPaid += payment.amount;
            }
          }
          console.log("Miles Driven", milesDriven);
          console.log("Amount Paid", amountPaid);
          const Driver = { ...driver.toObject(), milesDriven, amountPaid };

          console.log("Driver Added Whose Payment Type Is Mileage", Driver);
          driversWhoDrove.push(Driver);
          return driver;
        } else if (driver.paymentType == "direct") {
          console.log("Getting driver with direct pay payment type");
          driversWhoDrove.push(driver);
          return driver;
        }
      }
      return false; // Ensure this driver is skipped if no conditions are met
    });

    console.log("Drivers Who Drove", driversWhoDrove);
    console.log("Starting Date", startingDate);
    console.log("Ending Date", endingDate);

    res.json({ success: true, driversWhoDrove });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.getDriversByDate = async (req, res) => {
  let date = req.params.date;
  let limit = parseInt(req.query.limit) || 25; // Default limit to 25 if not provided
  let page = parseInt(req.query.page) || 1; // Default page to 1 if not provided

  try {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Fetch drivers with date filter
    let drivers = await DriverModel.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      addedBy: req.userId, // Filter directly in the query
    })
      .limit(limit) // Limit the number of results
      .skip((page - 1) * limit); // Skip records based on the current page

    // Optionally, you can get the total count for pagination information
    const totalCount = await DriverModel.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      addedBy: req.userId,
    });

    res.json({
      success: true,
      drivers,
      totalCount,
      totalPages: Math.ceil(totalCount / limit), // Calculate total pages
      currentPage: page, // Current page
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
};
exports.getFilteredDrivers = async (req, res) => {
  const { filter } = req.params;
  console.log(filter);
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
    let filteredDrivers = await DriverModel.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });
    console.log("Filtered Drivers", filteredDrivers);
    filteredDrivers = filteredDrivers.filter((driver) => {
      return driver.addedBy == req.userId;
    });
    console.log("Filtered Drivers For Admin", filteredDrivers);

    res.json(filteredDrivers);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  console.log("Changing Driver Password");
  console.log(req.body);
  try {
    let driver = await DriverModel.findOne({ EMailAddress: req.EMailAddress });
    console.log("Driver Found", driver);
    if (!driver) {
      res.json({ success: false, message: "Not Found!" });
    } else {
      let isMatched = await bcrypt.compare(oldPassword, driver.password);
      if (isMatched) {
        console.log("Has Matched Driver Password");
        let salt = await bcrypt.genSalt(10);
        let hashedPassword = await bcrypt.hash(newPassword, salt);
        driver.password = hashedPassword;
        await driver.save();
        res.json({ success: true });
      } else {
        res.json({ success: false, message: "InCorrect Old Password" });
      }
    }
  } catch (e) {
    res.json({ success: false });
  }
};

exports.login = async (req, res) => {
  try {
    const transport = createEmailTransporter();

    console.log(">>REQ BODY", req.body);
    let driver = await DriverModel.findOne({
      EMailAddress: req.body.email,
    });
    let isApproved = false;
    if (driver) {
      isApproved = driver.isApproved;
    }
    console.log("Patient Found!", driver);
    if (!driver) {
      res.json({ success: false, message: "Driver Not Found!" });
    } else {
      let isMatched = await bcrypt.compare(req.body.password, driver.password);
      console.log("Matching Password", isMatched);
      if (isMatched) {
        let admin = await Admin.findOne({ _id: driver.addedBy });
        const token = jwt.sign(
          {
            id: driver._id,
            role: "Driver",
            EMailAddress: driver.EMailAddress,
            admin,
          },
          JWT_SECRET,
          {
            expiresIn: "6d",
          }
        );
        if (isApproved) {
          let admin = await Admin.findOne({ _id: driver.addedBy });
          res.json({ success: true, driver, token, admin });
        } else {
          res.json({ success: false, message: "You Are Not Approved!" });
        }
      } else {
        res.json({ success: false, message: "Incorrect Password" });
      }
    }
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.getAvailableDrivers = async (req, res) => {
  const parseTime = (date, time) => {
    const [hours, minutes] = time.split(":").map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  };
  const { pickUpDate, pickUpTime, appointmentTime } = req.query;

  const pickUpDateTime = parseTime(pickUpDate, pickUpTime);
  const appointmentDateTime = parseTime(pickUpDate, appointmentTime);

  try {
    // Fetch all drivers
    const drivers = await DriverModel.find();
    const availableDrivers = [];

    for (const driver of drivers) {
      const overlappingTrips = await TripModel.find({
        driverRef: driver._id,
        pickUpDate: pickUpDate,
        $or: [
          {
            pickUpTime: { $lt: appointmentTime, $gt: pickUpTime },
          },
          {
            appointmentTime: { $lt: appointmentTime, $gt: pickUpTime },
          },
        ],
      });

      if (overlappingTrips.length === 0) {
        availableDrivers.push(driver);
      }
    }

    res.status(200).json(availableDrivers);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
exports.getUpcomingTrips = async (req, res) => {
  const handleCombine = (time, date) => {
    const [hours, minutes] = time.split(":").map(Number);
    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);

    return combinedDate;
  };

  try {
    let allTrips = await TripModel.find();
    let MyTrips = allTrips.filter((trip) => {
      return (
        trip.status != "Completed" &&
        trip.driverRef == req.driverId &&
        trip.status != "Cancelled"
      );
    });
    console.log(MyTrips);
    let upcomingTrips = MyTrips.sort((t1, t2) => {
      let d1 = handleCombine(t1.pickUpTime, t1.pickUpDate);
      let d2 = handleCombine(t2.pickUpTime, t2.pickUpDate);
      if (d1 < d2) {
        return -1;
      } else {
        return 1;
      }
    });
    console.log("Upcoming Trips", upcomingTrips);
    res.json({ success: true, upcomingTrips });
  } catch (error) {
    res.json({ success: false });
  }
};
exports.getCancelledTrips = async (req, res) => {
  try {
    console.log("Getting Cancelled Trips");
    let allTrips = await TripModel.find();
    console.log(req.driverId);
    let cancelledTrips = allTrips.filter((trip) => {
      return trip.status == "Cancelled" && trip.driverRef == req.driverId;
    });
    res.json({ success: true, cancelledTrips, driverId: req.driverId });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.getMyTrips = async (req, res) => {
  try {
    console.log("Geting DRiver Trips");
    console.log("Driver Trips are being fetched!");
    let allTrips = await TripModel.find();
    let MyTrips = allTrips.filter((trip) => {
      return trip.driverRef == req.driverId;
    });
    console.log(allTrips);
    res.json({ success: true, MyTrips });
  } catch (e) {
    res.json({ success: false });
  }
};

// Add new Driver API Fixed
exports.addNewDriver = async (req, res) => {
  if (req.files.profilePhoto && req.files.profilePhoto[0]) {
    req.body.profilePhotoUrl =
      "https://api.triphog.net/" + req.files.profilePhoto[0].filename;
  } else {
    req.body.profilePhotoUrl =
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyNAzESlk0ZBEa2byO_j3-gEm62VGNdlaz5A&s";
  }

  if (req.files.signature && req.files.signature[0]) {
    req.body.signatureUrl =
      "https://api.triphog.net/" + req.files.signature[0].filename;
  }

  if (req.files.liscense && req.files.liscense[0]) {
    req.body.licenseUrl =
      "https://api.triphog.net/" + req.files.liscense[0].filename;
  }

  if (req.files.IDCard && req.files.IDCard[0]) {
    req.body.IDCardUrl =
      "https://api.triphog.net/" + req.files.IDCard[0].filename;
  }

  try {
    let driver = new DriverModel({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      hourlyPay: Number(req.body.hourlyPay),
      EMailAddress: req.body.EMailAddress,
      phoneNumber: req.body.phoneNumber,
      location: req.body.location,
      vehicleName: req.body.vehicleName,
      gender: req.body.gender,
      addedBy: req.userId,
      IDCardUrl: req.body.IDCardUrl,
      licenseUrl: req.body.licenseUrl,
      profilePhotoUrl: req.body.profilePhotoUrl,
      signatureUrl: req.body.signatureUrl,
      paymentType: req.body.paymentType,
      payPerMile: req.body.payPerMile,
    });
    console.log(driver);
    let token = Math.random().toString() + req.body.EMailAddress;
    driver.token = token;
    const passwordCreationLink = `https://triphog.net/driver/createpassword/${token}`;

    console.log("Sending Link To Driver For Password Creation", driver);
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
        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
      } catch (error) {
        console.error("Error sending email:", error);
      }
    }

    // Usage example
    const recipientEmail = req.body.EMailAddress;
    const emailSubject = "Welcome to TripHog!";
    const emailData = {
      name: driver.firstName + " " + driver.lastName,
      passwordCreationLink: passwordCreationLink,
    };

    sendEmail(recipientEmail, emailSubject, emailData);

    //  const transport=  nodemailer.createTransport({
    //     service:"gmail",
    //     secure: true,
    //     port: 465,
    //     auth:{
    //       user: "contact.alinventors@gmail.com",
    //       pass: "sxmp lxuv jckd savw",
    //     }
    //   })
    //  await transport.sendMail({
    //   from: "admin@triphog.com",
    //   to: driver.EMailAddress,
    //   subject: "Create your password",
    //   text: message,
    //  });
    await driver.save();
    console.log(driver);
    res.json({ success: true, driver });
  } catch (e) {
    console.log(e);
    console.log("Error While Adding Drivers");
    res.json({ success: false, message: e.message });
  }
};
exports.createPassword = async (req, res) => {
  console.log("YourPassword", req.body.password);
  try {
    let driver = await DriverModel.findOne({ token: req.params.token });
    console.log("Driver", driver);
    if (!driver) {
      console.log("Not found!");
      res.json({ success: false, notFound: true });
    } else {
      console.log("Encrypting Password");
      let salt = await bcrypt.genSalt(10);
      console.log("Salt Value", salt);
      let hashedPassword = await bcrypt.hash(req.body.password, salt);
      console.log("Hashed Password", hashedPassword);
      driver.password = hashedPassword;
      driver.status = "active";
      driver.token = "_sd__sdfd_0%34@_3454545";
      await driver.save();
      let _driver = await DriverModel.findById(driver._id);
      console.log(_driver);
      res.json({ success: true });
    }
  } catch (error) {
    res.json({ success: false });
  }
};

exports.getDrivers = async (req, res) => {
  console.log("Getting Drivers");

  try {
    // Get query parameters with defaults
    const limit = parseInt(req.query.limit) || 25;
    const page = parseInt(req.query.page) || 1;
    const filter = req.query.filter?.toLowerCase() || "all";
    const timezone = req.query.timezone || "UTC";

    // Calculate pagination values
    const skip = (page - 1) * limit;

    // Initialize filter query with user ID
    const filterQuery = { addedBy: req.userId };

    // Apply date filters based on the selected filter type
    if (filter !== "all") {
      const now = DateTime.now().setZone(timezone);

      switch (filter) {
        case "today":
          filterQuery.createdAt = {
            $gte: now.startOf("day").toUTC().toJSDate(),
            $lte: now.endOf("day").toUTC().toJSDate(),
          };
          break;

        case "weekly":
          filterQuery.createdAt = {
            $gte: now.startOf("week").toUTC().toJSDate(),
            $lte: now.endOf("week").toUTC().toJSDate(),
          };
          break;

        case "monthly":
          filterQuery.createdAt = {
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

    // Fetch drivers with pagination
    const [drivers, totalDrivers] = await Promise.all([
      DriverModel.find(filterQuery).limit(limit).skip(skip),
      DriverModel.countDocuments(filterQuery),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalDrivers / limit);

    // Send response
    res.json({
      success: true,
      drivers,
      pagination: {
        totalPages,
        totalDrivers,
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (e) {
    console.error("Error fetching drivers:", e);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? e.message : undefined,
    });
  }
};
exports.getDriver = async (req, res) => {
  console.log("Getting Driver");
  try {
    console.log("Getting Single Driver");
    let driver = await DriverModel.findById(req.params.Id);
    console.log(driver);
    res.json({ success: true, driver });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.deleteDriver = async (req, res) => {
  try {
    await DriverModel.deleteOne({ _id: req.params.Id });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.updateDriver = async (req, res) => {
  if (req.files) {
    if (req.files.signature) {
      req.body.signatureUrl ==
        "https://api.triphog.net/" + req.files.signature[0].path;
    }
    if (req.files.profilePhoto) {
      console.log("Updating Driver Profile Photo", req.files.profilePhoto);
      req.body.profilePhotoUrl =
        "https://api.triphog.net/" + req.files.profilePhoto[0].path;
    }
    if (req.files.liscense) {
      req.body.licenseUrl =
        "https://api.triphog.net/" + req.files.liscense[0].path;
    }
    if (req.files.IDCard) {
      req.body.IDCardUrl =
        "https://api.triphog.net/" + req.files.IDCard[0].path;
    }
  }
  console.log("Updating Driver");
  console.log("Pay Per Mile Of Driver Is", req.body.payPerMile);
  try {
    const updatedDriver = await DriverModel.findByIdAndUpdate(
      req.params.Id,
      req.body,
      { new: true, runValidators: true } // Options: new returns the updated document, runValidators ensures the update adheres to schema validation
    );
    console.log(updatedDriver);
    res.json({ success: true, updatedDriver });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};

exports.getDriverStats = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const timezone = req.query.timezone || "UTC";

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

    // First get all drivers assigned to trips today
    const todaysActiveDrivers = await TripModel.aggregate([
      {
        $match: {
          addedBy: userId,
          $or: [
            { status: "Assigned" },
            { status: "On Route" },
            { status: "In Progress" },
          ],
          createdAt: { $gte: utcTodayStart, $lte: utcTodayEnd },
        },
      },
      {
        $group: {
          _id: "$driverRef",
          count: { $sum: 1 },
        },
      },
    ]);

    const onRouteDriverIds = todaysActiveDrivers.map((driver) => driver._id);

    // Get all counts in parallel
    const [totalDrivers, inactiveDrivers, allAvailableDrivers] =
      await Promise.all([
        // Total drivers count for this user
        DriverModel.countDocuments({ addedBy: userId }),

        // Inactive drivers
        DriverModel.countDocuments({
          addedBy: userId,
          status: "unactive",
        }),

        // All potentially available drivers (not inactive)
        DriverModel.find({
          addedBy: userId,
          status: { $ne: "unactive" },
        }),
      ]);

    // Calculate available drivers (not inactive and not on route today)
    const availableDrivers = allAvailableDrivers.filter(
      (driver) => !onRouteDriverIds.includes(driver._id.toString())
    ).length;

    res.json({
      success: true,
      stats: {
        totalDrivers,
        availableDrivers,
        onRouteDrivers: onRouteDriverIds.length,
        inactiveDrivers,
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
