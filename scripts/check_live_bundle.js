async function main() {
  const res = await fetch('https://mrs-solar-yj6e.vercel.app/', { cache: 'no-store' });
  const html = await res.text();
  const scriptMatches = html.match(/src="\/assets\/[^"]+"/g);
  console.log('Script tags in live index.html:', scriptMatches);

  const swRes = await fetch('https://mrs-solar-yj6e.vercel.app/sw.js', { cache: 'no-store' });
  const swText = await swRes.text();
  console.log('sw.js top 2 lines:\n', swText.split('\n').slice(0, 2).join('\n'));
}

main().catch(console.error);
