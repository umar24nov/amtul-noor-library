/**
 * The photographs on the landing page.
 *
 * Held here rather than in the page so the grid and the hero cannot disagree
 * about which picture is which, and so adding or removing one is a single line
 * edit. Width and height are the real pixel sizes of the files in
 * `public/images`, which lets `next/image` reserve the right box before the
 * file loads and so the page does not jump as the pictures arrive.
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
  { src: "library-01.jpg", width: 1024, height: 1378, hero: false, alt: ALT },
  { src: "library-02.jpg", width: 1084, height: 1079, hero: true, alt: ALT },
  { src: "library-03.jpg", width: 1024, height: 1024, hero: false, alt: ALT },
  { src: "library-04.jpg", width: 1600, height: 814, hero: false, alt: ALT },
  { src: "library-05.jpg", width: 868, height: 1156, hero: false, alt: ALT },
  { src: "library-06.jpg", width: 868, height: 1156, hero: false, alt: ALT },
  { src: "library-07.jpg", width: 868, height: 1156, hero: false, alt: ALT },
  { src: "library-08.jpg", width: 1200, height: 1600, hero: false, alt: ALT },
  { src: "library-09.jpg", width: 960, height: 1280, hero: false, alt: ALT },
  { src: "library-10.jpg", width: 960, height: 1280, hero: false, alt: ALT },
  { src: "library-11.jpg", width: 960, height: 1280, hero: false, alt: ALT },
  { src: "library-12.jpg", width: 960, height: 1280, hero: false, alt: ALT },
  { src: "library-13.jpg", width: 868, height: 1156, hero: false, alt: ALT },
  { src: "library-14.jpg", width: 1280, height: 960, hero: false, alt: ALT },
  { src: "library-15.jpg", width: 868, height: 1156, hero: false, alt: ALT },
];

export const HERO_PHOTO =
  LIBRARY_PHOTOS.find((photo) => photo.hero) ?? LIBRARY_PHOTOS[0];

/** Everything except the hero, which is already shown at the top. */
export const GALLERY_PHOTOS = LIBRARY_PHOTOS.filter((photo) => !photo.hero);