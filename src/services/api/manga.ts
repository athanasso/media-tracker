import { Manga } from '@/src/types/media';

const BASE_URL = 'https://graphql.anilist.co';

const MANGA_FRAGMENT = `
  id
  title {
    romaji
    english
    native
  }
  coverImage {
    large
    medium
    color
  }
  description
  status
  chapters
  volumes
  averageScore
  popularity
  format
  startDate {
    year
    month
    day
  }
  genres
  bannerImage
`;

const SEARCH_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 20) {
      media(search: $search, type: MANGA, sort: POPULARITY_DESC) {
        ${MANGA_FRAGMENT}
      }
    }
  }
`;

const DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: MANGA) {
      ${MANGA_FRAGMENT}
    }
  }
`;

export const searchManga = async (query: string): Promise<Manga[]> => {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { search: query },
      }),
    });

    if (!response.ok) throw new Error('Failed to fetch manga');

    const data = await response.json();
    return data.data.Page.media || [];
  } catch (error) {
    console.error('Error searching manga:', error);
    return [];
  }
};

export const getMangaDetails = async (id: number): Promise<Manga | null> => {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: DETAILS_QUERY,
        variables: { id },
      }),
    });

    if (!response.ok) throw new Error('Failed to fetch manga details');

    const data = await response.json();
    return data.data.Media || null;
  } catch (error) {
    console.error('Error fetching manga details:', error);
    return null;
  }
};
