const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
const { DBConfig } = require('./config');
const TripModel = require('./models/TripModel');
const Admin = require('./models/adminSchema');

// Connect to MongoDB
mongoose.connect(DBConfig.dbURL, { dbName: DBConfig.dbName })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Read the Excel file
const filePath = 'C:\\Users\\Shoaib\\Downloads\\MernProject\\TRIPS DATA.csv';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total rows found:', data.length);

// Import function
async function importTrips() {
  try {
    // Get the first admin from database
    const admin = await Admin.findOne();
    
    if (!admin) {
      console.error('No admin found in database. Please create an admin first.');
      process.exit(1);
    }
    
    console.log(`Using admin: ${admin.firstName} ${admin.lastName} (${admin._id})`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Parse date - convert Excel date format
        let pickUpDate = '';
        if (row['Pick Up Date']) {
          const excelDate = row['Pick Up Date'];
          if (typeof excelDate === 'number') {
            // Excel date to JS date
            const date = new Date((excelDate - 25569) * 86400 * 1000);
            pickUpDate = date.toISOString().split('T')[0];
          } else {
            pickUpDate = excelDate;
          }
        }
        
        // Map CSV columns to trip schema
        const tripData = {
          patientName: row['FULL NAME'] || '',
          patientPhoneNumber: row["Member's Phone Number"] || '',
          pickUpTime: row['PREF. PICK UP TIME'] || '',
          appointmentTime: row['APPOINMENT TIME'] || '',
          pickUpAddress: row['Pick Up Address'] || '',
          dropOffAddress: row['Delivery Address'] || '',
          confirmation: row['Confirmation'] || 'Unresponsive',
          patientType: row['Passenger Type'] || 'AMBULATORY',
          noOfPassengers: parseInt(row['Number of Additional Passengers'] || 0) + 1,
          pickUpDate: pickUpDate,
          legId: row['LEG ID'] || '',
          status: 'Not Assigned',
          isComplted: false,
          addedBy: admin._id.toString(), // Set admin ID
          addedByCompanyCode: admin.companyCode || '', // Set company code
          driverRef: '',
          patientRef: '',
          mileage: '0',
          timeTaken: 0,
          isOtherTrip: true
        };
        
        // Create trip
        const trip = new TripModel(tripData);
        await trip.save();
        
        successCount++;
        console.log(`✓ Row ${i + 1}/${data.length} imported: ${tripData.patientName}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Row ${i + 1} error:`, error.message);
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Total rows: ${data.length}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('Import completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('Import error:', error);
    process.exit(1);
  }
}

// Start import
console.log('\n=== Starting Import ===');
importTrips();
