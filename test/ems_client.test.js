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
import EMS_STYLE_BRIGHT_PROXIED  from './ems_mocks/sample_style_bright_proxied.json';
import EMS_STYLE_BRIGHT_VECTOR_PROXIED  from './ems_mocks/sample_style_bright_vector_proxied.json';

describe('ems_client', () => {


  it('should get the tile service', async () => {

    const emsClient = getEMSClient();
    const tiles = await emsClient.getTMSServices();

    expect(tiles.length).toBe(3);

    const tileService = tiles[0];
    expect(await tileService.getUrlTemplate()).toBe('https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.2.0');

    expect (tileService.getHTMLAttribution()).toBe('<p><a rel="noreferrer noopener" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a rel="noreferrer noopener" href="https://openmaptiles.org">OpenMapTiles</a> | <a rel="noreferrer noopener" href="https://www.maptiler.com">MapTiler</a> | <a rel="noreferrer noopener" href="https://www.elastic.co/elastic-maps-service">Elastic Maps Service</a></p>');
    expect (await tileService.getMinZoom()).toBe(0);
    expect (await tileService.getMaxZoom()).toBe(10);
    expect (tileService.hasId('road_map')).toBe(true);

  });

  it('tile service- localized (fallback)', async () => {
    const emsClient = getEMSClient({
      language: 'zz'//madeup
    });
    const tiles = await emsClient.getTMSServices();

    expect(tiles.length).toBe(3);

    const tileService = tiles[0];
    expect(await tileService.getUrlTemplate()).toBe('https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.2.0');

    expect (tileService.getHTMLAttribution()).toBe('<p><a rel="noreferrer noopener" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a rel="noreferrer noopener" href="https://openmaptiles.org">OpenMapTiles</a> | <a rel="noreferrer noopener" href="https://www.maptiler.com">MapTiler</a> | <a rel="noreferrer noopener" href="https://www.elastic.co/elastic-maps-service">Elastic Maps Service</a></p>');
    expect (await tileService.getMinZoom()).toBe(0);
    expect (await tileService.getMaxZoom()).toBe(10);
    expect (tileService.hasId('road_map')).toBe(true);
  });

  it('.addQueryParams', async () => {

    const emsClient = getEMSClient();


    const tilesBefore = await emsClient.getTMSServices();
    const urlBefore = await tilesBefore[0].getUrlTemplate();
    expect(urlBefore).toBe('https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.2.0');

    emsClient.addQueryParams({
      'foo': 'bar'
    });
    let tiles = await emsClient.getTMSServices();
    let url = await tiles[0].getUrlTemplate();
    expect(url).toBe('https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.2.0&foo=bar');

    emsClient.addQueryParams({
      'foo': 'schmoo',
      'bar': 'foo'
    });
    tiles = await emsClient.getTMSServices();
    url = await tiles[0].getUrlTemplate();
    expect(url).toBe('https://tiles.foobar/raster/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.2.0&foo=schmoo&bar=foo');


  });


  it('.getFileLayers', async () => {
    const emsClient = getEMSClient();
    const layers = await emsClient.getFileLayers();
    expect(layers.length).toBe(18);
  });

  it('.getFileLayers[0]', async () => {
    const emsClient = getEMSClient();
    const layers = await emsClient.getFileLayers();

    const layer = layers[0];
    expect(layer.getId()).toBe('world_countries');
    expect(layer.hasId('world_countries')).toBe(true);

    // expect(layer.hasId('World Countries')).toBe(true);//todo
    expect(layer.getHTMLAttribution()).toBe('<a href=http://www.naturalearthdata.com/about/terms-of-use>Made with NaturalEarth</a> | <a href=https://www.elastic.co/elastic-maps-service>Elastic Maps Service</a>');

    expect(layer.getHTMLAttribution()).toBe('<a href=http://www.naturalearthdata.com/about/terms-of-use>Made with NaturalEarth</a> | <a href=https://www.elastic.co/elastic-maps-service>Elastic Maps Service</a>');

    expect(layer.getDisplayName()).toBe('World Countries');

  });

  it('.getFileLayers[0] - localized (known)', async () => {
    const emsClient = getEMSClient({
      language: 'fr'
    });
    emsClient.addQueryParams({
      foo: 'bar'
    });
    const layers = await emsClient.getFileLayers();

    const layer = layers[0];
    expect(layer.getId()).toBe('world_countries');
    expect(layer.hasId('world_countries')).toBe(true);

    // expect(layer.hasId('World Countries')).toBe(true);//todo
    expect(layer.getHTMLAttribution()).toBe('<a href=http://www.naturalearthdata.com/about/terms-of-use>Made with NaturalEarth</a> | <a href=https://www.elastic.co/elastic-maps-service>Elastic Maps Service</a>');
    expect(layer.getDisplayName()).toBe('pays');


    const fields = layer.getFieldsInLanguage();
    expect(fields).toEqual([ { name: 'iso2',
      description: 'code ISO 3166-1 alpha-2 du pays',
      type: 'id' },
    { name: 'iso3',
      description: 'code ISO 3166-1 alpha-3',
      type: 'id' },
    { name: 'name', description: 'nom', type: 'property' } ]);

    expect(layer.getDefaultFormatType()).toBe('geojson');
    expect(layer.getDefaultFormatUrl()).toBe('https://files.foobar/files/world_countries_v1.geo.json?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.2.0&foo=bar');


  });

  it('.getFileLayers[0] - localized (fallback)', async () => {
    const emsClient = getEMSClient({
      language: 'zz'//madeup
    });
    const layers = await emsClient.getFileLayers();

    const layer = layers[0];
    expect(layer.getId()).toBe('world_countries');
    expect(layer.hasId('world_countries')).toBe(true);

    // expect(layer.hasId('World Countries')).toBe(true);//todo
    expect(layer.getHTMLAttribution()).toBe('<a href=http://www.naturalearthdata.com/about/terms-of-use>Made with NaturalEarth</a> | <a href=https://www.elastic.co/elastic-maps-service>Elastic Maps Service</a>');
    expect(layer.getDisplayName()).toBe('World Countries');

    const fields = layer.getFieldsInLanguage();
    expect(fields).toEqual([ { name: 'iso2',
      description: 'ISO 3166-1 alpha-2 code',
      type: 'id' },
    { name: 'iso3',
      description: 'ISO 3166-1 alpha-3 code',
      type: 'id' },
    { name: 'name', description: 'name', type: 'property' } ]);


    expect((await layer.getEMSHotLink())).toBe('https://landing.foobar/?locale=zz#file/world_countries');

  });

  it('.findFileLayerById', async () => {
    const emsClient = getEMSClient();
    const layer = await emsClient.findFileLayerById('world_countries');
    expect(layer.getId()).toBe('world_countries');
    expect(layer.hasId('world_countries')).toBe(true);

  });

  it('.findTMSServiceById', async () => {
    const emsClient = getEMSClient();
    const tmsService = await emsClient.findTMSServiceById('road_map');
    expect(tmsService.getId()).toBe('road_map');

  });


  it('should prepend proxypath', async () => {

    const emsClient = getEMSClient({
      tileApiUrl: 'http://proxy.com/foobar/tiles',
      fileApiUrl: 'http://proxy.com/foobar/vector',
    });

    //should prepend the proxypath to all urls, for tiles and files
    const tmsServices = await emsClient.getTMSServices();
    expect(tmsServices.length).toBe(1);
    const tmsService = tmsServices[0];
    tmsService._getRasterStyleJson = () => {
      return EMS_STYLE_BRIGHT_PROXIED;
    };
    const urlTemplate = await tmsServices[0].getUrlTemplate();
    expect(urlTemplate).toBe('http://proxy.com/foobar/tiles/raster/osm_bright/{x}/{y}/{z}.jpg?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.2.0');

    const fileLayers = await emsClient.getFileLayers();
    expect(fileLayers.length).toBe(1);
    const fileLayer = fileLayers[0];
    expect(fileLayer.getDefaultFormatUrl()).toBe('http://proxy.com/foobar/vector/files/world_countries.json?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.2.0');

  });

  it('should retrieve vectorstylesheet with all sources inlined)', async () => {

    const emsClient = getEMSClient({});

    const tmsServices = await emsClient.getTMSServices();
    expect(tmsServices.length).toBe(3);
    const tmsService = tmsServices[0];

    const styleSheet = await tmsService.getVectorStyleSheet();

    expect(styleSheet.layers.length).toBe(111);
    expect(styleSheet.sprite).toBe('https://tiles.foobar/styles/osm-bright/sprite');
    expect(styleSheet.sources.openmaptiles.tiles.length).toBe(1);
    expect(styleSheet.sources.openmaptiles.tiles[0]).toBe('https://tiles.foobar/data/v3/{z}/{x}/{y}.pbf?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.2.0');

  });

  it('should retrieve vectorstylesheet with all sources inlined) (proxy)', async () => {

    const emsClient = getEMSClient({
      tileApiUrl: 'http://proxy.com/foobar/tiles',
      fileApiUrl: 'http://proxy.com/foobar/vector',
    });

    const tmsServices = await emsClient.getTMSServices();
    expect(tmsServices.length).toBe(1);
    const tmsService = tmsServices[0];

    tmsService._getVectorStyleJsonRaw = () => {
      return EMS_STYLE_BRIGHT_VECTOR_PROXIED;
    };

    const styleSheet = await tmsService.getVectorStyleSheet();

    expect(styleSheet.layers.length).toBe(111);
    expect(styleSheet.sprite).toBe('http://proxy.com/foobar/tiles/styles/osm-bright/sprite');
    expect(styleSheet.sources.openmaptiles.tiles.length).toBe(1);
    expect(styleSheet.sources.openmaptiles.tiles[0]).toBe('http://proxy.com/foobar/tiles/data/v3/{z}/{x}/{y}.pbf?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.2.0');

  });


});

