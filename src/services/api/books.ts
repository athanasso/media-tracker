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
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY; // Ensure this is set in .env
    const url = `${BASE_URL}?q=${encodeURIComponent(query)}&maxResults=20${apiKey ? `&key=${apiKey}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      try {
           const errorJson = JSON.parse(errorText);
           throw new Error(`Failed to fetch books: ${response.status} ${JSON.stringify(errorJson)}`);
      } catch (e) {
           throw new Error(`Failed to fetch books: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }
    
    const data: GoogleBooksResponse = await response.json();
    return (data.items || []).map(mapGoogleBookToBook);
  } catch (error) {
    console.error('Error searching books:', error);
    throw error; // Re-throw so UI can see/log it or at least so we see it in stack trace more clearly if caller handles it. 
    // Wait, typical pattern might be returning empty array to avoid crashing UI.
    // The user saw the console error.
    // I will keep `return []` but default to throwing so we can debug, OR just log better.
    // The user provided a stack trace from a `console.error` presumably, or a redbox.
    // "ERROR Error searching books: [Error: Failed to fetch books]" suggests the catch block caught it and logged it.
    // So improving the ERROR MESSAGE is the key.
    return [];
  }
};

export const getBookDetails = async (id: string): Promise<Book | null> => {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
    const url = `${BASE_URL}/${id}${apiKey ? `?key=${apiKey}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch book details');
    
    const data: GoogleBookItem = await response.json();
    return mapGoogleBookToBook(data);
  } catch (error) {
    console.error('Error fetching book details:', error);
    return null;
  }
};
