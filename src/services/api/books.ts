import { Book } from '@/src/types/media';

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

interface GoogleBooksResponse {
  items?: GoogleBookItem[];
  totalItems: number;
}

interface GoogleBookItem {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    publisher?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    averageRating?: number;
    ratingsCount?: number;
    categories?: string[];
    language?: string;
    infoLink?: string;
  };
}

const mapGoogleBookToBook = (item: GoogleBookItem): Book => {
  const { volumeInfo } = item;
  return {
    id: item.id,
    title: volumeInfo.title || 'Unknown Title',
    authors: volumeInfo.authors || ['Unknown Author'],
    description: volumeInfo.description || '',
    pageCount: volumeInfo.pageCount || 0,
    publishedDate: volumeInfo.publishedDate || '',
    publisher: volumeInfo.publisher || '',
    imageLinks: {
      thumbnail: volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
      smallThumbnail: volumeInfo.imageLinks?.smallThumbnail?.replace('http:', 'https:') || null,
    },
    averageRating: volumeInfo.averageRating,
    ratingsCount: volumeInfo.ratingsCount,
    categories: volumeInfo.categories,
    language: volumeInfo.language,
    infoLink: volumeInfo.infoLink,
  };
};

export const searchBooks = async (query: string): Promise<Book[]> => {
  try {
    const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(query)}&maxResults=20`);
    if (!response.ok) throw new Error('Failed to fetch books');
    
    const data: GoogleBooksResponse = await response.json();
    return (data.items || []).map(mapGoogleBookToBook);
  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
};

export const getBookDetails = async (id: string): Promise<Book | null> => {
  try {
    const response = await fetch(`${BASE_URL}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch book details');
    
    const data: GoogleBookItem = await response.json();
    return mapGoogleBookToBook(data);
  } catch (error) {
    console.error('Error fetching book details:', error);
    return null;
  }
};
