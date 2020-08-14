
declare abstract class AbstractEmsService implements IEmsService {
    protected readonly _emsClient: EMSClient;
    protected readonly _config: BaseEmsServiceConfig;
    protected readonly _proxyPath: string;
    constructor(config: BaseEmsServiceConfig, emsClient: EMSClient, proxyPath: string);
    getAttributions(): {
        url: string;
        label: string;
    }[];
    getHTMLAttribution(): string;
    getMarkdownAttribution(): string;
    getOrigin(): string;
    /**
     * Checks if url is absolute. If not, prepend the basePath.
     */
    protected _getAbsoluteUrl: (url: string) => string;
    abstract getDisplayName(): string;
    abstract getId(): string;
    abstract hasId(id: string): boolean;
    abstract getApiUrl(): string;
}

declare type BaseClientConfig = {
    appName?: string;
    manifestServiceUrl?: string;
    tileApiUrl: string;
    fileApiUrl: string;
    emsVersion?: string;
    htmlSanitizer?: Function;
    language?: string;
    landingPageUrl?: string;
    fetchFunction: Function;
    proxyPath?: string;
};

declare type BaseEmsServiceConfig = {
    attribution: EmsLayerAttribution[];
};

declare type ClientConfig = BaseClientConfig & {
    appVersion: string;
};

declare type DeprecatedClientConfig = BaseClientConfig & {
    kbnVersion: string;
};

declare type EmsCatalogManifest = {
    version?: string;
    services: EmsCatalogService[];
};

declare type EmsCatalogService = {
    id?: string;
    name?: string;
    manifest: string;
    type: string;
};

export declare class EMSClient {
    readonly EMS_LOAD_TIMEOUT = 32000;
    private _queryParams;
    private readonly _appVersion;
    private readonly _fetchFunction;
    private readonly _sanitizer;
    private readonly _manifestServiceUrl?;
    private readonly _fileApiUrl;
    private readonly _tileApiUrl;
    private readonly _emsVersion;
    private readonly _emsLandingPageUrl;
    private readonly _language;
    private readonly _proxyPath;
    /**
     * these methods are assigned outside the constructor
     */
    private _getMainCatalog;
    private _getDefaultTMSCatalog;
    private _getDefaultFileCatalog;
    private _loadTMSServices;
    private _loadFileLayers;
    constructor(config: ClientConfig | DeprecatedClientConfig);
    getDefaultLocale(): string;
    getLocale(): string;
    getValueInLanguage(i18nObject: {
        [language: string]: string;
    }): string;
    /**
     * this internal method is overridden by the tests to simulate custom manifest.
     */
    getManifest<T>(manifestUrl: string): Promise<T>;
    /**
     * Add optional query-parameters to all requests
     *
     * @param additionalQueryParams
     */
    addQueryParams(additionalQueryParams: {
        [key: string]: string;
    }): void;
    getMainManifest(): Promise<EmsCatalogManifest>;
    getDefaultFileManifest(): Promise<EmsFileCatalog>;
    getDefaultTMSManifest(): Promise<EmsTmsCatalog>;
    getFileLayers(): Promise<FileLayer[]>;
    getTMSServices(): Promise<TMSService[]>;
    getTileApiUrl(): string;
    getFileApiUrl(): string;
    getLandingPageUrl(): string;
    sanitizeHtml(html: string): string;
    extendUrlWithParams(url: string): string;
    findFileLayerById(id: string): Promise<FileLayer | undefined>;
    findTMSServiceById(id: string): Promise<TMSService | undefined>;
    private _getEmsVersion;
    private _fetchWithTimeout;
    private _getManifestWithParams;
    private _invalidateSettings;
}

declare type EmsFileCatalog = {
    version?: string;
    layers: FileLayerConfig[];
};

declare type EmsFileLayerFormatGeoJson = {
    type: 'geojson';
    url: string;
    legacy_default: boolean;
};

declare type EmsFileLayerFormatTopoJson = {
    type: 'topojson';
    url: string;
    legacy_default: boolean;
    meta: {
        feature_collection_path: string;
    };
};

declare type EmsLayerAttribution = {
    label: LocalizedStrings;
    url: LocalizedStrings;
};

declare type EmsRasterStyle = {
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

declare type EmsSprite = {
    height: number;
    pixelRatio: number;
    width: number;
    x: number;
    y: number;
};

declare type EmsSpriteSheet = {
    [spriteName: string]: EmsSprite;
};

declare type EmsTmsCatalog = {
    version?: string;
    services: TMSServiceConfig[];
};

declare type EmsTmsFormat = {
    locale: string;
    format: string;
    url: string;
};

declare type EmsVectorSource = {
    type: 'vector';
    url: string;
    tiles: string[];
    bounds?: number[];
    scheme?: 'xyz' | 'tms';
    minzoom?: number;
    maxzoom?: number;
    attribution?: string;
};

declare type EmsVectorSources = {
    [sourceName: string]: EmsVectorSource;
};

declare type EmsVectorStyle = {
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

export declare class FileLayer extends AbstractEmsService {
    protected readonly _config: FileLayerConfig;
    constructor(config: FileLayerConfig, emsClient: EMSClient, proxyPath: string);
    getFields(): FileLayerConfig['fields'];
    getFieldsInLanguage(): {
        type: string;
        name: string;
        description: string;
    }[];
    getDisplayName(): string;
    getId(): string;
    hasId(id: string): boolean;
    getEMSHotLink(): string;
    getDefaultFormatType(): string;
    getDefaultFormatMeta(): {
        [key: string]: string;
    } | undefined;
    getDefaultFormatUrl(): string;
    getCreatedAt(): string;
    getApiUrl(): string;
    private _getDefaultFormat;
}

declare type FileLayerConfig = BaseEmsServiceConfig & {
    layer_id: string;
    created_at: string;
    formats: (EmsFileLayerFormatGeoJson | EmsFileLayerFormatTopoJson)[];
    fields: {
        type: string;
        id: string;
        label: LocalizedStrings;
    }[];
    legacy_ids: string[];
    layer_name: LocalizedStrings;
};

declare interface IEmsService {
    getAttributions(): {
        url: string;
        label: string;
    }[];
    getHTMLAttribution(): string;
    getMarkdownAttribution(): string;
    getDisplayName(): string;
    getId(): string;
    hasId(id: string): boolean;
    getOrigin(): string;
    getApiUrl(): string;
}

declare type LocalizedStrings = {
    [key: string]: string;
};

export declare const ORIGIN: {
    EMS: string;
    KIBANA_YML: string;
};

export declare class TMSService extends AbstractEmsService {
    protected readonly _config: TMSServiceConfig;
    private _getRasterStyleJson;
    private _getVectorStyleJsonRaw;
    private _getVectorStyleJsonInlined;
    constructor(config: TMSServiceConfig, emsClient: EMSClient, proxyPath: string);
    getDefaultRasterStyle(): Promise<EmsRasterStyle | undefined>;
    getUrlTemplate(): Promise<string>;
    getUrlTemplateForVector(sourceId: string): Promise<string>;
    getVectorStyleSheet(): Promise<EmsVectorStyle | undefined>;
    getVectorStyleSheetRaw(): Promise<EmsVectorStyle | undefined>;
    getSpriteSheetMeta(isRetina?: boolean): Promise<{
        png: string;
        json: EmsSpriteSheet;
    } | undefined>;
    getSpriteSheetJsonPath(isRetina?: boolean): Promise<string>;
    getSpriteSheetPngPath(isRetina?: boolean): Promise<string>;
    getDisplayName(): string;
    getMinZoom(): Promise<number | undefined>;
    getMaxZoom(): Promise<number | undefined>;
    getId(): string;
    hasId(id: string): boolean;
    getApiUrl(): string;
    private _getStyleUrlForLocale;
    private _getFormats;
    private _getSpriteSheetRootPath;
    private _getUrlTemplateForGlyphs;
}

declare type TMSServiceConfig = BaseEmsServiceConfig & {
    id: string;
    name: {
        en: string;
    };
    formats: EmsTmsFormat[];
};

export { }
