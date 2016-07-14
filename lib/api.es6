"use strict";

import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import mwAllowCrossDomain from "./middleware_services/mwAllowCrossDomain";
import mwErrorHandler from "./middleware_services/mwErrorHandler";
import mwInActivityCheck from "./middleware_services/mwInActivityCheck";
// import mwAuthenticate from "./middleware_services/mwAuthenticate";
import checkEnvironmentVariables from "./util/checkEnvironmentVariables";
import {router} from "./endpoints/index";
import domain from "express-domain-middleware";
import expressJwt from "express-jwt";

let {NODE_ENV} = process.env,
  nodeEnv = NODE_ENV || "local",
  config = Object.freeze(require("../config/" + nodeEnv)),
  app = express(),
  urlPrefix = config.urlPrefix,
  secret = config.AUTH_SECRET_KEY,
  environmentVariables = require("../config/environmentVariables");

// Checks the required enviro// Defines top middleware and routesnment variables
// Logs the missing environment variables and exit the application
if (config.environmentVariableChecker.isEnabled) {
  checkEnvironmentVariables(environmentVariables);
}

// Sets the relevant config app-wise
app.use(domain);
app.set("port", config.http.port);
app.set("tokenSecret", secret);
app.use(mwAllowCrossDomain);
app.use(bodyParser.json());
// Defines top middleware and routes
app.use(expressJwt({"secret": app.get("tokenSecret")}).unless({"path": ["/focus-api/login", "/focus-api/logout"]}));
app.use(mwInActivityCheck);
// app.use(mwAuthenticate);
// app.use(mwcheckEntitlement);
app.use(`${urlPrefix}`, router);
app.use(methodOverride);
app.use(mwErrorHandler);

// Starts the app
app.listen(app.get("port"), function () {
  console.log("Server has started and is listening on port: " + app.get("port"));
});
