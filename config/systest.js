"use strict";

var environmentVariables = require("./environmentVariables"),
    config = {
        "http": {
            "protocol": "http",
            "domain": "data.systest.egiextranet.ds",
            "port": 8050
        },
        "sqs": {
            "sqsQueueUrl": environmentVariables.DATA_CORE_SQS_ENDPOINT,
            "sqsVisibilityTimeout": 180, // seconds - how long we want a lock on this job
            "sqsWaitTimeSeconds": 20, // seconds - how long should we wait for a message to appear in the queue
            "sqsMaxNumberOfMessages": 10, // max number of messages to receive as part of one api call
            "proxy": {
                "useHttpsProxy": true,
                "host": "10.53.188.74",
                "port": 3128,
                "secureProxy": true,
                "secureEndpoint": true
            }
        },
        "mongoDb": {
            "connectionString": environmentVariables.DATA_CORE_MONGO_CONNECTION_STRING,
            "operationTimeout": 4000,
            "connectionOptions": {
                "server": {
                    "poolSize": 5,
                    "socketOptions": {
                        "autoReconnect": true,
                        "keepAlive": 0
                    },
                    "reconnectTries": 30,
                    "reconnectInterval": 1000
                }
            },
            "promiseTimeout": 4500
        },
        "logger": {
            name: "egi-data-core-api",
            "streams": [
                {
                    level: environmentVariables.DATA_CORE_LOGGING_LEVEL,
                    stream: process.stdout
                }
            ]
        },
        "authorization": {
            "authorize": true,
            "endpoint": environmentVariables.DATA_CORE_VIPER_ENDPOINT,
            "service": "real", // Change this to real if you want to authorize against the real service
            "timeout": 3000, // Please note that this should be lower than the timeout for mochaTest in Gruntfile
            "cache": true,
            "entitlements": {
                "read": ["egi-data-core_ro", "egi-data-core_rw"],
                "readWrite": ["egi-data-core_rw"]
            }
        },
        "caching": {
            "host": environmentVariables.DATA_CORE_REDIS_HOST,
            "port": environmentVariables.DATA_CORE_REDIS_PORT,
            "db": 7,
            "ttl": 24*60*60
        },
        "environmentVariableChecker": {
            "isEnabled": true
        },
        "urlPrefix": "/data-core/v1",
        "originValue": "datacore:api"
    };

module.exports = config;
