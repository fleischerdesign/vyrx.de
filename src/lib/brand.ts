// The mark, as markup a component can size and colour itself.
//
// The artwork lives in `src/brand/`: the delivered drawing and the arrangements derived from it
// (`scripts/build-brand.py`, explained in `docs/brand.md`). A component that needs a mark imports the file
// as raw text and hands it to `geometryOf` here - so the header draws the *brand's* lettering instead of
// typing the name in the nearest system font, and the geometry exists once.
//
// Only geometry is taken: the colour of the file is dropped and the component decides, which is what makes
// one file work in both themes (G2) and why the header needs no second, white copy.

export interface Geometry {
  /** The box the paths are drawn in, straight from the source file. */
  readonly viewBox: string;
  /** The paths, without the wrapper the file needs to be a file. */
  readonly body: string;
}

export function geometryOf(raw: string): Geometry {
  const viewBox = /viewBox="([^"]+)"/.exec(raw)?.[1];
  if (!viewBox) throw new Error('the brand file carries no viewBox - is it an SVG?');
  const content = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '');
  const body = content.replace(/\sfill="[^"]*"/g, '').trim();
  if (!body) throw new Error('the brand file carried no geometry');
  return { viewBox, body };
}
