"use strict";

import merge from "deepmerge";
import express from "express";
import mongodb from "mongodb";
import Q from "q";
import loggerInstance from "../util/FocusApiLogger";
import {getGenericRepoInstance} from "../endpoints/generic/GenericRepository";
import {DomainService} from "./services/domainService";
import {DrillService} from "./services/drillService";
import {EmailService} from "./services/emailService";
import {LeaderShipService} from "./services/leadershipService";
import {LoginService} from "./services/loginService";
import {LogoutService} from "./services/logoutService";
import {getGenericServiceInstance} from "./services/GenericService";
import {getEntitlementInstance} from "../middleware_services/mwcheckEntitlement";
import NodeMailer from "ch-nodemailer";
import {RedisCache} from "ch-redis-cache";

let router = express.Router(),
  {NODE_ENV} = process.env,
  nodeEnv = NODE_ENV || "local",
  config = Object.freeze(require("../../config/" + nodeEnv)),
  domainRoute = router.route("/domain/:name"),
  drillRoute = router.route("/domain/:name/:group/:portlet"),
  leadershipRoute = router.route("/leadership"),
  emailRoute = router.route("/sendmail"),
  pdfRoute = router.route("/download"),
  getAction = router.route("/getAll"),
  removeAction = router.route("/remove/:id"),
  fhirValidateRoute = router.route("/validate/:endpoint/:id"),
// leadershipActionableRoute = router.route("/actionable/:id"),
  loginRoute = router.route("/login"),
  logoutRoute = router.route("/logout"),
  redis = new RedisCache({"redisdb": config.caching, "logger": loggerInstance}),
  genericRepo = getGenericRepoInstance({"config": config, "mongodb": mongodb, "loggerInstance": loggerInstance}),
  genericService = getGenericServiceInstance(genericRepo, loggerInstance, mongodb, config),
  domainService = new DomainService(genericRepo, loggerInstance, Q, merge),
  loginService = new LoginService(genericRepo, loggerInstance, redis, config),
  logoutService = new LogoutService(loggerInstance, redis, config),
  leadershipService = new LeaderShipService(genericRepo, loggerInstance, Q, merge),
  drillService = new DrillService(genericRepo, loggerInstance, Q, merge),
  nodeMailerInstance = new NodeMailer(config.smtp),
  entitlementInstance = getEntitlementInstance(genericRepo, loggerInstance),
  emailService = new EmailService(loggerInstance, genericService, nodeMailerInstance);

domainRoute
  .get(entitlementInstance.getEntitlements.bind(entitlementInstance))
  .get(domainService.getDomainDashboard.bind(domainService));

loginRoute
  .post(loginService.authLogin.bind(loginService));

logoutRoute
  .post(logoutService.userLogout.bind(logoutService));

leadershipRoute
  .get(entitlementInstance.getLeaderAction.bind(entitlementInstance))
  .get(leadershipService.getLeadershipDashboard.bind(leadershipService));

drillRoute
  .get(drillService.getDrillDashboard.bind(drillService));

emailRoute
  .post(emailService.sendmail.bind(emailService));

pdfRoute
  .get(genericService.generatePDF.bind(genericService));

getAction
  .get(entitlementInstance.getLeaderAction.bind(entitlementInstance))
  .get(genericService.getAll.bind(genericService));

removeAction
  .post(entitlementInstance.getLeaderAction.bind(entitlementInstance))
  .post(genericService.deleteRecord.bind(genericService));

fhirValidateRoute
  .get(genericService.validateRecord.bind(genericService));

export {router};
