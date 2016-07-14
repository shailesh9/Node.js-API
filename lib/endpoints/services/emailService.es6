"use strict";
import ApiError from "../../util/apiError";
export class EmailService {

  constructor(loggerInstance, genericService, NodeMailer) {
    this.loggerInstance = loggerInstance;
    this.genericService = genericService;
    this.Nodemailer = NodeMailer;
  }
  sendmail(req, res, next) {
    let mailOption = {
      "to": req.body.to,
      "from": "info@cantahealth.com",
      "text": "Hello MDOffice",
      "html": `<footer>
      The data displayed in this email is the result of drill down from ${req.body.domain} dashboard.Please do not reply
       to this e-mail, as it was sent from an unattended e-mail address. For any query or clarification please feel free
        to contact info@cantahealth.com</footer>`,
      "attachments": [{
        "file": "testMail.pdf",
        "path": "PDF/Attachment.pdf"
      }]
    };

    this.genericService.generatePDF(req, res)
      .then(() => {
        mailOption.subject = `Focus email for ${req.body.domain} drilldown for user ${req.body.emailId}`;
        this.Nodemailer.send(mailOption)
          .then(resp => {
            console.log("Mail sent Successfully");
            res.status(200).send(resp);
          }, err => {
            console.log("Mail not sent");
            return next(new ApiError("Internal Server Error", "Mail failure", err, 500));
          });
      }, err => {
        console.log("Error generating pdf");
        return next(new ApiError("Internal Server Error", "Error generating pdf", err, 500));
      });
  }
}
