"use strict";
import ApiError from "../../util/apiError";

export class LogoutService {

  constructor(loggerInstance, redis, config) {
    this.loggerInstance = loggerInstance;
    this.redis = redis;
    this.config = config;
  }

  userLogout(req, res, next) {
    this.loggerInstance.debug("=====User Logout======> ", req.body.emailID);
    this.redis.deleteKey(req.body.emailID)
      .then(success => {
        this.loggerInstance.debug("======User logged out successfully===>", success);
        return res.status(200).send("User logged out");
      }, err => {
        this.loggerInstance.debug("===Error while logging out=>", err);
        return next(new ApiError("Internal Server Error", "Redis Server Error", err, 500));
      });
  }
}
