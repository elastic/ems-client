/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Resolves a target URL path relative to the host.
 * This is specifically useed by the Kibana proxy re-routing.
 * It also handles trailing slashes in tileApiUrl and fileApiUrl parameters.
 */
export const toAbsoluteUrl = (host: string | undefined, path: string): string => {
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
};
