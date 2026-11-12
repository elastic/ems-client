import { setUrlQueryParams } from '../src/utils';

const query = { my_app_name: 'My App', my_app_version: '9.0.0' };

describe('setUrlQueryParams', () => {
  test('absolute URL', () => {
    expect(setUrlQueryParams('https://tiles.example/v9.0/manifest', query)).toBe(
      'https://tiles.example/v9.0/manifest?my_app_name=My%20App&my_app_version=9.0.0'
    );
  });

  test('keeps existing params, overrides duplicates, keeps hash', () => {
    expect(setUrlQueryParams('https://t.example/m?a=1&my_app_name=old#frag', query)).toBe(
      'https://t.example/m?a=1&my_app_name=My%20App&my_app_version=9.0.0#frag'
    );
  });

  test('path-only URL stays path-only', () => {
    expect(setUrlQueryParams('/api/maps/ems/v9.0/manifest', query)).toBe(
      '/api/maps/ems/v9.0/manifest?my_app_name=My%20App&my_app_version=9.0.0'
    );
  });

  test('protocol-relative URL keeps its host', () => {
    expect(setUrlQueryParams('//host.example/p.png', query)).toBe(
      '//host.example/p.png?my_app_name=My%20App&my_app_version=9.0.0'
    );
  });

  test('template variables are percent-encoded in the path', () => {
    expect(setUrlQueryParams('https://t.example/{z}/{x}/{y}.png', query)).toContain(
      '/%7Bz%7D/%7Bx%7D/%7By%7D.png?'
    );
  });
});
