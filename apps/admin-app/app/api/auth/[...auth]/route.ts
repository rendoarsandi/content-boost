import { toNextJsHandler } from "better-auth/next-js";

// Lazy load auth to avoid build-time initialization
function getAuth() {
  const { auth } = require("@repo/auth/server-only");
  return auth;
}

// Create handlers dynamically
const handlers = (request: Request) => {
  const auth = getAuth();
  return toNextJsHandler(auth);
};

export async function GET(request: Request) {
  const { GET: getHandler } = handlers(request);
  return getHandler(request);
}

export async function POST(request: Request) {
  const { POST: postHandler } = handlers(request);
  return postHandler(request);
}