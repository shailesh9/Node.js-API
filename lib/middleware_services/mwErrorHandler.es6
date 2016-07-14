"use strict";
import ApiError from "../util/apiError";
import loggerInstance from "../util/FocusApiLogger";

function mwErrorHandler(err, req, res, next) {
  loggerInstance.info("=======mwErrorhandler=========>", err);
  if (err) {
    if (err.domain) {
      console.log("Something Bad Happened", err.stack);
      // you should think about gracefully stopping & respawning your server
      // since an unhandled error might put your application into an unknown state
    }

    /* eslint-disable */
    if (err.constructor.name === "UnauthorizedError") {
      loggerInstance.info("=======Invalid token============>");
      err = new ApiError("Internal Server Error", "Invalid token", "Invalid token", 401);
    }

    /* eslint-enable */
    if (err instanceof ApiError) {
      res.status(err.statusCode).send(err);
    }else if (err instanceof Error) {
      res.status(500).send("Internal Server Error");
    }
  }
  next();
}

export default mwErrorHandler;
