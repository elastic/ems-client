# @elastic/ems-client

@elastic/ems-client is a JavaScript library for the [Elastic Maps Service](https://www.elastic.co/elastic-maps-service).

This library is intended to be used by Elastic products. Use of the Elastic Maps Service is governed by the [Elastic Maps Service Terms of Service](https://www.elastic.co/elastic-maps-service-terms).


## Installation

NPM
`npm i @elastic/ems-client`

Yarn
`yarn add @elastic/ems-client`

## Building locally

`yarn build`

## Usage

```js
import { EMSClient } from '@elastic/ems-client';

const emsClient = new EMSClient({
  kbnVersion: '7.2.0',
  manifestServiceUrl: 'http://catalogue.maps.elastic.co/v7.2/manifest',
  language: 'en'
});
```
