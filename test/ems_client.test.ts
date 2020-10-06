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

import { getEMSClient } from './ems_client_util';

describe('ems_client', () => {
  it('should get api manifests', async () => {
    const emsClient = getEMSClient({
      language: 'zz',
      tileApiUrl: 'https://tiles.foobar',
      fileApiUrl: 'https://files.foobar',
      emsVersion: '7.6',
    });
    const spy = jest.spyOn(emsClient, 'getManifest');
    await emsClient.getTMSServices();
    await emsClient.getFileLayers();

    expect(spy).toHaveBeenNthCalledWith(1, 'https://tiles.foobar/v7.6/manifest');
    expect(spy).toHaveBeenNthCalledWith(2, 'https://files.foobar/v7.6/manifest');
  });

  it('should handle end slashes in api urls correctly', async () => {
    const emsClient = getEMSClient({
      language: 'zz',
      tileApiUrl: 'https://tiles.foobar/',
      fileApiUrl: 'https://files.foobar/',
      emsVersion: '7.6',
    });
    const spy = jest.spyOn(emsClient, 'getManifest');
    await emsClient.getTMSServices();
    await emsClient.getFileLayers();

    expect(spy).toHaveBeenNthCalledWith(1, 'https://tiles.foobar/v7.6/manifest');
    expect(spy).toHaveBeenNthCalledWith(2, 'https://files.foobar/v7.6/manifest');
  });

  it('should get the tile service', async () => {
    const emsClient = getEMSClient({
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
    const emsClient = getEMSClient({
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
    const emsClient = getEMSClient({
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
    const emsClient = getEMSClient({
      tileApiUrl: 'https://tiles.foobar',
      fileApiUrl: 'https://files.foobar',
      emsVersion: '7.6',
    });
    const layers = await emsClient.getFileLayers();
    expect(layers.length).toBe(18);
  });

  it('.getFileLayers[0]', async () => {
    const emsClient = getEMSClient({
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
    expect(layer.getFormatOfTypeMeta('geojson')).toBeUndefined();
    expect(layer.getFormatOfTypeMeta('topojson')).toStrictEqual({
      feature_collection_path: 'data',
    });
  });

  it('.getFileLayers[0] - localized (known)', async () => {
    const emsClient = getEMSClient({
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

    expect(layer.getDefaultFormatType()).toBe('topojson');
    expect(layer.getDefaultFormatUrl()).toBe(
      'https://files.foobar/files/world_countries_v7.topo.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x&foo=bar'
    );
    expect(layer.getDefaultFormatMeta()).toStrictEqual({ feature_collection_path: 'data' });
  });

  it('.getFileLayers[0] - localized (fallback)', async () => {
    const emsClient = getEMSClient({
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

  it('.findFileLayerById', async () => {
    const emsClient = getEMSClient({
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
    const emsClient = getEMSClient({
      language: 'zz', //madeup
      tileApiUrl: 'https://tiles.foobar',
      fileApiUrl: 'https://files.foobar',
      emsVersion: '7.6',
    });
    const tmsService = await emsClient.findTMSServiceById('road_map');
    expect(tmsService!.getId()).toBe('road_map');
  });

  it('should prepend proxypath', async () => {
    const emsClient = getEMSClient({
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
    expect(fileLayers.length).toBe(1);
    const fileLayer = fileLayers[0];
    expect(fileLayer.getDefaultFormatUrl()).toBe(
      'http://proxy.com/foobar/vector/files/world_countries_v7.topo.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
    );
    expect(fileLayer.getFormatOfTypeUrl('geojson')).toBe(
      'http://proxy.com/foobar/vector/files/world_countries_v1.geo.json?elastic_tile_service_tos=agree&my_app_name=tester&my_app_version=7.x.x'
    );
  });

  it('should retrieve vectorstylesheet with all sources inlined)', async () => {
    const emsClient = getEMSClient({
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
    const emsClient = getEMSClient({
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
});
