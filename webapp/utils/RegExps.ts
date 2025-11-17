import isString from "lodash.isstring";

class RegExps {
  public fieldId = /^[a-z0-9_-]*$/i;

  public isFieldId(value: unknown): value is string {
    if (!isString(value)) return false;
    return new RegExp(this.fieldId).test(value);
  }
}

export default new RegExps();