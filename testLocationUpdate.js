const io = require("socket.io-client");

// Connect to server
const socket = io("http://localhost:8000", {
  query: { userId: "test-driver-123" },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("✅ Connected to server");
  console.log("Socket ID:", socket.id);

  // Simulate driver location updates
  let lat = 24.8607; // Karachi coordinates
  let lng = 67.0011;

  setInterval(() => {
    // Slightly change location to simulate movement
    lat += (Math.random() - 0.5) * 0.001;
    lng += (Math.random() - 0.5) * 0.001;

    const locationData = {
      latitude: lat,
      longitude: lng,
      driverRef: "test-driver-123",
      addedBy: "690895184e7688d54225fe39", // Your admin ID
      addedByCompanyCode: "HQ001",
      timestamp: new Date().toISOString(),
    };

    console.log("📍 Sending location update:", locationData);
    socket.emit("current-location", locationData);
  }, 3000); // Every 3 seconds
});

socket.on("location-changed", (data) => {
  console.log("✅ Location update confirmed:", data);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error);
});

console.log("🚀 Starting location simulator...");
console.log("Press Ctrl+C to stop");
