const { findById } = require("../models/adminSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = "sdfd345ef_dfdf";

const AdminModel = require(`${__dirname}/../models/adminSchema`);
const PaymentModel = require(`${__dirname}/../models/paymentSchema`);
const SuperAdminModel = require("../models/SuperAdminModel");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { createEmailTransporter, sendEmailSafely } = require("../utils/emailConfig");
const ChatConversation = require("../models/ChatConversation");
const ChatMessage = require("../models/ChatMessage");
const { default: mongoose } = require("mongoose");
const UserModel = require("../models/UserModel");

// Email transport configuration
const transport = createEmailTransporter();
exports.addDoc = async (req, res) => {
  console.log("Adding Doc For admin");
  try {
    let superAdmin = await SuperAdminModel.findOne({ _id: req.userId });
    let docUrl = "https://api.triphog.net/" + req.file.path;
    if (superAdmin) {
      let _docs = superAdmin.docs;
      _docs = _docs.concat({
        url: docUrl,
        title: req.file.originalname,
        Id: Math.random().toString(),
      });
      console.log("Docs", _docs);
      await SuperAdminModel.findByIdAndUpdate(
        req.userId,
        { docs: _docs },
        { new: true, runValidators: true }
      );
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "Super Admin Not Found" });
    }
  } catch (e) {
    console.log("Error Msg", e.message);
    res.json({ success: false, message: e.message });
  }
};
exports.deleteDoc = async (req, res) => {
  try {
    let superAdmin = await SuperAdminModel.findOne({ _id: req.userId });
    if (superAdmin) {
      let _docs = superAdmin.docs;
      _docs = _docs.filter((doc) => {
        return doc.Id != req.params.docId;
      });
      await SuperAdminModel.findByIdAndUpdate(
        req.userId,
        { docs: _docs },
        { new: true, runValidators: true }
      );
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "Super Admin Not Found" });
    }
  } catch (e) {
    console.log("Error Msg", e.message);
    res.json({ success: false, message: e.message });
  }
};
exports.getDocs = async (req, res) => {
  try {
    let superAdmin = await SuperAdminModel.findOne({ _id: req.userId });
    if (superAdmin) {
      let docs = superAdmin.docs;
      res.json({ success: true, docs });
    } else {
      res.json({ success: false, message: "Super Admin Not Found" });
    }
  } catch (e) {
    console.log("Error Msg", e.message);
    res.json({ success: false, message: e.message });
  }
};
exports.getSuperAdmin = async (req, res) => {
  try {
    let superAdmin = await SuperAdminModel.findOne({ _id: req.superAdmin.id });
    res.json({ success: true, superAdmin });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.changePassword = async (req, res) => {
  const { currentPassword, email, newPassword } = req.body;

  try {
    let superAdmin = await SuperAdminModel.findOne({ EMailAddress: email });
    if (!superAdmin) {
      res.json({ success: false, message: "Not Found!" });
    } else {
      let isMatched = await bcrypt.compare(
        currentPassword,
        superAdmin.password
      );
      if (isMatched) {
        let salt = await bcrypt.genSalt(10);
        let hashedPassword = await bcrypt.hash(newPassword, salt);
        superAdmin.password = hashedPassword;
        await superAdmin.save();
        res.json({ success: true });
      } else {
        res.json({ success: false, message: "InCorrect Old Password" });
      }
    }
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};
exports.getAdminStatistics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find admins created in the last 30 days
    const recentAdmins = await AdminModel.find({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Filter by status
    const paidAdmins = recentAdmins.filter(
      (admin) => admin.status === "Success" || admin.status === "paid"
    );
    const pendingAdmins = recentAdmins.filter((admin) => {
      let createdAt = admin.createdAt;
      let today = new Date();
      console.log("CreatedAT", createdAt);
      console.log("Today' Date", today);
      const differenceInTime = today.getTime() - createdAt.getTime();
      const differenceInDays = differenceInTime / (1000 * 3600 * 24);
      if (differenceInDays <= 7 && admin.status != "Paid") {
        console.log("Pending Admin Found");
        return true;
      } else {
        return false;
      }
    });
    const failedAdmins = recentAdmins.filter((admin) => {
      let createdAt = admin.createdAt;
      let today = new Date();
      console.log("CreatedAT", createdAt);
      console.log("Today' Date", today);
      const differenceInTime = today.getTime() - createdAt.getTime();
      const differenceInDays = differenceInTime / (1000 * 3600 * 24);
      if (differenceInDays > 7 && admin.status != "Paid") {
        console.log("Failed Admin Found");
        return true;
      } else {
        return false;
      }
    });

    // Calculate percentages
    const totalAdmins = recentAdmins.length;
    const paidPercentage = (paidAdmins.length / totalAdmins) * 100;
    const pendingPercentage = (pendingAdmins.length / totalAdmins) * 100;
    const failedPercentage = (failedAdmins.length / totalAdmins) * 100;

    // Calculate total and received payments
    const totalPayment = totalAdmins * 30; // Assuming $30 per admin
    const receivedPayment = paidAdmins.length * 30;

    // Get the number of new admins by month
    const newAdminsByMonth = await AdminModel.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Return statistics
    res.json({
      totalAdmins,
      paidAdminsCount: paidAdmins.length,
      pendingAdminsCount: pendingAdmins.length,
      failedAdminsCount: failedAdmins.length,
      paidPercentage,
      pendingPercentage,
      failedPercentage,
      totalPayment,
      receivedPayment,
      newAdminsByMonth,
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
};

// Admin Signup Controller
exports.superAdminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const superAdmin = await SuperAdminModel.findOne({
      EMailAddress: email,
    });

    if (!superAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Super Admin Not Found" });
    }

    const token = crypto.randomBytes(20).toString("hex");
    superAdmin.passwordResetToken = token;
    await superAdmin.save();

    const resetURL = `https://triphog.net/superadmin/reset-password/${token}`;
    const message = `Click on the link to reset your password ${resetURL}`;

    await transport.sendMail({
      from: "admin@triphog.com",
      to: superAdmin.EMailAddress,
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
exports.superAdminResetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    const { password } = req.body;

    const superAdmin = await SuperAdminModel.findOne({
      passwordResetToken: token,
    });

    if (!superAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Super Admin Not Found" });
    }

    superAdmin.passwordResetToken = undefined;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    superAdmin.password = hashedPassword;
    await superAdmin.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (e) {
    return res.status(200).json({
      success: false,
      message: "Error resetting password, please try again later.",
    });
  }
};
exports.createSuperAdmin = async (req, res) => {
  try {
    let salt = await bcrypt.genSalt(10);
    let hashedPassword = await bcrypt.hash(req.body.password, salt);

    req.body.password = hashedPassword;
    let superAdmin = new SuperAdminModel(req.body);
    await superAdmin.save();
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
};
exports.superAdminLogin = async (req, res) => {
  try {
    const { EMailAddress, passWord } = req.body;

    const superAdmin = await SuperAdminModel.findOne({
      EMailAddress,
    });

    if (!superAdmin) {
      return res.json({ success: false, message: "Super Admin Not Found!" });
    }

    const isMatched = await bcrypt.compare(passWord, superAdmin.password);

    if (!isMatched) {
      return res.json({ success: false, message: "Incorrect Password" });
    }

    const token = jwt.sign(
      {
        id: superAdmin._id,
        role: "SuperAdmin",
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
      },
      JWT_SECRET,
      {
        expiresIn: "6d",
      }
    );
    return res.json({
      success: true,
      token,
      superAdminId: superAdmin._id,
      superAdminEMailAddress: superAdmin.EMailAddress,
      superAdminRole: superAdmin.role,
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};

exports.adminSignUp = async function (req, res) {
  try {
    console.log(req.body);

    console.log("Profile Photo For Admin", req.file);
    // Generate a token
    const token = crypto.randomBytes(20).toString("hex");
    const tokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    // Create admin without password
    const adminData = {
      ...req.body,
      passwordResetToken: token,
      passwordResetExpires: tokenExpiry,
      photo: "https://api.triphog.net/" + req.file.path,
    };
    console.log("Admin Data", adminData);
    const admin = await AdminModel.create(adminData);

    // Send email with token
    const resetURL = `https://triphog.net/admin/create-password/${token}`;
    const message = `Click on the link to create your password Link Expired after 10 minutes: ${resetURL}`;

    await transport.sendMail({
      from: "admin@triphog.com",
      to: admin.email,
      subject: "Create Your Admin Password",
      text: message,
    });

    res.status(201).json({
      status: "success",
      message:
        "Admin created successfully. Check your email to create a password.",
      data: admin,
    });
  } catch (err) {
    console.log("🧨 Error Occurred ", err);
    res.status(500).json({
      status: "failed",
      message: "Admin creation failed",
    });
  }
};
exports.sendPasswordLink = async (req, res) => {
  console.log("Sending Password Link", req.params.adminId);
  try {
    let admin = await AdminModel.findOne({ _id: req.params.adminId });
    if (!admin) {
      res.json({ success: false });
    } else {
      const token = crypto.randomBytes(20).toString("hex");
      const tokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now
      admin.passwordResetToken = token;
      admin.passwordResetExpires = tokenExpiry;
      await admin.save();
      const resetURL = `https://triphog.net/admin/create-password/${token}`;
      const message = `Click on the link to create your password Link Expired after 10 minutes: ${resetURL}`;

      await transport.sendMail({
        from: "admin@triphog.com",
        to: admin.email,
        subject: "Create Your Admin Password",
        text: message,
      });
      res.json({ success: true });
    }
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
};

// Password Creation Controller
exports.createPassword = async function (req, res) {
  try {
    const { token } = req.params;
    console.log(token);
    const { password, confirmPassword } = req.body;

    const admin = await AdminModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({
        status: "failed",
        message: "Token is invalid or has expired",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: "failed",
        message: "Passwords do not match",
      });
    }

    // Update admin with new password
    let salt = await bcrypt.genSalt(10);
    let hashedPassword = await bcrypt.hash(password, salt);

    admin.password = hashedPassword; // Assuming you have a pre-save hook to hash //the password
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    admin.status = "active";
    await admin.save();

    res.status(200).json({
      status: "success",
      message: "Password created successfully",
    });
  } catch (err) {
    console.log("🧨 Error Occurred ", err);
    res.status(500).json({
      status: "failed",
      message: "Password creation failed",
    });
  }
};

exports.getAllAdmins = async (req, resp) => {
  try {
    let data = await AdminModel.find();
    resp.status(200).json({
      status: "success",
      message: "Admins get Successfully",
      data,
    });
  } catch (err) {
    console.log("🧨 Error Occurred ", err);
    resp.status(500).json({
      status: "failed",
      message: "Admin get Failed",
    });
  }
};

exports.createPayment = async (req, resp) => {
  try {
    const data = await PaymentModel.create({
      ...req.body,
      admin: req.params.id,
    });
    await AdminModel.findByIdAndUpdate(req.params.id, {
      $push: { payments: data._id },
      status: req.body.status,
      plan: req.body.plan,
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    resp.status(201).json({
      status: "success",
      message: "Payment Created Successflly",
    });
  } catch (err) {
    console.log("🧨 Error Occured ", err);
    resp
      .status(500)
      .json({ status: "failed", message: "Payment Creation Failed" });
  }
};

exports.editPayment = async (req, resp) => {
  try {
    const data = await PaymentModel.findByIdAndUpdate(req.params.id, req.body);
    await AdminModel.findByIdAndUpdate(data.admin, {
      status: req.body.status,
      plan: req.body.plan,
    });
    resp.status(200).json({
      status: "success",
      message: "Payment Updated Successfully",
      data,
    });
  } catch (err) {
    console.log("🧨 Error Occured ", err);
    resp
      .status(500)
      .json({ status: "failed", message: "Payment Updation Failed" });
  }
};

exports.deletePayment = async (req, resp) => {
  try {
    const data = await PaymentModel.findByIdAndDelete(req.params.id);
    resp.status(200).json({
      status: "success",
      message: "Payment Deleted Successfully",
    });
  } catch (err) {
    console.log("🧨 Error Occured ", err);
    resp
      .status(500)
      .json({ status: "failed", message: "Payment Deletion Failed" });
  }
};
exports.getAllPayments = async (req, resp) => {
  try {
    const data = await AdminModel.findById(req.params.id).populate({
      path: "payments",
    });
    resp.status(200).json({
      status: "success",
      message: "Payments Get Successfully",
      data,
    });
  } catch (err) {
    console.log("🧨 Error Occured ", err);
    resp.status(500).json({ status: "failed", message: "Payments Get Failed" });
  }
};

exports.getSingleAdmin = async (req, resp) => {
  console.log("Admin Id", req.userId);
  try {
    const data = await AdminModel.findById(req.userId);
    console.log("data", data);
    resp.status(200).json({
      status: "success",
      message: "Admin Get Successfully",
      data,
    });
  } catch (err) {
    console.log("🧨 Error Occured ", err);
    resp.status(500).json({ status: "failed", message: "Admin Get Failed" });
  }
};

exports.updateAdmin = async (req, resp) => {
  if (req.file) {
    req.body.photo = "https://api.triphog.net/" + req.file.path;
  }
  try {
    const data = await AdminModel.findByIdAndUpdate(req.params.id, req.body);
    resp.status(200).json({
      status: "success",
      message: "Admin Updated Successfully",
      data,
    });
  } catch (err) {
    console.log("🧨 Error Occured ", err);
    resp
      .status(500)
      .json({ status: "failed", message: "Admin Updation Failed" });
  }
};
exports.getAdminById = async (req, res) => {
  try {
    const admin = await AdminModel.findById(req.params.adminId);
    res.json({ success: true, admin });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.reActivateAdmin = async (req, res) => {
  try {
    await AdminModel.findByIdAndUpdate(req.params.adminId, { isOnHold: false });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
};
exports.holdAdmin = async (req, res) => {
  try {
    await AdminModel.findByIdAndUpdate(
      req.params.adminId,
      { isOnHold: true, warningMsg: req.body.warningMsg },
      { new: true, runValidators: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: true });
  }
};
exports.deleteAdmin = async (req, resp) => {
  try {
    const data = await AdminModel.findByIdAndDelete(req.params.id);
    resp.status(200).json({
      status: "success",
      message: "Admin Deleted Successfully",
    });
  } catch (err) {
    console.log("🧨 Error Occured ", err);
    resp
      .status(500)
      .json({ status: "failed", message: "Admin Deletion Failed" });
  }
};

exports.giveWarning = async (req, resp) => {
  try {
    const getAdmin = await AdminModel.findById(req.params.id).populate({
      path: "payments",
    });
    const id = getAdmin.payments[getAdmin.payments.length - 1];
    const data = await PaymentModel.findByIdAndUpdate(id, req.body);
    resp.status(201).json({
      status: "success",
      message: "Warning Send Successfully",
    });
  } catch (err) {
    console.log("🧨 Error Occured ", err);
    resp.status(500).json({ status: "failed", message: "Warning Send Failed" });
  }
};

exports.getUsersForChat = async (req, res) => {
  try {
    const allAdmins = await AdminModel.find({})
      .select("_id firstName lastName photo")
      .sort({ createdAt: -1 })
      .lean();

    const allUsers = await UserModel.find({})
      .select("_id firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    const admins = allAdmins.map((a) => ({ ...a, role: "Admin" }));
    const users = allUsers.map((a) => ({ ...a, role: "User" }));

    const allUsersToChat = [...admins, ...users];

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
          { id: senderId, role: "SuperAdmin" },
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
        role: "SuperAdmin",
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
    const { id: superAdminId } = req.user;

    const allConversations = await ChatConversation.aggregate([
      {
        $match: {
          recipients: {
            $elemMatch: {
              id: mongoose.Types.ObjectId.createFromHexString(superAdminId),
              role: "SuperAdmin",
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
                    mongoose.Types.ObjectId.createFromHexString(superAdminId),
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
          from: "triphogusers",
          localField: "otherRecipient.id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $addFields: {
          recipient: {
            $cond: {
              if: { $eq: ["$otherRecipient.role", "Admin"] },
              then: { $arrayElemAt: ["$adminDetails", 0] },
              else: { $arrayElemAt: ["$userDetails", 0] },
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

    const { id: superAdminId } = req.user;

    const conversation = await ChatConversation.findOneAndDelete({
      _id: conversationId,
      recipients: {
        $elemMatch: { id: superAdminId, role: "SuperAdmin" },
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
