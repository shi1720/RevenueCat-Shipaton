import fs from 'node:fs/promises';
import sharp from 'sharp';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#5753A3"/><rect x="276" y="267" width="116" height="490" rx="58" fill="#F8F7F3"/><path d="M566 277 Q536 259 536 304 L536 724 Q536 769 574 744 L815 544 Q853 511 815 481 Z" fill="#F8F7F3"/></svg>';
await fs.writeFile('assets/icon.svg',svg);
await sharp(Buffer.from(svg)).png().toFile('assets/icon.png');
// Foreground stays inside Android's 66% safe circle; adaptive background is configured separately.
const foreground='<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect x="335" y="345" width="78" height="334" rx="39" fill="#F8F7F3"/><path d="M544 355 Q524 343 524 374 L524 654 Q524 685 550 667 L711 534 Q737 512 711 492 Z" fill="#F8F7F3"/></svg>';
await sharp(Buffer.from(foreground)).png().toFile('assets/adaptive-icon.png');
await sharp(Buffer.from(svg)).resize(64).png().toFile('assets/favicon.png');
console.log('Icons generated.');
