const mongoose = require('mongoose');
const { DBConfig } = require('./config');
const TripModel = require('./models/TripModel');

// Connect to MongoDB
mongoose.connect(DBConfig.dbURL, { dbName: DBConfig.dbName })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function deleteTrips() {
  try {
    // Delete all trips where addedBy is empty
    const result = await TripModel.deleteMany({ 
      $or: [
        { addedBy: '' },
        { addedBy: { $exists: false } }
      ]
    });
    
    console.log(`Deleted ${result.deletedCount} trips without admin ID`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteTrips();
