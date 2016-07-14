"use strict";
import ApiError from "../../util/apiError";

require("babel-polyfill");

let args = {
  "collection": "",
  "filter": {},
  "projection": {}
};

export class DomainService {

  constructor(genericRepo, loggerInstance, Q, merge) {
    this.merge = merge;
    this.genericRepo_ = genericRepo;
    this.loggerInstance = loggerInstance;
    this.Q = Q;
  }

  /*
   validateRequest(req) {
   console.log("===inside validate Request====>");

   if (!req || !req.params) {

   this.loggerInstance.debug("ValidationError: Request cannot be processed. Parameters missing");
   return new ApiError(
   "ValidationError", "Request cannot be processed. Parameter missing : Parameters missing", null, 400);

   } else if (!req.params.userId) {

   this.loggerInstance.debug("ValidationError: Request cannot be processed. Parameter missing : user id");
   return new ApiError(
   "ValidationError", "Request cannot be processed. Parameter missing : user id", null, 400);

   } else if (!req.params.name) {

   this.loggerInstance.debug("ValidationError: Request cannot be processed. Parameter missing : domain name");
   return new ApiError(
   "ValidationError", "Request cannot be processed. Parameter missing : domain name", null, 400);
   }

   return true;
   }
   */

  getDomainData(req) {
    this.loggerInstance.info("======Get Domain Data======>");
    let projection = `dashboard.${req.params.name}`;

    args.collection = "users";
    args.filter = {"_id": req.userId};
    args.projection[projection] = 1;
    args.projection.lastUpdatedDate = 1;
    console.log(args);
    return this.genericRepo_.retrieve(args);
  }

  getDomainPreferences(req) {
    this.loggerInstance.info("=======Get Domain Preferences======>");
    let projection = `dashboard.${req.params.name}`;

    args.collection = "preferences";
    args.filter = {"userId": req.userId};
    // _id in preferences collection indicates preference id. We don't need that.
    args.projection = {"_id": 0};
    args.projection[projection] = 1;
    console.log(args);
    return this.genericRepo_.retrieve(args);
  }

  getDomainDashboard(req, res, next) {
    this.loggerInstance.info("===get Domain DashBoard====>");
    let content;

    this.Q.all([
      this.getDomainData(req),
      this.getDomainPreferences(req)
    ])
    .then(response => {
      if (response) {
        content = this.merge(response[0], response[1]);

        //    let {portlets} = content.dashboard.financial.groups[0];

        if (typeof content.dashboard.financial !== "undefined") {
          content.dashboard.financial.groups = content.dashboard.financial.groups.map(obj => {

            obj.portlets = obj.portlets.map(port => {

              if (port.hasOwnProperty("drillDown")) {
                Reflect.deleteProperty(port, "drillDown");
              }
              return port;
            });
            return obj;
          });
        }
        return res.status(200).send(content);
      }

      return next(new ApiError("ReferenceError", "Domain Data not Found", response, 404));
    }, err => {
      console.log("Error from DB");
      return next(new ApiError("Internal Server Error", "DB error", err, 500));
    })
    .done();
  }
}
