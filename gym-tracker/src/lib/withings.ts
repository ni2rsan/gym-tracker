/**
 * Withings API client
 * Handles OAuth 2.0 URL building, token exchange, token refresh, and measure fetching.
 *
 * Withings API docs: https://developer.withings.com/api-reference
 * Measure types used:
 *   1  = Weight (kg)
 *   6  = Body fat percentage (%)
 */

const WITHINGS_AUTH_URL = "https://account.withings.com/oauth2_user/authorize2";
const WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const WITHINGS_MEASURE_URL = "https://wbsapi.withings.net/measure";

function getClientId() {
  const id = process.env.WITHINGS_CLIENT_ID;
  if (!id) throw new Error("WITHINGS_CLIENT_ID is not set");
  return id;
}

function getClientSecret() {
  const secret = process.env.WITHINGS_CLIENT_SECRET;
  if (!secret) throw new Error("WITHINGS_CLIENT_SECRET is not set");
  return secret;
}

function getRedirectUri() {
  const uri = process.env.WITHINGS_REDIRECT_URI;
  if (!uri) throw new Error("WITHINGS_REDIRECT_URI is not set");
  return uri;
}

/** Build the Withings OAuth authorization URL */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: "user.metrics",
    state,
  });
  return `${WITHINGS_AUTH_URL}?${params.toString()}`;
}

export interface WithingsTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface WithingsTokenResponse {
  status: number;
  body: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    userid: number;
  };
}

/** Exchange an authorization code for tokens */
export async function exchangeCode(code: string): Promise<WithingsTokens> {
  const params = new URLSearchParams({
    action: "requesttoken",
    grant_type: "authorization_code",
    client_id: getClientId(),
    client_secret: getClientSecret(),
    code,
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(WITHINGS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data: WithingsTokenResponse = await res.json();
  if (data.status !== 0) {
    throw new Error(`Withings token exchange failed: status ${data.status}`);
  }

  return {
    accessToken: data.body.access_token,
    refreshToken: data.body.refresh_token,
    expiresAt: new Date(Date.now() + data.body.expires_in * 1000),
  };
}

/** Refresh an expired access token using the refresh token */
export async function refreshAccessToken(refreshToken: string): Promise<WithingsTokens> {
  const params = new URLSearchParams({
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshToken,
  });

  const res = await fetch(WITHINGS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data: WithingsTokenResponse = await res.json();
  if (data.status !== 0) {
    throw new Error(`Withings token refresh failed: status ${data.status}`);
  }

  return {
    accessToken: data.body.access_token,
    refreshToken: data.body.refresh_token,
    expiresAt: new Date(Date.now() + data.body.expires_in * 1000),
  };
}

export interface WithingsMeasureGroup {
  grpid: number;
  date: number; // unix timestamp
  weightKg: number | null;
  bodyFatPct: number | null;
}

interface RawMeasure {
  value: number;
  type: number;
  unit: number;
}

interface RawMeasureGrp {
  grpid: number;
  date: number;
  measures: RawMeasure[];
}

interface WithingsMeasureResponse {
  status: number;
  body: {
    measuregrps: RawMeasureGrp[];
  };
}

function decodeMeasure(value: number, unit: number): number {
  return value * Math.pow(10, unit);
}

/**
 * Fetch body measurements from Withings API.
 * @param accessToken Valid access token
 * @param lastUpdateUnix Unix timestamp — only fetch measurements after this time (0 = last 90 days)
 */
export async function fetchMeasures(
  accessToken: string,
  lastUpdateUnix: number
): Promise<WithingsMeasureGroup[]> {
  const params = new URLSearchParams({
    action: "getmeas",
    meastypes: "1,6",
    category: "1",
  });
  if (lastUpdateUnix > 0) {
    params.set("lastupdate", String(lastUpdateUnix));
  } else {
    // Default: last 90 days
    params.set("lastupdate", String(Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60));
  }

  const res = await fetch(`${WITHINGS_MEASURE_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data: WithingsMeasureResponse = await res.json();
  if (data.status !== 0) {
    throw new Error(`Withings measure fetch failed: status ${data.status}`);
  }

  return (data.body?.measuregrps ?? []).map((grp) => {
    let weightKg: number | null = null;
    let bodyFatPct: number | null = null;

    for (const m of grp.measures) {
      if (m.type === 1) weightKg = parseFloat(decodeMeasure(m.value, m.unit).toFixed(2));
      if (m.type === 6) bodyFatPct = parseFloat(decodeMeasure(m.value, m.unit).toFixed(2));
    }

    return { grpid: grp.grpid, date: grp.date, weightKg, bodyFatPct };
  });
}
