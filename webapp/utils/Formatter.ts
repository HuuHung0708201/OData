import DateFormat from "sap/ui/core/format/DateFormat";

class Formatter {
  public toUTCDate(value: string, pattern = "yyyyMMdd") {
    if (!value) {
      return null;
    }

    const instance = DateFormat.getDateInstance({
      pattern,
    });

    return instance.parse(value, true);
  }

  public formatDate(value: Date | string, source: string = "yyyyMMdd", pattern: string = "dd.MM.yyyy"): string {
    if (!value) {
      return "";
    }

    const sourceInstance = DateFormat.getDateInstance({
      pattern: source,
    });

    const targetInstance = DateFormat.getDateInstance({
      pattern,
    });

    const parsedValue = typeof value === "string" ? sourceInstance.parse(value) : value;

    return targetInstance.format(parsedValue);
  }
}

export default new Formatter();