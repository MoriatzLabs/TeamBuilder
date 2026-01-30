const https = require('https');
const fs = require('fs');
const path = require('path');

const DDRAGON_VERSION = '16.2.1';
const CHAMPIONS_TO_DOWNLOAD = [
  // Blaber's champions
  'LeeSin', 'Nidalee', 'Viego', 'RekSai', 'Elise', 'JarvanIV', 'Kindred',
  // APA's champions
  'Ahri', 'Azir', 'Syndra', 'Orianna', 'Akali', 'Leblanc', 'Zed',
  // Zven's champions
  'Jinx', 'Kaisa', 'Aphelios', 'Zeri', 'Ezreal', 'Lucian', 'Varus',
  // Vulcan's champions
  'Nautilus', 'Thresh', 'Rakan', 'Alistar', 'Renata', 'Leona', 'Braum',
  // Thanatos's champions
  'Aatrox', 'KSante', 'Renekton', 'Jayce', 'Gnar', 'Rumble', 'Ornn',
];

const IMAGES_DIR = path.join(__dirname, 'frontend', 'public', 'images');
const CHAMPIONS_DIR = path.join(IMAGES_DIR, 'champions');
const TEAMS_DIR = path.join(IMAGES_DIR, 'teams');

// Ensure directories exist
if (!fs.existsSync(CHAMPIONS_DIR)) {
  fs.mkdirSync(CHAMPIONS_DIR, { recursive: true });
}
if (!fs.existsSync(TEAMS_DIR)) {
  fs.mkdirSync(TEAMS_DIR, { recursive: true });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        fileStream.on('error', reject);
      } else {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
      }
    }).on('error', reject);
  });
}

async function downloadChampions() {
  console.log(`Downloading ${CHAMPIONS_TO_DOWNLOAD.length} champion icons from Data Dragon v${DDRAGON_VERSION}...`);

  let downloaded = 0;
  let failed = 0;

  for (const champion of CHAMPIONS_TO_DOWNLOAD) {
    const url = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${champion}.png`;
    const filepath = path.join(CHAMPIONS_DIR, `${champion}.png`);

    try {
      await downloadImage(url, filepath);
      console.log(`✓ ${champion}`);
      downloaded++;
    } catch (error) {
      console.error(`✗ ${champion}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\nDownload complete! ${downloaded} succeeded, ${failed} failed.`);
}

async function downloadTeamLogo() {
  console.log('Downloading Cloud9 logo...');

  const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Cloud9_logo.svg/1200px-Cloud9_logo.svg.png';
  const filepath = path.join(TEAMS_DIR, 'c9-logo.png');

  try {
    await downloadImage(url, filepath);
    console.log('✓ Cloud9 logo downloaded');
  } catch (error) {
    console.error(`✗ Cloud9 logo: ${error.message}`);
    console.log('Note: You can manually download the logo from:');
    console.log('https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Cloud9_logo.svg/1200px-Cloud9_logo.svg.png');
  }
}

async function main() {
  try {
    await downloadChampions();
    await downloadTeamLogo();
    console.log('\nAll images downloaded successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
