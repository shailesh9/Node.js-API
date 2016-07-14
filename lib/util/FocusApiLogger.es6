"use strict";

import {getLoggerInstance} from "ch-logger";

let nodeEnv = process.env.NODE_ENV || "local",
  config = require("../../config/" + nodeEnv),
  loggerOptions = config.logger || {},
  loggerInstance = getLoggerInstance("focus-api", loggerOptions);

console.log("logger option", loggerOptions);

export default loggerInstance;
