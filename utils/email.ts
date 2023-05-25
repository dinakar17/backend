import nodemailer from "nodemailer";
import pug from "pug";
import { convert } from "html-to-text";
import fs from "fs";

import { dirname } from "path";
import { fileURLToPath } from "url";
import { HydratedDocument } from "mongoose";
import { IUser } from "models/userModel.js";
import nodemailerSendgrid from "nodemailer-sendgrid";


const __dirname = dirname(fileURLToPath(import.meta.url));

export default class Email {
  to: string;
  firstName: string;
  url: string;
  from: string;
  constructor(user: HydratedDocument<IUser>, url: string) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `NITC Blogs App <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
      return nodemailer.createTransport(
        nodemailerSendgrid({
          apiKey: process.env.SENDGRID_API_KEY,
        })
      );
  }

  async send(template: string, subject: string) {
    const pathFile =
      process.env.NODE_ENV === "development"
        ? `C:/Users/Dinakar/Documents/NITC Blogs/backend/utils/../views/email/${template}.pug`
        : `${__dirname}/../views/email/${template}.pug`;

      // check if the file exists
      if (fs.existsSync(pathFile)) {
        console.log("File exists.");
      } else {
        console.log("File does not exist.");
      }

    const html = pug.renderFile(pathFile, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html,
      text: convert(html),
    };

    await this.newTransport().sendMail(
      mailOptions,
      async (err: any, info: any) => {
        if (err) {
          console.log(err);
        } else {
          console.log(`Email sent: ${info.response}`);
        }
      }
    );
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
