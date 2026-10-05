/**
 * The photographs on the landing page.
 *
 * Held here rather than in the page so the grid and the hero cannot disagree
 * about which picture is which, and so adding or removing one is a single line
 * edit. Width and height are the real pixel sizes of the files in
 * `public/images`, which lets `next/image` reserve the right box before the
 * file loads and so the page does not jump as the pictures arrive.
 *
 * Three photographs, all the same 4:3 shape, which means the grid crops
 * nothing and the page does not change mood as you scroll. They were supplied
 * as PNGs and converted to progressive JPEG at quality 82, taking the total
 * from 5.1 MB to 397 KB with no visible loss at these dimensions.
 *
 * `alt` is deliberately generic. Replace it with a description of what each
 * photograph actually shows, which also makes the page usable with a screen
 * reader and survive being posted somewhere images are blocked.
 */
export type LibraryPhoto = {
  src: string;
  width: number;
  height: number;
  /** The large picture at the top of the page. */
  hero: boolean;
  alt: string;
};

const ALT = "Amtul Noor Library";

export const LIBRARY_PHOTOS: LibraryPhoto[] = [
  { src: "hero.jpg", width: 1448, height: 1086, hero: true, alt: ALT },
  { src: "gallery-1.jpg", width: 1448, height: 1086, hero: false, alt: ALT },
  { src: "gallery-2.jpg", width: 1195, height: 896, hero: false, alt: ALT },
];

export const HERO_PHOTO =
  LIBRARY_PHOTOS.find((photo) => photo.hero) ?? LIBRARY_PHOTOS[0];

/** Everything except the hero, which is already shown at the top. */
export const GALLERY_PHOTOS = LIBRARY_PHOTOS.filter((photo) => !photo.hero);