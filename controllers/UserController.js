const nodemailer = require("nodemailer");
const crypto = require("crypto");
const Admin = require("../models/adminSchema");
const bcrypt = require("bcryptjs");
const UserModel = require("../models/UserModel");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const SuperAdminModel = require("../models/SuperAdminModel");
const ChatConversation = require("../models/ChatConversation");
const { default: mongoose } = require("mongoose");
const ChatMessage = require("../models/ChatMessage");
const JWT_SECRET = "sdfd345ef_dfdf";
const transport = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  port: 465,
  auth: {
    user: "contact.alinventors@gmail.com",
    pass: "sxmp lxuv jckd savw",
  },
});
exports.deleteSelected = async (req, res) => {
  console.log("Req.query", req.query);
  console.log(" Users Ids", req.body.selectedUsersIds);
  try {
    await UserModel.deleteMany({ _id: { $in: req.body.selectedUsersIds } });
    res.json({ success: true });
  } catch (e) {
    console.log("Error", e.message);
    res.json({ success: false });
  }
};
exports.login = async (req, res) => {
  try {
    console.log("User Login", req.body);

    let user = await UserModel.findOne({ EMailAddress: req.body.email });
    console.log("I am User", user);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found!" });
    } else {
      // let isMatched = await bcrypt.compare(req.body.password, user.password)
      let isMatched = false;
      if (req.body.password === user.password) {
        console.log("IN IF body.password === user.password");
        console.log("REQ.BODY.PASSWORD", req.body.password);
        console.log("USER.PASSWORD", user.password);
        isMatched = true;
      }
      if (isMatched) {
        let admin = await Admin.findOne({ _id: user.addedBy });
        const token = jwt.sign(
          {
            id: user._id,
            role: "User",
            accessibilities: user.accessibilities,
            companyCode: admin?.companyCode,
            createdBy: user.addedBy,
            profilePhotoUrl: user.profilePhotoUrl,
            fullName: user.firstName + " " + user.lastName,
          },
          JWT_SECRET,
          {
            expiresIn: "6d",
          }
        );

        return res.json({
          success: true,
          message: "Login successfull.",
          user,
          token,
        });
      } else {
        return res.json({ success: false, message: "Invalid Credentials" });
      }
    }
  } catch (e) {
    console.log("Error While Adding User", e.message);
    res.json({ success: false, message: e.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await UserModel.findOne({ EMailAddress: email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const token = crypto.randomBytes(20).toString("hex");

    user.passwordResetToken = token;
    user.passwordResetExpires = Date.now() + 3600000;

    await user.save();

    const resetURL = `https://triphog.net/reset-password/${token}?userType=subadmin`;
    const message = `Click on the link to reset your password: ${resetURL}`;

    await transport.sendMail({
      from: "admin@triphog.com",
      to: user.EMailAddress,
      subject: "Reset Your Password | Trip Hog",
      text: message,
    });

    return res.status(200).json({
      success: true,
      message: "Reset Password link sent successfully.",
    });
  } catch (e) {
    return res.status(200).json({
      success: false,
      message: "Error sending reset password link, please try again later.",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    const { password } = req.body;

    const user = await UserModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      message: "Error resetting password, please try again later.",
    });
  }
};

// exports.login = async (req, res) => {
//   try {
//     let user = await UserModel.findOne({ EMailAddress: req.body.email });

//     if (!user) {
//       return res.json({ success: false, message: "User Not Found!" });
//     }
//     console.log("Found User:", user);
//     console.log("Entered Password:", req.body.password);
//     console.log("Password in DB:", user.password);

//     if (req.body.password === user.password) {
//       console.log("Password matched successfully...");

//       let admin = await Admin.findOne({ _id: user.addedBy });

//       if (!admin) {
//         return res.json({ success: false, message: "Admin Not Found!" });
//       }

//       const token = jwt.sign(
//         {
//           id: user._id,
//           role: "User",
//           accessibilities: user.accessibilities,
//           companyCode: admin.companyCode,
//           createdBy: user.addedBy,
//           profilePhotoUrl: user.profilePhotoUrl,
//           fullName: user.firstName + " " + user.lastName,
//         },
//         JWT_SECRET,
//         { expiresIn: "6d" }
//       );

//       return res.json({ success: true, user, token });
//     } else {
//       return res.json({ success: false, message: "Incorrect Password" });
//     }
//   } catch (e) {
//     res.json({ success: false, message: e.message });
//   }
// };

exports.getUsersByDate = async (req, res) => {
  let date = req.params.date;
  try {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0); // Set to the start of the day

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999); // Set to the end of the day

    const limit = parseInt(req.query.limit) || 25; // Default to 25 records per page if not provided
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided

    // Find users within the date range
    let users = await UserModel.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      addedBy: req.userId, // Ensure that only users added by the current user are retrieved
    })
      .limit(limit) // Limit the number of users per page
      .skip((page - 1) * limit); // Skip users based on the current page

    // Count total number of users matching the query (without pagination)
    const totalUsers = await UserModel.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      addedBy: req.userId,
    });

    const totalPages = Math.ceil(totalUsers / limit); // Calculate total pages

    // Return response with pagination information
    res.json({
      success: true,
      users, // Users for the current page
      totalUsers, // Total number of users matching the query
      totalPages, // Total number of pages based on the limit
      currentPage: page, // Current page number
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.getFilteredUsers = async (req, res) => {
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
    let filteredUsers = await UserModel.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });
    filteredUsers = filteredUsers.filter((user) => {
      return user.addedBy == req.userId;
    });
    res.json(filteredUsers);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25; // Number of records per page, default to 25
    const page = parseInt(req.query.page) || 1; // Page number, default to 1
    const filter = req.query.filter || "monthly"; // Filter type (today, weekly, monthly, all time)
    if (Object.keys(req.query).length == 0) {
      let users = await UserModel.find({ addedBy: req.userId });
      res.json({ success: true, users });
    } else {
      let query = { addedBy: req.userId };

      // Add date filters based on the filter query (today, weekly, monthly)
      if (filter === "today") {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        query.createdAt = { $gte: startOfDay, $lte: endOfDay };
      } else if (filter === "weekly") {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7); // 7 days ago
        startOfWeek.setUTCHours(0, 0, 0, 0);

        const endOfWeek = new Date();
        endOfWeek.setUTCHours(23, 59, 59, 999);

        query.createdAt = { $gte: startOfWeek, $lte: endOfWeek };
      } else if (filter === "monthly") {
        const startOfMonth = new Date();
        startOfMonth.setDate(startOfMonth.getDate() - 30); // 30 days ago
        startOfMonth.setUTCHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setUTCHours(23, 59, 59, 999);

        query.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
      }

      // Fetch users based on the query and apply pagination
      let users = await UserModel.find(query)
        .limit(limit) // Limit number of users per page
        .skip((page - 1) * limit); // Skip records based on the page number

      // Count the total number of users matching the query
      const totalUsers = await UserModel.countDocuments(query);

      // Calculate total number of pages
      const totalPages = Math.ceil(totalUsers / limit);

      // Return response with users and pagination info
      res.json({
        success: true,
        users, // Users for the current page
        totalUsers, // Total number of users matching the query
        totalPages, // Total number of pages
        currentPage: page, // Current page number
      });
    }
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
// exports.createPassword = async (req, res) => {
//     console.log("Token>>>>>>", req.params.token)
//     try {
//         let user = await UserModel.findOne({ token: req.params.token })
//         console.log("Found User", user)
//         if (!user) {
//             console.log("Invalid Token Error")
//             res.json({ success: false, message: "Invalid Token" })
//         }
//         else {
//             let salt = await bcrypt.genSalt(10)
//             let hashedPassword = await bcrypt.hash(req.body.password, salt)
//             user.password = hashedPassword
//             user.status = "Active"
//             await user.save()
//             res.json({ success: true })

//         }

//     }
//     catch (e) {
//         console.log("Error Message", e.message)
//         res.json({ success: false, message: e.message })

//     }
// }

exports.createPassword = async (req, res) => {
  console.log("Token>>>>>>", req.params.token);
  try {
    let user = await UserModel.findOne({ token: req.params.token });
    console.log("Found User", user);

    if (!user) {
      console.log("Invalid Token Error");
      return res.json({ success: false, message: "Invalid Token" });
    } else {
      user.password = req.body.password;
      user.status = "Active";
      await user.save();
      return res.json({ success: true });
    }
  } catch (e) {
    console.log("Error Message", e.message);
    return res.json({ success: false, message: e.message });
  }
};

exports.addUser = async (req, res) => {
  try {
    console.log(req.body);
    req.body.addedBy = req.userId;
    console.log(req.body);
    if (req.file) {
      req.body.profilePhotoUrl = "https://api.triphog.net/" + req.file.path;
    }
    // Check if email already exists
    const existingUser = await UserModel.findOne({
      EMailAddress: req.body.EMailAddress,
    });
    if (existingUser) {
      return res.json({ success: false, message: "Email already exists" });
    }
    let user = new UserModel(req.body);
    console.log(user);
    const token = crypto.randomBytes(20).toString("hex");
    user.token = token;

    let passwordCreationLink = `https://triphog.net/admin/user/createpassword/${token}`;
    let messageToSend = `Click On The Link To Create Your Password:\n ${passwordCreationLink}`;
    await transport.sendMail({
      from: "admin@triphog.com",
      to: user.EMailAddress,
      subject: "Create Your Password",
      text: messageToSend,
    });
    await user.save();
    res.json({ success: true, user });
  } catch (e) {
    console.log("Error While Adding User", e.message);
    res.json({ success: false, message: e.message });
  }
};
exports.deleteUser = async (req, res) => {
  try {
    await UserModel.findByIdAndDelete(req.params.userId);

    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.getUser = async (req, res) => {
  try {
    let user = await UserModel.findById(req.params.userId);
    if (!user) {
      res.json({ success: false, message: "No User Found!" });
    } else {
      res.json({ success: true, user });
    }
  } catch (e) {
    res.json({ success: false });
  }
};
exports.updateUser = async (req, res) => {
  try {
    if (req.file) {
      req.body.profilePhotoUrl = "https://api.triphog.net/" + req.file.path;
    }
    await UserModel.findByIdAndUpdate(req.params.userId, req.body, {
      new: true,
      runValidators: true,
    });
    let user = await UserModel.findOne({ _id: req.params.userId });
    await transport.sendMail({
      from: "admin@triphog.com",
      to: user.EMailAddress,
      subject: "Create Your Password",
      text: "Your Account Is Updated By The Admin.Please Login In Again Into Your Account To Be Able To Use Updated Features",
    });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
};

exports.getUsersForChat = async (req, res) => {
  try {
    const allAdmins = await Admin.find({})
      .select("_id firstName lastName photo")
      .sort({ createdAt: -1 })
      .lean();

    const allSuperAdmins = await SuperAdminModel.find({})
      .select("_id firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    const admins = allAdmins.map((a) => ({ ...a, role: "Admin" }));
    const superadmins = allSuperAdmins.map((a) => ({
      ...a,
      role: "SuperAdmin",
    }));

    const allUsersToChat = [...admins, ...superadmins];

    return res.status(200).json({
      success: true,
      message: "All Users for chat",
      data: allUsersToChat,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message:
        err.message ?? "Error fetching users for chat, please try again later.",
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, recipient, content } = req.body;
    const { id: senderId } = req.user;

    if (!recipient?._id || !recipient?.role) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid recipient." });
    }

    let convId = conversationId;

    if (!convId) {
      const newConversation = new ChatConversation({
        latestMessage: content,
        recipients: [
          { id: senderId, role: "User" },
          { id: recipient._id, role: recipient.role },
        ],
      });

      await newConversation.save();

      convId = newConversation._id;
    }

    const newMessage = new ChatMessage({
      content,
      conversationId: convId,
      sender: {
        id: senderId,
        role: "User",
      },
      reciever: {
        id: recipient._id,
        role: recipient.role,
      },
    });

    await newMessage.save();

    if (conversationId) {
      await ChatConversation.findByIdAndUpdate(conversationId, {
        latestMessage: content,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message sent successfully.",
      data: { conversationId: convId },
    });
  } catch (err) {
    console.log(err);
    return res.status(
      err.message ?? "Error sending message, please try again later."
    );
  }
};

exports.getConversations = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const allConversations = await ChatConversation.aggregate([
      {
        $match: {
          recipients: {
            $elemMatch: {
              id: mongoose.Types.ObjectId.createFromHexString(userId),
              role: "User",
            },
          },
        },
      },
      {
        $addFields: {
          otherRecipient: {
            $first: {
              $filter: {
                input: "$recipients",
                as: "recipient",
                cond: {
                  $ne: [
                    "$$recipient.id",
                    mongoose.Types.ObjectId.createFromHexString(userId),
                  ],
                },
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "admins",
          localField: "otherRecipient.id",
          foreignField: "_id",
          as: "adminDetails",
        },
      },
      {
        $lookup: {
          from: "triphogsuperadmins",
          localField: "otherRecipient.id",
          foreignField: "_id",
          as: "superAdminDetails",
        },
      },
      {
        $addFields: {
          recipient: {
            $cond: {
              if: { $eq: ["$otherRecipient.role", "Admin"] },
              then: { $arrayElemAt: ["$adminDetails", 0] },
              else: { $arrayElemAt: ["$superAdminDetails", 0] },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          "recipient._id": 1,
          "recipient.firstName": 1,
          "recipient.lastName": 1,
          "recipient.role": "$otherRecipient.role",
          latestMessage: 1,
          createdAt: "$updatedAt",
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Conversations.",
      data: allConversations,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message:
        err.message ?? "Error fetching conversations, please try again later.",
    });
  }
};

exports.getConversationChat = async (req, res) => {
  try {
    const { conversationId } = req.query;

    const chatMessages = await ChatMessage.find({
      conversationId,
    })
      .sort({ createdAt: 1 })
      .lean();

    return res
      .status(200)
      .json({ success: true, message: "Chat Messages", data: chatMessages });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Error fetching conversation messages.",
    });
  }
};

exports.deleteConversations = async (req, res) => {
  try {
    const { conversationId } = req.query;

    const { id: userId } = req.user;

    const conversation = await ChatConversation.findOneAndDelete({
      _id: conversationId,
      recipients: {
        $elemMatch: { id: userId, role: "User" },
      },
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found." });
    }

    await ChatMessage.deleteMany({ conversationId });

    return res.status(200).json({
      success: true,
      message: "Chat deleted successfully.",
    });
  } catch (err) {
    return res.status(
      err.message ?? "Error deleting chat, please try again later."
    );
  }
};
