import Boom from "@hapi/boom";

import config from "../../config/index";
import moment from "moment";
import { Response } from "express";
import { omit, isNull, isUndefined } from "lodash";
const countryCodes = require("country-codes-list");
import PhoneUtil from "google-libphonenumber";
import pnf from "google-libphonenumber";
const phoneUtil = PhoneUtil.PhoneNumberUtil.getInstance();
const PNF = pnf.PhoneNumberFormat;
import { isValidObjectId } from "mongoose";

const httpResp = (
  status: boolean,
  message: string,
  code: number,
  data: any,
  metadata?: any
) => {
  const response: any = {
    status: status,
    message: message,
    code: code,
    statusCode: code,
    data: data,
  };
  if (isDef(metadata)) {
    response.metadata = metadata;
  }
  return response;
};

const isDef = (param: any): boolean => {
  if (isNull(param) || isUndefined(param)) {
    return false;
  } else {
    return true;
  }
};

const errBuilder = (err: any) => {
  let final_error = err;

  if (err.isServer) {
    // log the error...
    // probably you don't want to log unauthorized access
    // or do you?
  }

  // Restructuring error data
  // If the error belongs to boom error (Check boom module: https://www.npmjs.com/package/boom)
  if (err.isBoom) {
    console.log("Boom old err");
    console.log(err);
    // err.output.statusCode = 400;
    err.output.payload.status = false;
    err.output.payload.code = err.output.statusCode;
    if (isDef(err.data)) {
      err.output.payload.data = err.data;
    }
    err.reformat();
    console.log("NEW err");
    console.log(err);
    final_error = err.output.payload;
    if (isDef(err.message) && final_error.statusCode == 500) {
      final_error.message = err.message;
    }

    // return res.status(err.output.statusCode).send(err.output.payload);
  } else {
    // If the error are other errors
    err.status = false;
    err.code = err.statusCode;
    if (!isDef(err.message) && isDef(err.type)) {
      err.message = err.type;
    }
  }

  return final_error;
};

const errHandler = (error: any, res: any) => {
  const resp = httpResp(false, "There is some error occured", 500, error);
  return res.status(resp.code).send(resp);
};

const successHandler = (
  res: Response,
  data: any,
  message?: string,
  metadata?: any
) => {
  message = message || "Operation successful";
  let resp;
  if (isDef(metadata)) {
    resp = httpResp(true, message, 200, data, metadata);
  } else {
    resp = httpResp(true, message, 200, data);
  }

  return res.status(resp.code).send(resp);
};

const isLiteralObject = (a: any) => {
  return !!a && a.constructor === Object;
};

// Converts all MongoIDs in the object to the plain string
const leanObject = (object: any) => {
  if (Array.isArray(object)) {
    let array = object;
    array = array.map((obj) => {
      return leanObject(obj);
    });
    return array;
  }
  for (const key in object) {
    if (Object.hasOwnProperty.call(object, key)) {
      if (isDef(object[key])) {
        if (isValidObjectId(object[key]) && !isLiteralObject(object[key])) {
          object[key] = object[key].toString();
        }
        if (typeof object[key] == "object" && isLiteralObject(object[key])) {
          object[key] = leanObject(object[key]);
        }
      } else {
        object = omit(object, [key]);
      }
    }
  }
  return object;
};

const addDaysToDate = (date: Date, days?: any) => {
  return new Date(new Date(date).getTime() + days * 24 * 60 * 60 * 1000);
};

const isvalidEmail = (email: string): boolean => {
  try {
    let tester =
      /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

    if (!email) return false;

    let emailParts = email.split("@");

    if (emailParts.length !== 2) return false;

    let account = emailParts[0];
    let address = emailParts[1];

    if (account.length > 64) return false;
    else if (address.length > 255) return false;

    let domainParts = address.split(".");
    if (
      domainParts.some(function (part) {
        return part.length > 63;
      })
    )
      return false;

    if (!tester.test(email)) return false;

    return true;
  } catch (error) {
    return false;
    console.log({ error });
    // throw Boom.boomify(error)
  }
};

const getRole = (type: number) => {
  if (!isDef(type)) {
    return null;
  }
  if (type == 1) {
    return "doctor";
  } else if (type == 2) {
    return "patient";
  } else if (type == 3) {
    return "admin";
  } else if (type == 4) {
    return "nurse";
  } else if (type == 5) {
    return "secretary";
  } else {
    return null;
  }
};

const callingCodeToAlpha2 = (countryCallingCode: number) => {
  countryCallingCode = parseInt(countryCallingCode as any);
  if (!countryCallingCode || isNaN(countryCallingCode)) {
    return;
  }
  let country = countryCodes.findOne(
    "countryCallingCode",
    countryCallingCode.toString()
  );
  return country ? country.countryCode : null;
};
const n = phoneUtil.parseAndKeepRawInput("202-456-1414", "US");

// countryCode e.g. IN, AE
// Returns e.g. 91, 971 etc.
const alpha2ToCallingCode = (countryCode: string) => {
  console.log({
    countryCode,
  });
  let country = countryCodes.findOne("countryCode", countryCode);
  return country ? country.countryCallingCode : null;
};

const getFormattedMobile = (mobileRaw: number | string, regionCode: string) => {
  try {
    if (!mobileRaw) {
      // throw Boom.notFound("Mobile number is required!");
      let formattedMobileObj: any = {
        mobileRaw,
        valid: false,
      };
      return formattedMobileObj;
    }
    if (!regionCode) {
      // throw Boom.notFound("Country Region Code is required!");
      let formattedMobileObj: any = {
        mobileRaw,
        valid: false,
      };
      return formattedMobileObj;
    }

    // if regionCode is 91 then Converting 91 to 'IN'
    if (isDef(regionCode) && !isNaN(parseInt(regionCode))) {
      regionCode = callingCodeToAlpha2(regionCode as any);
    }
    let formattedMobileObj: any = {
      mobileRaw,
      valid: false,
    };

    let mobileNumber = phoneUtil.parseAndKeepRawInput(
      mobileRaw.toString(),
      regionCode
    );
    if (mobileNumber) {
      let isMobileNumberValidForRegion = phoneUtil.isValidNumberForRegion(
        mobileNumber,
        regionCode
      );
      console.log({
        isMobileNumberValidForRegion,
      });
      if (isMobileNumberValidForRegion) {
        formattedMobileObj.countryCode = mobileNumber.getCountryCode();
        formattedMobileObj.regionCode =
          phoneUtil.getRegionCodeForNumber(mobileNumber);
        formattedMobileObj.mobile = mobileNumber.getNationalNumber();
        formattedMobileObj.pnf = phoneUtil.format(mobileNumber, PNF.E164);
        console.log({
          formattedMobileObj,
        });

        formattedMobileObj = { ...formattedMobileObj, valid: true };
      }
    }
    return formattedMobileObj;
  } catch (error: any) {
    console.log("error");
    console.log(error);
  }
};


const titleCaseadrs = (adrs: string) =>
  adrs
    .split(" ")
    .map((adrs: string) => {
      const word = adrs.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");


const validatePhoneNumber = (input_str: any) => {
  let re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;

  return re.test(input_str);
};

const isNumeric = (value: any) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};



function isFutureDate(idate: any) {
  let today = new Date().getTime();
  idate = idate.split("/");
  idate = new Date(idate[2], idate[1] - 1, idate[0]).getTime();
  console.log("idate", idate);
  return today - idate < 0 ? true : false;
}


function stringToDate(_date: any, _format: any, _delimiter: any) {
  var formatLowerCase = _format.toLowerCase();
  var formatItems = formatLowerCase.split(_delimiter);
  var dateItems = _date.split(_delimiter);
  var monthIndex = formatItems.indexOf("mm");
  var dayIndex = formatItems.indexOf("dd");
  var yearIndex = formatItems.indexOf("yyyy");
  var month = parseInt(dateItems[monthIndex]);
  month -= 1;
  var formatedDate = new Date(dateItems[yearIndex], month, dateItems[dayIndex]);
  return formatedDate;
}




export {
  config,
  httpResp,
  isDef,
  errBuilder,
  errHandler,
  successHandler,
  leanObject,
  addDaysToDate,
  isvalidEmail,
  getRole,
  getFormattedMobile,
  alpha2ToCallingCode,
  callingCodeToAlpha2,
};
