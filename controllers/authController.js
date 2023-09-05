const crypto = require("crypto");
const { promisify } = require("util");
require("dotenv").config({ path: "../config.env" });
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const sendEmail = require("../utils/email");
const catchAsync = require("../utils/catchAsync");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

exports.signup = async (req, res) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordChangedAt: req.body.passwordChangedAt,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.status(201).json({
      status: "success",
      message: "New user created",
      token,
      payload: newUser,
    });
  } catch (err) {
    res.status(501).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Do entered email and password exist? This is handled in React

    // Does user exist in the DB and is password correct?
    const user = await User.findOne({ email: email });

    if (!user || !(await user.correctPassword(password, user.password))) {
      console.log("Email or password are incorrect");
      return next(
        res.status(401).json({
          status: "fail",
          message: "Incorrect username or password, you are not logged in.",
        })
      );
    }

    // If all is okay send token to client
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.status(200).json({
      status: "success",
      message: "User is logged in",
      token,
      payload: user,
    });
  } catch (err) {
    res.status(501).json({
      status: "fail",
      message: err.message,
    });
  }
};

// roles is an array
exports.protectAndRestrictTo = (...roles) => {
  return async (req, res, next) => {
    try {
      // 1) Get token and check if it exists
      let token;
      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("jwt=Bearer ")
      ) {
        const placeholder = req.headers.authorization.split("jwt=Bearer ");
        token = placeholder[1];
      }

      if (!token) {
        console.log("❌ 401: No token, you are not logged in");
        return next(
          res.status(401).json({
            status: "fail",
            message: "No token, you are not logged in",
          })
        );
      }

      // 2) Verify token
      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET
      );

      // 3) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        console.log("❌ User belonging to token not found");
        return next(
          res.status(401).json({
            status: "fail",
            message: "User belonging to token not found, you are not logged in",
          })
        );
      }

      // 4) Check if user changed password after token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        console.log(
          "❌ 401: Password changed after token assigned, you are not logged in"
        );
        return next(
          res.status(401).json({
            status: "fail",
            message:
              "Password changed after token assigned, you are not logged in",
          })
        );
      }

      // 5: Conditional) Check if user's role matches the specified restricted roles
      if (roles.length > 0 && !roles.includes(currentUser.role)) {
        return next(
          res.status(403).json({
            status: "fail",
            message: "You do not have permission to perform this action",
          })
        );
      }
    } catch (err) {
      console.log(err.message);

      if (err.message === "Invalid signature") {
        console.log("❌ 401: Invalid signature, you are not logged in");
        return next(
          res.status(401).json({
            status: "fail",
            message: "Invalid signature, you are not logged in",
          })
        );
      }

      /* Both config.env and document.cookies (in React) should be set with expiry timer */
      /* Remember when changing JWT_EXPIRES_IN, server must be reset for changes to take effect */
      if (err.message === "jwt expired") {
        console.log("❌ jwt expired");
        return next(
          res.status(401).json({
            status: "fail",
            message: "JWT expired, you are not logged in",
          })
        );
      }
    }

    next();
  };
};

exports.forgotPassword = async (req, res, next) => {
  try {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });

    if (user.length === 0 || !user) {
      console.log("❌ No user found with this email!");
      return next(
        res.status(404).json({
          status: "fail",
          message: "No user found with this email, token could not be sent",
        })
      );
    }

    // 2) Generate random token

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    console.log(
      { sentResetToken: resetToken }, // Original token
      { documentResetToken: user.passwordResetToken } // Hashed token
    );

    let placeholderDate = Date.now() + 10 * 60 * 1000;

    await User.findOneAndUpdate(
      { email: req.body.email },
      { passwordResetToken: user.passwordResetToken },
      { passwordResetExpires: placeholderDate }
    );

    console.log(
      `⚠️ passwordResetExpires: ${Date.parse(
        user.passwordResetExpires
      )}, ${Date.now()}`
    );

    // 3) Send token as email

    const message = `Your token is... ${resetToken}. \n If you didn't forget your password please ignore this email. \n  `;

    const transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "40052abfdaab02",
        pass: "9d182883a7593c",
      },
    });

    const mailOptions = {
      from: "testAdmin@test.com",
      to: "me@me.com",
      subject: "This is a test",
      text: `This is a test, your token is... ${resetToken}`,
    };

    try {
      await transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error occurred:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });

      res.status(200).json({
        status: "success",
        message: "Token sent to email",
      });
    } catch (err) {
      await User.findByIdAndUpdate(user.id, {
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      });

      console.log("❌ There was an error sending this email! try again later");
      console.log(err.message);
      return next(
        res.status(500).json({
          status: "fail",
          message: "There was an error sending this email, try again later",
        })
      );
    }
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    // 1) Get user based on the token, check if token has expired
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.body.token) // would normally be req.params.token
      .digest("hex");

    let user = await User.findOne({
      passwordResetToken: hashedToken,
    });

    // 2) Set password but only if there is a user
    if (!user) {
      console.log("❌ Token is invalid");
      return next(
        res.status(400).json({
          status: "fail",
          message: "Token is invalid or token has expired",
        })
      );
    }

    if (user && Date.parse(user.passwordResetExpires) > Date.now()) {
      console.log("❌ Token has expired");
      return next(
        res.status(400).json({
          status: "fail",
          message: "Token is invalid or token has expired",
        })
      );
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    await User.findByIdAndUpdate(user.id, {
      password: hashedPassword,
      passwordChangedAt: Date.now(),
      passwordResetToken: null,
      passwordResetExpires: undefined,
    });

    // 3) Update changedPasswordAt property for current user

    // 4) Log the user in, send JWT to client
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.status(200).json({
      status: "success",
      message: "User is logged in",
      payload: user,
    });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    // 1) Get token and check if it exists
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("jwt=Bearer ")
    ) {
      const placeholder = req.headers.authorization.split("jwt=Bearer ");
      token = placeholder[1];
    }

    if (!token) {
      console.log("❌ 401: No token, you are not logged in");
      return next(
        res.status(401).json({
          status: "fail",
          message: "No token, you are not logged in",
        })
      );
    }

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      console.log("❌ User belonging to token not found");
      return next(
        res.status(401).json({
          status: "fail",
          message: "User belonging to token not found, you are not logged in",
        })
      );
    }

    if (
      !(await currentUser.correctPassword(
        req.body.curPassword,
        currentUser.password
      ))
    ) {
      console.log("❌ Current password is incorrect");
      return next(
        res.status(401).json({
          status: "fail",
          message: "Current password is incorrect, please try again",
        })
      );
    }

    /////
    const hashedPassword = await bcrypt.hash(req.body.newPassword, 12);

    await User.findByIdAndUpdate(currentUser._id, {
      password: hashedPassword,
      passwordChangedAt: Date.now(),
      passwordResetToken: null,
      passwordResetExpires: undefined,
    });

    res.status(200).json({
      status: "success",
      user: currentUser,
    });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.getUserFromToken = (...roles) => {
  return async (req, res, next) => {
    try {
      // 1) Get token and check if it exists
      let token;
      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("jwt=Bearer ")
      ) {
        const placeholder = req.headers.authorization.split("jwt=Bearer ");
        token = placeholder[1];
      }

      if (!token) {
        console.log("❌ 401: No token, you are not logged in");
        return next(
          res.status(401).json({
            status: "fail",
            message: "No token, you are not logged in",
          })
        );
      }

      // 2) Verify token
      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET
      );

      // 3) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        console.log("❌ User belonging to token not found");
        return next(
          res.status(401).json({
            status: "fail",
            message: "User belonging to token not found, you are not logged in",
          })
        );
      }

      // 4) Check if user changed password after token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        console.log(
          "❌ 401: Password changed after token assigned, you are not logged in"
        );
        return next(
          res.status(401).json({
            status: "fail",
            message:
              "Password changed after token assigned, you are not logged in",
          })
        );
      }

      // 5: Conditional) Check if user's role matches the specified restricted roles
      if (roles.length > 0 && !roles.includes(currentUser.role)) {
        return next(
          res.status(403).json({
            status: "fail",
            message: "You do not have permission to perform this action",
          })
        );
      }

      return res
        .status(200)
        .json({
          status: "success",
          message: "This worked",
          payload: currentUser,
        });
    } catch (err) {
      console.log(err.message);

      if (err.message === "Invalid signature") {
        console.log("❌ 401: Invalid signature, you are not logged in");
        return next(
          res.status(401).json({
            status: "fail",
            message: "Invalid signature, you are not logged in",
          })
        );
      }

      /* Both config.env and document.cookies (in React) should be set with expiry timer */
      /* Remember when changing JWT_EXPIRES_IN, server must be reset for changes to take effect */
      if (err.message === "jwt expired") {
        console.log("❌ jwt expired");
        return next(
          res.status(401).json({
            status: "fail",
            message: "JWT expired, you are not logged in",
          })
        );
      }
    }

    next();
  };
};
