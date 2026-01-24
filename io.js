const Admin = require("./models/adminSchema");
const socketIo = require("socket.io");
const setUpChatHandler = require("./sockets/chat-sockets");
let IO;
let connectedUsers = [];
let allAdmins = [];

(async () => {
  try {
    allAdmins = await Admin.find();
    // console.log("All Admins IN IO after fetch", allAdmins);
  } catch (error) {
    console.log("ERROR", error);
  }
})();

let getAdminId = (companyCode) => {
  let filteredAdmins = allAdmins.filter((admin) => {
    return admin.companyCode == companyCode;
  });
  console.log("Found ADmin With Company Code", companyCode, filteredAdmins[0]);
  return filteredAdmins[0]?._id.toString(); // Use optional chaining to prevent errors
};

const initializeSocket = (server) => {
  IO = socketIo(server, {
    cors: {
      origin: [
        "https://triphog.net",
        "https://www.triphog.net", 
        "https://api.triphog.net",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
    },
    pingTimeout: 120000,
    pingInterval: 30000,
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      const allowedOrigins = [
        "https://triphog.net",
        "https://www.triphog.net",
        "https://api.triphog.net", 
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('Socket.IO blocked origin:', origin);
        callback('Origin not allowed', false);
      }
    }
  });

  IO.on("connection", (socket) => {
    let userId = socket.handshake.query.userId;

    console.log("userId", userId);
    if (!userId) {
      return socket.disconnect();
    }

    socket.on("current-location", (data) => {
      const socketID = getReceiverSocketId(data.addedBy);
      console.log("Updated Driver Location From Mobile App");
      console.log("Driver Location Changed");
      console.log(
        "Receiver Socket Id For Sending Location To Web App ",
        socketID
      );
      IO.to(socketID).emit("location-changed", data);
    });
    socket.emit("latest-location", {
      message: "Your Location Is Changing Properly",
    });

    socket.on("location-changed", (updatedLocation) => {
      console.log(
        "Location Changed And The Updated Location Is",
        updatedLocation
      );
      if (updatedLocation.addedByCompanyCode.length > 0) {
        console.log(
          "Updated Location Admin Company Code",
          updatedLocation.addedByCompanyCode
        );
        let adminId = getAdminId(updatedLocation.addedByCompanyCode);
        let adminSocketId = getReceiverSocketId(adminId);
        let patientSocketId = getReceiverSocketId(updatedLocation.patientRef);

        if (adminSocketId) {
          IO.to(adminSocketId).emit("update-location", updatedLocation);
        }
        if (patientSocketId) {
          IO.to(patientSocketId).emit("update-location", updatedLocation);
        }
      } else {
        let adminSocketId = getReceiverSocketId(updatedLocation.addedBy);
        let patientSocketId = getReceiverSocketId(updatedLocation.patientRef);

        if (adminSocketId) {
          IO.to(adminSocketId).emit("update-location", updatedLocation);
        }
        if (patientSocketId) {
          IO.to(patientSocketId).emit("update-location", updatedLocation);
        }
      }
    });

    let alreadyConnected = connectedUsers.some((user) => user.ID === userId);
    if (alreadyConnected) {
      connectedUsers = connectedUsers.filter((user) => user.ID !== userId);
    }
    connectedUsers.push({ ID: userId, socketId: socket.id });

    console.log("A New User Connected With Id:", socket.id);
    console.log(connectedUsers);

    socket.on("disconnect", (reason) => {
      connectedUsers = connectedUsers.filter(
        (user) => user.socketId !== socket.id
      );
      console.log(connectedUsers);
      console.log(
        "User with Id",
        socket.id,
        "has been disconnected due to:",
        reason
      );
    });
    socket.on("reconnect", (attemptNumber) => {
      console.log("Client Reconnected After", attemptNumber);
    });

    setUpChatHandler(IO, socket, connectedUsers);
  });
};

const getIO = () => {
  if (!IO) {
    throw new Error("Socket.IO not initialized!");
  }
  return IO;
};

const getReceiverSocketId = (userId) => {
  console.log("Getting Socket Id Of Person With Id", userId);
  const user = connectedUsers.find((user) => user.ID === userId);
  console.log("Found User", user);
  console.log("Connected Users", connectedUsers);
  return user ? user.socketId : ""; // Return null if not found
};

module.exports = { initializeSocket, getReceiverSocketId, getIO };
