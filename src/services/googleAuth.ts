/**
 * Google Authentication Service
 * Handles OAuth 2.0 authentication with Google using a backend for token exchange
 * Adapted from photos-widget project
 */

import * as AuthSession from "expo-auth-session";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { storage } from '@/src/store/storage';

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Backend URL for OAuth
const AUTH_SERVER_URL = process.env.EXPO_PUBLIC_AUTH_SERVER_URL;

// Token storage keys
const TOKEN_KEY = 'google_access_token';
const REFRESH_TOKEN_KEY = 'google_refresh_token';
const EXPIRY_KEY = 'google_token_expiry';
const USER_INFO_KEY = 'google_user_info';

// Google OAuth endpoints
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

// OAuth scopes for Google Drive App Data
// drive.file: Per-file access to files created or opened by the app. 
const SCOPES = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/drive.file", 
];

// Types
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

// Get client IDs from env
const getClientIds = () => {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
  };
};

/**
 * Get the OAuth authorization URL
 */
export function getAuthorizationUrl(): string {
  const { webClientId } = getClientIds();
  const redirectUri = `${AUTH_SERVER_URL}/api/callback`;
  
  const params = new URLSearchParams({
    client_id: webClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Start the OAuth flow by opening the browser
 */
export async function startOAuthFlow(): Promise<void> {
  const authUrl = getAuthorizationUrl();
  console.log("Opening auth URL:", authUrl);
  
  await WebBrowser.openBrowserAsync(authUrl, {
    showInRecents: true,
  });
}

/**
 * Handle the OAuth callback from deep link
 */
export async function handleOAuthCallback(url: string): Promise<TokenData | null> {
  console.log("Handling OAuth callback:", url);
  
  const parsedUrl = Linking.parse(url);
  const params = parsedUrl.queryParams || {};

  const accessToken = params.access_token as string;
  const refreshToken = params.refresh_token as string;
  const expiresIn = parseInt(params.expires_in as string || "3600", 10);

  if (!accessToken) {
    console.error("No access token in callback");
    return null;
  }

  const tokenData: TokenData = {
    accessToken,
    refreshToken: refreshToken || "",
    expiresAt: Date.now() + expiresIn * 1000,
  };

  await saveTokens(tokenData);

  try {
    const userInfo = await fetchUserInfo(accessToken);
    await saveUserInfo(userInfo);
  } catch (error) {
    console.error("Failed to fetch user info:", error);
  }

  return tokenData;
}

/**
 * Save tokens to storage
 */
async function saveTokens(data: TokenData) {
  storage.set(TOKEN_KEY, data.accessToken);
  if (data.refreshToken) {
    storage.set(REFRESH_TOKEN_KEY, data.refreshToken);
  }
  storage.set(EXPIRY_KEY, data.expiresAt.toString());
}

/**
 * Save user info to storage
 */
async function saveUserInfo(info: UserInfo) {
  storage.set(USER_INFO_KEY, JSON.stringify(info));
}

/**
 * Get user info from storage
 */
export function getUserInfo(): UserInfo | null {
  const data = storage.getString(USER_INFO_KEY);
  return data ? JSON.parse(data) : null;
}

/**
 * Refresh the access token
 */
export async function refreshAccessToken(): Promise<TokenData | null> {
  const refreshToken = storage.getString(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${AUTH_SERVER_URL}/api/refresh?refresh_token=${encodeURIComponent(refreshToken)}`);
    const data = await response.json();

    if (data.error) {
      console.error("Token refresh error:", data.error);
      return null;
    }

    const tokenData: TokenData = {
      accessToken: data.access_token,
      refreshToken, // Keep existing refresh token
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    // Update tokens, keeping the old refresh token
    storage.set(TOKEN_KEY, tokenData.accessToken);
    storage.set(EXPIRY_KEY, tokenData.expiresAt.toString());
    
    return tokenData;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}

/**
 * Get a valid access token (refreshes if expired)
 */
export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = storage.getString(TOKEN_KEY);
  const expiryStr = storage.getString(EXPIRY_KEY);

  if (!accessToken || !expiryStr) {
    return null;
  }

  const expiresAt = parseInt(expiryStr, 10);
  
  // Refresh if missing or expired (buffer of 5 minutes)
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    console.log("Token expired, attempting refresh...");
    const newTokens = await refreshAccessToken();
    return newTokens?.accessToken ?? null;
  }

  return accessToken;
}

/**
 * Fetch user info from Google
 */
export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch user info");
  }

  const data = await response.json();

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  const accessToken = storage.getString(TOKEN_KEY);

  if (accessToken) {
    try {
      await AuthSession.revokeAsync({ token: accessToken }, discovery);
    } catch (error) {
      console.error("Failed to revoke token:", error);
    }
  }

  storage.remove(TOKEN_KEY);
  storage.remove(REFRESH_TOKEN_KEY);
  storage.remove(EXPIRY_KEY);
  storage.remove(USER_INFO_KEY);
}

/**
 * Check if authenticated
 */
export function isAuthenticated(): boolean {
  return !!storage.getString(TOKEN_KEY);
}
