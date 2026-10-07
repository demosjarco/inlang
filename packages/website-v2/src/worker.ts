import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { getParaglideBlogRedirectForPath } from "./blog/paraglideBlogRedirects";
import { getParaglideRedirectForPath } from "./marketplace/legacyRedirects";

const handler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const paraglideRedirect =
      getParaglideRedirectForPath(url.pathname) ??
      getParaglideBlogRedirectForPath(url.pathname);
    if (paraglideRedirect) {
      const location = new URL(paraglideRedirect.href);
      location.search = url.search;
      return Response.redirect(
        location.toString(),
        paraglideRedirect.statusCode,
      );
    }

    return handler(request);
  },
};
