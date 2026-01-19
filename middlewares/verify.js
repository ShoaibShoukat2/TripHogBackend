const jwt = require("jsonwebtoken");
const JWT_SECRET = "sdfd345ef_dfdf";
// const JWT_SECRET = process.env.JWT_SECRET;

let verify = (req, res, next) => {
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
          req.user = user;
          console.log("user", user);
          if (user.role == "Admin") {
            req.userId = user.id;
            next();
          } else if (user.role == "User") {
            req.userId = user.createdBy;
            next();
          }
        }
      });
    }
  } catch (e) {
    res.json({ success: false });
  }
};

const verifySuperAdmin = (req, res, next) => {
  try {
    const token = req.headers["authorization"];

    if (!token) {
      return res.status(401).json({ success: false, message: "Forbidden!" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({ success: false, message: "Forbidden!" });
      }

      if (user.role !== "SuperAdmin") {
        return res.status(401).json({ success: false, message: "Forbidden!" });
      }

      req.user = user;
      next();
    });
  } catch (e) {
    return res
      .status(500)
      .json({ success: false, message: e.message ?? "Forbidden!" });
  }
};

module.exports = { verify, verifySuperAdmin };
