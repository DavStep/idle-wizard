import { describe, expect, it } from 'vitest';

import { packAssets } from './build-asset-atlas.js';

describe('build asset atlas', () => {
  it('rejects a named asset wider than the primary atlas page', () => {
    expect(() =>
      packAssets([
        {
          frameName: 'test:tooWide',
          height: 64,
          relativePath: 'test/too-wide.png',
          width: 2049,
        },
      ]),
    ).toThrow('does not fit inside the 2048x2048 primary atlas page');
  });

  it('rejects named assets whose packed rows exceed the primary atlas height', () => {
    expect(() =>
      packAssets([
        {
          frameName: 'test:first',
          height: 990,
          relativePath: 'test/first.png',
          width: 1984,
        },
        {
          frameName: 'test:second',
          height: 990,
          relativePath: 'test/second.png',
          width: 1984,
        },
      ]),
    ).toThrow('exceed the 2048px primary atlas page height');
  });
});
