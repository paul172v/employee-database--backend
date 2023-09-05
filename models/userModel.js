const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "User must have a first name"],
    default: "John",
  },
  lastName: {
    type: String,
    required: [true, "User must have a last name"],
    default: "Doe",
  },
  gender: {
    type: String,
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  department: {
    type: String,
    enum: [
      "Administration",
      "Reception",
      "Restaurant",
      "Kitchen",
      "Housekeeping",
      "Maintenance",
      "All Departments",
    ],
  },
  position: {
    type: String,
    enum: [
      "General Manager",
      "Assistant Manager",
      "Head Receptionist",
      "Receptionist",
      "FOH Manager",
      "Restaurant Manager",
      "Waiting Staff",
      "Bartender",
      "Head Chef",
      "Sous Chef",
      "Pastry Chef",
      "Line Chef",
      "Kitchen Porter",
      "Head Housekeeper",
      "Housekeeper",
      "General Assistant",
      "Maintenance",
    ],
  },

  role: {
    type: String,
    required: [true, "User must have a role"],
    enum: ["user", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "User must have a password"],
  },
  DOB: {
    type: String,
  },
  streetAddress: {
    type: String,
  },
  CityTown: {
    type: String,
  },
  postcode: {
    type: String,
  },
  nationality: {
    type: String,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "User must have an email"],
    unique: [true, "User's email must be unique"],
  },
  NINumber: {
    type: String,
  },
  shareCode: {
    type: String,
  },
  visa: {
    type: String,
  },
  NoKName: {
    type: String,
  },
  NoKRelation: {
    type: String,
  },
  NoKPhone: {
    type: String,
  },
  startDate: {
    type: String,
  },
  contractType: {
    type: String,
  },
  ratePerHour: {
    type: Number,
  },
  avgWeeklyHours: {
    type: Number,
  },
  endDate: {
    type: String,
  },
  bankName: {
    type: String,
  },
  sortCode: {
    type: String,
  },
  accountNumber: {
    type: Number,
  },
  nameOnAccount: {
    type: String,
  },

  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

userSchema.pre("save", async function (next) {
  // Only run if the password was modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000; // The -1000 (1second) is to avoid bugs where there is a delay before the document is saved

  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }

  // false means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log(
    { sentResetToken: resetToken },
    { documentResetToken: this.passwordResetToken }
  );

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins

  return resetToken;
};

///
userSchema.methods.test = function () {
  console.log("⚠️⚠️⚠️⚠️ This is a schema methods test");
};
///

const User = mongoose.model("User", userSchema);

module.exports = User;
