/**
 * ==============================================================================
 *  IP Tools - Cloudflare Worker (端口保留 + 自动翻译 + 对齐优化 + 国内免翻版)
 *  更新说明：
 *  1. [新增] 国家分组点击展开/收起
 *  2. [新增] IP:端口 单击直接复制到剪贴板
 *  3. [保留] 后端翻译代理 (/api/translate)
 *  4. [保留] 带端口的 IP 提取与保留
 * ==============================================================================
 */

const USAGE_MAP = {
    "COM": "商业宽带", "ORG": "组织机构", "ISP": "家庭宽带", "MOB": "移动流量",
    "DCH": "数据中心/机房", "CDN": "CDN节点", "EDU": "教育网", "GOV": "政府", "SES": "爬虫",
    "RSV": "保留地址", "MIL": "军事", "ISP/MOB": "家庭宽带"
  };
  
  export default {
    async fetch(request, env) {
      const url = new URL(request.url);
      const path = url.pathname;
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
  
      if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  
      // --- API: IP 查询 ---
      if (path === '/api/check' && request.method === 'POST') {
        try {
          const body = await request.json();
          const ip = body.ip; 
          const envKey = env.IP_API_KEY || null;
          const apiKey = (body.key && body.key.trim() !== "") ? body.key : envKey;
  
          let apiUrl = apiKey 
            ? `https://api.ip2location.io/?key=${apiKey}&ip=${ip}&format=json`
            : `https://api.ip2location.io/?ip=${ip}&format=json`;
          
          const resp = await fetch(apiUrl);
          let credits = resp.headers.get('X-Credits-Remaining') || resp.headers.get('X-RateLimit-Remaining');
          const data = await resp.json();
          data._credits = credits; 
  
          return new Response(JSON.stringify(data), {
            headers: { 'content-type': 'application/json;charset=UTF-8', ...corsHeaders }
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: { error_message: e.message } }), { status: 500, headers: corsHeaders });
        }
      }
  
      // --- API: 翻译代理 ---
      if (path === '/api/translate' && request.method === 'POST') {
        try {
          const body = await request.json();
          const text = body.text;
          if (!text) return new Response(JSON.stringify({}), { headers: corsHeaders });
  
          const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
          
          const resp = await fetch(googleUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          
          const data = await resp.json();
          return new Response(JSON.stringify(data), {
            headers: { 'content-type': 'application/json;charset=UTF-8', ...corsHeaders }
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 200, headers: corsHeaders });
        }
      }
  
      return new Response(getIndexHTML(), { headers: { 'content-type': 'text/html;charset=UTF-8' } });
    }
  };
  
  function getIndexHTML() {
    return `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IP 地理位置批量查询 (支持端口/国内优化)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
  <style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono&family=Inter:wght@400;600&family=Noto+Sans+SC:wght@400;500;700&display=swap');
  body{background:#0b1120;color:#e2e8f0;font-family:'Inter','Noto Sans SC',sans-serif}
  .glass-panel{background:rgba(30,41,59,0.6);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.08)}
  .btn-primary{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);transition:all .3s ease}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,0.3)}
  .badge-proxy{background:rgba(239,68,68,0.2);color:#fca5a5;border:1px solid rgba(239,68,68,0.3)}
  .badge-direct{background:rgba(34,197,94,0.2);color:#86efac;border:1px solid rgba(34,197,94,0.3)}
  .truncate-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .group-header { cursor: pointer; transition: background 0.2s; }
  .group-header:hover { background: rgba(51, 65, 85, 0.6); }
  .copy-success { color: #10b981 !important; transition: color 0.2s; }
  </style>
  </head>
  <body class="min-h-screen p-4 md:p-8 pb-20">
  <div class="max-w-6xl mx-auto space-y-6">
   <header class="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
    <div>
    <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-3"><i data-lucide="radar" class="text-blue-500"></i>IP 地理位置批量查询</h1>
     <p class="text-slate-400 text-sm mt-1">内置翻译代理，国内直连可用。</p>
    </div>
    
    <div class="flex flex-col md:flex-row gap-3 items-end md:items-center w-full md:w-auto">
      <div class="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300">
          <i data-lucide="coins" class="w-3 h-3 text-yellow-500"></i>
          <span>查询剩余: <b id="creditsCount" class="text-white">--</b></span>
      </div>
      <div class="relative w-full md:w-64">
        <input type="text" id="userApiKey" class="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="API Key (可选)">
      </div>
    </div>
   </header>
  
   <div class="glass-panel rounded-2xl overflow-hidden border border-slate-700/50">
    <div class="bg-[#0f172a]/50 p-4 border-b border-slate-700/50 flex justify-between items-center">
      <span class="text-slate-400 text-sm font-medium flex items-center gap-2"><i data-lucide="list"></i> IP 输入 (支持带端口)</span>
      <div class="flex gap-3">
          <button onclick="document.getElementById('fileInput').click()" class="bg-slate-700 hover:bg-slate-600 text-xs text-white px-3 py-1.5 rounded transition flex items-center gap-1"><i data-lucide="upload-cloud" class="w-3 h-3"></i> 导入文件</button>
          <input type="file" id="fileInput" hidden accept=".txt,.csv">
          <button onclick="document.getElementById('ipInput').value=''" class="text-xs text-slate-500 hover:text-slate-300">清空</button>
      </div>
    </div>
    <textarea id="ipInput" rows="6" class="w-full bg-transparent p-4 text-slate-300 font-mono text-sm outline-none resize-y" placeholder="支持格式：1.1.1.1 或 1.1.1.1:8080"></textarea>
    <div class="p-4 border-t border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4">
     <div id="statusIndicator" class="flex items-center gap-2 opacity-0 transition-opacity">
      <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
      <span class="text-sm text-slate-400">处理进度: <span id="progressNums" class="text-white font-mono">0/0</span></span>
     </div>
     <button onclick="processIPs()" id="actionBtn" class="btn-primary w-full md:w-auto px-10 py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2"><i data-lucide="play"></i> 开始检测</button>
    </div>
   </div>
  
   <div id="statsPanel" class="hidden grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="glass-panel p-4 rounded-xl border-l-4 border-blue-500 text-sm">总数: <span id="statTotal" class="block text-2xl font-bold text-white">0</span></div>
    <div class="glass-panel p-4 rounded-xl border-l-4 border-emerald-500 text-sm">直连: <span id="statDirect" class="block text-2xl font-bold text-emerald-400">0</span></div>
    <div class="glass-panel p-4 rounded-xl border-l-4 border-red-500 text-sm">代理: <span id="statProxy" class="block text-2xl font-bold text-red-400">0</span></div>
    <div class="glass-panel p-4 rounded-xl border-l-4 border-purple-500 flex flex-col justify-center gap-1">
      <button onclick="exportData('xlsx')" class="text-left text-xs text-purple-300 hover:text-white transition flex items-center gap-1"><i data-lucide="sheet" class="w-3 h-3"></i> 导出 Excel</button>
      <button onclick="exportData('csv')" class="text-left text-xs text-blue-300 hover:text-white transition flex items-center gap-1"><i data-lucide="file-text" class="w-3 h-3"></i> 导出 CSV</button>
    </div>
   </div>
  
   <div id="outputArea" class="space-y-6"></div>
  
   <footer class="text-center text-slate-600 text-xs mt-10 pb-6">
      <p>Data powered by Cloudflare KV & Worker Proxy</p>
      <p class="mt-1 opacity-75">IP数据来源 <a href="https://www.ip2location.io" target="_blank" class="hover:text-blue-400 transition underline decoration-dotted">IP2Location.io</a></p>
   </footer>
   
  </div>
  
  <script>
  const USAGE_MAP = ${JSON.stringify(USAGE_MAP)};
  let analyzedData = [], isProcessing = false;
  
  lucide.createIcons();
  
  // 复制功能
  async function copyText(text, el) {
      try {
          await navigator.clipboard.writeText(text);
          const originalText = el.innerText;
          el.innerText = '已复制！';
          el.classList.add('copy-success');
          setTimeout(() => {
              el.innerText = originalText;
              el.classList.remove('copy-success');
          }, 1000);
      } catch (err) {
          console.error('复制失败', err);
      }
  }

  // 折叠功能
  function toggleGroup(id) {
      const el = document.getElementById('group-' + id);
      const icon = document.getElementById('chevron-' + id);
      if (el.classList.contains('hidden')) {
          el.classList.remove('hidden');
          icon.style.transform = 'rotate(0deg)';
      } else {
          el.classList.add('hidden');
          icon.style.transform = 'rotate(-90deg)';
      }
  }

  // 文件导入
  document.getElementById('fileInput').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => { document.getElementById('ipInput').value = event.target.result; };
      reader.readAsText(file);
  });
  
  // 正则提取：支持 IP 和 IP:端口
  function extractIPsWithPorts(text) {
      const ipPortRegex = /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?::\\d+)?/g;
      return [...new Set(text.match(ipPortRegex) || [])];
  }
  
  // 批量自动翻译
  async function translateBatch(texts) {
      if (!texts.length) return {};
      try {
          const combined = texts.join(' || ');
          const res = await fetch('/api/translate', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ text: combined })
          });
          const json = await res.json();
          if (json.error) return {};
          const translatedFull = json[0].map(item => item[0]).join('');
          const results = translatedFull.split('||').map(s => s.trim());
          const map = {};
          texts.forEach((original, i) => { map[original] = results[i] || original; });
          return map;
      } catch (e) { 
          return {}; 
      }
  }
  
  async function processIPs() {
      if(isProcessing) return;
      const inputList = extractIPsWithPorts(document.getElementById('ipInput').value);
      if (!inputList.length) return alert('未检测到有效IP');
  
      const userKey = document.getElementById('userApiKey').value.trim();
      isProcessing = true;
      document.getElementById('actionBtn').disabled = true;
      document.getElementById('actionBtn').innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> 处理中...';
      document.getElementById('statusIndicator').classList.remove('opacity-0');
      lucide.createIcons();
  
      let completed = 0;
      const results = [];
      
      const check = async (fullInput) => {
          try {
              const cleanIp = fullInput.split(':')[0];
              const res = await fetch('/api/check', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ ip: cleanIp, key: userKey })
              });
              const d = await res.json();
              document.getElementById('creditsCount').innerText = d._credits || '∞';
              completed++;
              document.getElementById('progressNums').innerText = \`\${completed}/\${inputList.length}\`;
              return { fullInput, ...d };
          } catch (e) { return { fullInput, error: true }; }
      };
  
      for (let i=0; i<inputList.length; i+=5) {
          results.push(...await Promise.all(inputList.slice(i, i+5).map(check)));
      }
  
      const toTranslate = new Set();
      results.forEach(item => {
          if (!item.error) {
              if (item.country_name) toTranslate.add(item.country_name);
              if (item.region_name) toTranslate.add(item.region_name);
              if (item.city_name) toTranslate.add(item.city_name);
          }
      });
      
      const translationMap = await translateBatch([...toTranslate]);
  
      analyzedData = results.map(item => {
          if (item.error) return item;
          let country = translationMap[item.country_name] || item.country_name;
          const region = translationMap[item.region_name] || item.region_name;
          const city = translationMap[item.city_name] || item.city_name;
          
          if(['HK','TW','MO'].includes(item.country_code)) country = '中国';
          
          let loc = region;
          if (city && city !== region) loc = \`\${region} / \${city}\`;
  
          return {
              ...item,
              translated_country: country,
              translated_location: loc,
              usage_cn: USAGE_MAP[item.usage_type] || '未知类型'
          };
      });
  
      renderResults();
      updateStats();
      isProcessing = false;
      document.getElementById('actionBtn').disabled = false;
      document.getElementById('actionBtn').innerHTML = '<i data-lucide="play"></i> 开始检测';
      document.getElementById('statusIndicator').classList.add('opacity-0');
      document.getElementById('statsPanel').classList.remove('hidden');
      lucide.createIcons();
  }
  
  function renderResults() {
      const box = document.getElementById('outputArea'); box.innerHTML = '';
      const groups = analyzedData.reduce((a,i) => {
          const k = i.error ? '查询失败' : (i.translated_country || '未知');
          (a[k] = a[k] || []).push(i);
          return a;
      }, {});
  
      Object.keys(groups).forEach((k, index) => {
          const list = groups[k], isErr = k === '查询失败';
          let cc = (!isErr && list[0].country_code) ? list[0].country_code.toLowerCase() : '';
          if(k === '中国') cc = 'cn';
          const flag = cc ? \`<img src="https://flagcdn.com/24x18/\${cc}.png" class="inline mr-2 rounded-sm shadow-sm">\` : '';
          const groupId = index;
  
          box.innerHTML += \`
          <div class="glass-panel rounded-xl overflow-hidden border border-slate-700/50">
              <div onclick="toggleGroup('\${groupId}')" class="group-header px-6 py-3 bg-slate-800/40 border-b border-slate-700/50 flex justify-between items-center">
                  <h3 class="font-bold flex items-center \${isErr?'text-red-400':'text-blue-400'}">
                      \${flag} \${k} <span class="ml-2 text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">\${list.length}</span>
                  </h3>
                  <i data-lucide="chevron-down" id="chevron-\${groupId}" class="w-4 h-4 text-slate-500 transition-transform"></i>
              </div>
              <div id="group-\${groupId}" class="overflow-x-auto">
                  <table class="w-full text-left table-fixed">
                      <thead class="text-[11px] text-slate-500 uppercase bg-slate-900/40">
                          <tr>
                              <th class="px-6 py-3 w-[25%]">IP:端口 (点击复制)</th>
                              <th class="px-6 py-3 w-[10%]">代理</th>
                              <th class="px-6 py-3 w-[20%]">地区</th>
                              <th class="px-6 py-3 w-[20%]">类型</th>
                              <th class="px-6 py-3 w-[25%]">ASN</th>
                          </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-700/30 font-sans">\${list.map(i => i.error ? \`
                          <tr><td onclick="copyText('\${i.fullInput}', this)" class="px-6 py-3 font-mono text-xs text-slate-500 cursor-pointer hover:text-white transition-colors">\${i.fullInput}</td><td colspan="4" class="px-6 text-red-500 text-xs italic">Request Failed</td></tr>\` : \`
                          <tr class="hover:bg-slate-700/20 transition-colors">
                              <td onclick="copyText('\${i.fullInput}', this)" class="px-6 py-3 font-mono text-xs text-slate-200 cursor-pointer truncate-text hover:text-blue-400 transition-colors" title="点击复制 \${i.fullInput}">\${i.fullInput}</td>
                              <td class="px-6 py-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold \${i.is_proxy?'badge-proxy':'badge-direct'}">\${i.is_proxy?'是':'否'}</span></td>
                              <td class="px-6 py-3 text-xs text-slate-300 truncate-text" title="\${i.translated_location}">\${i.translated_location}</td>
                              <td class="px-6 py-3 text-xs text-slate-300">
                                  <span class="text-[10px] text-slate-500 font-mono border border-slate-700 px-1 rounded mr-1">\${i.usage_type}</span> \${i.usage_cn}
                              </td>
                              <td class="px-6 py-3 text-[11px] text-slate-400 truncate-text" title="AS\${i.asn} \${i.as}">AS\${i.asn} \${i.as}</td>
                          </tr>\`).join('')}</tbody>
                  </table>
              </div>
          </div>\`;
      });
      lucide.createIcons();
  }
  
  function updateStats() {
      const v = analyzedData.filter(x=>!x.error), p = v.filter(x=>x.is_proxy).length;
      document.getElementById('statTotal').innerText = analyzedData.length;
      document.getElementById('statDirect').innerText = v.length - p;
      document.getElementById('statProxy').innerText = p;
  }
  
  function exportData(t) {
      if(!analyzedData.length) return alert('没有数据可供导出');
      const d = analyzedData.map(i => ({
          IP_Port: i.fullInput,
          状态: i.error ? '失败' : '成功',
          代理: i.is_proxy ? '是' : '否', 
          国家: i.translated_country || '-', 
          地区: i.translated_location || '-', 
          用途: i.error ? '-' : \`(\${i.usage_type}) \${i.usage_cn}\`, 
          ISP: i.error ? '-' : \`AS\${i.asn} \${i.as}\`
      }));
      const n = \`IP_Report_\${new Date().toISOString().slice(0,10)}\`;
      if(t==='xlsx') { 
          const w=XLSX.utils.json_to_sheet(d), b=XLSX.utils.book_new(); 
          XLSX.utils.book_append_sheet(b,w,"Results"); 
          XLSX.writeFile(b, n+'.xlsx'); 
      } else { 
          const c=XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(d)), a=document.createElement('a'); 
          a.href=URL.createObjectURL(new Blob(["\\uFEFF"+c],{type:'text/csv'})); 
          a.download=n+'.csv'; a.click(); 
      }
  }
  </script>
  </body>
  </html>`;
  }
