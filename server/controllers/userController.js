import User from "../models/userModel.js";
import AppError from "../utils/appError.js";

const register = async (req, res, next) => {
    const { fullName, email, password } = req.body;

    // Check if the data is there or not, if not throw error message
    if (!fullName || !email || !password) {
        return next(new AppError('All fields are required', 400));
    }

    // Check if the user exists with the provided email
    const userExists = await User.findOne({ email });

    // If user exists send the reponse
    if (userExists) {
        return next(new AppError('Email already exists', 409));
    }

    // Create new user with the given necessary data and save to DB
    const user = await User.create({
        fullName,
        email,
        password
    });

    // If user not created send message response
    if (!user) {
        return next(
            new AppError('User registration failed, please try again later', 400)
        );
    }
    
}

const login = async (req, res, next) => {
    const { email, password } = req.body;

    // Check if the data is there or not, if not throw error message
    if (!email || !password) {
        return next(new AppError('Email and Password are required', 400));
    }

    // Finding the user with the sent email
    const user = await User.findOne({ email }).select('+password');

    // If no user or sent password do not match then send generic response
    if (!(user && (await user.comparePassword(password)))) {
        return next(
            new AppError('Email or Password do not match or user does not exist', 401)
        );
    }

    // Generating a JWT token
    const token = await user.generateJWTToken();

    // Setting the password to undefined so it does not get sent in the response
    user.password = undefined;
    // If all good send the response to the frontend
    res.status(200).json({
        success: true,
        message: 'User logged in successfully',
        user,
    });
}


export { login, register };