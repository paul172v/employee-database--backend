const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const adminController = require("../dev-docs/defaultEmployees");

// router
//   .route("/")
//   .get(authController.protectAndRestrictTo("user"), userController.getAll);

router.route("/").get(userController.getAll);

router.route("/get-birthdays").get(userController.getBirthdays);

router.route("/signup").post(authController.signup);

router.route("/login").post(authController.login);

router.route("/forgot-password").post(authController.forgotPassword);

router.route("/reset-password").patch(authController.resetPassword);

router.route("/change-password").patch(authController.changePassword);

router.route("/delete-all").delete(userController.deleteAll);

router.route("/create-batch-users").post(adminController.createEmployees);

router.route("/specific-search").post(userController.specificSearch);

router.route("/sort-users").post(userController.sortUsers);

router.route("/get-user").get(authController.getUserFromToken("user"));

router.route("/update-profile").post(userController.updateUser);

// router.route("/download-photo/:email").get(userController.downloadPhoto);

module.exports = router;
