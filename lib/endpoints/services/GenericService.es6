"use strict";
import PDFDocument from "pdfmake/src/printer";
import ApiError from "../../util/apiError";
import fs from "fs";
import Q from "q";
import request from "request";
let protectedGenericInstance,
  fonts = {
    "Roboto": {
      "normal": "fonts/Roboto-Regular.ttf",
      "bold": "fonts/Roboto-Medium.ttf",
      "italics": "fonts/Roboto-Italic.ttf",
      "bolditalics": "fonts/Roboto-Italic.ttf"
    }
  },
  repoObj = {
    "collection": "",
    "filter": {},
    "projection": {}
  };

export class GenericService {

  constructor(genericRepo, loggerInstance, mongo, config) {
    GenericService.genericRepo = genericRepo;
    GenericService.loggerInstance = loggerInstance;
    GenericService.mongo = mongo;
    GenericService.config = config;
  }

  generatePDF(req, res) {
    GenericService.loggerInstance.info("=======Generating PDF==========>");
    let printer = new PDFDocument(fonts),
      defer = Q.defer(),
      projection = `dashboard.${req.body.domain}.groups.portlets.drillDown.data`,
      content, columnNames, tableRowContent,
      docDefinition = {
        "pageOrientation": "landscape",
        "content": [
          {
            "text": "Patient details", "style": "title"
          },
          {
            "style": "tableExample",
            "table": {
              "body": [
              ]
            },
            "layout": {
              hLineWidth(i, node) {
                return (i === 0 || i === node.table.body.length) ? 2 : 1;
              },
              vLineWidth(i, node) {
                return (i === 0 || i === node.table.widths.length) ? 2 : 1;
              },
              hLineColor(i, node) {
                return (i === 0 || i === node.table.body.length) ? "black" : "gray";
              },
              vLineColor(i, node) {
                return (i === 0 || i === node.table.widths.length) ? "black" : "gray";
              }
              // paddingLeft: function(i, node) { return 4; },
              // paddingRight: function(i, node) { return 4; },
              // paddingTop: function(i, node) { return 2; },
              // paddingBottom: function(i, node) { return 2; }
            }
          }
        ],
        "styles": {
          "header": {
            "fontSize": 18,
            "bold": true,
            "margin": [0, 0, 0, 10]
          },
          "subheader": {
            "fontSize": 16,
            "bold": true,
            "margin": [0, 10, 0, 5]
          },
          "tableExample": {
            "margin": [0, 5, 0, 15]
          },
          "tableHeader": {
            "bold": true,
            "fontSize": 13,
            "color": "black"
          }
        },
        "defaultStyle": {
          // alignment: 'justify'
        }
      };

    repoObj.collection = "users";
    repoObj.filter = {"_id": req.userId};
    repoObj.projection[projection] = 1;
    repoObj.projection.lastUpdatedDate = 1;
    console.log(repoObj);

    GenericService.genericRepo.retrieve(repoObj)
      .then(resp => {
        content = resp.dashboard[req.body.domain].groups[0].portlets[0].drillDown.data;
        Object.keys(content).map(key => {
          columnNames = Object.keys(content[key]);
          tableRowContent = this.generateValueOfObj(content[key]);
          docDefinition.content[1].table.body.push(tableRowContent);
        });
        columnNames.shift();
        docDefinition.content[1].table.body.unshift(columnNames);
        console.log(JSON.stringify(docDefinition));
        let pdfDoc = printer.createPdfKitDocument(docDefinition);

        pdfDoc.pipe(fs.createWriteStream("PDF/Attachment.pdf"));
        pdfDoc.end();
        console.log("Pdf generated successfully");

        defer.resolve(res);
      }, err => {
        defer.reject(new ApiError("Internal Server Error", "DB error", err, 500));
      });

    return defer.promise;
  }

  generateValueOfObj(obj) {
    let valuesArr = [];

    Object.keys(obj).map(key => {
      if (!isNaN(obj[key])) {
        let numberToString = String(obj[key]);

        valuesArr.push(numberToString);
      }else {
        valuesArr.push(obj[key]);
      }
    });
    valuesArr.shift();
    return valuesArr;
  }

  getAll(req, res, next) {
    console.log("GenericService getAll call");
    GenericService.loggerInstance.info("GenericService getAll call");
    repoObj.collection = "actionables";
    repoObj.filter = {
      "_id": req.userId
    };
    repoObj.createdDate = 1;
    repoObj.limit = 5;
    GenericService.genericRepo.getData(repoObj)
      .then(resp => {
        GenericService.loggerInstance.info("GenericService success after retrieve call");
        res.status(200).send(resp);
      }, err => {
        this.loggerInstance.info("GenericService fail after retreive call");
        return next(new ApiError("Internal Server error", "DB error", err, 500));
      })
      .done();
  }

  deleteRecord(req, res, next) {
    GenericService.loggerInstance.info("GenericService delete record call");
    repoObj.collection = "actionables";
    repoObj.filter = {
      "id": req.body.col
    };
    repoObj.limit = 5;
    repoObj.id = req.params.id;
    GenericService.genericRepo.removeRecord(repoObj)
      .then(resp => {
        GenericService.loggerInstance.info("GenericService success after remove call");
        res.status(200).send(resp);
      }, err => {
        GenericService.loggerInstance.info("GenericService fail after remove call");
        return next(new ApiError("Internal Server error", "DB error", err, 500));
      });
  }

  validateRecord(req, res, next) {
    GenericService.loggerInstance.info("Generic schema validation");
    const url = `${
      GenericService.config.fhirValidator.baseURI.protocol
      }://${
      GenericService.config.fhirValidator.baseURI.domain
      }:${
      GenericService.config.fhirValidator.baseURI.port
      }/fhir/v1/${
      req.params.endpoint
      }/${
      req.params.id
      }`,
      options = {
        "url": url,
        "headers": {
          "Content-Type": "application/json"
        }
      };

    request.get(options, (err, xhp, body) => {
      if (err) {
        GenericService.loggerInstance.debug("Error received:", err);
        return next(new ApiError("Internal Server error", "Error while validating fhir endpoint", err, 500));
      }

      let response = JSON.parse(body),
        result = {};

      if (req.params.endpoint === "Patient") {
        console.log("in Patient", response);
        result.PatientID = response._id;
        result.PatientName = response.name[0].text;
        result.DOB = response.birthDate;
        result.PatientCity = response.address[0].city;
        if (response.careProvider.length > 0) {
          for (let i = 0; i < response.careProvider.length; i++) {
            let str = response.careProvider[i].reference;

            if (str.startsWith("Practitioner")) {
              let ress = str.split("/");

              result.RefID = ress[1];
            }
          }
        }
      } else if (req.params.endpoint === "Appointment") {
        result.VisitID = response.identifier[0].value;
        let actorRef = response.participant[1].actor.reference,
          resactorRef = actorRef.split("/");

        result.PatientID = resactorRef[1];
        result.DayofWeek = response.start;

        // result.AppointmentType = response.name;
      }
      GenericService.loggerInstance
        .debug("DONE: ", body);
      res.status(200).send(result);
    });

  }

  /* getUserPreference(req) {
    let projection = "dashboard.financial.groups.portlets.component.options";

    repoObj.collection = "preferences";
    repoObj.filter = {"_id": req.userId};
    repoObj.projection[projection] = 1;
    console.log(repoObj);

    return GenericService.genericRepo.retrieve(repoObj);
  } */
}

export function getGenericServiceInstance(...args) {

  protectedGenericInstance = protectedGenericInstance || new GenericService(...args);

  return protectedGenericInstance;
}
