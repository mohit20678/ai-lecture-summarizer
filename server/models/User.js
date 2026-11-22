const bcryptjs = require("bcryptjs");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*\.\w{2,}$/, "Please fill a valid email address"],
    },
    password: {
      type: String,
      select: false, // never return password in queries
    },
    googleId: {
      type: String,
      sparse: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    profilePhoto: {
      type: String,
      default: "",
    },

    // Google Drive integration
    driveRefreshToken: {
      type: String,
      select: false, // don't return in JSON by default
    },
    driveFolderId: {
      type: String,
      default: null,
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    loginHistory: [
      {
        loginAt: {
          type: Date,
          default: Date.now,
        },
        ip: {
          type: String,
        },
        userAgent: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

// Index for faster email lookups
userSchema.index({ email: 1 });

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  const user = this;
  const isMatch = await bcryptjs.compare(candidatePassword, user.password);
  return isMatch;
};

// Static method to find user by email (for login)
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

module.exports = mongoose.model("User", userSchema);