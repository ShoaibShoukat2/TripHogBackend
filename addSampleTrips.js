const mongoose = require("mongoose");
const TripModel = require("./models/TripModel");
const Admin = require("./models/adminSchema");
const { DBConfig } = require("./config");

const MONGO_URI = `${DBConfig.dbURL}/${DBConfig.dbName}`;

// Sample trips data
const sampleTrips = [
  {
    patientName: "John Smith",
    patientPhoneNumber: "+1-555-0101",
    pickUpTime: "09:00 AM",
    appointmentTime: "10:30 AM",
    pickUpAddress: "123 Main St, New York, NY 10001",
    dropOffAddress: "456 Hospital Ave, New York, NY 10002",
    confirmation: "Confirmed",
    patientType: "AMBULATORY",
    noOfPassengers: 1,
    pickUpDate: "2026-01-24",
    legId: "LEG001",
    status: "Not Assigned"
  },
  {
    patientName: "Sarah Johnson",
    patientPhoneNumber: "+1-555-0102",
    pickUpTime: "10:30 AM",
    appointmentTime: "12:00 PM",
    pickUpAddress: "789 Oak St, Brooklyn, NY 11201",
    dropOffAddress: "321 Medical Center Dr, Brooklyn, NY 11202",
    confirmation: "Confirmed",
    patientType: "WHEELCHAIR",
    noOfPassengers: 2,
    pickUpDate: "2026-01-24",
    legId: "LEG002",
    status: "Not Assigned"
  },
  {
    patientName: "Michael Brown",
    patientPhoneNumber: "+1-555-0103",
    pickUpTime: "02:00 PM",
    appointmentTime: "03:30 PM",
    pickUpAddress: "555 Pine St, Queens, NY 11354",
    dropOffAddress: "777 Clinic Blvd, Queens, NY 11355",
    confirmation: "Pending",
    patientType: "AMBULATORY",
    noOfPassengers: 1,
    pickUpDate: "2026-01-25",
    legId: "LEG003",
    status: "Not Assigned"
  },
  {
    patientName: "Emily Davis",
    patientPhoneNumber: "+1-555-0104",
    pickUpTime: "08:30 AM",
    appointmentTime: "10:00 AM",
    pickUpAddress: "999 Elm St, Manhattan, NY 10003",
    dropOffAddress: "111 Health Center Way, Manhattan, NY 10004",
    confirmation: "Confirmed",
    patientType: "STRETCHER",
    noOfPassengers: 1,
    pickUpDate: "2026-01-25",
    legId: "LEG004",
    status: "Not Assigned"
  },
  {
    patientName: "Robert Wilson",
    patientPhoneNumber: "+1-555-0105",
    pickUpTime: "01:15 PM",
    appointmentTime: "02:45 PM",
    pickUpAddress: "222 Cedar Ave, Bronx, NY 10451",
    dropOffAddress: "333 Therapy Center St, Bronx, NY 10452",
    confirmation: "Confirmed",
    patientType: "AMBULATORY",
    noOfPassengers: 3,
    pickUpDate: "2026-01-26",
    legId: "LEG005",
    status: "Not Assigned"
  },
  {
    patientName: "Lisa Anderson",
    patientPhoneNumber: "+1-555-0106",
    pickUpTime: "11:00 AM",
    appointmentTime: "12:30 PM",
    pickUpAddress: "444 Maple Dr, Staten Island, NY 10301",
    dropOffAddress: "666 Specialist Plaza, Staten Island, NY 10302",
    confirmation: "Unresponsive",
    patientType: "WHEELCHAIR",
    noOfPassengers: 1,
    pickUpDate: "2026-01-26",
    legId: "LEG006",
    status: "Not Assigned"
  },
  {
    patientName: "David Martinez",
    patientPhoneNumber: "+1-555-0107",
    pickUpTime: "03:45 PM",
    appointmentTime: "05:15 PM",
    pickUpAddress: "888 Birch Ln, Long Island, NY 11501",
    dropOffAddress: "999 Rehab Center Rd, Long Island, NY 11502",
    confirmation: "Confirmed",
    patientType: "AMBULATORY",
    noOfPassengers: 2,
    pickUpDate: "2026-01-27",
    legId: "LEG007",
    status: "Not Assigned"
  },
  {
    patientName: "Jennifer Taylor",
    patientPhoneNumber: "+1-555-0108",
    pickUpTime: "07:30 AM",
    appointmentTime: "09:00 AM",
    pickUpAddress: "123 Willow St, Yonkers, NY 10701",
    dropOffAddress: "456 Diagnostic Center Ave, Yonkers, NY 10702",
    confirmation: "Confirmed",
    patientType: "STRETCHER",
    noOfPassengers: 1,
    pickUpDate: "2026-01-27",
    legId: "LEG008",
    status: "Not Assigned"
  },
  {
    patientName: "Christopher Lee",
    patientPhoneNumber: "+1-555-0109",
    pickUpTime: "12:30 PM",
    appointmentTime: "02:00 PM",
    pickUpAddress: "789 Spruce St, White Plains, NY 10601",
    dropOffAddress: "321 Treatment Center Dr, White Plains, NY 10602",
    confirmation: "Pending",
    patientType: "AMBULATORY",
    noOfPassengers: 1,
    pickUpDate: "2026-01-28",
    legId: "LEG009",
    status: "Not Assigned"
  },
  {
    patientName: "Amanda Garcia",
    patientPhoneNumber: "+1-555-0110",
    pickUpTime: "04:00 PM",
    appointmentTime: "05:30 PM",
    pickUpAddress: "555 Poplar Ave, New Rochelle, NY 10801",
    dropOffAddress: "777 Medical Plaza Blvd, New Rochelle, NY 10802",
    confirmation: "Confirmed",
    patientType: "WHEELCHAIR",
    noOfPassengers: 2,
    pickUpDate: "2026-01-28",
    legId: "LEG010",
    status: "Not Assigned"
  }
];

async function addSampleTrips() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get admin to associate trips with
    const admin = await Admin.findOne({ email: "admin@gmail.com" });
    if (!admin) {
      console.error("❌ Admin not found. Please create admin first.");
      process.exit(1);
    }

    console.log(`📋 Using admin: ${admin.firstName} ${admin.lastName}`);

    // Check if trips already exist
    const existingTrips = await TripModel.countDocuments();
    console.log(`📊 Existing trips in database: ${existingTrips}`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sampleTrips.length; i++) {
      try {
        const tripData = {
          ...sampleTrips[i],
          addedBy: admin._id.toString(),
          addedByCompanyCode: admin.companyCode,
          isComplted: false,
          mileage: "0",
          timeTaken: 0,
          isOtherTrip: false,
          reviews: [],
          pauses: [],
          possibleRoutes: [],
          patientPhotoUrl: "",
          patientSignatureUrl: "",
          driverSignatureUrl: "",
          driverName: "",
          driverRef: "",
          patientRef: "",
          createdAt: new Date()
        };

        const trip = new TripModel(tripData);
        await trip.save();
        
        successCount++;
        console.log(`✅ Trip ${i + 1}/${sampleTrips.length} added: ${tripData.patientName}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error adding trip ${i + 1}:`, error.message);
      }
    }

    console.log("\n=== Summary ===");
    console.log(`✅ Successfully added: ${successCount} trips`);
    console.log(`❌ Errors: ${errorCount} trips`);
    console.log(`📊 Total trips in database: ${await TripModel.countDocuments()}`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

console.log("🚀 Starting to add sample trips data...");
addSampleTrips();