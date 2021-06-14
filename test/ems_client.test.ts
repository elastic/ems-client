/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEMSClient } from './ems_client_util';
import { FileLayer } from '../src/file_layer';

it('should get api manifests', async () => {
  const { emsClient, getManifestMock } = getEMSClient({
    language: 'zz',
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });

  await emsClient.getTMSServices();
  await emsClient.getFileLayers();

  expect(getManifestMock).toHaveBeenNthCalledWith(1, 'https://tiles.foobar/v7.6/manifest');
  expect(getManifestMock).toHaveBeenNthCalledWith(2, 'https://files.foobar/v7.6/manifest');
});

it('should handle end slashes in api urls correctly', async () => {
  const { emsClient, getManifestMock } = getEMSClient({
    language: 'zz',
    tileApiUrl: 'https://tiles.foobar/',
    fileApiUrl: 'https://files.foobar/',
    emsVersion: '7.6',
  });
  await emsClient.getTMSServices();
  await emsClient.getFileLayers();

  expect(getManifestMock).toHaveBeenNthCalledWith(1, 'https://tiles.foobar/v7.6/manifest');
  expect(getManifestMock).toHaveBeenNthCalledWith(2, 'https://files.foobar/v7.6/manifest');
});

it('should get the tile service', async () => {
  const { emsClient } = getEMSClient({
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });
  const tiles = await emsClient.getTMSServices();

  expect(tiles.length).toBe(3);

  const tileService = tiles[0];
  expect(await tileService.getUrlTemplate()).toBe(
    'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );

  expect(await tileService.getMinZoom()).toBe(0);
  expect(await tileService.getMaxZoom()).toBe(10);
  expect(tileService.hasId('road_map')).toBe(true);
});

it('tile service- localized (fallback)', async () => {
  const { emsClient } = getEMSClient({
    language: 'zz', //madeup
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });
  const tiles = await emsClient.getTMSServices();

  expect(tiles.length).toBe(3);

  const tileService = tiles[0];
  expect(await tileService.getUrlTemplate()).toBe(
    'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );

  expect(await tileService.getMinZoom()).toBe(0);
  expect(await tileService.getMaxZoom()).toBe(10);
  expect(tileService.hasId('road_map')).toBe(true);
});

it('.addQueryParams', async () => {
  const { emsClient } = getEMSClient({
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });

  const tilesBefore = await emsClient.getTMSServices();
  const urlBefore = await tilesBefore[0].getUrlTemplate();
  expect(urlBefore).toBe(
    'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );

  emsClient.addQueryParams({
    foo: 'bar',
  });
  let tiles = await emsClient.getTMSServices();
  let url = await tiles[0].getUrlTemplate();
  expect(url).toBe(
    'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x&foo=bar'
  );

  emsClient.addQueryParams({
    foo: 'schmoo',
    bar: 'foo',
  });
  tiles = await emsClient.getTMSServices();
  url = await tiles[0].getUrlTemplate();
  expect(url).toBe(
    'https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x&foo=schmoo&bar=foo'
  );
});

it('.getFileLayers', async () => {
  const { emsClient } = getEMSClient({
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });
  const layers = await emsClient.getFileLayers();
  expect(layers.length).toBe(19);
});

it('.getFileLayers with a single format', async () => {
  const { emsClient } = getEMSClient({
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });
  const layers = await emsClient.getFileLayers();

  const layer = layers[0];
  expect(layer.getId()).toBe('world_countries');
  expect(layer.hasId('world_countries')).toBe(true);
  expect(layer.getFields()).toMatchObject([
    {
      type: 'id',
      id: 'iso2',
      label: {
        en: 'ISO 3166-1 alpha-2 code',
      },
    },
    {
      type: 'id',
      id: 'iso3',
      label: {
        en: 'ISO 3166-1 alpha-3 code',
      },
    },
    {
      type: 'property',
      id: 'name',
      label: {
        en: 'name',
      },
    },
  ]);

  expect(layer.getDisplayName()).toBe('World Countries');
  expect(layer.getFormatOfTypeUrl('geojson')).toBe(
    'https://files.foobar/files/world_countries_v1.geo.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );
  expect(layer.getFormatOfType('geojson')).toBe('geojson');
  expect(layer.getDefaultFormatType()).toBe('geojson');
  expect(layer.getFormatOfTypeMeta('geojson')).toBeUndefined();
  expect(layer.getFormatOfTypeMeta('topojson')).toBeUndefined();
});

it('Test field metadata', async () => {
  const { emsClient } = getEMSClient({
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });
  const layers = await emsClient.getFileLayers();

  const france = layers.find((l) => l.getId() === 'france_departments');
  expect(france).toBeDefined();
  if (france) {
    const insee = france.getFields().find((f) => f.id === 'insee');
    expect(insee).toBeDefined();
    if (insee) {
      expect(insee.alias).toBeDefined();
      if (insee.alias && insee.alias.length >= 0) {
        expect(insee.alias[0]).toBe('insee');
      }
      expect(insee.regex).toBeDefined();
      expect(insee.regex).toBe('^(\\d{2}|2[AB]|9[78]\\d)D?$');
      expect(insee.values).toBeDefined();
      if (insee.values && insee.values.length >= 0) {
        expect(insee.values.length).toBe(96);
        expect(insee.values[0]).toBe('30');
      }
    }
  }
});

it('.getFileLayers with multiple formats', async () => {
  const { emsClient } = getEMSClient({
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });
  const layers = await emsClient.getFileLayers();

  const layer = layers[1];
  expect(layer.getId()).toBe('administrative_regions_lvl2');
  expect(layer.hasId('administrative_regions_lvl2')).toBe(true);
  expect(layer.getFields()).toMatchObject([
    {
      type: 'id',
      id: 'region_iso_code',
      label: {
        en: 'Region ISO code',
      },
    },
    {
      type: 'property',
      id: 'region_name',
      label: {
        en: 'Region name',
      },
    },
  ]);

  expect(layer.getDisplayName()).toBe('Administrative regions');
  expect(layer.getFormatOfTypeUrl('geojson')).toBe(
    'https://files.foobar/files/admin_regions_lvl2_v2.geo.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );
  expect(layer.getFormatOfTypeUrl('topojson')).toBe(
    'https://files.foobar/files/admin_regions_lvl2_v2.topo.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );
  expect(layer.getDefaultFormatUrl()).toBe(
    'https://files.foobar/files/admin_regions_lvl2_v2.topo.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );
  expect(layer.getFormatOfType('geojson')).toBe('geojson');
  expect(layer.getDefaultFormatType()).toBe('topojson');
  expect(layer.getFormatOfTypeMeta('geojson')).toBeUndefined();
  expect(layer.getFormatOfTypeMeta('topojson')).toMatchObject({
    feature_collection_path: 'data',
  });
});

it('.getFileLayers[0] - localized (known)', async () => {
  const { emsClient } = getEMSClient({
    language: 'fr',
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });
  emsClient.addQueryParams({
    foo: 'bar',
  });
  const layers = await emsClient.getFileLayers();

  const layer = layers[0];
  expect(layer.getId()).toBe('world_countries');
  expect(layer.hasId('world_countries')).toBe(true);
  expect(layer.getDisplayName()).toBe('pays');

  const fields = layer.getFieldsInLanguage();
  expect(fields).toEqual([
    { name: 'iso2', description: 'code ISO 3166-1 alpha-2 du pays', type: 'id' },
    { name: 'iso3', description: 'code ISO 3166-1 alpha-3', type: 'id' },
    { name: 'name', description: 'nom', type: 'property' },
  ]);

  expect(layer.getDefaultFormatType()).toBe('geojson');
  expect(layer.getDefaultFormatUrl()).toBe(
    'https://files.foobar/files/world_countries_v1.geo.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x&foo=bar'
  );
  expect(layer.getDefaultFormatMeta()).toBeUndefined();
});

it('.getFileLayers[0] - localized (fallback)', async () => {
  const { emsClient } = getEMSClient({
    language: 'zz', //madeup
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });
  const layers = await emsClient.getFileLayers();

  const layer = layers[0];
  expect(layer.getId()).toBe('world_countries');
  expect(layer.hasId('world_countries')).toBe(true);
  expect(layer.getDisplayName()).toBe('World Countries');

  const fields = layer.getFieldsInLanguage();
  expect(fields).toEqual([
    { name: 'iso2', description: 'ISO 3166-1 alpha-2 code', type: 'id' },
    { name: 'iso3', description: 'ISO 3166-1 alpha-3 code', type: 'id' },
    { name: 'name', description: 'name', type: 'property' },
  ]);

  expect(await layer.getEMSHotLink()).toBe(
    'https://landing.foobar/?locale=zz#file/world_countries'
  );
});

describe('.getFileLayers[1] - getGeoJson defaults', () => {
  const { emsClient, getManifestMock } = getEMSClient({
    language: 'en',
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.13',
  });

  let layers: FileLayer[], topoLayer: FileLayer, fetchedJson: unknown;

  beforeAll(async () => {
    layers = await emsClient.getFileLayers();
    topoLayer = layers[1];
    fetchedJson = await topoLayer.getGeoJson();
  });

  it('should convert topojson to geojson', () => {
    expect(emsClient.getCachedGeoJson(topoLayer.getId())).toMatchSnapshot();
  });

  it('should store the converted geojson in the cache', () => {
    expect(getManifestMock).toHaveBeenNthCalledWith(1, 'https://files.foobar/v7.13/manifest');
    expect(getManifestMock).toHaveBeenNthCalledWith(
      2,
      'https://files.foobar/files/admin_regions_lvl2_v2.topo.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
    );
  });

  it('subsequent requests for the same layer should not call emsClient.getManifest', async () => {
    const cachedJson = await topoLayer.getGeoJson();
    expect(getManifestMock).toHaveBeenCalledTimes(2);
    expect(fetchedJson).toStrictEqual(cachedJson);
  });

  it('should return a geojson layer and cache the result', async () => {
    const geoLayer = layers[0];
    await geoLayer.getGeoJson();
    await geoLayer.getGeoJson();
    expect(getManifestMock).toHaveBeenNthCalledWith(
      3,
      'https://files.foobar/files/world_countries_v1.geo.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
    );
    expect(getManifestMock).toHaveBeenCalledTimes(3);
  });

  it('should reset the cache when emsClient is changed', () => {
    const cacheId = topoLayer.getId();
    emsClient.addQueryParams({ foo: 'bar' }); // calls private method _invalidateSettings
    expect(emsClient.getCachedGeoJson(cacheId)).toBeUndefined();
  });
});

it('.getFileLayers[1] - getGeoJson limited cache', async () => {
  const { emsClient } = getEMSClient({
    language: 'en',
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.13',
    cacheSize: 1,
  });

  const layers = await emsClient.getFileLayers();
  for await (const layer of layers.slice(0, 2)) {
    layer.getGeoJson();
  }
  expect(emsClient.getCachedGeoJson(layers[0].getId())).toBeUndefined();
  expect(emsClient.getCachedGeoJson(layers[1].getId())).toMatchSnapshot();
});

it('.findFileLayerById', async () => {
  const { emsClient } = getEMSClient({
    language: 'zz', //madeup
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });
  const layer = await emsClient.findFileLayerById('world_countries');
  expect(layer!.getId()).toBe('world_countries');
  expect(layer!.hasId('world_countries')).toBe(true);
});

it('.findTMSServiceById', async () => {
  const { emsClient } = getEMSClient({
    language: 'zz', //madeup
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });
  const tmsService = await emsClient.findTMSServiceById('road_map');
  expect(tmsService!.getId()).toBe('road_map');
});

it('should prepend proxypath', async () => {
  const { emsClient } = getEMSClient({
    tileApiUrl: 'http://proxy.com/foobar/tiles',
    fileApiUrl: 'http://proxy.com/foobar/vector',
    emsVersion: '7.6',
  });

  //should prepend the proxypath to all urls, for tiles and files
  const tmsServices = await emsClient.getTMSServices();
  expect(tmsServices.length).toBe(1);
  const urlTemplate = await tmsServices[0].getUrlTemplate();
  expect(urlTemplate).toBe(
    'http://proxy.com/foobar/tiles/raster/osm_bright/{x}/{y}/{z}.jpg?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );

  const fileLayers = await emsClient.getFileLayers();
  expect(fileLayers.length).toBe(2);
  const fileLayer = fileLayers[0];
  expect(fileLayer.getDefaultFormatUrl()).toBe(
    'http://proxy.com/foobar/vector/files/world_countries.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );
  expect(fileLayer.getFormatOfTypeUrl('geojson')).toBe(
    'http://proxy.com/foobar/vector/files/world_countries.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );
});

it('should retrieve vectorstylesheet with all sources inlined)', async () => {
  const { emsClient } = getEMSClient({
    tileApiUrl: 'https://tiles.foobar',
    fileApiUrl: 'https://files.foobar',
    emsVersion: '7.6',
  });

  const tmsServices = await emsClient.getTMSServices();
  expect(tmsServices.length).toBe(3);
  const tmsService = tmsServices[0];

  const styleSheet = await tmsService.getVectorStyleSheet();

  expect(styleSheet!.layers!.length).toBe(111);
  expect(styleSheet!.sprite).toBe('https://tiles.foobar/styles/osm-bright/sprite');
  expect(styleSheet!.sources!.openmaptiles!.tiles.length).toBe(1);
  expect(styleSheet!.sources!.openmaptiles!.tiles[0]).toBe(
    'https://tiles.foobar/data/v3/{z}/{x}/{y}.pbf?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );
  expect(styleSheet!.sources!.openmaptiles!.type).toBe('vector');
});

it('should retrieve vectorstylesheet with all sources inlined) (proxy)', async () => {
  const { emsClient } = getEMSClient({
    tileApiUrl: 'http://proxy.com/foobar/tiles',
    fileApiUrl: 'http://proxy.com/foobar/files',
    emsVersion: '7.6',
  });

  const tmsServices = await emsClient.getTMSServices();
  expect(tmsServices.length).toBe(1);
  const tmsService = tmsServices[0];

  const styleSheet = await tmsService.getVectorStyleSheet();

  expect(styleSheet!.layers!.length).toBe(111);
  expect(styleSheet!.sprite).toBe('http://proxy.com/foobar/tiles/styles/osm-bright/sprite');
  expect(styleSheet!.sources!.openmaptiles!.tiles!.length).toBe(1);
  expect(styleSheet!.sources!.openmaptiles!.tiles![0]).toBe(
    'http://proxy.com/foobar/tiles/data/v3/{z}/{x}/{y}.pbf?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
  );
  expect(styleSheet!.sources!.openmaptiles!.type).toBe('vector');
});
