const { Schema, model } = require("mongoose");

const participantSchema = new Schema(
  {
    id: { type: Schema.Types.ObjectId, required: true },
    role: {
      type: String,
      enum: ["Admin", "SuperAdmin", "User"],
      required: true,
    },
  },
  { _id: false }
);

const chatConversationSchema = new Schema(
  {
    // superAdminId: {
    //   type: Schema.Types.ObjectId,
    //   ref: "TriphogSuperAdmin",
    //   required: [true, "SuperAdmin ID is required."],
    // },
    // recipientId: {
    //   type: Schema.Types.ObjectId,
    //   required: [true, "Recipient ID is required."],
    // },
    latestMessage: {
      type: String,
      default: "",
    },
    recipients: { type: [participantSchema] },
  },
  { timestamps: true }
);

const ChatConversation = model("ChatConversation", chatConversationSchema);

module.exports = ChatConversation;
