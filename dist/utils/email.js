import nodemailer from "nodemailer";
import pug from "pug";
import { convert } from "html-to-text";
import { dirname } from "path";
import { fileURLToPath } from "url";
import nodemailerSendgrid from "nodemailer-sendgrid";
const sendgridLogic = nodemailerSendgrid({
    apiKey: process.env.SENDGRID_API_KEY,
});
const __dirname = dirname(fileURLToPath(import.meta.url));
export default class Email {
    to;
    firstName;
    // Here url = ${process.env.CLIENT_URL}/auth/confirmSignup/${signupToken} for signup
    url;
    from;
    // res: Response;
    // next: NextFunction;
    constructor(user, url) {
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
        return nodemailer.createTransport(nodemailerSendgrid({
            apiKey: process.env.SENDGRID_API_KEY,
        }));
        // }
        // return nodemailer.createTransport({
        //   service: "gmail",
        //   auth: {
        //     user: process.env.EMAIL_USERNAME,
        //     pass: process.env.EMAIL_PASSWORD,
        //   },
        // });
    }
    async send(template, subject) {
        const pathFile = process.env.NODE_ENV === "development"
            ? `C:/Users/Dinakar/Documents/NITC Blogs/backend/utils/../views/email/${template}.pug`
            : __dirname + `/../views/email/${template}.pug`;
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
        await this.newTransport().sendMail(mailOptions, async (err, info) => {
            if (err) {
                // Todo: The response is successful even if the email is not sent. Fix this by providing an option to resend the email
                console.log(err);
                // return this.next(new AppError("There was an error sending the email. Try again later!", 500));
            }
            else {
                console.log(`Email sent: ${info.response}`);
            }
        });
    }
    async sendSignup() {
        await this.send("confirmSignup", "Email confirmation for NITC Blogs");
    }
    async sendPasswordReset() {
        await this.send("passwordReset", "Your password reset token (valid for only 10 minutes)");
    }
}
