import nodemailer from "nodemailer";
import pug from "pug";
import { convert } from "html-to-text";

import { dirname } from "path";
import { fileURLToPath } from "url";
import { HydratedDocument } from "mongoose";
import { IUser } from "models/userModel.js";
import AppError from "./appError.js";


const __dirname = dirname(fileURLToPath(import.meta.url)); 

export default class Email {
  to: string;
  firstName: string;
  // Here url = ${process.env.CLIENT_URL}/auth/confirmSignup/${signupToken} for signup
  url: string;
  from: string;
  constructor(user: HydratedDocument<IUser>, url: string) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `Blog App <${process.env.EMAIL_FROM}>`;
  }

   newTransport() {
    // if the app is in production, we use sendgrid to send emails
    // use sendgrid instead of gmail. Ref: https://midnightgamer.medium.com/how-to-use-sendgrid-with-nodemailer-to-send-mails-a289f30af622
    // if (process.env.NODE_ENV === "production") {
    //   return nodemailer.createTransport({
    //     service: "SendGrid",
    //     auth: {
    //       user: process.env.SENDGRID_USERNAME,
    //       pass: process.env.SENDGRID_PASSWORD,
    //     },
    //   });
    // }
    // console.log("Reached to newTransport function");
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template: string, subject: string) {
    
    // Todo: In production replace path file with __dirname + "/../views/email/${template}.pug"
    const html = pug.renderFile(`C:/Users/Dinakar/Documents/NITC Blogs/backend/utils/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html,
      text: convert(html)
    };

   

    await this.newTransport().sendMail(mailOptions, (err: any, info: any) => {
      if (err) {
        // Todo: The response is successful even if the email is not sent. Fix this byk providing an option to resend the email
        console.log(err);
        throw new AppError("There was an error sending the email. Try again later!", 500);
      } else {
        console.log(`Email sent: ${info.response}`);
      }
    });
  }

  async sendSignup() {
    await this.send("confirmSignup", "Email confirmation for NITC Blogs");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your password reset token (valid for only 10 minutes)"
    );
  }
}
