import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9335;
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

    tabWs.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        console.log(`[CONSOLE ${msg.params.type}]:`, text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[UNCAUGHT EXCEPTION]:', JSON.stringify(msg.params.exceptionDetails, null, 2));
      }
    };

    await sendTab('Runtime.enable');
    await sendTab('Page.enable');

    console.log('Waiting for login page to load...');
    await sleep(4000);

    // Trigger manager login by setting credentials directly or clicking the demo button
    console.log('Logging in as Manager demo...');
    const loginRes = await sendTab('Runtime.evaluate', {
      expression: `
        (async () => {
          const btns = Array.from(document.querySelectorAll('button'));
          const managerBtn = btns.find(b => b.innerText.includes('Manager') || b.innerText.includes('Team Portal'));
          if (managerBtn) {
            managerBtn.click();
            return 'Clicked Manager Demo Button';
          }
          return 'Manager button not found, buttons: ' + btns.map(b => b.innerText).join(' | ');
        })()
      `,
      awaitPromise: true
    });
    console.log('Demo Login Action:', loginRes.result?.value);

    // Wait 5 seconds for auth response and router navigation to /manager
    await sleep(5000);

    const currentUrl = await sendTab('Runtime.evaluate', { expression: 'window.location.href' });
    console.log('Current URL after login:', currentUrl.result?.value);

    const bodyText = await sendTab('Runtime.evaluate', { expression: 'document.body.innerText.slice(0, 400)' });
    console.log('Rendered Page Content:\n', bodyText.result?.value);

    const isRecoveryPresent = await sendTab('Runtime.evaluate', {
      expression: 'document.body.innerText.includes("MRS SOLAR Portal Recovery")'
    });
    console.log('Is Recovery ErrorBoundary Screen Visible?:', isRecoveryPresent.result?.value);

    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

run();
