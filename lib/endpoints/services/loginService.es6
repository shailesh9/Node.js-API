"use strict";
import ApiError from "../../util/apiError";
import jwt from "jsonwebtoken";
import Q from "q";
import moment from "moment";
import crypto from "crypto";

let args = {
  "collection": "",
  "filter": {},
  "projection": {}
};

export class LoginService {

  constructor(genericRepo, loggerInstance, redis, config) {
    this.genericRepo_ = genericRepo;
    this.loggerInstance = loggerInstance;
    this.redis = redis;
    this.config = config;
  }

  login(req, res, next) {

    let encryptedPassword = crypto
      .createHash("md5")
      .update(req.body.password)
      .digest("hex");

    args.collection = "accounts";
    args.filter = {
      "emailID": req.body.emailID,
      "password": encryptedPassword
    };
    args.projection = {
      "_id": 0,
      "preferenceId": 1,
      "emailID": 1,
      "token": 1
    };

    this.genericRepo_.retrieve(args)
      .then(result => {
        if (result) {
          args.collection = "preferences";
          args.filter = {
            "_id": result.preferenceId
          };
          args.projection = {
            "_id": 0,
            "landingPage": 1,
            "entitlements": 1
          };

          this.genericRepo_.retrieve(args)
            .then(response => {
              if (response) {
                let content = Object.assign({}, result, response);

                Reflect.deleteProperty(content, "preferenceId");
                return res.status(200).send(content);
              }
              return next(new ApiError("ReferenceError", "User Data not Found", response, 404));
            }, err => {
              this.loggerInstance.info("Error Retreiving User login data");
              return next(new ApiError("Internal Server Error", "DB error", err, 500));
            });
        }else {
          return next(new ApiError("ReferenceError", "User Data not Found", result, 404));
        }

      }, err => {
        this.loggerInstance.info("Error from DB");
        return next(new ApiError("Internal Server Error", "DB error", err, 500));
      });
  }

  validateUser(credentials, secret) {
    this.loggerInstance.info("========Validate User=======>");
    let defer = Q.defer();

    this.genericRepo_.retrieve(credentials)
      .then(user => {
        if (user) {
          let redisStore = {
              "key": "",
              "value": ""
            },
            inactivityCheck = {
              "token": "",
              "lastCheckIn": ""
            };

          args.collection = "preferences";
          args.filter = {
            "_id": user.preferenceId
          };
          args.projection = {
            "_id": 0,
            "landingPage": 1,
            "entitlements": 1
          };

          this.getPreferences(args)
            .then(response => {
              if (response) {
                let payload = {
                    "userId": "",
                    "userEmail": "",
                    "preferenceId": "",
                    "landingPage": "",
                    "entitlements": ""
                  },
                  content = Object.assign({}, user, response),
                  claims = {
                    "expiresIn": this.config.tokenExpireIn
                  };

                Reflect.deleteProperty(content, "preferenceId");
                Reflect.deleteProperty(content, "userId");
                payload.userId = user.userId;
                payload.userEmail = user.emailID;
                payload.preferenceId = user.preferenceId;
                payload.landingPage = response.landingPage;
                payload.entitlements = response.entitlements;
                payload.role = "Provider";
                this.createToken(payload, secret, claims)
                  .then(token => {
                    content.token = token;
                    inactivityCheck.token = token;
                    inactivityCheck.lastCheckIn = moment().unix(); // Math.round(new Date().getTime() / 1000);
                    redisStore.key = user.emailID;
                    redisStore.value = inactivityCheck;
                    redisStore.options = {
                      "ttl": this.config.tokenExpireIn
                    };
                    this.setTokenInRedis(redisStore)
                      .then(done => {
                        console.log("Value added to redis", done);
                        defer.resolve(content);
                      }, fail => {
                        console.log("Error while adding value to redis", fail);
                        defer.reject(new ApiError("Internal Server Error", "Redis server error", fail, 500));
                      });
                  }, noToken => {
                    this.loggerInstance.info("Jwt token error");
                    defer.reject(new ApiError("Internal Server Error", "token error", noToken, 500));
                  });
              }else {
                this.loggerInstance.info("User preferences not found");
                defer.resolve(new ApiError("ReferenceError", "User not found", response, 404));
              }
            }, fail => {
              defer.reject(new ApiError("Internal Server Error", "DB error", fail, 500));
            });
        }else {
          this.loggerInstance.info("User not found");
          defer.resolve(new ApiError("ReferenceError", "User not found", user, 404));
        }
      }, error => {
        this.loggerInstance.info("Generic repo error");
        defer.reject(new ApiError("Internal Server Error", "DB error", error, 500));
      });

    return defer.promise;
  }

  getPreferences(projections) {
    this.loggerInstance.info("=====get user prefernces=========>");
    let defer = Q.defer();

    this.genericRepo_.retrieve(projections)
      .then(success => {
        console.log("User preferences found");
        defer.resolve(success);
      }, fail => {
        console.log("User preferences not found");
        defer.reject(fail);
      });
    return defer.promise;
  }

  createToken(payload, secret, claims) {
    this.loggerInstance.info("=======create user token==========>");
    let defer = Q.defer();

    jwt.sign(payload, secret, claims, (error, token) => {
      if (!error) {
        console.log("Token Generated");
        defer.resolve(token);
      }else {
        console.log("token not generated", error);
        defer.reject(error);
      }
    });
    return defer.promise;
  }

  setTokenInRedis(redisStore) {
    this.loggerInstance.info("=======set token in redis=========>");
    let deferred = Q.defer();

    this.redis.setToken(redisStore)
      .then(tokenSet => {
        deferred.resolve(tokenSet);
      }, redisErr => {
        deferred.reject(redisErr);
      });
    return deferred.promise;
  }

  singleSignAuth(user) {
    this.loggerInstance.info("=====Single Sign Auth=============>");
    let deferred = Q.defer();

    this.redis.getToken({
      "key": user
    })
      .then(result => {
        if (result) {
          this.loggerInstance.info("success in getting token ");
          deferred.resolve(result);
        }else {
          this.loggerInstance.info("Token not found");
          deferred.resolve(result);
        }
      }, err => {
        console.log("Redis Error while getting token ", err);
        deferred.reject(err);
      });
    return deferred.promise;
  }

  authLogin(req, res, next) {
    this.loggerInstance.info("=======Authlogin============>");
    let encryptedPassword = crypto
      .createHash("md5")
      .update(req.body.password)
      .digest("hex");

    args.collection = "accounts";
    args.filter = {
      "emailID": req.body.emailID,
      "password": encryptedPassword
    };
    args.projection = {
      "_id": 0,
      "preferenceId": 1,
      "emailID": 1,
      "userId": 1
    };
    const secret = req.app.get("tokenSecret");

    this.singleSignAuth(req.body.emailID)
      .then(loggedIn => {
        if (loggedIn) {
          console.log("User already logged in with other device ", loggedIn);
          this.userLogoutOnLogin(req)
            .then(succ => {
              this.loggerInstance.info("First device", succ);
              this.validateUser(args, secret)
                .then(user => {
                  if (user instanceof ApiError) {
                    return next(user);
                  }
                  return res.status(200).send(user);
                });
            }, failed => {
              this.loggerInstance.info("Redis Server Error");
              return next(new ApiError("Internal Server Error", "Redis Server Error", failed, 500));
            });
          console.log("==============DONE============");
          return;
        }
        this.loggerInstance.info("First device");
        this.validateUser(args, secret)
          .then(user => {
            if (user instanceof ApiError) {
              return next(user);
            }
            return res.status(200).send(user);
          });
      }, error => {
        this.loggerInstance.info("Redis Server Error");
        return next(new ApiError("Internal Server Error", "Redis Server Error", error, 500));
      });
  }

  userLogoutOnLogin(req) {
    console.log("=========userlogoutonlogin===================");
    let deferred = Q.defer();

    this.loggerInstance.debug("=====User Logout======>", req.body.emailID);
    this.redis.deleteKey(req.body.emailID)
      .then(success => {
        this.loggerInstance.debug("======User logged out successfully===>", success);
        deferred.resolve(success);
      }, err => {
        this.loggerInstance.debug("===Error while logging out=>", err);
        deferred.reject(err);
      });
    return deferred.promise;
  }
}
