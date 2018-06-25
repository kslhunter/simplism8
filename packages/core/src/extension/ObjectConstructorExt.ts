import {DateOnly} from "../type/DateOnly";
import {Uuid} from "../type/Uuid";
import {Type} from "../type/Type";
import {DateTime} from "../type/DateTime";
import {Time} from "../type/Time";

declare global {
  // tslint:disable-next-line:interface-name
  interface ObjectConstructor {
    clone<T extends { [key: string]: any }>(source: T, options?: { excludeProps?: (keyof T)[] }): T;

    equal<T extends { [key: string]: any }>(source: T, taget: T, options?: { excludeProps?: (keyof T)[] }): boolean;

    validate(value: any, validator: TypeValidator): IObjectValidateResult | undefined;

    validates(source: any, validators: { [key: string]: TypeValidator }): IObjectValidateResult[];
  }
}

export type TypeValidator = Type<any> | Type<any>[] | {
  type?: Type<any> | Type<any>[];
  notnull?: boolean;

  validator?(value: any): boolean;
};

export interface IObjectValidateResult {
  value: any;
  propertyKey?: string;
  type?: Type<any> | Type<any>[];
  notnull?: boolean;

  validator?(value: any): boolean;
}

Object.clone = function (source: any, options?: { excludeProps?: string[] }): any {
  if (source instanceof Array) {
    const result = [];
    for (const sourceItem of source) {
      result.push(Object.clone(sourceItem));
    }

    return result;
  }
  else if (source instanceof Date) {
    return new Date(source.getTime());
  }
  else if (source instanceof DateTime) {
    return new DateTime(source.tick);
  }
  else if (source instanceof DateOnly) {
    return new DateOnly(source.tick);
  }
  else if (source instanceof Time) {
    return new Time(source.tick);
  }
  else if (source instanceof Uuid) {
    return new Uuid(source.toString());
  }
  else if (typeof source === "object") {
    const result = {};
    Object.setPrototypeOf(result, source.constructor.prototype);
    for (const key of Object.keys(source).filter(sourceKey => !options || !options.excludeProps || !options.excludeProps.includes(sourceKey))) {
      result[key] = Object.clone(source[key]);
    }

    return result;
  }
  else {
    return source;
  }
};

Object.equal = function (source: any, target: any, options?: { excludeProps?: string[] }): boolean {
  if (source instanceof Date) {
    if (!(target instanceof Date)) {
      return false;
    }

    return source.getTime() === target.getTime();
  }
  else if (source instanceof Time || source instanceof DateOnly || source instanceof DateTime) {
    if (!(target instanceof Time || target instanceof DateOnly || target instanceof DateTime)) {
      return false;
    }

    return source.tick === target.tick;
  }
  else if (source instanceof Uuid) {
    if (!(target instanceof Uuid)) {
      return false;
    }

    return source.toString() === target.toString();
  }
  else if (source instanceof Array) {
    if (!(target instanceof Array)) {
      return false;
    }

    return source.diffs(target).length < 1;
  }
  else if (source instanceof Object) {
    if (!(target instanceof Object)) {
      return false;
    }

    const sourceKeys = Object.keys(source).filter(sourceKey => !options || !options.excludeProps || !options.excludeProps.includes(sourceKey));
    const targetKeys = Object.keys(target).filter(targetKey => !options || !options.excludeProps || !options.excludeProps.includes(targetKey));

    if (sourceKeys.length !== targetKeys.length) {
      return false;
    }

    for (const key of sourceKeys) {
      if (!Object.equal(source[key], target[key])) {
        return false;
      }
    }

    return true;
  }
  else {
    return source === target;
  }
};

Object.validate = function (value: any, validator: TypeValidator): IObjectValidateResult | undefined {
  let config;
  if (validator instanceof Array) {
    config = {type: validator};
  }
  else if (typeof validator === "function") {
    config = {type: [validator]};
  }
  else if (!((validator as any).type instanceof Array)) {
    config = {
      ...(validator as any),
      type: [(validator as any).type]
    };
  }
  else {
    config = validator;
  }

  if (value == undefined) {
    if (config.notnull) {
      return {value, notnull: config.notnull};
    }
    return undefined;
  }

  if (config.type) {
    if (!config.type.some((type: any) => type === value.constructor)) {
      return {value, type: config.type.map((item: Type<any>) => item.name)};
    }
  }

  if (config.validator) {
    if (!config.validator(value)) {
      return {value, validator: config.validator};
    }
  }
};

Object.validates = function (source: any, validators: { [propertyKey: string]: TypeValidator }): IObjectValidateResult[] {
  const result: IObjectValidateResult[] = [];
  for (const propertyKey of Object.keys(validators)) {
    const validateResult = this.validate(source[propertyKey], validators[propertyKey]);
    if (validateResult) {
      result.push({
        propertyKey,
        ...validateResult
      });
    }
  }

  return result;
};