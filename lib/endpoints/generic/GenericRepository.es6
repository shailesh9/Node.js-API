"use strict";

import Q from "q";

let protectedGenericRepoInstance;

export class GenericRepository {

  constructor({
    config,
    mongodb,
    loggerInstance
    }) {

    if (!config ||
      !config.mongoDb ||
      !config.mongoDb.connectionString ||
      !config.mongoDb.operationTimeout ||
      !config.mongoDb.connectionOptions ||
      !config.mongoDb.promiseTimeout ||
      !loggerInstance
    ) {
      throw new Error("Failed to initialise MongoDB, config or dependencies were missing");
    }

    this.loggerInstance = loggerInstance;

    /** @member {string} Connection string to database. */
    this.connectionString_ = config.mongoDb.connectionString;

    /** @member {Object} Options object to pass to the driver connect method. */
    this.connectionOptions_ = config.mongoDb.connectionOptions;

    /** @member {Object} The default write concern for CUD operations. */
    this.commonWriteConcern_ = {
      "wtimeout": config.mongoDb.operationTimeout,
      "j": true,
      "w": "majority"
    };

    /** @member {number} The default timeout for promises in ms */
    this.promiseTimeout_ = config.mongoDb.promiseTimeout;

    /** @static {Function} Connect method */
    GenericRepository.nativeConnect = mongodb.MongoClient.connect;

    /** @member {Q.Promise} Promise which represents the db connection and resolves to the db controller object. */
    this.db_ = this.connectToDb_();
  }

  /**
   * Creates a connection to the database.
   * @private
   * @returns {Q.Promise} A promise which resolves to the database controller object.
   */
  connectToDb_() {

    this.loggerInstance.info("Connecting to db with options: ", this.connectionOptions_);

    this.db_ = Q.ninvoke(GenericRepository, "nativeConnect", this.connectionString_, this.connectionOptions_);

    return this.db_;
  }

  static idSwap(obj) {

    let swappedObj = Object.create(Reflect.getPrototypeOf(obj));

    /* eslint-disable prefer-reflect */
    for (let propKey of Object.getOwnPropertyNames(obj)) {
      /* eslint-enable prefer-reflect */

      let descriptor = Reflect.getOwnPropertyDescriptor(obj, propKey);

      switch (propKey) {
        case "id":
          Reflect.defineProperty(swappedObj, "_id", descriptor);
          break;
        case "_id":
          Reflect.defineProperty(swappedObj, "id", descriptor);
          break;
        default:
          Reflect.defineProperty(swappedObj, propKey, descriptor);
      }
    }

    return swappedObj;
  }

  /**
   * Get the event resource relation from event resource map
   * @param {string} event Name of the event
   * @returns {Object} the relation from the event resource map
   */
  getEventResourceRelation(event) {
    return this.eventResourceMap_.get(
      GenericRepository
        .eventRegistry
        .lookupForEventContainer(event)
    );
  }

  retrieve(param) {

    this.loggerInstance.info("Retreiving from db");

    let {collection, filter, projection} = param;

    return this.db_
      .catch(err => {
        this.loggerInstance.debug("Connection to db is broken at create: ", err);
        return this.connectToDb_();
      })
      .then(db => {
        this.loggerInstance.debug("Successfully connected");
        this.loggerInstance.debug(collection);
        this.loggerInstance.debug(filter);
        this.loggerInstance.debug(projection);
        return Q.ninvoke(
          db.collection(collection),
          "findOne", filter, projection
        );
      })
      .then(findResult => {
        return findResult;
      }, err => {
        return err;
      });
  }

  getData(query) {
    let {collection} = query,

    /* aggregateObj = [
        {
          "$group": {
            "_id": {
              "col": "$col", "text": "$text", "createdDate": "$createdDate", "id": "$_id"
            }, "count": {
              "$sum": 1
            }
          }
        },
        {
          "$group": {
            "_id": "$_id.col", "data": {
              "$push": {
                "text": "$_id.text", "createdDate": "$_id.createdDate", "id": "$_id.id"
              }
            }
          }
        },
        {
          "$limit": limit
        }
      ] */

      aggregateObj = [{
        "$project": {
          "id": 1,
          "data": {
            "$slice": ["$data", 5]
          }
        }
      }];

    this.loggerInstance.info("Retreiving from db");

    return this.db_
      .catch(err => {
        this.loggerInstance.debug("Connection to db is broken at create: ", err);
        return this.connectToDb_();
      })
      .then(db => {
        this.loggerInstance.debug("Successfully connected");
        return Q.ninvoke(db.collection(collection), "aggregate", aggregateObj);
      })
      .then(findResult => {
        return findResult;
      }, err => {
        return err;
      });
  }

  removeRecord(params) {
    let {collection, filter, limit, id} = params,
      removeFrom = {
        "$pull": {
          "data": {
            "id": id
          }
        }
      };

    this.loggerInstance.info("Removing record from db having id");

    return this.db_
      .catch(err => {
        this.loggerInstance.debug("Connection to db is broken at create: ", err);
        return this.connectToDb_();
      })
      .then(db => {
        this.loggerInstance.debug("Successfully connected");
        console.log(filter);
        return Q.ninvoke(
          db.collection(collection), "update", filter, removeFrom)
          .then(() => {
            return this.getData({
              "collection": "actionables",
              "limit": limit
            });
          }, err => {
            console.log("error after remove", err);
            return err;
          });
      });
  }

  /* getDataAfterRemove(params) {
    let {collection, limit, col} = params,
      aggregateObj = [
        {
          "$match": {"col": col}
        },
        {
          "$group": {
            "_id": {
              "col": "$col", "text": "$text", "createdDate": "$createdDate", "id": "$_id"
            }, "count": {
              "$sum": 1
            }
          }
        },
        {
          "$group": {
            "_id": "$_id.col", "data": {
              "$push": {
                "text": "$_id.text", "createdDate": "$_id.createdDate", "id": "$_id.id"
              }
            }
          }
        },
        {
          "$limit": limit
        }
      ];

    this.loggerInstance.info("Retreiving from db");

    return this.db_
      .catch(err => {
        this.loggerInstance.debug("Connection to db is broken at create: ", err);
        return this.connectToDb_();
      })
      .then(db => {
        this.loggerInstance.debug("Successfully connected");
        return Q.ninvoke(db.collection(collection), "aggregate", aggregateObj);
      })
      .then(findResult => {
        return findResult;
      });
  } */
}

export function getGenericRepoInstance(args) {

  protectedGenericRepoInstance = protectedGenericRepoInstance || new GenericRepository(args);
  return protectedGenericRepoInstance;
}
