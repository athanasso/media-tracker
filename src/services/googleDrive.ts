/**
 * Google Drive Service
 * Handles backup and restore using Google Drive API
 */

import { generateExportData, mergeWatchlistData, replaceWatchlistData, ExportData } from './dataExport';
import { getValidAccessToken } from './googleAuth';

const BACKUP_FILENAME = 'media_tracker_backup.json';
const MIME_TYPE = 'application/json';

const FOLDER_NAME = 'media-tracker';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

/**
 * Get or create the app folder in Drive
 */
async function getOrCreateFolder(token: string): Promise<string> {
  const query = `mimeType = '${FOLDER_MIME_TYPE}' and name = '${FOLDER_NAME}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Failed to search for folder');

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const metadata = {
    name: FOLDER_NAME,
    mimeType: FOLDER_MIME_TYPE,
  };

  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createResponse.ok) throw new Error('Failed to create folder');
  
  const createData = await createResponse.json();
  return createData.id;
}

/**
 * List backup files from Google Drive
 * Searches for files created by this app inside the specific folder
 */
export async function listBackups() {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Not authenticated");

  const folderId = await getOrCreateFolder(token);

  const query = `name = '${BACKUP_FILENAME}' and '${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, modifiedTime, size)`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to list backups');
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Download a backup file
 */
export async function downloadBackup(fileId: string): Promise<ExportData> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Not authenticated");

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download backup');
  }

  const data = await response.json();
  return data as ExportData;
}

/**
 * Upload backup (Create or Update)
 */
export async function uploadBackup(): Promise<void> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("Not authenticated");

  // Get current data
  const exportData = generateExportData();
  const fileContent = JSON.stringify(exportData, null, 2);

  const folderId = await getOrCreateFolder(token);

  // Check if file exists in the folder
  const existingFiles = await listBackups();
  
  if (existingFiles.length > 0) {
    // Update existing file
    const fileId = existingFiles[0].id;
    await updateFile(fileId, fileContent, token);
  } else {
    // Create new file in the folder
    await createFile(fileContent, folderId, token);
  }
}

/**
 * Create a new file in Drive
 */
/**
 * Create a new file in Drive
 */
async function createFile(content: string, folderId: string, token: string) {
  const metadata = {
    name: BACKUP_FILENAME,
    mimeType: MIME_TYPE,
    parents: [folderId],
  };

  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${MIME_TYPE}\r\n\r\n` +
    content +
    closeDelim;

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload backup: ${error}`);
  }
}

/**
 * Update existing file in Drive
 */
async function updateFile(fileId: string, content: string, token: string) {
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': MIME_TYPE,
    },
    body: content,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update backup: ${error}`);
  }
}

/**
 * Sync from Drive (Download and Merge/Replace)
 */
export async function syncFromDrive(mode: 'merge' | 'replace'): Promise<void> {
  const backups = await listBackups();
  if (backups.length === 0) {
    throw new Error('No backup found');
  }

  // Use the most recent backup
  const latestBackup = backups[0]; // Logic could be improved to sort by modifiedTime
  const data = await downloadBackup(latestBackup.id);

  if (mode === 'merge') {
    mergeWatchlistData(data.data.trackedShows, data.data.trackedMovies);
  } else {
    replaceWatchlistData(data.data.trackedShows, data.data.trackedMovies);
  }
}
