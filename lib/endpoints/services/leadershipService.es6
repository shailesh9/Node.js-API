"use strict";
import ApiError from "../../util/apiError";

let args = {
  "collection": "",
  "filter": {},
  "projection": {}
};

export class LeaderShipService {

  constructor(genericRepo, loggerInstance, Q, merge) {
    this.merge = merge;
    this.genericRepo_ = genericRepo;
    this.loggerInstance = loggerInstance;
    this.Q = Q;
  }

  getLeadershipData() {
    this.loggerInstance.info("=====get leadership Data======>");
    args.collection = "leadership";
    args.filter = {};
    args.projection = {"dashboard.leadership": 1};
    args.projection.lastUpdatedDate = 1;

    return this.genericRepo_.retrieve(args);
  }

  getLeadershipPreferences(req) {
    this.loggerInstance.info("=====get leadership preferences======>");
    args.collection = "preferences";
    args.filter = {"userId": req.userId};
    // _id in preferences collection indicates preference id. We don't need that.
    args.projection = {"dashboard.leadership": 1, "_id": 0};

    return this.genericRepo_.retrieve(args);
  }

  getLeadershipDashboard(req, res, next) {
    this.loggerInstance.info("====get leadership dashboard===========>");

    let content;

    this.Q.all([
      this.getLeadershipData(req),
      this.getLeadershipPreferences(req)
    ])
    .then(response => {
      if (response) {
        console.log("==================leader===========>");
        console.log(response);
        content = this.merge(response[0], response[1]);
        return res.status(200).send(content);
      }
      return next(new ApiError("ReferenceError", "Data not Found", response, 404));
    }, err => {
      console.log("Error Retreiving leadership data");
      return next(new ApiError("Internal Server Error", "DB error", err, 500));
    })
    .done();
  }
}
