const TripModel = require('../models/TripModel')
const path = require('path')
const MessageModel = require("../models/MessageModel")
const { getIO, getReceiverSocketId } = require('../io')
const axios = require('axios')
const fs = require('fs')
const xlsx = require('xlsx')
const Admin = require('../models/adminSchema')
const NotificationModel = require('../models/NotificationModel')
const PatientModel = require('../models/PatientModel')
const DriverModel = require('../models/DriverModel')
const moment = require('moment')
const { DateTime } = require("luxon");

exports.deleteSelected = async (req, res) => {
  try {
    console.log("Selected Trips Ids", req.body.selectedTripsIds);
    await TripModel.deleteMany({ _id: { $in: req.body.selectedTripsIds } });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.updateStatus = async (req, res) => {
  try {
    if (req.body.status == "Cancelled") {
      let trip = await TripModel.findOne({ _id: req.params.tripId });
      let driver = await DriverModel.findOne({ _id: trip.driverRef });
      if (trip.patientRef) {
        let notification = new NotificationModel({
          fromId: driver._id,
          toId: trip.patientRef ? trip.patientRef : "randomReference",
          fromPhotoUrl: driver.profilePhotoUrl,
          type: "TripCancelled",
          text: "Cancelled Your Trip",
          from: driver.firstName + driver.lastName,
        });
      }

      let notification2 = new NotificationModel({
        fromId: driver._id,
        toId: trip.addedBy ? trip.addedBy : "Admin",
        fromPhotoUrl: driver.profilePhotoUrl,
        type: "TripCancelled",
        text: "Cancelled Your Trip",
        from: driver.firstName + driver.lastName,
      });
    }
    const updateData = {
      status: req.body.status,
    };
    if (req.body.status == "Completed") {
      let endingAtDate = new Date();
      await TripModel.findByIdAndUpdate(
        req.params.tripId,
        {
          status: "Completed",
          completedAt: endingAtDate,
          timeTaken: 0,
          endedAt: endingAtDate,
        },
        { new: true, runValidators: true }
      );
    } else {
      const updatedTrip = await TripModel.findByIdAndUpdate(
        req.params.tripId,
        { status: req.body.status },
        { new: true, runValidators: true }
      );

      console.log(updatedTrip); // This will log the updated trip object
    }

    res.json({
      success: true,
      message: "Trip marked as completed successfully",
      updatedTrip,
    });
  } catch (e) {
    res.json({ success: false, message: "Internal Server Error!" });
  }
};
exports.addReview = async (req, res) => {
  console.log("Review For Trip Id", req.params.tripId);
  console.log(req.params.tripId);
  try {
    let trip = await TripModel.findById(req.params.tripId);
    if (!trip) {
      res.json({ success: false, message: "Trip Not Found!" });
    } else {
      console.log("Trip Review Data");
      let reviews = trip.reviews;
      let images = [];
      if (req.files) {
        for (let file of req.files) {
          images.push("https://api.triphog.net/uploads/" + file.path);
        }
      }
      reviews = reviews.concat({
        ID: Math.random(),
        addedON: new Date(),
        description: req.body.description,
        rating: Number(req.body.rating),
        images,
      });
      let newtrip = await TripModel.findByIdAndUpdate(
        req.params.tripId,
        { reviews: reviews },
        { new: true, runValidators: true }
      );
      console.log("New Trip Reviews", newtrip.reviews);
      res.json({ success: true });
    }
  } catch (e) {
    res.json({ success: false });
  }
};
exports.deleteTripReview = async (req, res) => {
  console.log("Deleting Trip Review", req.params);
  try {
    let trip = await TripModel.findById(req.params.tripId);
    let reviews = trip.reviews;
    let _reviews = reviews.filter((review) => {
      return review.ID != req.params.reviewId;
    });
    await TripModel.findByIdAndUpdate(
      req.params.tripId,
      { reviews: _reviews },
      { new: true, runValidators: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.cancelTrip = async (req, res) => {
  try {
    await TripModel.findByIdAndUpdate(
      req.params.tripId,
      { status: "Cancelled" },
      { new: true, runValidators: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
};
(exports.startTrip = async (req, res) => {
  try {
    let trip = await TripModel.findById(req.params.tripId);
    if (!trip) {
      res.json({ success: false, message: "Trip Not Found!" });
    } else {
      let date = new Date();
      await TripModel.findByIdAndUpdate(
        req.params.tripId,
        { startedAt: date, status: "On Route" },
        { new: true, runValidators: true }
      );
      await DriverModel.findByIdAndUpdate(
        req.driverId,
        { status: "On Route" },
        { new: true, runValidators: true }
      );
      trip = await TripModel.findById(req.params.tripId);
      console.log("Trip Has Started At", trip.startedAt);

      res.json({ success: true });
    }
  } catch (e) {
    res.json({ success: false });
  }
}),
  (exports.resumeTrip = async (req, res) => {
    try {
      const trip = await TripModel.findById(req.params.tripId);
      trip.pauses.push({ pauseTime: new Date() });
      await trip.save();
      res.json({ success: true });
    } catch (e) {
      res.json({ success: false });
    }
  });
exports.pauseTrip = async (req, res) => {
  try {
    const trip = await TripModel.findById(req.params.tripId);
    const lastPause = trip.pauses[trip.pauses.length - 1];
    if (lastPause && !lastPause.resumeTime) {
      lastPause.resumeTime = new Date();
      await trip.save();
    }
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.addSignature = async (req, res) => {
  try {
    if (!req.file) {
      res.json({ success: false, message: "Signature Is Missing" });
    } else {
      let signatureUrl = "https://api.triphog.net/" + req.file.path;
      await TripModel.findByIdAndUpdate(
        { _id: req.params.tripId },
        { status: "Completed", patientSignatureUrl: signatureUrl },
        { new: true, runValidators: true }
      );
      res.json({ success: true });
    }
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.endTrip = async (req, res) => {
  try {
    let trip = await TripModel.findById(req.params.tripId);
    if (!trip) {
      res.json({ success: false, message: "Trip Not Found!" });
    } else {
      let currentDate = new Date();
      let endingDate = new Date();
      console.log("Trip Started at", trip.startedAt);
      let startingDate = new Date(trip.startedAt);
      let differenceInMilliSeconds = endingDate - startingDate;

      console.log("Milli Seconds", differenceInMilliSeconds);
      let totalPausedTime = 0;

      trip.pauses.forEach((pause) => {
        if (pause.resumeTime) {
          totalPausedTime += pause.resumeTime - pause.pauseTime;
        }
      });

      // Convert milliseconds to hours
      let TOTALPAUSEDTIMEINHOURS = totalPausedTime / (1000 * 60 * 60);
      let hours = differenceInMilliSeconds / 3600000; // Convert milliseconds to hours
      console.log("Time Taken In Hours", hours);
      console.log("Total Paused Time In Hours", TOTALPAUSEDTIMEINHOURS);
      hours = parseFloat(hours.toFixed(2));
      console.log("Time Taken", hours);

      console.log("Time Taken Difference", hours - TOTALPAUSEDTIMEINHOURS);
      if (trip.patientRef) {
        await TripModel.findByIdAndUpdate(req.params.tripId, {
          endedAt: endingDate,
          completedAt: endingDate,
          status: "Completed",
          timeTaken: hours - TOTALPAUSEDTIMEINHOURS,
        });
        await DriverModel.findByIdAndUpdate(req.driverId, {
          status: "Available",
        });
        let Trip = await TripModel.findById(req.params.tripId);
        console.log("Patient Reference", trip.patientRef);
        let socketId = getReceiverSocketId(trip.patientRef);
        console.log(
          "Ending Trip And Notifying Patient With SocketId",
          socketId
        );
        getIO().to(socketId).emit("trip-ended", req.params.tripId);
        res.json({ success: true });
      } else {
        await TripModel.findByIdAndUpdate(req.params.tripId, {
          endedAt: endingDate,
          completedAt: endingDate,
          timeTaken: hours - TOTALPAUSEDTIMEINHOURS,
        });

        res.json({ success: false, isPatientMissing: true });
      }
    }
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.getTripsByDate = async (req, res) => {
  let date = req.params.date;

  try {
    const limit = parseInt(req.query.limit) || 25; // Number of records per page, default is 25
    const page = parseInt(req.query.page) || 1; // Page number, default is 1

    // Start and end of the day
    let startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    let endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    let isPickUpDateSelected = req.query.isPickUpDateSelected == "true";
    let dateField = isPickUpDateSelected ? "pickUpDate" : "createdAt";

    let queryConditions = {
      addedBy: req.userId,
    };

    // If dateField is 'pickUpDate', convert startOfDay and endOfDay to match the format (YYYY/MM/DD).
    if (dateField === "pickUpDate") {
      queryConditions.pickUpDate = date;
    } else {
      // For createdAt (Date range query)
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      queryConditions.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    // Query the database with pagination
    let trips = await TripModel.find(queryConditions)
      .limit(limit) // Limit the results based on the query parameter
      .skip((page - 1) * limit);

    console.log(trips);
    // Get the total number of trips for this day using the same date field
    const totalTrips = await TripModel.countDocuments(queryConditions);

    const totalPages = Math.ceil(totalTrips / limit); // Calculate total number of pages

    res.json({
      success: true,
      trips, // Trips for the current page
      currentPage: page,
      totalTrips, // Total number of trips for this day
      totalPages, // Total number of pages based on the limit
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.getFilteredTrips = async (req, res) => {
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
    let filteredTrips = await TripModel.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });
    filteredTrips = filteredTrips.filter((trip) => {
      return trip.addedBy == req.userId;
    });
    res.json(filteredTrips);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
exports.bookTripsUsingCSV = async (req, res) => {
  // First, delete all trips before processing the new file
  //   await TripModel.deleteMany({});
  let routesFound = 0;
  let routesMissing = 0;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Helper function to normalize phone numbers
  function normalizePhoneNumber(phoneNumber) {
    return phoneNumber ? phoneNumber.toString().replace(/[^\d]/g, "") : "";
  }
  function convertTo24Hour(timeStr) {
    console.log(" TIME STRING", timeStr);
    // Split the time string into components (e.g., "9:30 AM" -> ["9:30", "AM"])
    const [time, modifier] = timeStr.split(" ");

    // Split the time itself into hours and minutes
    let [hours, minutes] = time.split(":");

    // Convert hours to integer
    hours = parseInt(hours, 10);

    // If it's "PM" and hours are less than 12, add 12 to convert to 24-hour format
    if (modifier === "PM" && hours !== 12) {
      hours += 12;
    }

    // If it's "AM" and hours are 12, set it to 0 (midnight in 24-hour format)
    if (modifier === "AM" && hours === 12) {
      hours = 0;
    }

    // Return the formatted time in 24-hour format, padded with leading zeros if needed
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }

  function convertExcelTime(excelTime) {
    if (typeof excelTime === "number") {
      // Convert Excel time (fraction of a day) to a JavaScript date object
      const date = new Date(Math.round((excelTime - 25569) * 86400 * 1000)); // 25569 is the Excel epoch date
      const hours = date.getUTCHours().toString().padStart(2, "0");
      const minutes = date.getUTCMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    // Return the time if it's a string (already formatted like "12:30 AM")
    return excelTime;
  }
  async function geocodeAddress(address) {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${apiKey}`;
    try {
      const response = await axios.get(geocodeUrl);
      if (response.data.results.length > 0) {
        const formattedAddress = response.data.results[0].formatted_address;
        console.log(`Geocoded Address: ${formattedAddress}`);
        return formattedAddress;
      } else {
        console.log(`No geocode results for address: ${address}`);
        return address;
      }
    } catch (error) {
      console.error(`Error during geocoding: ${error}`);
      return address;
    }
  }

  try {
    console.log("ADMIN ID", req.userId);
    const filePath = path.join(__dirname, "..", req.file.path);
    console.log("File Path:", filePath);

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log("Column Count In File", rows[0].length);

    let columnsCount = rows[0].length;

    if (columnsCount == 12) {
      const rows = xlsx.utils.sheet_to_json(sheet);

      for (let row of rows) {
        console.log("Total Rows", rows.length);

        // Normalize phone number before using it
        const phoneNumber = normalizePhoneNumber(row["Member's Phone Number"]);
        console.log("Normalized Phone Number:", phoneNumber);

        let pickUpAddress = await geocodeAddress(row["Pick Up Address"]);
        let dropOffAddress = await geocodeAddress(row["Delivery Address"]);
        console.log("Pick Up Address", pickUpAddress);
        console.log("Delivery Address", dropOffAddress);
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
          `${pickUpAddress}`
        )}&destination=${encodeURIComponent(
          `${dropOffAddress}`
        )}&alternatives=true&key=${apiKey}`; // Added alternatives=true to fetch multiple routes

        console.log("TIME VALUE", row["PREF\\. PICK UP TIME"]);
        console.log("Again Time value", row["PREF\\. PICK UP TIME"]);

        let appoinmentTime =
          row["APPOINMENT TIME"] !== undefined
            ? convertTo24Hour(row["APPOINMENT TIME"])
            : "00:00";
        let pickUpTime =
          row["PREF. PICK UP TIME"] !== "B LEG WILL CALL" &&
            row["PREF. PICK UP TIME"] !== "C LEG WILL CALL"
            ? convertTo24Hour(row["PREF. PICK UP TIME"])
            : "00:00";

        try {
          const response = await axios.get(url);
          const routes = response.data.routes; // Retrieve all routes

          console.log("Routes For Trip", routes);

          // Check if routes are available
          if (routes && routes.length > 0) {
            // Find the first route with valid legs
            const validRoute = routes.find(
              (route) => route.legs && route.legs.length > 0
            );

            // If a valid route is found, use it
            if (validRoute) {
              console.log("Valid Route Legs");
              req.body.possibleRoutes = routes[0].legs;
              req.body.mileage = Number(
                routes[0].legs[0].distance.text.toString().split(" ")[0]
              );

              routesFound++;
            } else {
              // If no valid routes, but we have routes available, we can choose the first one as an alternative
              req.body.possibleRoutes = routes[0].legs || [];
              req.body.mileage = Number(
                routes[0].legs[0].distance.text.toString().split(" ")[0]
              );

              routesFound++;
            }
          } else {
            req.body.possibleRoutes = [];
            routesMissing++;
          }
        } catch (err) {
          console.log("Error fetching route:", err);
          req.body.possibleRoutes = [];
          routesMissing++;
        }

        // Search the database using the normalized phone number

        console.log("TRIP CAN BE ADDED");

        function convertExcelDate(excelSerialDate) {
          const offset = 25567;
          const millisecondsInADay = 24 * 60 * 60 * 1000;
          const formattedDate = new Date(
            (excelSerialDate - offset) * millisecondsInADay
          );
          return formattedDate.toLocaleDateString("en-US");
        }

        const newTrip = new TripModel({
          patientName: row["FULL NAME"],
          patientPhoneNumber: phoneNumber,
          possibleRoutes: req.body.possibleRoutes,
          pickUpAddress: row["Pick Up Address"],
          dropOffAddress: row["Delivery Address"],
          patientType: row["Passenger Type"],
          confirmation: row["Confirmation"],
          legId: row["LEG ID"],
          pickUpDate: row["Pick Up Date"]
            ? convertExcelDate(row["Pick Up Date"])
            : "",
          pickUpTime: pickUpTime,
          appointmentTime: appoinmentTime,
          addedBy: req.userId,
          isOtherTrip: true,
        });

        console.log("Possible Routes", req.body.possibleRoutes);
        await newTrip.save();
      }
      console.log("Routes Found For Trips", routesFound);
      console.log("Routes Missing For Trips", routesMissing);

      res.status(200).send("File processed successfully.");
    } else {
      console.log("File Columns Are More Than 12 That You Are Trying To Read");
      const rows = xlsx.utils.sheet_to_json(sheet);
      const convertExcelTime = (excelTime) => {
        // Total seconds in a day
        const totalSeconds = 86400;

        // If the value is in seconds (e.g., `968` seconds after midnight)
        const hours = Math.floor(excelTime / 3600); // Extract hours
        const minutes = Math.floor((excelTime % 3600) / 60); // Extract minutes
        const seconds = excelTime % 60; // Remaining seconds

        // Format into HH:MM:SS
        const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        return formattedTime;
      };

      // Example Usage
      const timeValue = 968; // Value from the Excel file
      console.log(convertExcelTime(timeValue)); // Output: 00:16:08

      for (let row of rows) {
        console.log("Total Rows", rows.length);

        // Normalize phone number before using it
        const phoneNumber = normalizePhoneNumber(row["Member's Phone Number"]);
        console.log("Normalized Phone Number:", phoneNumber);

        let pickUpAddress = await geocodeAddress(
          row["Pickup Address"] + "," + row["Pickup City"]
        );
        let dropOffAddress = await geocodeAddress(
          row["Delivery Address"] + "," + row["Delivery City"]
        );
        console.log("Pick Up Address", pickUpAddress);
        console.log("Delivery Address", dropOffAddress);
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
          `${pickUpAddress}`
        )}&destination=${encodeURIComponent(
          `${dropOffAddress}`
        )}&alternatives=true&key=${apiKey}`; // Added alternatives=true to fetch multiple routes

        console.log("TIME VALUE", row["PREF\\. PICK UP TIME"]);
        console.log("Again Time value", row["PREF\\. PICK UP TIME"]);

        let appoinmentTime =
          row["Time"] !== undefined ? convertExcelTime(row["Time"]) : "00:00";
        let pickUpTime =
          row["Pick Up Time"] != undefined
            ? convertExcelTime(row["Pick Up Time"])
            : "00:00";

        try {
          const response = await axios.get(url);
          const routes = response.data.routes; // Retrieve all routes

          console.log("Routes For Trip", routes);

          // Check if routes are available
          if (routes && routes.length > 0) {
            // Find the first route with valid legs
            const validRoute = routes.find(
              (route) => route.legs && route.legs.length > 0
            );

            // If a valid route is found, use it
            if (validRoute) {
              console.log("Valid Route Legs");
              req.body.possibleRoutes = routes[0].legs;
              req.body.mileage = Number(
                routes[0].legs[0].distance.text.toString().split(" ")[0]
              );

              routesFound++;
            } else {
              // If no valid routes, but we have routes available, we can choose the first one as an alternative
              req.body.possibleRoutes = routes[0].legs || [];
              req.body.mileage = Number(
                routes[0].legs[0].distance.text.toString().split(" ")[0]
              );

              routesFound++;
            }
          } else {
            req.body.possibleRoutes = [];
            routesMissing++;
          }
        } catch (err) {
          console.log("Error fetching route:", err);
          req.body.possibleRoutes = [];
          routesMissing++;
        }

        // Search the database using the normalized phone number

        console.log("TRIP CAN BE ADDED");

        function convertExcelDate(excelSerialDate) {
          const offset = 25567;
          const millisecondsInADay = 24 * 60 * 60 * 1000;
          const formattedDate = new Date(
            (excelSerialDate - offset) * millisecondsInADay
          );
          return formattedDate.toLocaleDateString("en-US");
        }

        const newTrip = new TripModel({
          patientName: row["Member's First Name"] + row["Member's Last Name"],
          patientPhoneNumber: phoneNumber ? phoneNumber : "",
          possibleRoutes: req.body.possibleRoutes,
          pickUpAddress: row["Pickup Address"] + "," + row["Pickup City"],
          dropOffAddress: row["Delivery Address"] + "," + row["Delivery City"],
          patientType: row["Passenger Type"],
          pickUpDate: row["Pick Up Date"]
            ? convertExcelDate(row["Pick Up Date"])
            : "",
          pickUpTime: pickUpTime,
          appointmentTime: appoinmentTime,
          addedBy: req.userId,
          isOtherTrip: true,
        });

        console.log("Possible Routes", req.body.possibleRoutes);
        await newTrip.save();
      }
      console.log("Routes Found For Trips", routesFound);
      console.log("Routes Missing For Trips", routesMissing);

      res.status(200).send("File processed successfully.");
    }
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).send("Error processing file.");
  }
};

exports.addTrip = async (req, res) => {
  try {
    // Check user role and set addedBy field
    if (req.userRole != "Patient") {
      console.log("Not A Patient");
      req.body.addedBy = req.userId;
    }
    console.log("Pick Up Address", req.body.pickUpAddress);
    console.log("DRop Off Address", req.body.dropOfAddress);

    // Call Google Maps API for directions
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
      req.body.pickUpAddress
    )}&destination=${encodeURIComponent(
      req.body.dropOffAddress
    )}&key=${apiKey}`;
    const response = await axios.get(url);
    const route = response.data.routes[0];

    console.log("Route Legs", route.legs);
    console.log("Directions", response.data);
    req.body.possibleRoutes = route.legs;
    req.body.mileage = Number(
      route.legs[0].distance.text.toString().split(" ")[0]
    );
    // Get patient details
    console.log("Patient Ref", req.body.patientRef);
    let patient;
    if (req.body.patientRef) {
      patient = await PatientModel.findById(req.body.patientRef);
    }

    console.log("Patient", patient);
    if (req.body.patientRef) {
      req.body.patientPhotoUrl = patient.profilePhotoUrl;
      req.body.patientSignatureUrl = patient.signatureUrl;
    }
    req.body.isOtherTrip = req.body.patientRef ? false : true;

    // Handle driver assignment if driverRef is provided
    if (req.body.driverRef) {
      const driver = await DriverModel.findById(req.body.driverRef);
      if (driver) {
        req.body.driverName = `${driver.firstName} ${driver.lastName}`;
        req.body.driverSignatureUrl = driver.signatureUrl;
        req.body.status = "Assigned";
        // Mark driver as unavailable
        await DriverModel.findByIdAndUpdate(req.body.driverRef, { isAvailable: false });
      }
    }

    // Save the trip
    let trip = new TripModel(req.body);
    console.log(trip);
    let notification = new NotificationModel({
      fromId: trip.addedBy ? trip.addedBy : "adminId ",
      toId: trip.patientRef ? trip.patientRef : "randomRef",
      fromPhotoUrl:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRo1KQPQY6ldUIZfCi4UOUx6ide2_s0vuIxRQ&s",
      type: "TripBooked",
      text: "Booked A Trip For You",
      from: "Admin",
    });

    await notification.save();
    await trip.save();

    // For Admin users
    if (req.userRole == "Admin") {
      console.log("Sending Message");
      // Create a message model and emit socket event for Admin-Patient
      let message = new MessageModel({
        text: `A Trip has been booked for patient:\n ${req.body.patientName}\n :from ${req.body.pickUpAddress} \n:to ${req.body.dropOffAddress}. \nPick Up Time Is:${req.body.pickUpTime}  \nAnd The Appointment Time is:${req.body.appointmentTime}`,
        senderId: req.userId,
        receiverId: req.body.patientRef ? req.body.patientRef : "randomRef",
        addedON: new Date().toLocaleString(),
        addedAt: new Date().toLocaleTimeString(),
      });
      console.log("Message", message);
      await message.save();
      try {
        const response = await axios.post(
          process.env.FIREBASE_NOTIFICATION_URL,
          {
            message: {
              topic: req.body.patientRef ? req.body.patientRef : "randomRef",
              data: {
                sender: "",
                message: `A Trip has been booked for patient:${req.body.patientName} from ${req.body.pickUpAddress} to ${req.body.dropOffAddress}. Pick Up Time Is:${req.body.pickUpTime}  And The Appointment Time is:${req.body.appointmentTime}`,
                type: "notification",
              },
              notification: {
                title: "",
                body: `A Trip has been booked for patient:${req.body.patientName} from ${req.body.pickUpAddress} to ${req.body.dropOffAddress}. Pick Up Time Is:${req.body.pickUpTime}  And The Appointment Time is:${req.body.appointmentTime}`,
              },
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );
        console.log("Successfully Sent Notification Msg");
      } catch (e) {
        console.log("Error While Sending Notification message", e.message);
      }

      let socketId1 = getReceiverSocketId(req.userId);
      let socketId2 = getReceiverSocketId(
        req.body.patientRef ? req.body.patientRef : "randomRef"
      );

      console.log("Socket Id 1", socketId1);
      if (socketId1.length > 0) {
        console.log("Emitting NewMsg Event for Admin");
        getIO().to(socketId1).emit("newMsg", message);
      }

      console.log("Socket Id 2", socketId2);
      if (socketId2.length > 0) {
        console.log("Emitting NewMsg Event for Patient");
        getIO().to(socketId2).emit("newMsg", message);
      }
    }
    // For non-admin (Patient)
    else {
      if (req.body.patient) {
        console.log("Company Code", patient.companyCode);
        let admin = await Admin.findOne({ companyCode: patient.companyCode });
        console.log("Admin To Send Message", admin);

        // Create a message model and emit socket event for Patient-Admin
        let message = new MessageModel({
          text: `A Trip has been booked for patient:\n${req.body.patientName} \n from ${req.body.pickUpAddress} \nto ${req.body.dropOffAddress}. \nPick Up Time Is:${req.body.pickUpTime}  \nAnd The Appointment Time is:${req.body.appointmentTime}`,
          senderId: req.body.patientRef,
          receiverId: admin._id,
          addedON: new Date().toLocaleString(),
          addedAt: new Date().toLocaleTimeString(),
        });
        await message.save();
        let socketId1 = getReceiverSocketId(admin._id.toString());
        let socketId2 = getReceiverSocketId(req.body.patientRef);
        console.log("Socket Id 1", socketId1);
        if (socketId1.length > 0) {
          console.log("Emitting NewMsg Event for Admin");
          getIO().to(socketId1).emit("newMsg", message);
          getIO()
            .to(socketId1)
            .emit(
              "trip-booking-notification",
              `A Trip has been booked for patient:${req.body.patientName} from ${req.body.pickUpAddress} to ${req.body.dropOffAddress}. Pick Up Time Is:${req.body.pickUpTime}  And The Appointment Time is:${req.body.appointmentTime}`
            );
        }

        // Check if routes exist before proceeding
        if (!response.data.routes || response.data.routes.length === 0) {
          console.log("No routes found:", response.data);
          return res.json({
            success: false,
            message: "No valid route found between the pickup and dropoff locations. Please check the addresses."
          });
        }
        console.log("Socket Id 2", socketId2);
        if (socketId2.length > 0) {
          console.log("Emitting NewMsg Event for Patient");
          getIO().to(socketId2).emit("newMsg", message);
        }
      }
    }

    // Send success response
    res.json({ success: true, trip });
    console.log("Added Successfully");
  } catch (e) {
    console.log(e.message);
    res.json({ success: false, message: e.message });
  }
};

// --------------

exports.getTrips = async (req, res) => {
  try {
    console.log("Query For Trips", req.query);
    // Fetch the limit and page from query parameters, defaulting to 25 records per page and page 1 if not provided
    const limit = parseInt(req.query.limit) || 25;
    const page = parseInt(req.query.page) || 1;
    const timezone = req.query.timezone || "UTC";
    const filter = req.query.filter || "all time"; // default filter to 'all time'
    let admin = await Admin.findOne({ _id: req.userId });
    // Get the admin information
    if (Object.keys(req.query).length == 0) {
      console.log(" Records Without Query");
      let trips = await TripModel.find({
        $or: [
          { addedByCompanyCode: admin.companyCode },
          { addedBy: req.userId },
        ],
      });
      console.log("Trips Length", trips.length);
      res.json({ success: true, trips });
    } else {
      // Define date filters based on the filter query parameter
      let dateQuery = {};

      if (filter !== "all") {
        const now = DateTime.now().setZone(timezone);

        switch (filter) {
          case "today":
            dateQuery.createdAt = {
              $gte: now.startOf("day").toUTC().toJSDate(),
              $lte: now.endOf("day").toUTC().toJSDate(),
            };
            break;

          case "weekly":
            dateQuery.createdAt = {
              $gte: now.startOf("week").toUTC().toJSDate(),
              $lte: now.endOf("week").toUTC().toJSDate(),
            };
            break;

          case "monthly":
            dateQuery.createdAt = {
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

      // Get total number of trips matching the query before pagination
      const totalTrips = await TripModel.countDocuments({
        ...dateQuery,
        $or: [
          { addedByCompanyCode: admin.companyCode },
          { addedBy: req.userId },
        ],
      });

      // Calculate total pages
      const totalPages = Math.ceil(totalTrips / limit);

      // Get trips with date filter and pagination applied
      let trips = await TripModel.find({
        ...dateQuery,
        $or: [
          { addedByCompanyCode: admin.companyCode },
          { addedBy: req.userId },
        ],
      })
        .limit(limit)
        .skip((page - 1) * limit); // Skip records based on current page

      res.json({
        success: true,
        trips,
        currentPage: page,
        totalTrips,
        totalPages,
      });
    }
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.getTripById = async (req, res) => {
  try {
    let trip = await TripModel.findById(req.params.tripId)
    res.json({ success: true, trip })
  }
  catch (e) {
    res.json({ success: false, message: e.message })

  }

}
exports.updateTrip = async (req, res) => {
  let trip = await TripModel.findById(req.params.tripId)
  try {
    // Handle driver assignment changes
    if (req.body.driverRef && req.body.driverRef !== trip.driverRef) {
      const driver = await DriverModel.findById(req.body.driverRef);
      if (driver) {
        req.body.driverName = `${driver.firstName} ${driver.lastName}`;
        req.body.driverSignatureUrl = driver.signatureUrl;
        if (req.body.status === "Not Assigned") {
          req.body.status = "Assigned";
        }
        // Mark new driver as unavailable
        await DriverModel.findByIdAndUpdate(req.body.driverRef, { isAvailable: false });
        
        // Mark old driver as available if there was one
        if (trip.driverRef) {
          await DriverModel.findByIdAndUpdate(trip.driverRef, { isAvailable: true });
        }
      }
    } else if (!req.body.driverRef && trip.driverRef) {
      // Driver was removed, mark old driver as available
      await DriverModel.findByIdAndUpdate(trip.driverRef, { isAvailable: true });
      req.body.driverName = "";
      req.body.driverSignatureUrl = "";
      req.body.status = "Not Assigned";
    }

    if (req.body.status == "Cancelled") {

      let trip = await TripModel.findOne({ _id: req.params.tripId })
      let admin = await Admin.findOne({ _id: trip.addedBy })
      console.log("Added By Admin", admin)
      console.log("Patient Ref", trip.patientRef)
      console.log("Driver Ref", trip.driverRef)
      if (trip.patientRef) {
        let notification = new NotificationModel({ fromId: admin._id, toId: trip.patientRef, fromPhotoUrl: admin.photo, type: "TripCancelled", text: "Cancelled Your Trip", from: admin.firstName + admin.lastName })
        await notification.save()

      }
      if (trip.driverRef) {
        let notification2 = new NotificationModel({ fromId: admin._id, toId: trip.driverRef, fromPhotoUrl: admin.photo, type: "TripCancelled", text: "Cancelled Your Trip", from: admin.firstName + admin.lastName })
        await notification2.save()
      }




      console.log("SUccessfully Added Notification")





    }
    if (req.body.status == "Completed") {
      req.body.completedAt = new Date()
      let currentDate = new Date()
      let endingDate = new Date()
      console.log("Trip Started at", trip.startedAt)
      let startingDate = new Date(trip.startedAt)
      let differenceInMilliSeconds = endingDate - startingDate

      console.log("Milli Seconds", differenceInMilliSeconds)
      let totalPausedTime = 0;

      trip.pauses.forEach(pause => {
        if (pause.resumeTime) {
          totalPausedTime += (pause.resumeTime - pause.pauseTime);
        }
      });

      // Convert milliseconds to hours
      let TOTALPAUSEDTIMEINHOURS = totalPausedTime / (1000 * 60 * 60);
      let hours = differenceInMilliSeconds / 3600000; // Convert
      req.body.timeTaken = hours - TOTALPAUSEDTIMEINHOURS
    }
    const updatedTrip = await TripModel.findByIdAndUpdate(req.params.tripId, req.body, { new: true, runValidators: true })
    res.json({ success: true, updatedTrip })
  }
  catch (e) {
    res.json({ success: false, message: e.message })
  }
}
exports.deleteTrip = async (req, res) => {
  try {
    await TripModel.findByIdAndDelete(req.params.tripId)
    res.json({ success: true })

  }
  catch (e) {
    res.json({ success: false })

  }
}
exports.assignTrip = async (req, res) => {
  console.log("Assigning Trip To Driver")
  try {
    let driver = await DriverModel.findById(req.params.driverId)
    console.log(driver)
    let updatedTrip = await TripModel.findByIdAndUpdate(req.params.tripId, { driverRef: req.params.driverId, driverSignatureUrl: driver.signatureUrl, status: "Assigned", driverName: driver.firstName + " " + driver.lastName }, { new: true, runValidators: true })
    console.log(updatedTrip)
    await DriverModel.findByIdAndUpdate(req.params.driverId, { isAvailable: false }, { new: true, runValidators: true })
    let notification = new NotificationModel({ fromId: "adminId ", toId: req.params.driverId, fromPhotoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRo1KQPQY6ldUIZfCi4UOUx6ide2_s0vuIxRQ&s", type: "TripAssigned", text: "Assigned A Trip For You", from: "Admin" })

    await notification.save()
    res.json({ success: true })
  }
  catch (e) {
    console.log("Error While Assigning Trip", e.message)
    res.json({ success: false })

  }
}

exports.getTripStatusCounts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.userId; // Assuming you have user authentication

    // Base query filter (by user and optional date range)
    const baseFilter = { addedBy: userId };

    // Add date filter if provided
    if (startDate && endDate) {
      baseFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get all counts in parallel for better performance
    const [
      totalTrips,
      assignedTrips,
      onRouteTrips,
      completedTrips,
      cancelledTrips,
      unassignedTrips,
      nonResponsiveTrips,
    ] = await Promise.all([
      // Total trips count
      TripModel.countDocuments(baseFilter),

      // Assigned trips (status is "Assigned")
      TripModel.countDocuments({ ...baseFilter, status: "Assigned" }),

      // On route trips (status is "On Route")
      TripModel.countDocuments({ ...baseFilter, status: "On Route" }),

      // Completed trips (status is "Completed")
      TripModel.countDocuments({ ...baseFilter, status: "Completed" }),

      // Cancelled trips (status is "Cancelled")
      TripModel.countDocuments({ ...baseFilter, status: "Cancelled" }),

      // Unassigned trips (status is "Not Assigned")
      TripModel.countDocuments({ ...baseFilter, status: "Not Assigned" }),

      // Non-responsive trips (custom logic - adjust as needed)
      TripModel.countDocuments({
        ...baseFilter,
        status: { $in: ["Assigned", "On Route"] },
        lastDriverResponse: { $lt: new Date(Date.now() - 30 * 60 * 1000) }, // No response in 30 mins
      }),
    ]);

    res.json({
      success: true,
      counts: {
        total: totalTrips,
        assigned: assignedTrips,
        onRoute: onRouteTrips,
        completed: completedTrips,
        cancelled: cancelledTrips,
        unassigned: unassignedTrips,
        nonResponsive: nonResponsiveTrips,
      },
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};
