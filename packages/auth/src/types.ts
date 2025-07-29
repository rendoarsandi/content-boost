export interface FrameworkRequest {
  url: string;
  method: string;
  headers: Map<string, string>;
  json?: () => Promise<any>;
  text?: () => Promise<string>;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  blob?: () => Promise<Blob>;
  formData?: () => Promise<FormData>;
}

export interface FrameworkResponse {
  status: number;
  headers: Map<string, string>;
  body?: string | object | ArrayBuffer | Blob | FormData;
  redirect?: string;
}
