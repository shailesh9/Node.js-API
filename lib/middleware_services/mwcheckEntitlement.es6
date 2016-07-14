"use strict";
import ApiError from "../util/apiError";
let protectedEntitlementInstance;

export class MwcheckEntitlement {

  constructor(genericRepo, loggerInstance) {
    this.genericRepo = genericRepo;
    this.loggerInstance = loggerInstance;
  }

  getEntitlements(req, res, next) {

    if (req.user && req.user.entitlements.indexOf(req.params.name) > -1) {
      return next();
    }
    return next(
      new ApiError("ReferenceError", "User is not authorised to access", "Unauthorized", 401));
  }

  getLeaderAction(req, res, next) {
    if (req.user && req.user.entitlements.indexOf("leadership") > -1) {
      return next();
    }
    return next(
      new ApiError("ReferenceError", "User is not authorised to access", "Unauthorized", 401));
  }
}

export function getEntitlementInstance(...args) {

  protectedEntitlementInstance = protectedEntitlementInstance || new MwcheckEntitlement(...args);

  return protectedEntitlementInstance;
}
