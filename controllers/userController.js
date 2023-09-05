const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const User = require("../models/userModel");

exports.getAll = async (req, res, next) => {
  try {
    const users = await User.find();

    res.status(200).json({
      status: "success",
      message: "Test 1 passed",
      payload: users,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message,
    });
  }
};

// exports.downloadPhoto = async (req, res, next) => {
//   try {
//     const user = await User.findOne({ email: req.params.email }); // Use findOne instead of find

//     if (!user) {
//       return res.status(404).send("User not found.");
//     }

//     const filename = `${user.firstName}${user.lastName}.jpg`;
//     const filePath = path.join(
//       __dirname,
//       "../public-backend/img/user-photos/",
//       filename
//     );

//     res.status(200).download(filePath);
//   } catch (err) {
//     res.status(500).json({
//       status: "error",
//       message: err.message,
//     });
//   }
// };

exports.getBirthdays = async (req, res, next) => {
  try {
    const users = await User.find();

    const userBirthdaysThisMonth = [];
    const userBirthdaysNextMonth = [];

    // Get this month and next month in numerical format
    const todayDate = new Date();
    const todayDay = String(todayDate).slice(8, 10);
    const todayMonth = String(todayDate.getMonth() + 1).padStart(2, "0");
    const nextMonth = String(todayDate.getMonth() + 2).padStart(2, "0");

    // Sort through all birthdays and find the ones on this or
    // next month, and that are not before today,
    // then send them to the corresponding arrays
    const placeholderArr = [];

    for (let user of users) {
      if (user.DOB) {
        const userMonth = user.DOB.slice(0, 2);
        const userDay = user.DOB.slice(3, 5);

        userMonth === todayMonth &&
          userDay >= todayDay &&
          userBirthdaysThisMonth.push([
            user.email,
            user.DOB,
            user.firstName,
            user.lastName,
          ]);
        userMonth === nextMonth &&
          user.DOB &&
          userBirthdaysNextMonth.push([
            user.email,
            user.DOB,
            user.firstName,
            user.lastName,
          ]);
      }
    }

    // Sort all the birthdays in both months by day,
    // then combine them into a single array

    userBirthdaysThisMonth.map((user) => {
      placeholderArray = user[1].split("/");
      const day = Number(placeholderArray[1]);
      user.push(day);
    });

    const sortedUserBirthdaysThisMonth = userBirthdaysThisMonth.sort(
      (a, b) => a[4] - b[4]
    );

    sortedUserBirthdaysThisMonth.map((user) => {
      user.pop();
    });

    userBirthdaysNextMonth.map((user) => {
      placeholderArray = user[1].split("/");
      const day = Number(placeholderArray[1]);
      user.push(day);
    });

    const sortedUserBirthdaysNextMonth = userBirthdaysNextMonth.sort(
      (a, b) => a[4] - b[4]
    );

    sortedUserBirthdaysNextMonth.map((user) => {
      user.pop();
    });

    const combinedBirthdays = sortedUserBirthdaysThisMonth.concat(
      sortedUserBirthdaysNextMonth
    );

    res.status(200).json({
      status: "success",
      message: "Test 1 passed",
      payload: combinedBirthdays,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.deleteAll = async (req, res, next) => {
  try {
    const users = await User.deleteMany();

    res.status(200).json({
      status: "success",
      message: "All users deleted successfully",
    });
  } catch (err) {
    status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.specificSearch = async (req, res, next) => {
  try {
    let users;
    if (req.body.criteria === "firstName") {
      users = await User.find({ firstName: req.body.targetWord });
    } else if (req.body.criteria === "lastName") {
      users = await User.find({ lastName: req.body.targetWord });
    } else if (req.body.criteria === "position") {
      users = await User.find({ position: req.body.targetWord });
    } else if (req.body.criteria === "department") {
      users = await User.find({ department: req.body.targetWord });
    } else if (req.body.criteria === "phone") {
      users = await User.find({ phone: req.body.targetWord });
    } else if (req.body.criteria === "email") {
      users = await User.find({ email: req.body.targetWord });
    }

    res.status(200).json({
      status: "success",
      payload: users,
    });
  } catch (err) {
    status(404).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.sortUsers = (req, res, next) => {
  const users = req.body.users;

  res.status(200).json({
    status: "success",
    message: "This has been sent!",
    payload: users,
  });
};

exports.updateUser = async (req, res, next) => {
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

    ///////
    const storageEngine = multer.diskStorage({
      destination: "./public/img/user-photos/",
      filename: function (req, file, callback) {
        callback(
          null,
          currentUser.firstName +
            currentUser.lastName +
            path.extname(file.originalname)
        );
      },
    });

    const fileFilter = (req, file, callback) => {
      const pattern = /\.jpe?g|\.png|\.svg/i; // Corrected file extension pattern

      if (pattern.test(path.extname(file.originalname))) {
        callback(null, true);
      } else {
        callback(new Error("Error: not a valid file"));
      }
    };

    const upload = multer({
      storage: storageEngine,
      fileFilter,
    }).single(`${currentUser.firstName}${currentUser.lastName}`); // Use .single() for single file uploads

    upload(req, res, function (err) {
      if (err) {
        return res.status(400).json({
          status: "fail",
          message: err.message,
        });
      }

      res.status(200).json({
        status: "success",
        message: "File uploaded successfully",
      });
    });
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};
