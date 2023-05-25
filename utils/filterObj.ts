import { Request } from "express";

export default (obj: Request["body"], ...allowedFields: string[]) => {
    const newObj: any = {};
  
    Object.keys(obj).forEach((el) => {
      if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};
  