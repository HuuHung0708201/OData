export type Dict<T = any> = { [key: string]: T };

export interface ComponentData {
  startupParameters: Dict<string>;
}