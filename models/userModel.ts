import crypto from "crypto";
import mongoose, {Schema} from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser {
  name: string;
  email: string;
  photo: string;
  isVerified: boolean;
  bio: string;
  password: string;
  passwordConfirm: string;
  role: {
    isAdmin: boolean;
    adminBranch: string;
    adminSemester: string;
  };
  passwordChangedAt: Date;
  passwordResetToken: string;
  passwordResetExpires: Date;
  signupToken: string | undefined;
  signupTokenExpires: Date | undefined;
  active: boolean;

  correctPassword: (
    candidatePassword: String,
    userPassword: String
  ) => Promise<boolean>;
  changedPasswordAfter: (JWTTimestamp: Number) => boolean;
  createPasswordResetToken: () => string;
  createSignupToken: () => string;
}

let validateEmail = function (email: string) {
  // check whether the email is valid and ends with "@nitc.ac.in"
  const regex = /^([a-zA-Z0-9_\-\.]+)@nitc\.ac\.in$/;
  const re = new RegExp(regex);
  return re.test(email);
};

const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Please tell us your name!"],
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
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
      validate: {
        // This only works on CREATE and SAVE!!! - wont work on UPDATE
        validator: function (el: String): boolean {
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
  },
  {
    timestamps: true,
  }
);

// Hash password before saving to DB
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined as any; // Clear passwordConfirm field after validation

  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = (Date.now() - 1000) as any;
  next();
});

userSchema.pre(/^find/, function (next) {
  // @ts-ignore
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword: String,
  userPassword: String
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// type of JWTTimestamp is number
userSchema.methods.changedPasswordAfter = function (JWTTimestamp: Number) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      (this.passwordChangedAt.getTime() / 1000) as any,
      10
    );
    //@ts-ignore
    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;

  return resetToken;
};

userSchema.methods.createSignupToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.signupToken = crypto.createHash("sha256").update(token).digest("hex");

  this.signupTokenExpires = Date.now() + 12 * 60 * 60 * 1000;

  return token;
};

const User = mongoose.model("User", userSchema);

export default User;