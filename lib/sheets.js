import { gapi } from 'gapi-script';

const CLIENT_ID = '817219013119-ncmooed6jrnjgk9krumb3q9geutuu8v9.apps.googleusercontent.com';
const SHEET_ID = '1TXzwLse4jyTxu-hnxjqfMu6H5WQVpsSwB22g1pu_10U';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export function initGoogleClient(onSignIn) {
  gapi.load('client:auth2', () => {
    gapi.client.init({
      clientId: CLIENT_ID,
      scope: SCOPES,
      discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"]
    }).then(() => {
      gapi.auth2.getAuthInstance().isSignedIn.listen(onSignIn);
      onSignIn(gapi.auth2.getAuthInstance().isSignedIn.get());
    });
  });
}

export function isSignedIn() {
  return gapi.auth2 && gapi.auth2.getAuthInstance().isSignedIn.get();
}

export function getUserEmail() {
  return gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail();
}

export async function saveComparisonToSheet(name, channels) {
  const values = [[name, JSON.stringify(channels), new Date().toISOString()]];
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "comparisons!A1",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: { values }
  });
}

export async function loadComparisonsFromSheet() {
  const res = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "comparisons!A1:C1000"
  });
  return res.result.values || [];
}

export async function saveUserDetailsToSheet(email, firstName, lastName, phone) {
  const values = [[email, firstName, lastName, phone, new Date().toISOString()]];
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "userdetails!A1",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: { values }
  });
}

export async function saveVideosToSheet(channel, videos) {
  const values = [
    [
      'Channel Title',
      'Channel ID',
      'Video Title',
      'Video ID',
      'Description',
      'Published At',
      'Views',
      'Likes',
      'Comments',
      'Tags'
    ],
    ...videos.map(video => [
      channel.snippet.title,
      channel.id,
      video.snippet.title,
      video.id,
      video.snippet.description,
      video.snippet.publishedAt,
      video.statistics.viewCount,
      video.statistics.likeCount,
      video.statistics.commentCount,
      video.snippet.tags ? video.snippet.tags.join(', ') : ''
    ])
  ];
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'videos!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values }
  });
} 