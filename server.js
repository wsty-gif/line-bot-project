const express = require('express');
const line = require('@line/bot-sdk');
const { google } = require('googleapis');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const client = new line.Client(config);
const app = express();

// --- Google Sheets 読み込み ---
async function getRole(userId) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const range = 'Permissions!A:B';
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range
  });
  const rows = res.data.values || [];
  // 1行目ヘッダ前提: [userId, role]
  for (let i = 1; i < rows.length; i++) {
    const [id, role] = rows[i];
    if (id === userId) return (role || '').trim().toLowerCase();
  }
  return 'user'; // 見つからない場合のデフォルト
}

const MENU_IDS = {
  user: 'richmenu-9a01d513df9871b617a12d5df5d59872',
  admin: 'richmenu-59af1afffbf6825344904095bbaa3958'
};

// 役割に応じてリンク
async function linkMenuForRole(userId, role) {
  const richMenuId = MENU_IDS[role] || MENU_IDS.user;
  await client.linkRichMenuToUser(userId, richMenuId);
}

app.post('/webhook', line.middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).catch(console.error);
  res.sendStatus(200);
});

async function handleEvent(event) {
  const userId = event.source && event.source.userId;
  if (!userId) return;

  // フォロー時・参加時・メッセージで「menu」「メニュー」等を受けたら同期
  const shouldSync =
    event.type === 'follow' ||
    event.type === 'memberJoined' ||
    (event.type === 'message' &&
      event.message.type === 'text' &&
      /^(menu|メニュー|sync|同期)$/i.test(event.message.text));

  if (shouldSync) {
    const role = await getRole(userId);
    await linkMenuForRole(userId, role);
    if (event.type === 'message') {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `あなたの権限は「${role}」です。メニューを更新しました。`
      });
    }
  }
}

app.get('/', (_, res) => res.send('ok')); // 動作確認用
const port = process.env.PORT || 3000;
app.listen(port, () => console.log('LISTEN', port));
