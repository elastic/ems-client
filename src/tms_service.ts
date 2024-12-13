/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { EMSClient, EmsTmsFormat, TMSServiceConfig } from './ems_client';
import { AbstractEmsService } from './ems_service';

type EmsVectorSource = {
  type: 'vector';
  url: string;
  tiles: string[];
  bounds?: number[];
  scheme?: 'xyz' | 'tms';
  minzoom?: number;
  maxzoom?: number;
  attribution?: string;
};

type EmsVectorSources = {
  [sourceName: string]: EmsVectorSource;
};

type EmsVectorStyle = {
  sources: EmsVectorSources;
  sprite: string;
  glyphs: string;
  bearing?: number;
  center?: number[];
  layers?: unknown[];
  metadata?: unknown;
  name?: string;
  pitch?: number;
  light?: unknown;
  transition?: unknown;
  version: number;
  zoom?: number;
};

type EmsSprite = {
  height: number;
  pixelRatio: number;
  width: number;
  x: number;
  y: number;
};

type EmsSpriteSheet = {
  [spriteName: string]: EmsSprite;
};

type EmsRasterStyle = {
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
};

export class TMSService extends AbstractEmsService {
<<<<<<< HEAD
=======
  /*
  List of supported languages with labels and OMT codes extracted
  from https://openmaptiles.org/languages

  Keys are values for i18.locale from Kibana settings
  and OMT codes for the rest. 
  */
  public static SupportedLanguages = [
    { key: 'ar', omt: 'ar' },
    { key: 'az', omt: 'az' },
    { key: 'be', omt: 'be' },
    { key: 'bg', omt: 'bg' },
    { key: 'br', omt: 'br' },
    { key: 'bs', omt: 'bs' },
    { key: 'ca', omt: 'ca' },
    { key: 'cs', omt: 'cs' },
    { key: 'cy', omt: 'cy' },
    { key: 'da', omt: 'da' },
    { key: 'de', omt: 'de' },
    { key: 'el', omt: 'el' },
    { key: 'en', omt: 'en' },
    { key: 'eo', omt: 'eo' },
    { key: 'es', omt: 'es' },
    { key: 'et', omt: 'et' },
    { key: 'fi', omt: 'fi' },
    { key: 'fr-fr', omt: 'fr' },
    { key: 'fy', omt: 'fy' },
    { key: 'ga', omt: 'ga' },
    { key: 'gd', omt: 'gd' },
    { key: 'he', omt: 'he' },
    { key: 'hi-in', omt: 'hi' },
    { key: 'hr', omt: 'hr' },
    { key: 'hu', omt: 'hu' },
    { key: 'hy', omt: 'hy' },
    { key: 'is', omt: 'is' },
    { key: 'it', omt: 'it' },
    { key: 'ja_kana', omt: 'ja_kana' },
    { key: 'ja_rm', omt: 'ja_rm' },
    { key: 'ja-jp', omt: 'ja' },
    { key: 'ka', omt: 'ka' },
    { key: 'kk', omt: 'kk' },
    { key: 'kn', omt: 'kn' },
    { key: 'ko_rm', omt: 'ko_rm' },
    { key: 'ko', omt: 'ko' },
    { key: 'la', omt: 'la' },
    { key: 'lb', omt: 'lb' },
    { key: 'lt', omt: 'lt' },
    { key: 'lv', omt: 'lv' },
    { key: 'mk', omt: 'mk' },
    { key: 'mt', omt: 'mt' },
    { key: 'nl', omt: 'nl' },
    { key: 'no', omt: 'no' },
    { key: 'pl', omt: 'pl' },
    { key: 'pt-pt', omt: 'pt' },
    { key: 'rm', omt: 'rm' },
    { key: 'ro', omt: 'ro' },
    { key: 'ru-ru', omt: 'ru' },
    { key: 'sk', omt: 'sk' },
    { key: 'sl', omt: 'sl' },
    { key: 'sq', omt: 'sq' },
    { key: 'sr-Ltn', omt: 'sr-Ltn' },
    { key: 'sr', omt: 'sr' },
    { key: 'sv', omt: 'sv' },
    { key: 'th', omt: 'th' },
    { key: 'tr', omt: 'tr' },
    { key: 'uk', omt: 'uk' },
    { key: 'zh-cn', omt: 'zh' },
  ];

  /*
  Suggested default operations for the different EMS styles
  */
  public static colorOperationDefaults: {
    style: string;
    operation: blendMode;
    percentage: number;
  }[] = [
    { style: 'road_map', operation: 'mix', percentage: 0.25 },
    { style: 'road_map_desaturated', operation: 'screen', percentage: 0.25 },
    { style: 'dark_map', operation: 'dodge', percentage: 0.25 },
    { style: 'high_contrast', operation: 'screen', percentage: 0.25 },
    { style: 'road_map_desaturated_v9', operation: 'screen', percentage: 0.25 },
    { style: 'dark_map_v9', operation: 'dodge', percentage: 0.25 },
  ];

>>>>>>> 7b11cec (Add color processors for upcoming new styles (#478))
  protected readonly _config: TMSServiceConfig;

  private _getRasterStyleJson = _.once(async (): Promise<EmsRasterStyle | undefined> => {
    const rasterUrl = this._getStyleUrlForLocale('raster');
    if (rasterUrl) {
      const url = this._proxyPath + this._getAbsoluteUrl(rasterUrl);
      return this._emsClient.getManifest<EmsRasterStyle>(this._emsClient.extendUrlWithParams(url));
    } else {
      return;
    }
  });

  private _getVectorStyleJsonRaw = _.once(async (): Promise<EmsVectorStyle | undefined> => {
    const vectorUrl = this._getStyleUrlForLocale('vector');
    if (vectorUrl) {
      const url = this._proxyPath + this._getAbsoluteUrl(vectorUrl);
      const vectorJson = await this._emsClient.getManifest<EmsVectorStyle>(
        this._emsClient.extendUrlWithParams(url)
      );
      return { ...vectorJson };
    } else {
      return;
    }
  });

  private _getVectorStyleJsonInlined = _.once(async (): Promise<EmsVectorStyle | undefined> => {
    const vectorJson = await this._getVectorStyleJsonRaw();
    if (vectorJson) {
      const inlinedSources: EmsVectorSources = {};
      const { sources } = vectorJson;
      for (const sourceName of Object.getOwnPropertyNames(sources)) {
        const { url } = sources[sourceName];
        const sourceUrl = this._proxyPath + this._getAbsoluteUrl(url);
        const extendedUrl = this._emsClient.extendUrlWithParams(sourceUrl);
        const sourceJson = await this._emsClient.getManifest<EmsVectorSource>(extendedUrl);

        const extendedTileUrls = sourceJson.tiles.map((tileUrl: string) => {
          const url = this._proxyPath + this._getAbsoluteUrl(tileUrl);
          return this._emsClient.extendUrlWithParams(url);
        });
        inlinedSources[sourceName] = {
          ...sourceJson,
          type: 'vector',
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
  });

  constructor(config: TMSServiceConfig, emsClient: EMSClient, proxyPath: string) {
    super(config, emsClient, proxyPath);
    this._config = config;
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
      const jsonMeta = await this._emsClient.getManifest<EmsSpriteSheet>(metaUrlExtended);
      return {
        png: spritePngs,
        json: jsonMeta,
      };
    } else {
      return;
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

  getApiUrl(): string {
    return this._emsClient.getTileApiUrl();
  }

  private _getStyleUrlForLocale(formatType: string): string | undefined {
    let vectorFormats = this._getFormats(formatType, this._emsClient.getLocale());
    if (!vectorFormats.length) {
      //fallback to default locale
      vectorFormats = this._getFormats(formatType, this._emsClient.getDefaultLocale());
    }
    if (!vectorFormats.length) {
      throw new Error(
        `Cannot find ${formatType} tile layer for locale ${this._emsClient.getLocale()} or ${this._emsClient.getDefaultLocale()}`
      );
    }
    const defaultStyle = vectorFormats[0];
    if (defaultStyle && Object.prototype.hasOwnProperty.call(defaultStyle, 'url')) {
      return defaultStyle.url;
    }
  }

  private _getFormats(formatType: string, locale: string): EmsTmsFormat[] {
    return this._config.formats.filter(
      (format) => format.locale === locale && format.format === formatType
    );
  }

  private async _getSpriteSheetRootPath(): Promise<string> {
    const vectorStyleJson = await this._getVectorStyleJsonRaw();
    if (vectorStyleJson) {
      return this._proxyPath + this._getAbsoluteUrl(vectorStyleJson.sprite);
    } else {
      return '';
    }
  }

  private async _getUrlTemplateForGlyphs(): Promise<string> {
    const vectorStyleJson = await this._getVectorStyleJsonRaw();
    if (vectorStyleJson) {
      return this._proxyPath + this._getAbsoluteUrl(vectorStyleJson.glyphs);
    } else {
      return '';
    }
  }
}
