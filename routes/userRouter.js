const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const JWT_SECRET = "sdfd345ef_dfdf";
const {
  login,
  addUser,
  getUser,
  deleteUser,
  updateUser,
  getAllUsers,
  createPassword,
  deleteSelected,
  getFilteredUsers,
  getUsersByDate,
  getUsersForChat,
  sendMessage,
  getConversations,
  getConversationChat,
  deleteConversations,
  forgotPassword,
  resetPassword,
} = require("../controllers/UserController");
const { verify } = require("../middlewares/verify");

const router = express.Router();
let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(file);
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, file.originalname);
  },
});
let upload = multer({ storage: storage });
router.delete("/deleteselected", deleteSelected);
router.post("/forgotpassword", forgotPassword);
router.post("/resetpassword/:token", resetPassword);
router.post(
  "/adduser",
  upload.single("profilePhoto"),
  (req, res, next) => {
    try {
      const token = req.headers["authorization"];
      if (!token) {
        res.json({ success: false, message: "Not Token Provided!" });
      } else {
        jwt.verify(token, JWT_SECRET, (err, user) => {
          if (err) {
            res.json({ success: false, message: "Invalid Token!" });
            console.log("Error", err);
          } else {
            console.log("user", user);
            if (user.role == "Admin") {
              req.userId = user.id;
              next();
            }
          }
        });
      }
    } catch (e) {
      res.json({ success: false });
    }
  },
  addUser
);
router.get(
  "/getallusers",
  (req, res, next) => {
    try {
      const token = req.headers["authorization"];
      if (!token) {
        res.json({ success: false, message: "Not Token Provided!" });
      } else {
        jwt.verify(token, JWT_SECRET, (err, user) => {
          if (err) {
            res.json({ success: false, message: "Invalid Token!" });
            console.log("Error", err);
          } else {
            console.log("user", user);
            if (user.role == "Admin") {
              req.userId = user.id;
              next();
            }
          }
        });
      }
    } catch (e) {
      res.json({ success: false });
    }
  },
  getAllUsers
);
router.get(
  "/getuserbyId/:userId",
  (req, res, next) => {
    try {
      const token = req.headers["authorization"];
      if (!token) {
        res.json({ success: false, message: "Not Token Provided!" });
      } else {
        jwt.verify(token, JWT_SECRET, (err, user) => {
          if (err) {
            res.json({ success: false, message: "Invalid Token!" });
            console.log("Error", err);
          } else {
            console.log("user", user);
            if (user.role == "Admin") {
              req.userId = user.id;
              next();
            }
          }
        });
      }
    } catch (e) {
      res.json({ success: false });
    }
  },
  getUser
);
router.post("/login", login);
router.get(
  "/getfilteredusers/:filter",
  (req, res, next) => {
    try {
      const token = req.headers["authorization"];
      if (!token) {
        res.json({ success: false, message: "Not Token Provided!" });
      } else {
        jwt.verify(token, JWT_SECRET, (err, user) => {
          if (err) {
            res.json({ success: false, message: "Invalid Token!" });
            console.log("Error", err);
          } else {
            console.log("user", user);
            if (user.role == "Admin") {
              req.userId = user.id;
              next();
            }
          }
        });
      }
    } catch (e) {
      res.json({ success: false });
    }
  },
  getFilteredUsers
);
router.get(
  "/getusersbydate/:date",
  (req, res, next) => {
    try {
      const token = req.headers["authorization"];
      if (!token) {
        res.json({ success: false, message: "Not Token Provided!" });
      } else {
        jwt.verify(token, JWT_SECRET, (err, user) => {
          if (err) {
            res.json({ success: false, message: "Invalid Token!" });
            console.log("Error", err);
          } else {
            console.log("user", user);
            if (user.role == "Admin") {
              req.userId = user.id;
              next();
            }
          }
        });
      }
    } catch (e) {
      res.json({ success: false });
    }
  },
  getUsersByDate
);
router.put(
  "/updateuser/:userId",
  upload.single("profilePhoto"),
  (req, res, next) => {
    try {
      const token = req.headers["authorization"];
      if (!token) {
        res.json({ success: false, message: "Not Token Provided!" });
      } else {
        jwt.verify(token, JWT_SECRET, (err, user) => {
          if (err) {
            res.json({ success: false, message: "Invalid Token!" });
            console.log("Error", err);
          } else {
            console.log("user", user);
            if (user.role == "Admin") {
              req.userId = user.id;
              next();
            }
          }
        });
      }
    } catch (e) {
      res.json({ success: false });
    }
  },
  updateUser
);
router.delete(
  "/deleteuser/:userId",
  (req, res, next) => {
    try {
      const token = req.headers["authorization"];
      if (!token) {
        res.json({ success: false, message: "Not Token Provided!" });
      } else {
        jwt.verify(token, JWT_SECRET, (err, user) => {
          if (err) {
            res.json({ success: false, message: "Invalid Token!" });
            console.log("Error", err);
          } else {
            console.log("user", user);
            if (user.role == "Admin") {
              req.userId = user.id;
              next();
            }
          }
        });
      }
    } catch (e) {
      res.json({ success: false });
    }
  },
  deleteUser
);
router.post("/createpassword/:token", createPassword);

// chat
router.get("/chat/get-users", verify, getUsersForChat);
router.post("/chat/send-message", verify, sendMessage);
router.get("/chat/get-conversations", verify, getConversations);
router.get("/chat/get-chat-by-conversation-id", verify, getConversationChat);
router.delete("/chat/delete-conversation", verify, deleteConversations);

module.exports = router;
