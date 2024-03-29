import crypto from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
let validateEmail = function (email) {
    // check whether the email is valid and ends with "@nitc.ac.in"
    const regex = /^([a-zA-Z0-9_\-\.]+)@nitc\.ac\.in$/;
    const re = new RegExp(regex);
    return re.test(email);
};
// For more info on Mongoose schemas, see https://mongoosejs.com/docs/schematypes.html
//TODO - Setup a logout timestamp and make jwt invalid just like with passwordChangedAt.
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: [true, 'Please tell us your name!'] means that the name field is required and if it is not provided, the error message will be 'Please tell us your name!'
        required: [true, "Please tell us your name!"],
    },
    email: {
        type: String,
        required: [true, "Please provide your email"],
        // unique: true means that the email field must be unique. If it is not unique, the error message will be 'Email address already exists'
        unique: true,
        lowercase: true,
        validate: [validateEmail, "Your email must be a valid NITC email"],
    },
    photo: {
        type: String,
        // default: 'default.jpg',
    },
    bio: {
        type: String,
        default: "",
    },
    isVerified: { type: Boolean, default: false },
    password: {
        type: String,
        required: [true, "Please provide a password"],
        minlength: 8,
        select: false,
    },
    // Note: passwordConfirm is not a field in the database because it is not in the schema. It is only used for validation purposes. It is not saved to the database
    passwordConfirm: {
        type: String,
        required: [true, "Please confirm your password"],
        // custom validator to check if password and passwordConfirm are the same
        validate: {
            // This only works on CREATE and SAVE!!! - wont work on UPDATE
            validator: function (el) {
                // @ts-ignore
                return el === this.password;
            },
            message: "Passwords are not the same!",
        },
    },
    role: {
        isAdmin: {
            type: Boolean,
            default: false,
        },
        adminBranch: {
            type: String,
            default: "",
        },
        adminSemester: {
            type: String,
            default: "",
        },
    },
    // Note: passwordChangedAt, passwordResetToken, passwordResetExpires, signupToken, signupTokenExpires are fields but they get set at a later time. They are not set when the user is created
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    signupToken: String,
    signupTokenExpires: Date,
    // active: { type: Boolean, default: true, select: false } means that the active field is a boolean and the default value is true.
    // The select: false means that the active field will not be returned in the response.
    active: {
        type: Boolean,
        default: true,
        // select: false means that the active field will not be returned in the response.
        select: false,
    },
    // set admin based on branch
}, 
// The below line of code means that when the data is outputted as JSON or Object, virtual properties will be included.
// For more info, see https://mongoosejs.com/docs/guide.html#toJSON
{
    // this will create "createdAt", "updatedAt" fields
    timestamps: true,
});
// Mongoose middleware that runs before the save command and runs the below function
userSchema.pre("save", async function (next) {
    // this.isModified('password') means that if the password field is modified, then run the below code
    if (!this.isModified("password"))
        return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});
userSchema.pre("save", function (next) {
    // !this.Modified() || this.isNew means that if the password field is modified or if the document is new, then run the below code
    if (!this.isModified("password") || this.isNew)
        return next();
    // this.passwordChangedAt is set to the current time minus 1 second. This is done because the JWT is created before the passwordChangedAt field is updated.
    // So, if the JWT is created before the passwordChangedAt field is updated, the JWT will be valid even though the password has been changed.
    // So, by subtracting 1 second, the JWT will be invalid if it is created before the passwordChangedAt field is updated.
    this.passwordChangedAt = (Date.now() - 1000);
    next();
});
// userSchema.pre(/^find/, fn) means that the function fn will run before any query that starts with find
userSchema.pre(/^find/, function (next) {
    // $ne means not equal to
    // @ts-ignore
    this.find({ active: { $ne: false } });
    next();
});
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};
// type of JWTTimestamp is number
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt((this.passwordChangedAt.getTime() / 1000), 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};
userSchema.methods.createPasswordResetToken = function () {
    // | resetToken is a random string of 32 characters
    const resetToken = crypto.randomBytes(32).toString("hex");
    // | encrypt the resetToken and save it to the database
    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    // | set the passwordResetExpires to 10 minutes from now
    this.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    return resetToken;
};
userSchema.methods.createSignupToken = function () {
    // crypto.randomBytes(32).toString('hex') returns a random string of 32 characters.
    // For example: 3b9d6bcdbbfd4b2d9b5dab8dfbbd4bed
    const token = crypto.randomBytes(32).toString("hex");
    // The below line of code hashes the token and returns the hash
    this.signupToken = crypto.createHash("sha256").update(token).digest("hex");
    // signupTokenExpires expires in 12 hours from now
    // Here 12 hours is converted to milliseconds i.e., 12 x 60 minutes x 60 seconds x 1000 milliseconds
    this.signupTokenExpires = Date.now() + 12 * 60 * 60 * 1000;
    return token;
};
const User = mongoose.model("User", userSchema);
export default User;
/*
{
    "status": "success",
    "data": {
      // The below line of code means that the user is created and the user is returned in the response
        "user": {
            "name": "firstName + lastName",
            "email": "email",
            "isVerified": false,
            "password": "$2a$12$rrBl9UCTixEVnZ.EeVGeo.3pp3xZSVFQqvGu2WjY9EvDNKH2eHsoG",
            "role": "user",
            "active": true,
            "_id": "631b20e34fcb993003ca2800",
            "createdAt": "2022-09-09T11:17:55.991Z",
            "updatedAt": "2022-09-09T11:17:55.991Z",
            "__v": 0
        }
    }
}
// ? App is getting crashed when there is an error in the Mongodb when using user.save().then(res.send("User created")).catch(err => console.log(err))
*/
