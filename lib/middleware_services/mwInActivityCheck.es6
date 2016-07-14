"use strict";
import ApiError from "../util/apiError";
import moment from "moment";
import {RedisCache} from "ch-redis-cache";
import loggerInstance from "../util/FocusApiLogger";

function mwInActivityCheck(req, res, next) {
  let {NODE_ENV} = process.env,
    nodeEnv = NODE_ENV || "local",
    config = Object.freeze(require("../../config/" + nodeEnv)),
    redis = new RedisCache({"redisdb": config.caching, "logger": loggerInstance}),
    redisStore = {};

  if (req.user) {
    req.userId = req.user.userId;
  }

  if (config.publicUrls.indexOf(req.url) === -1) {
    loggerInstance.info("========User Inactivity Check===========>");
    redis.getToken({
      "key": req.user.userEmail
    })
    .then(user => {
      if (user) {
        if (req.headers.authorization) {
          let repeatToken = req.headers.authorization.split(" ")[1];

          if (repeatToken !== user.token) {
            return next(new ApiError("Internal Server Error", "Invalid token", "Invalid token", 401));
          }
        }
        loggerInstance.debug("=======Inactivity user found, now check time========>");
        let currentTime = moment().unix(); // Math.round(new Date().getTime() / 1000);

        redisStore.lastCheckIn = currentTime;
        redisStore.token = user.token;
        if ((currentTime - Number(user.lastCheckIn)) > config.MaxInactivityTime) {
          redis.deleteKey(req.user.userEmail)
            .then(success => {
              loggerInstance.debug("======User logged out successfully===>", success);
              console.log("======User logged out successfully===>", success);
              return next(new ApiError("Unauthorized", "Invalid token", "Session timeout", 401));
            }, err => {
              loggerInstance.debug("===Error while logging out=>", err);
              return next(new ApiError("Internal Server Error", "Redis Server Error", err, 500));
            });
          return;
        }
        redis.setToken({
          "key": req.user.userEmail,
          "value": redisStore,
          "options": {
            "ttl": config.tokenExpireIn
          }
        })
          .then(() => {
            loggerInstance.debug("==========Time updated in token==========");
            return next();
          }, tokenNotSet => {
            loggerInstance.debug("Time not updated in token", tokenNotSet);
            return next(new ApiError("Internal Server Error", "Redis Server Error", tokenNotSet, 500));
          });
      }else {
        return next(new ApiError("Unauthorized", "User not logged in", "", 401));
      }
    }, err => {
      loggerInstance.debug("Redis server error ", err);
      return next(new ApiError("Internal Server Error", "Redis Server Error", "", 500));
    });
  }else {
    loggerInstance.info("=========Public Api/Endpoint Access==========>");
    return next();
  }
}
export default mwInActivityCheck;
