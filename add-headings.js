const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('Set ANTHROPIC_API_KEY first'); process.exit(1); }

const newsDir = path.join(__dirname, 'content/news');

async function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const files = fs.readdirSync(newsDir)
    .filter(f => f.endsWith('.md') && !f.includes('facialdx'))
    .sort();

  for (const fname of files) {
    const fpath = path.join(newsDir, fname);
    const content = fs.readFileSync(fpath, 'utf8');
    if (content.includes('\n## ')) { console.log('⏭ ', fname); continue; }
    const parts = content.split('---');
    if (parts.length < 3) continue;
    const frontmatter = '---' + parts[1] + '---';
    const body = parts.slice(2).join('---').trim();
    const res = await callClaude(
      'Add 2-3 section headings (## heading) to break up this news article naturally. ' +
      'Do NOT change any words — only insert ## heading lines at natural section breaks. ' +
      'Return only the body text with headings added, nothing else.\n\nArticle:\n' + body
    );
    if (res.error) { console.error('❌', fname, res.error.message); continue; }
    const newBody = res.content[0].text.trim();
    fs.writeFileSync(fpath, frontmatter + '\n\n' + newBody + '\n');
    console.log('✅', fname);
  }
  console.log('Done!');
}

main();
