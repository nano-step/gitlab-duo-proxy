export const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GitLab Duo Proxy Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh}
.top-bar{background:#1e293b;border-bottom:1px solid #334155;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.top-bar h1{font-size:20px;font-weight:700;color:#f8fafc}
.top-bar h1 span{color:#3b82f6}
.top-bar .meta{font-size:13px;color:#94a3b8;display:flex;gap:16px}
.container{max-width:1280px;margin:0 auto;padding:20px 24px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.card{background:#1e293b;border-radius:10px;padding:20px;border:1px solid #334155}
.card .label{font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}
.card .value{font-size:28px;font-weight:700;color:#f8fafc}
.card .value.green{color:#22c55e}
.card .value.blue{color:#3b82f6}
.card .value.amber{color:#f59e0b}
.section{background:#1e293b;border-radius:10px;border:1px solid #334155;margin-bottom:24px;overflow:hidden}
.section-header{padding:16px 20px;border-bottom:1px solid #334155;font-size:14px;font-weight:600;color:#f8fafc;display:flex;justify-content:space-between;align-items:center}
.section-header .badge{font-size:11px;background:#334155;color:#94a3b8;padding:2px 8px;border-radius:99px}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:10px 16px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;background:#0f172a}
td{padding:10px 16px;font-size:13px;border-top:1px solid #1e293b;color:#cbd5e1}
tr:hover td{background:#1e293b}
.badge-s{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
.badge-success{background:#052e16;color:#22c55e}
.badge-error{background:#450a0a;color:#ef4444}
.badge-anthropic{background:#2e1065;color:#a78bfa}
.badge-openai{background:#052e16;color:#22c55e}
.chart-row{display:flex;align-items:center;gap:8px;padding:4px 16px;font-size:12px}
.chart-row .day{width:80px;color:#94a3b8;text-align:right;flex-shrink:0}
.chart-row .bar-bg{flex:1;height:20px;background:#334155;border-radius:4px;overflow:hidden;position:relative}
.chart-row .bar-fill{height:100%;background:#3b82f6;border-radius:4px;transition:width 0.3s}
.chart-row .bar-label{position:absolute;right:6px;top:2px;font-size:10px;color:#e2e8f0}
.chart-row .count{width:60px;color:#94a3b8;font-size:11px}
.empty{padding:40px;text-align:center;color:#64748b;font-size:14px}
.mono{font-family:'SF Mono',Monaco,Consolas,monospace;font-size:12px}
@media(max-width:640px){.cards{grid-template-columns:1fr 1fr}.top-bar{flex-direction:column;align-items:flex-start}table{font-size:12px}th,td{padding:8px 10px}}
</style>
</head>
<body>
<div class="top-bar">
  <h1><span>&#9670;</span> GitLab Duo Proxy</h1>
  <div class="meta">
    <span id="uptime">Uptime: --</span>
    <span id="started">Started: --</span>
  </div>
</div>
<div class="container">
  <div class="cards">
    <div class="card"><div class="label">Total Requests</div><div class="value blue" id="c-requests">0</div></div>
    <div class="card"><div class="label">Success Rate</div><div class="value green" id="c-success">0%</div></div>
    <div class="card"><div class="label">Total Tokens</div><div class="value" id="c-tokens">0</div></div>
    <div class="card"><div class="label">Avg Latency</div><div class="value amber" id="c-latency">0ms</div></div>
  </div>

  <div class="section">
    <div class="section-header">Models <span class="badge" id="model-count">0</span></div>
    <table>
      <thead><tr><th>Model</th><th>Provider</th><th>Backend</th><th>Requests</th><th>Tokens</th><th>Avg Latency</th><th>Errors</th></tr></thead>
      <tbody id="model-body"></tbody>
    </table>
    <div class="empty" id="model-empty">No model data yet</div>
  </div>

  <div class="section">
    <div class="section-header">Daily Activity</div>
    <div id="daily-chart" style="padding:12px 0"></div>
    <div class="empty" id="daily-empty">No daily data yet</div>
  </div>

  <div class="section">
    <div class="section-header">Recent Requests <span class="badge" id="recent-count">0</span></div>
    <table>
      <thead><tr><th>Time</th><th>Model</th><th>Endpoint</th><th>Status</th><th>Tokens</th><th>Latency</th></tr></thead>
      <tbody id="recent-body"></tbody>
    </table>
    <div class="empty" id="recent-empty">No requests yet</div>
  </div>
</div>

<script>
function fmt(n){return n.toLocaleString()}
function fmtUptime(s){var d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60);return(d?d+'d ':'')+(h?h+'h ':'')+(m?m+'m ':'')+s%60+'s'}
function ago(ts){var d=Math.floor((Date.now()-ts)/1000);if(d<60)return d+'s ago';if(d<3600)return Math.floor(d/60)+'m ago';if(d<86400)return Math.floor(d/3600)+'h ago';return Math.floor(d/86400)+'d ago'}

var modelsCache=null;

async function fetchModels(){
  try{var r=await fetch('/dashboard/api/models');modelsCache=await r.json()}catch(e){}
}

async function refresh(){
  try{
    var r=await fetch('/dashboard/api/stats');
    var s=await r.json();
    document.getElementById('uptime').textContent='Uptime: '+fmtUptime(s.uptime);
    document.getElementById('started').textContent='Started: '+new Date(s.startedAt).toLocaleString();
    document.getElementById('c-requests').textContent=fmt(s.totalRequests);
    document.getElementById('c-success').textContent=s.totalRequests?Math.round(s.successCount/s.totalRequests*100)+'%':'--';
    document.getElementById('c-tokens').textContent=fmt(s.totalTokens);
    document.getElementById('c-latency').textContent=fmt(s.avgLatencyMs)+'ms';

    var mb=document.getElementById('model-body');
    var me=document.getElementById('model-empty');
    var models=modelsCache?modelsCache.models:[];
    var mc=document.getElementById('model-count');
    mc.textContent=models.length;
    if(models.length){
      me.style.display='none';
      var h='';
      models.forEach(function(m){
        var ms=s.models[m.id]||{totalRequests:0,totalTokens:0,avgLatencyMs:0,errorCount:0};
        var pc=m.provider==='anthropic'?'badge-anthropic':'badge-openai';
        h+='<tr><td class="mono">'+m.id+'</td><td><span class="badge-s '+pc+'">'+m.provider+'</span></td><td class="mono">'+m.backendModel+'</td><td>'+fmt(ms.totalRequests)+'</td><td>'+fmt(ms.totalTokens)+'</td><td>'+fmt(ms.avgLatencyMs)+'ms</td><td>'+(ms.errorCount?'<span class="badge-s badge-error">'+ms.errorCount+'</span>':'-')+'</td></tr>';
      });
      mb.innerHTML=h;
    }else{me.style.display='';mb.innerHTML=''}

    var dc=document.getElementById('daily-chart');
    var de=document.getElementById('daily-empty');
    var days=Object.entries(s.requestsByDay).sort(function(a,b){return a[0]>b[0]?1:-1}).slice(-14);
    if(days.length){
      de.style.display='none';
      var maxR=Math.max.apply(null,days.map(function(d){return d[1].requests}));
      var dh='';
      days.forEach(function(d){
        var pct=maxR?Math.round(d[1].requests/maxR*100):0;
        dh+='<div class="chart-row"><span class="day">'+d[0].slice(5)+'</span><div class="bar-bg"><div class="bar-fill" style="width:'+pct+'%"></div></div><span class="count">'+fmt(d[1].requests)+' req</span></div>';
      });
      dc.innerHTML=dh;
    }else{de.style.display='';dc.innerHTML=''}

    var rb=document.getElementById('recent-body');
    var re2=document.getElementById('recent-empty');
    var rc=document.getElementById('recent-count');
    var recs=s.recentRequests||[];
    rc.textContent=recs.length;
    if(recs.length){
      re2.style.display='none';
      var rh='';
      recs.slice(0,20).forEach(function(r){
        var sc=r.status==='success'?'badge-success':'badge-error';
        rh+='<tr><td>'+ago(r.timestamp)+'</td><td class="mono">'+r.model+'</td><td>'+r.endpoint+'</td><td><span class="badge-s '+sc+'">'+r.status+'</span></td><td>'+fmt(r.totalTokens)+'</td><td>'+fmt(r.latencyMs)+'ms</td></tr>';
      });
      rb.innerHTML=rh;
    }else{re2.style.display='';rb.innerHTML=''}
  }catch(e){console.error('refresh failed',e)}
}

fetchModels();
refresh();
setInterval(refresh,5000);
</script>
</body>
</html>`;
