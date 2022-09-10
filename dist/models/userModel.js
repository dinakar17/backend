import crypto from 'crypto';
import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';
// For more info on Mongoose schemas, see https://mongoosejs.com/docs/schematypes.html
//TODO - Setup a logout timestamp and make jwt invalid just like with passwordChangedAt.
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: [true, 'Please tell us your name!'] means that the name field is required and if it is not provided, the error message will be 'Please tell us your name!'
        required: [true, 'Please tell us your name!'],
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        // unique: true means that the email field must be unique. If it is not unique, the error message will be 'Email address already exists'
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email'],
    },
    photo: {
        type: String,
        // default: 'default.jpg',
    },
    isVerified: { type: Boolean, default: false },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // This only works on CREATE and SAVE!!! - wont work on UPDATE
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords are not the same!',
        },
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    signupToken: String,
    signupTokenExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
}, {
    timestamps: true,
});
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});
userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew)
        return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});
userSchema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } });
    next();
});
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};
// type of JWTTimestamp is number
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
};
userSchema.methods.createSignupToken = function () {
    // crypto.randomBytes(32).toString('hex') returns a random string of 32 characters. For example: 3b9d6bcdbbfd4b2d9b5dab8dfbbd4bed
    const token = crypto.randomBytes(32).toString('hex');
    // The below line of code hashes the token and returns the hash
    this.signupToken = crypto.createHash('sha256').update(token).digest('hex');
    // signupTokenExpires expires in 12 hours from now
    this.signupTokenExpires = Date.now() + 12 * 60 * 60 * 1000;
    return token;
};
const User = mongoose.model('User', userSchema);
export default User;