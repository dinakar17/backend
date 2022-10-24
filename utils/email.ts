import nodemailer from "nodemailer";
import pug from "pug";
import { convert } from "html-to-text";
import fs from "fs";

import { dirname } from "path";
import { fileURLToPath } from "url";
import { HydratedDocument } from "mongoose";
import { IUser } from "models/userModel.js";
import nodemailerSendgrid from "nodemailer-sendgrid";

const sendgridLogic = nodemailerSendgrid({
  apiKey: process.env.SENDGRID_API_KEY,
});

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class Email {
  to: string;
  firstName: string;
  // Here url = ${process.env.CLIENT_URL}/auth/confirmSignup/${signupToken} for signup
  url: string;
  from: string;
  // res: Response;
  // next: NextFunction;
  constructor(user: HydratedDocument<IUser>, url: string) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `NITC Blogs App <${process.env.EMAIL_FROM}>`;
    // this.res = res;
    // this.next = next;
  }

  newTransport() {
    // if the app is in production, we use sendgrid to send emails
    // use sendgrid instead of gmail. Ref: https://midnightgamer.medium.com/how-to-use-sendgrid-with-nodemailer-to-send-mails-a289f30af622
    // if (process.env.NODE_ENV === "production") {
      return nodemailer.createTransport(
        nodemailerSendgrid({
          apiKey: process.env.SENDGRID_API_KEY,
        })
      );
    // }

    // return nodemailer.createTransport({
    //   service: "gmail",
    //   auth: {
    //     user: process.env.EMAIL_USERNAME,
    //     pass: process.env.EMAIL_PASSWORD,
    //   },
    // });
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
      // instead of absolute use express.static to serve the file to pug.renderFile
      // instead of pathFile 

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
          // Todo: The response is successful even if the email is not sent. Fix this by providing an option to resend the email
          console.log(err);
          // return this.next(new AppError("There was an error sending the email. Try again later!", 500));
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
