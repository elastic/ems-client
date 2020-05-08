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

import _ from 'lodash';
import { ORIGIN } from './origin';
import { toAbsoluteUrl } from './utils';
import { EMSClient, ITMSService, EmsLayerAttribution } from './ems_client';
import { Sources, Style, VectorSource } from 'mapbox-gl';

interface EmsVectorSource extends VectorSource {
  url: string;
  tiles: string[];
}

interface EmsVectorSources extends Sources {
  [sourceName: string]: EmsVectorSource;
}

interface EmsVectorStyle extends Style {
  sources: EmsVectorSources;
  sprite: string;
  glyphs: string;
}

interface EmsSprite {
  height: number;
  pixelRatio: number;
  width: number;
  x: number;
  y: number;
}

interface EmsSpriteSheet {
  [spriteName: string]: EmsSprite;
}

interface EmsRasterStyle {
  tilejson: string;
  name: string;
  attribution: string;
  minzoom: number;
  maxzoom: number;
  bounds: number[];
  format: string;
  type: string;
  tiles: string[];
  center: number[];
}

export class TMSService {
  private readonly _emsClient: EMSClient;
  private readonly _config: ITMSService;
  private readonly _proxyPath: string;

  _getAbsoluteUrl = (url: string) => {
    if (/^https?:\/\//.test(url)) {
      return url;
    } else {
      return toAbsoluteUrl(this._emsClient.getTileApiUrl(), url);
    }
  };

  _getRasterStyleJson = _.once(
    async (): Promise<EmsRasterStyle | undefined> => {
      const rasterUrl = this._getStyleUrlForLocale('raster');
      if (rasterUrl) {
        const url = this._proxyPath + this._getAbsoluteUrl(rasterUrl);
        return this._emsClient.getManifest(this._emsClient.extendUrlWithParams(url));
      } else {
        return;
      }
    }
  );

  _getVectorStyleJsonRaw = _.once(
    async (): Promise<EmsVectorStyle | undefined> => {
      const vectorUrl = this._getStyleUrlForLocale('vector');
      if (vectorUrl) {
        const url = this._proxyPath + this._getAbsoluteUrl(vectorUrl);
        const vectorJson = await this._emsClient.getManifest(
          this._emsClient.extendUrlWithParams(url)
        );
        return { ...vectorJson };
      } else {
        return;
      }
    }
  );

  _getVectorStyleJsonInlined = _.once(
    async (): Promise<EmsVectorStyle | undefined> => {
      const vectorJson = await this._getVectorStyleJsonRaw();
      if (vectorJson) {
        const inlinedSources: EmsVectorSources = {};
        const { sources } = vectorJson;
        for (const sourceName of Object.getOwnPropertyNames(sources)) {
          const { url } = sources[sourceName];
          const sourceUrl = this._proxyPath + this._getAbsoluteUrl(url);
          const extendedUrl = this._emsClient.extendUrlWithParams(sourceUrl);
          const sourceJson = await this._emsClient.getManifest(extendedUrl);

          const extendedTileUrls = sourceJson.tiles.map((tileUrl: string) => {
            const url = this._proxyPath + this._getAbsoluteUrl(tileUrl);
            return this._emsClient.extendUrlWithParams(url);
          });
          // Override the attribution in the sources with the localized attribution
          const htmlAttribution = await this.getHTMLAttribution();
          inlinedSources[sourceName] = {
            type: 'vector',
            ...sourceJson,
            attribution: htmlAttribution,
            tiles: extendedTileUrls,
          };
        }
        return {
          ...vectorJson,
          sources: inlinedSources,
          sprite: await this._getSpriteSheetRootPath(),
          glyphs: await this._getUrlTemplateForGlyphs(),
        };
      } else {
        return;
      }
    }
  );

  constructor(config: ITMSService, emsClient: EMSClient, proxyPath: string) {
    this._config = config;
    this._emsClient = emsClient;
    this._proxyPath = proxyPath;
  }

  _getFormats(formatType: string, locale: string) {
    return this._config.formats.filter(
      format => format.locale === locale && format.format === formatType
    );
  }

  _getStyleUrlForLocale(formatType: string) {
    let vectorFormats = this._getFormats(formatType, this._emsClient.getLocale());
    if (!vectorFormats.length) {
      //fallback to default locale
      vectorFormats = this._getFormats(formatType, this._emsClient.getDefaultLocale());
    }
    if (!vectorFormats.length) {
      // eslint-disable-next-line max-len
      throw new Error(
        `Cannot find ${formatType} tile layer for locale ${this._emsClient.getLocale()} or ${this._emsClient.getDefaultLocale()}`
      );
    }
    const defaultStyle = vectorFormats[0];
    if (defaultStyle && defaultStyle.hasOwnProperty('url')) {
      return defaultStyle.url;
    }
  }

  async getDefaultRasterStyle(): Promise<EmsRasterStyle | undefined> {
    const tileJson = await this._getRasterStyleJson();
    if (tileJson) {
      const tiles = tileJson.tiles.map(
        (tile: string) => this._proxyPath + this._getAbsoluteUrl(tile)
      );
      return {
        ...tileJson,
        ...{ tiles },
      };
    } else {
      return;
    }
  }

  async getUrlTemplate(): Promise<string> {
    const tileJson = await this._getRasterStyleJson();
    if (tileJson) {
      const directUrl = this._proxyPath + this._getAbsoluteUrl(tileJson.tiles[0]);
      return this._emsClient.extendUrlWithParams(directUrl);
    } else {
      return '';
    }
  }

  async getUrlTemplateForVector(sourceId: string): Promise<string> {
    const tileJson = await this._getVectorStyleJsonInlined();
    if (!tileJson) {
      return '';
    }
    if (tileJson.sources[sourceId] && tileJson.sources[sourceId].tiles) {
      const directUrl = this._proxyPath + this._getAbsoluteUrl(tileJson.sources[sourceId].tiles[0]);
      return this._emsClient.extendUrlWithParams(directUrl);
    } else {
      return '';
    }
  }

  async getVectorStyleSheet(): Promise<EmsVectorStyle | undefined> {
    return await this._getVectorStyleJsonInlined();
  }

  async getVectorStyleSheetRaw(): Promise<EmsVectorStyle | undefined> {
    return await this._getVectorStyleJsonRaw();
  }

  async getSpriteSheetMeta(
    isRetina: boolean = false
  ): Promise<{ png: string; json: EmsSpriteSheet } | undefined> {
    const metaUrl = await this.getSpriteSheetJsonPath(isRetina);
    const spritePngs = await this.getSpriteSheetPngPath(isRetina);
    if (metaUrl && spritePngs) {
      const metaUrlExtended = this._emsClient.extendUrlWithParams(metaUrl);
      const jsonMeta = await this._emsClient.getManifest(metaUrlExtended);
      return {
        png: spritePngs,
        json: jsonMeta,
      };
    } else {
      return;
    }
  }

  async _getSpriteSheetRootPath(): Promise<string> {
    const vectorStyleJson = await this._getVectorStyleJsonRaw();
    if (vectorStyleJson) {
      return this._proxyPath + this._getAbsoluteUrl(vectorStyleJson.sprite);
    } else {
      return '';
    }
  }

  async _getUrlTemplateForGlyphs(): Promise<string> {
    const vectorStyleJson = await this._getVectorStyleJsonRaw();
    if (vectorStyleJson) {
      return this._proxyPath + this._getAbsoluteUrl(vectorStyleJson.glyphs);
    } else {
      return '';
    }
  }

  async getSpriteSheetJsonPath(isRetina: boolean = false): Promise<string> {
    const spriteSheetRootPath = await this._getSpriteSheetRootPath();
    if (spriteSheetRootPath) {
      const suffix = isRetina ? '@2x' : '';
      return spriteSheetRootPath + suffix + '.json';
    } else {
      return '';
    }
  }

  async getSpriteSheetPngPath(isRetina: boolean = false): Promise<string> {
    const spriteSheetRootPath = await this._getSpriteSheetRootPath();
    if (spriteSheetRootPath) {
      const suffix = isRetina ? '@2x' : '';
      return spriteSheetRootPath + suffix + '.png';
    } else {
      return '';
    }
  }

  getDisplayName(): string {
    return this._emsClient.getValueInLanguage(this._config.name);
  }

  getAttributions(): EmsLayerAttribution[] {
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
      return this._emsClient.sanitizeHtml(`${html}`);
    });
    return attributions.join(' | ');
  }

  getMarkdownAttribution(): string {
    const attributions = this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      return `[${label}](${url})`;
    });
    return attributions.join('|');
  }

  async getMinZoom(): Promise<number | undefined> {
    const tileJson = await this._getRasterStyleJson();
    if (tileJson) {
      return tileJson.minzoom;
    } else {
      return;
    }
  }

  async getMaxZoom(): Promise<number | undefined> {
    const tileJson = await this._getRasterStyleJson();
    if (tileJson) {
      return tileJson.maxzoom;
    } else {
      return;
    }
  }

  getId(): string {
    return this._config.id;
  }

  hasId(id: string): boolean {
    return this._config.id === id;
  }

  getOrigin(): string {
    return ORIGIN.EMS;
  }
}
