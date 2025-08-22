const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const TOKEN = process.env.CHANNEL_ACCESS_TOKEN;

async function createRichMenu(def) {
  const { data } = await axios.post(
    'https://api.line.me/v2/bot/richmenu',
    def,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  return data.richMenuId;
}

async function uploadImage(richMenuId, imagePath) {
  const buf = fs.readFileSync(imagePath);
  await axios.post(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    buf,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'image/png'
      }
    }
  );
}

async function createAlias(aliasId, richMenuId) {
  await axios.post(
    'https://api.line.me/v2/bot/richmenu/alias',
    { richMenuAliasId: aliasId, richMenuId },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
}

async function main() {
  const userDef = JSON.parse(fs.readFileSync('richmenu_user.json', 'utf8'));
  const adminDef = JSON.parse(fs.readFileSync('richmenu_admin.json', 'utf8'));

  const userId = await createRichMenu(userDef);
  await uploadImage(userId, path.join('images', 'richmenu_user.png'));
  await createAlias('tab_user_v3', userId);

  const adminId = await createRichMenu(adminDef);
  await uploadImage(adminId, path.join('images', 'richmenu_admin.png'));
  await createAlias('tab_admin_v3', adminId);

  console.log({ userId, adminId });
}

main().catch(console.error);
