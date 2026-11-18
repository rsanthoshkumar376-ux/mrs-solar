import http from 'http';
import { spawn } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9333;

const chromeProc = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
], { stdio: 'ignore' });

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const data = await res.json();
      return data.webSocketDebuggerUrl;
    } catch (e) {
      await sleep(300);
    }
  }
  throw new Error('Chrome did not start on port ' + port);
}

async function run() {
  try {
    const wsUrl = await getWsUrl();
    console.log('Connected to Chrome DevTools Protocol at:', wsUrl);

    // Import WebSocket (built into Node 22+)
    const ws = new WebSocket(wsUrl);

    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        console.log(`[Browser Console ${msg.params.type}]:`, text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[Browser Uncaught Exception]:', JSON.stringify(msg.params.exceptionDetails, null, 2));
      } else if (callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg.result);
        callbacks.delete(msg.id);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const reqId = id++;
        callbacks.set(reqId, resolve);
        ws.send(JSON.stringify({ id: reqId, method, params }));
      });
    }

    await new Promise(r => ws.onopen = r);

    // Create a new target/tab
    const target = await send('Target.createTarget', { url: 'about:blank' });
    const targetWsUrl = `ws://127.0.0.1:${port}/devtools/page/${target.targetId}`;

    const tabWs = new WebSocket(targetWsUrl);
    await new Promise(r => tabWs.onopen = r);

    let tabId = 1;
    const tabCallbacks = new Map();

    tabWs.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        console.log(`[PAGE CONSOLE ${msg.params.type}]:`, text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[PAGE EXCEPTION]:', JSON.stringify(msg.params.exceptionDetails, null, 2));
      } else if (tabCallbacks.has(msg.id)) {
        tabCallbacks.get(msg.id)(msg.result);
        tabCallbacks.delete(msg.id);
      }
    };

    function sendTab(method, params = {}) {
      return new Promise((resolve) => {
        const reqId = tabId++;
        tabCallbacks.set(reqId, resolve);
        tabWs.send(JSON.stringify({ id: reqId, method, params }));
      });
    }

    await sendTab('Runtime.enable');
    await sendTab('Page.enable');
    await sendTab('Network.enable');

    console.log('Navigating to https://mrs-solar-yj6e.vercel.app ...');
    await sendTab('Page.navigate', { url: 'https://mrs-solar-yj6e.vercel.app' });

    // Wait 5 seconds to observe mount & console logs
    await sleep(5000);

    const evalRes = await sendTab('Runtime.evaluate', {
      expression: 'document.getElementById("root") ? document.getElementById("root").innerHTML.length : -1'
    });
    console.log('Root innerHTML character length:', evalRes.result?.value);

    const evalTitle = await sendTab('Runtime.evaluate', {
      expression: 'document.title'
    });
    console.log('Page title:', evalTitle.result?.value);

    const evalButtons = await sendTab('Runtime.evaluate', {
      expression: 'Array.from(document.querySelectorAll("button, input")).map(el => (el.innerText || el.placeholder || el.value || el.type)).filter(Boolean)'
    });
    console.log('Detected UI elements:', evalRes.result?.value > 0 ? evalButtons.result?.value?.slice(0, 10) : 'None');

    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('Inspect failed:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

run();
