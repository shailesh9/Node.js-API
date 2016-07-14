"use strict";
import localConfig from "../../config/local";
import ApiError from "../util/apiError";
import expressJwt from "express-jwt";

function mwAuthenticate(req, res, next) {
  if (localConfig.publicUrls.indexOf(req.url) === -1 && req.headers.authorization) {
    let token = req.headers.authorization.split(" ")[1],
      secret = req.app.get("tokenSecret");

    expressJwt.verify(token, secret, (err, decoded) => {
      if (!err) {
        console.log("Token verified", decoded);

        return next();
      }
      console.log("Token failed", err);
      return next(new ApiError("Unauthenticated", "User verification failed", "Bad Request", 400));
    });
    return;

    /* if (!uniqueIdPattern.test(token)) {
      return res.status(401).send("Unauthenticated");
    }
    req.userId = token;
    return next(); */
  }

  /* if (localConfig.publicUrls.indexOf(req.url) > -1) {
    return next();
  } */
  next(new ApiError("Unauthorized", "User is not authorized to access", "", 401));
}

export default mwAuthenticate;
