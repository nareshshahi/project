import AppError from '../utils/error.util.js';
import User from "../models/user.model.js";
import cloudinary from 'cloudinary'
import sendEmail from 'nodemailer';
import fs from 'fs/promises'



const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true
}


const register = async (req, res, next) => {

    const { fullName, email, password, } = req.body;
    if (!fullName || !email || !password) {
        return next(new AppError('All fields are required , 400'));
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        return next(new AppError('email alredy exists', 400))
    }

    const user = await User.create({
        fullName,
        email,
        password,
        avatar: {
            public_id: email,
            secure_url: ''
        }
    });



    if (!user) {
        return next(new AppError('user regeistration fails ', 400))
    }


    // todo:file upload
    if (req.file) {
        console.log('file detailss>', JSON.stringify(req.file));
        try {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'lms',
                width: 250,
                height: 250,
                gravity: 'faces',
                crop: 'fill'
            });
            if (result) {
                user.avatar.public_id = result.public_id;
                user.avatar.secure_url = result.secure_url;

                // remove from derver 

                // fs.rm(`uploads/${req.file.filename}`)
            }
        } catch (error) {
            return next(
                new AppError ('file not uploaded , please try again', 500)
            )



        }
    }


    await user.save();
    user.password = undefined; //




    res.status(200).json({
        sucess: true,
        message: true,
        message: 'user registerd sucessfully',
        user


    })

};
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new AppError('all fields required', 400));
        }
        const user = await User.findOne({ email }).select('+password');
        if (!user || !user.comparePassword(password)) {
            return next(new AppError('User with given email does not exist', 400))
        }
        const match=await user.comparePassword(password);
        if(!match){
            return next(new AppError("Password does not match",400))
        }
        const token = await user.generateJWTToken();
        user.password = undefined;

        res.cookie('token', token, cookieOptions);
        res.status(200).json({
            success: true,
            message: "user login sucessfully",
            user  //
        });

    }


    catch (error) {
        return (new AppError(e.message, 500));

    }



}


const logout = (req, res) => {
    res.cookie('token', null, {
        secure: true,
        maxAge: 0,
        httpOnly: true
    });
    res.status(200).json({
        success: true,
        message: 'user log out sucessfully'
    });

};
// const getProfile = async (req, res, next) => {
//     try {
//         const userID = req.user.id;
//         const user = await user.findByID(userID);

//         res.status(200).json({
//             sucess: true,
//             message: 'user deatails',
//             user
//         })
//     } catch (error) {

//         return next(new AppError('failed to fetch error'));
//     }

// }


const forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return next(new AppError('email required', 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
        return next(new AppError('email not regesiter', 400));
    }

    const resetToken = await user.generatePasswordResetToken();
    await user.save();
    const resetPasswordURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const subject = "reset password"
    const message = `you can reset your password by clicking <a href= ${resetPasswordURL} target = "_blank ">Reset your password </a>\n if the link does not work for some reason the copy this kink in new tab ${resetPasswordURL}.\n  `;
    try {
        await sendEmail(email, subject, message);
        res.status(200).json({
            sucess: true,
            message: `reset password token has been sent to ${email} sucesfully`
        })
    } catch (error) {

        user.forgotPasswordExpiry = undefined;
        user.forgotPasswordToken = undefined;
        await user.save();
        return next(new AppError(error.message, 500));


    }

}



const resetPassword = async (req, res) => {
    const { resetToken } = req.parms;
    const { password } = req.body;
    const forgetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

    const user = await User.findOne({
        forgetPasswordToken,
        forgotPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
        return next(
            new AppError('token is invalid or expired please try again,400')
        )
    }
    user.password = password;
    user.forgetPasswordToken = undefined;
    user.fotgerPasswordExpiry = undefined;
    user.save();

    res.status(200).json({
        sucess: true,
        message: 'password changed sucessfully'
    })

}


const changePassword = async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    const { id } = req.user;
    console.log(id);

    if (!oldPassword || !newPassword) {
        return next(
            new AppError('all field are mandatiory', 400)
        )

    }

    const user = await User.find({ _id: id }).select('+password');
    console.log(user);
    if (!user) {
        return next(
            new AppError('user does not exist ', 400)
        )

    }


    const isPasswordValid = await user.comparePassword(oldPassword);
    if (!isPasswordValid) {

        return next(
            new AppError('invalid old password', 400)
        )
    }
    user.password = newPassword;
    await user.save();
    user.password = undefined;
    res.status(200).json({
        sucess: true,
        message: 'password changed sucessfully'

    })
}



const updateUser = async (req, res) => {
    const { fullName } = req.body;
    const { id } = req.user.id;

    const user = await User.findById(id);
    if (!user) {
        return next(
            new AppError('user does not exist ', 400)

        )

    }
    if (req.fullName) {
        user.fullName = fullName;
    }
    if (req.file) {
        await cloudinary.v2.uploader.destroy(user.public_id);
        try {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'lms',
                width: 250,
                height: 250,
                gravity: 'faces',
                crop: 'fill'
            });
            if (result) {
                user.avatar.public_id = result.public_id;
                user.avatar.secure_url = result.secure_url;

                // remove from derver 

                fs.rm(`uploads/${req.file.filename}`)
            }
        } catch (error) {
            return next(
                new AppError(error || 'file not uploaded , please try again', 500)
            )



        }

    }
    await user.save();

    res.status(200).json({
        sucess: true,
        message: 'user details update sucessfully'

    });

}

export {
   
    login,
    logout,
    register,
    forgotPassword,
    resetPassword,
    changePassword


}