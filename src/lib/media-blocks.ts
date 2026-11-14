import type { AssistantBlock } from './assistant-blocks.ts';
import type { MediaItem } from './seerr.ts';

/** Ein Seerr-Treffer wird zu einem nativen Medienblock, nie zu freiem HTML. */
export const mediaBlock = (item: MediaItem): AssistantBlock => ({
  type: 'media',
  tmdbId: item.tmdbId,
  mediaType: item.mediaType,
  title: item.title,
  year: item.year,
  overview: item.overview,
  posterPath: item.posterPath,
  backdropPath: item.backdropPath,
  rating: item.rating,
  releaseDate: item.releaseDate,
  runtime: item.runtime,
  tagline: item.tagline,
  genres: item.genres,
  director: item.director,
  cast: item.cast,
  voteCount: item.voteCount,
  numberOfSeasons: item.numberOfSeasons,
  numberOfEpisodes: item.numberOfEpisodes,
  status: item.status,
  statusText: item.statusText,
  requestable: item.requestable,
});
