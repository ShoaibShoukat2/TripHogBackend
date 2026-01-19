const express = require("express");
const {
  addPatient,
  createPassword,
  getPatients,
  getPatient,
  getPatientStats,
  updatePatient,
  deletePatient,
  login,
  signUp,
  changePassword,
  getMyTrips,
  getFilteredPatients,
  getPatientsByDate,
  getStatistics,
  forgotPassword,
  deleteSelected,
  resetPassword,
} = require("../controllers/patientController");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "sdfd345ef_dfdf";
const { verify } = require("../middlewares/verify");
const multer = require("multer");
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

let router = express.Router();
router.delete("/deleteselected", deleteSelected);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get(
  "/getstatistics",
  (req, res, next) => {
    const token = req.headers["authorization"];
    if (token) {
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json({ message: "Forbidden" });
        }
        console.log("Patient", user);

        if ((user.role === "Patient")) {
          req.patientId = user.id;
          next();
        } else {
          res.json({ success: false, message: "UnAuthorized" });
        }
      });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  },
  getStatistics
);
router.post(
  "/add",
  verify,
  upload.single("signature"),
  addPatient
);
router.post("/createpassword/:token", createPassword);
router.get("/getall", verify, getPatients);
router.get("/getone/:Id", verify, getPatient);
router.put(
  "/update/:Id",
  upload.single("signature"),
  updatePatient
);
router.delete("/delete/:Id", deletePatient);
router.post("/login", login);
router.post(
  "/signup",
  upload.single("signature"),
  signUp
);
router.get("/getpatientsbydate/:date", verify, getPatientsByDate);
router.get("/getfilteredpatients/:filter", verify, getFilteredPatients);
router.get(
  "/getmytrips",
  (req, res, next) => {
    const token = req.headers["authorization"];
    if (token) {
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json({ message: "Forbidden" });
        }
        console.log("Patient", user);

        if ((user.role === "Patient")) {
          req.patientId = user.id;
          next();
        } else {
          res.json({ success: false, message: "UnAuthorized" });
        }
      });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  },
  getMyTrips
);
router.post("/changepassword", changePassword);
router.get("/patient-stats", verify, getPatientStats);

module.exports = router;
