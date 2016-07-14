"use strict";
import ApiError from "../../util/apiError";

let args = {
  "collection": "",
  "filter": {},
  "projection": {}
};

export class DrillService {

  constructor(genericRepo, loggerInstance, Q, merge) {
    this.merge = merge;
    this.genericRepo_ = genericRepo;
    this.loggerInstance = loggerInstance;
    this.Q = Q;
  }

  getDrillData(req) {
    this.loggerInstance.info("=========get Drill Data===========>", req.userId);
    let projection = `dashboard.${req.params.name}.groups`;

    args.collection = "drilldown_data";
    args.filter = {"_id": req.userId};
    args.projection[projection] = 1;

    return this.genericRepo_.retrieve(args);
  }

  getDrillDataUsers(req) {
    this.loggerInstance.info("=========get Drill Data=====USERS======>");
    let projection = `dashboard.${req.params.name}.groups`;

    args.collection = "users";
    args.filter = {"_id": req.userId};
    args.projection[projection] = 1;
    args.projection.lastUpdatedDate = 1;

    return this.genericRepo_.retrieve(args);
  }

  getDrillPreferences(req) {
    this.loggerInstance.info("=========get Drill Preferences========>");
    let projection = `dashboard.${req.params.name}.groups`;

    args.collection = "preferences";
    args.filter = {"userId": req.userId};
    // _id in preferences collection indicates preference id. We don't need that.
    args.projection = {"_id": 0};
    args.projection[projection] = 1;

    return this.genericRepo_.retrieve(args);
  }

  getDrillDashboard(req, res, next) {
    this.loggerInstance.info("=========get Drill Dashboard========>");

    this.Q.all([
      this.getDrillDataUsers(req),
      this.getDrillPreferences(req),
      this.getDrillData(req)
    ])
    .then(response => {
      if (response) {
        let drillUsers = response[0].dashboard[req.params.name].groups[req.params.group].portlets[req.params.portlet],
          drillPref = response[1].dashboard[req.params.name].groups[req.params.group].portlets[req.params.portlet],
          output = this.merge(drillUsers, drillPref);

        output.drillDown = response[2]
          .dashboard[req.params.name].groups[req.params.group].portlets[req.params.portlet].drillDown;
        output.icon = response[1].dashboard[req.params.name].groups[req.params.group].icon;
        output.title = response[1].dashboard[req.params.name].groups[req.params.group].title;
        output.lastUpdatedDate = response[0].lastUpdatedDate;
        return res.status(200).send(output);
      }
      return next(new ApiError("ReferenceError", "Data not Found", response, 404));
    }, err => {
      console.log("Error Retreiving DrillDown data");
      return next(new ApiError("Internal Server Error", "DB error", err, 500));
    })
    .done();
  }
}
