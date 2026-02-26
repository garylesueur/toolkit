type HttpStatusCategory =
  | "informational"
  | "success"
  | "redirection"
  | "clientError"
  | "serverError";

interface HttpStatusCode {
  code: number;
  name: string;
  description: string;
  category: HttpStatusCategory;
  cacheable: boolean;
  retryable: boolean;
}

const httpStatusCodes: HttpStatusCode[] = [
  // 1xx Informational
  {
    code: 100,
    name: "Continue",
    description:
      "The server has received the request headers and the client should proceed to send the request body.",
    category: "informational",
    cacheable: false,
    retryable: false,
  },
  {
    code: 101,
    name: "Switching Protocols",
    description:
      "The server is switching protocols as requested by the client via the Upgrade header.",
    category: "informational",
    cacheable: false,
    retryable: false,
  },
  {
    code: 102,
    name: "Processing",
    description:
      "The server has received and is processing the request, but no response is available yet. Prevents the client from timing out.",
    category: "informational",
    cacheable: false,
    retryable: false,
  },
  {
    code: 103,
    name: "Early Hints",
    description:
      "Used to return some response headers before the final HTTP message, allowing the browser to preload resources.",
    category: "informational",
    cacheable: false,
    retryable: false,
  },

  // 2xx Success
  {
    code: 200,
    name: "OK",
    description:
      "The request has succeeded. The meaning of the success depends on the HTTP method used.",
    category: "success",
    cacheable: true,
    retryable: false,
  },
  {
    code: 201,
    name: "Created",
    description:
      "The request has been fulfilled and a new resource has been created. Typically returned after POST or PUT requests.",
    category: "success",
    cacheable: false,
    retryable: false,
  },
  {
    code: 202,
    name: "Accepted",
    description:
      "The request has been accepted for processing, but the processing has not been completed. Used for asynchronous operations.",
    category: "success",
    cacheable: false,
    retryable: false,
  },
  {
    code: 203,
    name: "Non-Authoritative Information",
    description:
      "The returned metadata is not exactly the same as available from the origin server. The response is from a local or third-party copy.",
    category: "success",
    cacheable: true,
    retryable: false,
  },
  {
    code: 204,
    name: "No Content",
    description:
      "The server has successfully fulfilled the request and there is no additional content to send in the response body.",
    category: "success",
    cacheable: true,
    retryable: false,
  },
  {
    code: 205,
    name: "Reset Content",
    description:
      "The server has fulfilled the request and the client should reset the document view that caused the request to be sent.",
    category: "success",
    cacheable: false,
    retryable: false,
  },
  {
    code: 206,
    name: "Partial Content",
    description:
      "The server is delivering only part of the resource due to a Range header sent by the client. Used for resumable downloads.",
    category: "success",
    cacheable: true,
    retryable: false,
  },
  {
    code: 207,
    name: "Multi-Status",
    description:
      "Conveys information about multiple resources where multiple status codes might be appropriate. Used in WebDAV.",
    category: "success",
    cacheable: false,
    retryable: false,
  },
  {
    code: 208,
    name: "Already Reported",
    description:
      "Used inside a DAV: propstat response to avoid enumerating the internal members of multiple bindings to the same collection repeatedly.",
    category: "success",
    cacheable: false,
    retryable: false,
  },
  {
    code: 226,
    name: "IM Used",
    description:
      "The server has fulfilled a GET request and the response is a representation of the result of one or more instance-manipulations applied to the current instance.",
    category: "success",
    cacheable: false,
    retryable: false,
  },

  // 3xx Redirection
  {
    code: 300,
    name: "Multiple Choices",
    description:
      "The request has more than one possible response. The user or user agent should choose one of them.",
    category: "redirection",
    cacheable: true,
    retryable: false,
  },
  {
    code: 301,
    name: "Moved Permanently",
    description:
      "The resource has been permanently moved to a new URL. All future requests should use the new URL.",
    category: "redirection",
    cacheable: true,
    retryable: false,
  },
  {
    code: 302,
    name: "Found",
    description:
      "The resource resides temporarily at a different URL. The client should continue to use the original URL for future requests.",
    category: "redirection",
    cacheable: false,
    retryable: false,
  },
  {
    code: 303,
    name: "See Other",
    description:
      "The response to the request can be found at another URL using a GET method. Often used after POST to redirect to a result page.",
    category: "redirection",
    cacheable: false,
    retryable: false,
  },
  {
    code: 304,
    name: "Not Modified",
    description:
      "The resource has not been modified since the last request. The client can use its cached version.",
    category: "redirection",
    cacheable: false,
    retryable: false,
  },
  {
    code: 305,
    name: "Use Proxy",
    description:
      "The requested resource must be accessed through the proxy given by the Location header. Deprecated due to security concerns.",
    category: "redirection",
    cacheable: false,
    retryable: false,
  },
  {
    code: 307,
    name: "Temporary Redirect",
    description:
      "The resource resides temporarily at a different URL. Unlike 302, the request method must not change when reissuing the request.",
    category: "redirection",
    cacheable: false,
    retryable: false,
  },
  {
    code: 308,
    name: "Permanent Redirect",
    description:
      "The resource has been permanently moved. Unlike 301, the request method must not change when reissuing the request.",
    category: "redirection",
    cacheable: true,
    retryable: false,
  },

  // 4xx Client Error
  {
    code: 400,
    name: "Bad Request",
    description:
      "The server cannot process the request due to malformed syntax, invalid framing, or deceptive routing.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 401,
    name: "Unauthorized",
    description:
      "The request requires authentication. The client must provide valid credentials to access the resource.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 402,
    name: "Payment Required",
    description:
      "Reserved for future use. Originally intended for digital payment systems, sometimes used for paywalled content.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 403,
    name: "Forbidden",
    description:
      "The server understood the request but refuses to authorise it. Authentication will not help; the client lacks permission.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 404,
    name: "Not Found",
    description:
      "The server cannot find the requested resource. The URL may be wrong or the resource may have been removed.",
    category: "clientError",
    cacheable: true,
    retryable: false,
  },
  {
    code: 405,
    name: "Method Not Allowed",
    description:
      "The HTTP method used is not supported for the requested resource. The response must include an Allow header listing valid methods.",
    category: "clientError",
    cacheable: true,
    retryable: false,
  },
  {
    code: 406,
    name: "Not Acceptable",
    description:
      "The server cannot produce a response matching the Accept headers sent by the client.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 407,
    name: "Proxy Authentication Required",
    description:
      "The client must first authenticate itself with the proxy before the request can be fulfilled.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 408,
    name: "Request Timeout",
    description:
      "The server timed out waiting for the request. The client may repeat the request without modifications.",
    category: "clientError",
    cacheable: false,
    retryable: true,
  },
  {
    code: 409,
    name: "Conflict",
    description:
      "The request conflicts with the current state of the target resource. Often used for concurrent edit conflicts.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 410,
    name: "Gone",
    description:
      "The resource is no longer available and will not be available again. Unlike 404, this is a permanent condition.",
    category: "clientError",
    cacheable: true,
    retryable: false,
  },
  {
    code: 411,
    name: "Length Required",
    description:
      "The server requires a Content-Length header in the request, which was not provided.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 412,
    name: "Precondition Failed",
    description:
      "One or more conditions in the request headers (e.g. If-Match, If-Unmodified-Since) evaluated to false.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 413,
    name: "Payload Too Large",
    description:
      "The request body is larger than the server is willing or able to process.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 414,
    name: "URI Too Long",
    description:
      "The URI provided was too long for the server to process. Often caused by excessive query string data.",
    category: "clientError",
    cacheable: true,
    retryable: false,
  },
  {
    code: 415,
    name: "Unsupported Media Type",
    description:
      "The server does not support the media type of the request body (e.g. sending XML when only JSON is accepted).",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 416,
    name: "Range Not Satisfiable",
    description:
      "The range specified in the Range header cannot be fulfilled. The range may be outside the size of the resource.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 417,
    name: "Expectation Failed",
    description:
      "The server cannot meet the requirements of the Expect request header.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 418,
    name: "I'm a Teapot",
    description:
      "Defined in RFC 2324 as an April Fools' joke. The server refuses to brew coffee because it is, permanently, a teapot.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 421,
    name: "Misdirected Request",
    description:
      "The request was directed at a server that is not able to produce a response. Sent by servers that are not configured for the requested URI scheme and authority.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 422,
    name: "Unprocessable Content",
    description:
      "The server understands the content type and syntax of the request, but the contained instructions are semantically invalid.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 423,
    name: "Locked",
    description:
      "The resource that is being accessed is locked. Used in WebDAV.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 424,
    name: "Failed Dependency",
    description:
      "The request failed because it depended on another request that also failed. Used in WebDAV.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 425,
    name: "Too Early",
    description:
      "The server is unwilling to process a request that might be replayed, to avoid potential replay attacks.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 426,
    name: "Upgrade Required",
    description:
      "The server refuses to perform the request using the current protocol but may do so after the client upgrades to a different protocol.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 428,
    name: "Precondition Required",
    description:
      "The server requires the request to be conditional (e.g. include an If-Match header) to prevent lost-update conflicts.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 429,
    name: "Too Many Requests",
    description:
      "The client has sent too many requests in a given amount of time. Used for rate limiting.",
    category: "clientError",
    cacheable: false,
    retryable: true,
  },
  {
    code: 431,
    name: "Request Header Fields Too Large",
    description:
      "The server refuses to process the request because one or more header fields are too large.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 451,
    name: "Unavailable For Legal Reasons",
    description:
      "The resource is unavailable due to legal demands, such as government censorship or court-ordered takedowns.",
    category: "clientError",
    cacheable: false,
    retryable: false,
  },

  // 5xx Server Error
  {
    code: 500,
    name: "Internal Server Error",
    description:
      "The server encountered an unexpected condition that prevented it from fulfilling the request.",
    category: "serverError",
    cacheable: false,
    retryable: true,
  },
  {
    code: 501,
    name: "Not Implemented",
    description:
      "The server does not support the functionality required to fulfil the request. Typically means the HTTP method is not recognised.",
    category: "serverError",
    cacheable: true,
    retryable: false,
  },
  {
    code: 502,
    name: "Bad Gateway",
    description:
      "The server, acting as a gateway or proxy, received an invalid response from the upstream server.",
    category: "serverError",
    cacheable: false,
    retryable: true,
  },
  {
    code: 503,
    name: "Service Unavailable",
    description:
      "The server is currently unable to handle the request due to temporary overloading or scheduled maintenance.",
    category: "serverError",
    cacheable: false,
    retryable: true,
  },
  {
    code: 504,
    name: "Gateway Timeout",
    description:
      "The server, acting as a gateway or proxy, did not receive a timely response from the upstream server.",
    category: "serverError",
    cacheable: false,
    retryable: true,
  },
  {
    code: 505,
    name: "HTTP Version Not Supported",
    description:
      "The server does not support the HTTP protocol version used in the request.",
    category: "serverError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 506,
    name: "Variant Also Negotiates",
    description:
      "The server has an internal configuration error: transparent content negotiation results in a circular reference.",
    category: "serverError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 507,
    name: "Insufficient Storage",
    description:
      "The server is unable to store the representation needed to complete the request. Used in WebDAV.",
    category: "serverError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 508,
    name: "Loop Detected",
    description:
      "The server detected an infinite loop while processing the request. Used in WebDAV.",
    category: "serverError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 510,
    name: "Not Extended",
    description:
      "The server requires further extensions to the request in order to fulfil it.",
    category: "serverError",
    cacheable: false,
    retryable: false,
  },
  {
    code: 511,
    name: "Network Authentication Required",
    description:
      "The client needs to authenticate to gain network access, typically used by captive portals.",
    category: "serverError",
    cacheable: false,
    retryable: false,
  },
];

export { httpStatusCodes };
export type { HttpStatusCode, HttpStatusCategory };
