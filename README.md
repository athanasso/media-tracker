# Media Tracker 📺🎬

A comprehensive mobile app for tracking TV shows and movies. Built with React Native (Expo) and TypeScript.

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo_SDK-54-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)

## ✨ Features

### 📱 Core Features
- **Discover** - Browse trending TV shows and movies with beautiful horizontal scrolls
- **Search** - Find any show or movie using the TMDB API with debounced search
- **Details** - View posters, synopses, cast, seasons, and episode lists
- **Track** - Add shows/movies to your watchlist with one tap
- **Watch Progress** - Mark episodes as watched with visual progress tracking
- **Profile** - Comprehensive watchlist management with multiple views and filters

### 📊 Profile & Watchlist Management

#### TV Shows & Movies Tabs
Each tab (TV Shows and Movies) includes three sub-tabs:

- **Watched** - View all shows/movies you've completed or are currently watching
- **Watchlist** - See all your tracked content in one place
- **Upcoming** - Discover upcoming releases from your "plan to watch" list with air/release dates
- **Dropped** - (Optional) View shows you have dropped. This tab can be toggled in Settings.
- **Books** - (Optional) Track your reading list (Google Books). Can be toggled in Settings.
- **Manga** - (Optional) Track your manga status (Anilist). Can be toggled in Settings.

#### Plan to Watch Tab
A dedicated tab showing all items you plan to watch, with sub-tabs:
- **All** - Combined view of shows and movies
- **Shows** - TV shows only
- **Movies** - Movies only

#### Favorites Tab
Quick access to all your favorite content, filtered by:
- **All** - Shows and Movies
- **Shows** - TV shows only
- **Movies** - Movies only

#### Search & Sort
- **Search** - Real-time search across all tabs and sub-tabs
- **Sort Options** - Sort by Name, Date, Status, or Added date
- **Works seamlessly across all views**

### 🔔 Push Notifications
- **Release Date Reminders** - Get notified before upcoming releases
- **Customizable Timing** - Choose when to be notified:
  - 1 hour before
  - 1 day before
  - 3 days before
  - 1 week before
  - 2 weeks before
  - 1 month before
- **Easy Management** - Set, change, or remove notifications directly from upcoming items
- **Visual Indicators** - See which items have notifications set

### 🎨 UI/UX
- Dark mode theme with red accent (#E50914)
- **Customizable UI** - Toggle visibility of specific tabs (e.g., Dropped items) in Settings
- Beautiful poster cards with progress overlays
- Horizontal season selector with progress bars
- Episode checkboxes for quick tracking
- Pull-to-refresh on all screens
- Smooth animations and transitions
- Intuitive tab navigation

### ☁️ Cloud Sync (Google Drive)
- **Seamless Backup** - Sync your entire watchlist and history to Google Drive
- **Secure Integration** - Uses secure Google Auth with restricted `app-folder` access
- **Cross-Device Sync** - Restore your data on any device
- **Automatic Folder Management** - Backups are neatly stored in a dedicated `media-tracker` folder

### 💾 Data Management
- **High-Performance Storage** - All data saved instantly using `react-native-mmkv` (fastest key-value storage)
- **Export Backup** - Export your watchlist to JSON file
- **Import Restore** - Restore from backup with merge or replace options
- **Offline Support** - Cached data available offline
- **TV Time Import** - Import your watchlist from TV Time

### 🌍 Localization & Regional Settings
- **Multi-language Support** - Fully localized in English and Greek
- **Date Formats** - Choose between European (DD/MM/YYYY), American (MM/DD/YYYY), or Custom formats
- **Localized Content** - Movie/Show descriptions and titles automatically displayed in your selected language (via TMDB)

### 📈 Tracking Features
- **Status Management** - Track with statuses:
  - Watching
  - Completed
  - Plan to Watch
  - On Hold
  - Dropped (with dedicated "Drop" button and auto-resume logic)
- **Episode Tracking** - Mark individual episodes or entire seasons as watched
- **Progress Visualization** - See your progress with visual indicators
- **Advanced Statistics** - Tap on stats cards to see detailed breakdowns:
  - **Status Graphs** - Visual stacked bar charts showing your library composition
  - **Time Spent** - Track your total watch time in days, hours, and minutes
  - **Episode Counts** - See your total watched episodes and top shows

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.81 (New Architecture Enabled) with Expo SDK 54 |
| Navigation | Expo Router (file-based) |
| State Management | Zustand with persistence (react-native-mmkv v4) |
| Data Fetching | TanStack Query (React Query) |
| Styling | NativeWind (Tailwind CSS) + StyleSheet |
| API | The Movie Database (TMDB) |
| Notifications | Expo Notifications |
| Localization | Custom i18n implementation |
| Language | TypeScript |
| Performance | FlatList (React Native), Expo Image, Expo Haptics |

## 🚀 Performance Optimizations (High Impact)

### 🏎️ TurboModules & New Architecture
- **Problem**: Legacy bridge caused slow native communication.
- **Solution**: Fully enabled New Architecture with JSI and TurboModules.
- **Impact**: Direct C++ bindings for critical modules like Storage (MMKV) and Reanimated.

### ⚡ Optimized Data Import (O(1))
- **Problem**: Importing thousands of existing items from TV Time caused massive UI lag due to O(N) checks.
- **Solution**: Implemented high-performance Set-based lookup algorithms (O(1)).
- **Impact**: Instant processing of imports regardless of library size.

### 🖼️ High-Performance Images (Expo Image)
- **Problem**: Standard `Image` component struggles with memory and caching lists of posters.
- **Solution**: Switched to `expo-image`.
- **Impact**: Superior caching, blur-hash placeholders (no popping), and optimized memory usage during scrolling.


### 📳 Haptic Feedback (UX)
- **Problem**: Interactions felt flat and purely visual.
- **Solution**: Integrated `expo-haptics` for key actions.
- **Impact**: Subtle vibrations confirm "Drops", "Mark Watched", and "Favorites", making the app feel premium and responsive.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- TMDB API Key ([Get one free](https://www.themoviedb.org/settings/api))

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```
   **⚠️ IMPORTANT**: This project uses **TurboModules** and **New Architecture** (specifically `react-native-mmkv` v4). **Expo Go is NOT supported**. You must use a Development Build (Step 4).

2. **Configure API Key**
   
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
   
   # Google Auth (Required for Cloud Sync)
   # 1. Create a project in Google Cloud Console
   # 2. Enable "Google Drive API"
   # 3. Create OAuth 2.0 Credentials (Web Client)
   # 4. Add "https://media-tracker-auth.vercel.app/api/callback" as authorized redirect URI
   EXPO_PUBLIC_AUTH_SERVER_URL=https://media-tracker-auth.vercel.app
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
   
   # Google Books API Key (Optional: for higher rate limits)
   # Get from https://console.cloud.google.com/apis/library/books.googleapis.com
   EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY=your_google_books_api_key
   ```

3. **Start development server**
   ```bash
   npx expo start
   ```

4. **Run the app (Development Build)**
   This command compiles the native code on your local machine.
   - For Android: `npx expo run:android`
   - For iOS: `npx expo run:ios`

## 📱 Screens

| Screen | Description |
|--------|-------------|
| **Discover** | Featured banner, trending shows/movies with horizontal scrolls |
| **Search** | Multi-search with real-time results and debouncing |
| **Profile** | Comprehensive watchlist management with tabs, search, and sort |
| **Show Details** | Full info, cast, seasons, episodes with tracking and progress |
| **Movie Details** | Full info, cast, watch status, and tracking |
| **Book Details** | Info from Google Books, page count, and reading status |
| **Manga Details** | Info from Anilist, chapters/volumes, and reading status |
| **Settings** | Language, date format, import/export data, visual preferences |

## 🎯 Key Features Explained

### Profile Screen
The Profile screen is your central hub for managing your watchlist:

- **Collapsible Header Layout**: Header elements scroll away to maximize content visibility on smaller screens.
- **Main Tabs**: TV Shows, Movies, Plan to Watch, Favorites
- **Sub-Tabs**: Each main tab has Watched, Watchlist, and Upcoming (except Plan to Watch and Favorites which have specific filters)
- **Search Bar**: Filter items by name across all tabs
- **Sort Menu**: Sort by Name, Date, Status, or Added date
- **Statistics Cards**: Tap to view detailed graphs and time spent analysis for Shows, Movies, and Episodes

### Upcoming Items
Upcoming items show only content from your "plan to watch" list that has future air/release dates:
- Automatically fetches details to get accurate dates
- Displays air date for shows and release date for movies
- Notification button to set reminders
- Visual indicator when notifications are active

### Notifications
- Request permission on first launch
- Schedule notifications based on release dates
- Manage notifications directly from item cards
- Change timing or remove notifications anytime
- Notifications persist across app restarts

## 📤 Import/Export

### Export Your Data
1. Go to Profile → Settings
2. Tap "Export Data"
3. Share/save the JSON backup file

### Import Your Data
1. Go to Profile → Settings
2. Tap "Import Data"
3. Select your backup JSON file
4. Choose "Merge" or "Replace All"

### TV Time Import
Import your existing watchlist from TV Time exports with intelligent matching:
1. Go to Profile → Settings
2. Tap "Import from TV Time"
3. Select your export file:
   - **movies.json** for movies
   - **shows.json** for TV shows (includes full season/episode progress)
4. **Intelligent Matching**:
   - Items with exact ID matches are imported automatically.
   - Items matched by Title are flagged as "Pending" for your review.
   - **Interactive Review**: View rich details for pending matches (Backdrop, Poster, Overview) side-by-side with your original data to verify correctness.
   - You can Accept or Ignore pending matches in the **Review Matches** modal.
   - Items that cannot be matched are listed as "Not Matched" for your reference.
   - **Extract**: You can easily share or extract the list of unmatched items to verify them manually.
5. Your library will be populated with correct statuses and progress.

### ☁️ Cloud Sync (Google Drive)
1. Go to Profile → Settings
2. Tap "Sign In with Google" and authorize the app
3. **Backup**: Tap "Backup to Drive" to safely save your current watchlist to the cloud.
4. **Restore**: Tap "Restore from Drive" to download your remote backup. You can choose to:
   - **Merge**: Combine cloud data with your local data.
   - **Replace**: Overwrite local data with the cloud backup.

## 🔧 Scripts

```bash
npm start          # Start Expo dev server
npx expo run:android # Run on Android (Rebuild native code)
npx expo run:ios     # Run on iOS (Rebuild native code)
npm run lint       # Run ESLint
```

## 📄 API Endpoints Used

- `GET /trending/{media_type}/{time_window}` - Trending content
- `GET /tv/{id}` - TV show details
- `GET /movie/{id}` - Movie details
- `GET /tv/{id}/season/{season}` - Season episodes
- `GET /search/multi` - Multi-search
- `GET /tv/popular` - Popular shows
- `GET /movie/popular` - Popular movies
- `GET /tv/on_the_air` - Upcoming shows
- `GET /movie/upcoming` - Upcoming movies
- `GET /discover/tv` - Discover shows with filters
- `GET /discover/movie` - Discover movies with filters
- `GET /volumes` - Google Books API
- `POST /graphql` - AniList API (Manga)

## 🎨 Design System

### Colors
- **Primary**: #E50914 (Red)
- **Background**: #0a0a0a (Dark)
- **Surface**: #1a1a1a (Dark Gray)
- **Text**: #ffffff (White)
- **Text Secondary**: #a0a0a0 (Light Gray)
- **Success**: #22c55e (Green)

### Status Colors
- **Watching**: Green (#22c55e)
- **Completed**: Blue (#3b82f6)
- **Plan to Watch**: Orange (#f59e0b)
- **On Hold**: Purple (#8b5cf6)
- **Dropped**: Red (#ef4444)

## 📦 Project Structure

```
media-tracker/
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── discover.tsx   # Discover screen
│   │   ├── search.tsx     # Search screen
│   │   └── profile.tsx    # Profile/watchlist screen
│   ├── show/[id].tsx      # Show details
│   ├── movie/[id].tsx     # Movie details
│   ├── book/[id].tsx      # Book details
│   ├── manga/[id].tsx     # Manga details
│   ├── settings.tsx        # Settings screen
│   └── stats.tsx           # Detailed statistics & graphs
├── hooks/                  # Custom React hooks
├── src/
│   ├── store/             # Zustand stores
│   │   ├── useWatchlistStore.ts
│   │   ├── useNotificationStore.ts
│   │   ├── useSettingsStore.ts
│   ├── services/          # API and utility services
│   │   ├── api/           # TMDB API client
│   │   ├── dataExport.ts  # Export functionality
│   │   └── tvTimeImport.ts # TV Time import
│   ├── i18n/              # Localization strings
│   └── types/             # TypeScript types
└── assets/                # Images and static assets
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - feel free to use this project for learning or building your own app!

---

Made with ❤️ using React Native and Expo
