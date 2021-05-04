/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Resolves a target URL path relative to the host.
 * This is specifically useed by the Kibana proxy re-routing.
 * It also handles trailing slashes in tileApiUrl and fileApiUrl parameters.
 */
export function toAbsoluteUrl(host: string | undefined, path: string): string {
  if (!host) {
    return path;
  }
  const hostEndWithSlash = host[host.length - 1] === '/';
  const pathStartsWithSlash = path[0] === '/';

  if (hostEndWithSlash === true && pathStartsWithSlash === true) {
    return host + path.slice(1);
  } else if (hostEndWithSlash !== pathStartsWithSlash) {
    return host + path;
  } else {
    return host + '/' + path;
  }
}
