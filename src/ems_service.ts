/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMSClient, BaseEmsServiceConfig } from './ems_client';
import { ORIGIN } from './origin';
import { toAbsoluteUrl } from './utils';

export interface IEmsService {
  getAttributions(): { url: string; label: string }[];
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
    return this._config.attribution.map((attribution) => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      return {
        url: url,
        label: label,
      };
    });
  }

  getMarkdownAttribution(): string {
    const attributions = this._config.attribution.map((attribution) => {
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
