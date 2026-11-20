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

  test('template variables are left untouched in the path', () => {
    expect(setUrlQueryParams('https://t.example/{z}/{x}/{y}.png', query)).toContain(
      '/{z}/{x}/{y}.png?'
    );
  });

  test('protocol-relative URL keeps explicit port 80 and credentials', () => {
    expect(setUrlQueryParams('//u:p@tiles.example:80/p.png', { a: '1' })).toBe(
      '//u:p@tiles.example:80/p.png?a=1'
    );
  });

  test('relative paths are not normalized', () => {
    expect(setUrlQueryParams('api/manifest', { a: '1' })).toBe('api/manifest?a=1');
    expect(setUrlQueryParams('../api/manifest?b=2#h', { a: '1' })).toBe(
      '../api/manifest?b=2&a=1#h'
    );
  });

  test('spaces in the path are passed through as given', () => {
    expect(setUrlQueryParams('https://t.example/my maps/é.json', { a: '1' })).toBe(
      'https://t.example/my maps/é.json?a=1'
    );
  });

  test('origin without path gets the root path', () => {
    expect(setUrlQueryParams('https://t.example', { a: '1' })).toBe('https://t.example/?a=1');
  });

  test('empty input yields only the query', () => {
    expect(setUrlQueryParams('', { a: '1' })).toBe('?a=1');
  });
});
