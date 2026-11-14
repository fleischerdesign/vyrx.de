/*
 * Genre-Namen sind Produktwissen, keine TMDB-IDs aus dem Modell.
 * Das Modell darf „Horror“ sagen; die Zuordnung zu 27 passiert hier.
 */

export type MediaType = 'movie' | 'tv';

export interface Genre {
  readonly id: number;
  readonly name: string;
}

const MOVIE_GENRES: readonly Genre[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Abenteuer' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Komödie' },
  { id: 80, name: 'Krimi' },
  { id: 99, name: 'Dokumentation' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Familie' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'Historie' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Musik' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romanze' },
  { id: 878, name: 'Science Fiction' },
  { id: 10770, name: 'TV-Film' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'Krieg' },
  { id: 37, name: 'Western' },
];

const TV_GENRES: readonly Genre[] = [
  { id: 10759, name: 'Action & Abenteuer' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Komödie' },
  { id: 80, name: 'Krimi' },
  { id: 99, name: 'Dokumentation' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Familie' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'Krieg & Politik' },
  { id: 37, name: 'Western' },
];

const normalize = (value: string): string =>
  value
    .trim()
    .toLocaleLowerCase('de')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ');

const ALIASES: Record<MediaType, Record<string, number>> = {
  movie: {
    action: 28,
    abenteuer: 12,
    adventure: 12,
    animation: 16,
    komödie: 35,
    komodie: 35,
    comedy: 35,
    krimi: 80,
    crime: 80,
    dokumentation: 99,
    documentary: 99,
    drama: 18,
    familie: 10751,
    family: 10751,
    fantasy: 14,
    historie: 36,
    history: 36,
    horror: 27,
    schocker: 27,
    musik: 10402,
    music: 10402,
    mystery: 9648,
    romanze: 10749,
    romance: 10749,
    'science fiction': 878,
    'sci fi': 878,
    scifi: 878,
    'sci-fi': 878,
    'tv film': 10770,
    'tv-film': 10770,
    thriller: 53,
    krieg: 10752,
    war: 10752,
    western: 37,
  },
  tv: {
    action: 10759,
    'action abenteuer': 10759,
    'action & abenteuer': 10759,
    'action adventure': 10759,
    'action & adventure': 10759,
    animation: 16,
    komödie: 35,
    komodie: 35,
    comedy: 35,
    krimi: 80,
    crime: 80,
    dokumentation: 99,
    documentary: 99,
    drama: 18,
    familie: 10751,
    family: 10751,
    kids: 10762,
    mystery: 9648,
    news: 10763,
    reality: 10764,
    scifi: 10765,
    'sci fi': 10765,
    'sci-fi': 10765,
    'sci fi fantasy': 10765,
    'sci fi & fantasy': 10765,
    'sci fi and fantasy': 10765,
    'sci-fi & fantasy': 10765,
    'science fiction': 10765,
    soap: 10766,
    talk: 10767,
    krieg: 10768,
    'krieg politik': 10768,
    'krieg & politik': 10768,
    'war politics': 10768,
    'war & politics': 10768,
    western: 37,
  },
};

export const genresFor = (mediaType: MediaType): readonly Genre[] =>
  mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;

export function genreIdFor(name: string, mediaType: MediaType): number | null {
  return ALIASES[mediaType][normalize(name)] ?? null;
}

export function genreName(id: number, mediaType: MediaType): string | null {
  return genresFor(mediaType).find((genre) => genre.id === id)?.name ?? null;
}
