import seedPackBlackIconUrl from './seed-pack-black.png';
import seedPackGrayIconUrl from './seed-pack-gray.png';
import seedPackRegularIconUrl from './seed-pack-regular.png';

export const seedIconVariantUrls = Object.freeze({
  black: seedPackBlackIconUrl,
  gray: seedPackGrayIconUrl,
  regular: seedPackRegularIconUrl,
});

export function getSeedIconUrl() {
  return seedPackRegularIconUrl;
}
