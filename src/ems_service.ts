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

import { EMSClient, BaseEmsServiceConfig } from './ems_client';
import { ORIGIN } from './origin';
import { toAbsoluteUrl } from './utils';

export interface IEmsService {
  getAttributions(): { url: string; label: string }[];
  getHTMLAttribution(): string;
  getMarkdownAttribution(): string;
  getDisplayName(): string;
  getId(): string;
  hasId(id: string): boolean;
  getOrigin(): string;
  getApiUrl(): string;
}

export abstract class AbstractEmsService implements IEmsService {
  protected readonly _emsClient: EMSClient;
  protected readonly _config: BaseEmsServiceConfig;
  protected readonly _proxyPath: string;

  constructor(config: BaseEmsServiceConfig, emsClient: EMSClient, proxyPath: string) {
    this._config = config;
    this._emsClient = emsClient;
    this._proxyPath = proxyPath;
  }

  getAttributions(): { url: string; label: string }[] {
    return this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      return {
        url: url,
        label: label,
      };
    });
  }

  getHTMLAttribution(): string {
    const attributions = this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      const html = url ? `<a rel="noreferrer noopener" href="${url}">${label}</a>` : label;
      return this._emsClient.sanitizeHtml(html);
    });
    return attributions.join(' | '); //!!!this is the current convention used in Kibana
  }

  getMarkdownAttribution(): string {
    const attributions = this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      return `[${label}](${url})`;
    });
    return attributions.join('|');
  }

  getOrigin(): string {
    return ORIGIN.EMS;
  }

  /**
   * Checks if url is absolute. If not, prepend the basePath.
  */
  protected _getAbsoluteUrl = (url: string) => {
    if (/^https?:\/\//.test(url)) {
      return url;
    } else {
      return toAbsoluteUrl(this.getApiUrl(), url);
    }
  };

  abstract getDisplayName(): string;

  abstract getId(): string;

  abstract hasId(id: string): boolean;

  abstract getApiUrl(): string;


}
