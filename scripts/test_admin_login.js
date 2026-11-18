import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9336;
const chromeProc = spawn(chromePath, ['--headless=new', '--remote-debugging-port=' + port, 'about:blank'], { stdio: 'ignore' });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  try {
    await sleep(1500);
    const v = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json();
    const ws = new WebSocket(v.webSocketDebuggerUrl);
    let id = 1;
    const send = (method, params = {}) => new Promise(res => {
      const reqId = id++;
      const onMsg = (evt) => {
        const m = JSON.parse(evt.data);
        if (m.id === reqId) { ws.removeEventListener('message', onMsg); res(m.result); }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
    await new Promise(r => ws.onopen = r);

    const target = await send('Target.createTarget', { url: 'https://mrs-solar-yj6e.vercel.app/login' });
    const tabWs = new WebSocket('ws://127.0.0.1:' + port + '/devtools/page/' + target.targetId);
    await new Promise(r => tabWs.onopen = r);

    let tid = 1;
    const sendTab = (method, params = {}) => new Promise(res => {
      const reqId = tid++;
      const onMsg = (evt) => {
        const m = JSON.parse(evt.data);
        if (m.id === reqId) { tabWs.removeEventListener('message', onMsg); res(m.result); }
      };
      tabWs.addEventListener('message', onMsg);
      tabWs.send(JSON.stringify({ id: reqId, method, params }));
    });

    await sendTab('Runtime.enable');
    await sendTab('Page.enable');
    await sleep(3500);

    // Login via Admin Demo
    console.log('Clicking Admin Demo Login button...');
    await sendTab('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.innerText.includes('Owner') || b.innerText.includes('Admin Portal'));
          if (btn) btn.click();
        })()
      `
    });

    await sleep(4000);
    const adminUrl = await sendTab('Runtime.evaluate', { expression: 'window.location.href' });
    const adminText = await sendTab('Runtime.evaluate', { expression: 'document.body.innerText.slice(0, 300)' });
    console.log('Admin URL:', adminUrl.result?.value);
    console.log('Admin Content Preview:\n', adminText.result?.value);

    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

run();
