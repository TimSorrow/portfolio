const { execSync } = require('child_process');
console.log('Running Lighthouse...');
try {
  execSync('npx lighthouse https://timursurov.vercel.app/ --chrome-flags="--headless" --output=json --only-categories=performance --quiet > lh.json', {stdio: 'inherit'});
  const lh = require('./lh.json');
  console.log('Performance Score:', lh.categories.performance.score * 100);
  console.log('FCP:', lh.audits['first-contentful-paint'].displayValue);
  console.log('LCP:', lh.audits['largest-contentful-paint'].displayValue);
  console.log('TBT:', lh.audits['total-blocking-time'].displayValue);
  console.log('CLS:', lh.audits['cumulative-layout-shift'].displayValue);
  console.log('Speed Index:', lh.audits['speed-index'].displayValue);
  
  console.log('\nTop 3 Opportunities:');
  const opps = Object.values(lh.audits).filter(a => a.details && a.details.type === 'opportunity').sort((a, b) => b.details.overallSavingsMs - a.details.overallSavingsMs).slice(0, 3);
  opps.forEach(o => console.log(o.title, '-', o.displayValue));

  console.log('\nTop Diagnostics:');
  const diags = Object.values(lh.audits).filter(a => a.details && typeof a.details.type === 'string' && a.details.type === 'debugdata' || (a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'notApplicable' && a.details && a.details.type !== 'opportunity')).slice(0,5);
  diags.forEach(d => console.log(d.title, 'Score:', d.score));

} catch (e) {
  console.error('Error running lighthouse', e.message);
}
