import type { Dict } from "./utils";

export interface ODataResponse<D = unknown> {
  results: D;
}

export interface ODataError {
  headers?: Dict;
  message?: string;
  statusCode?: string;
  statusText?: string;
  responseText?: string;
}