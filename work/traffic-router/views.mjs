const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const number = value => Number(value || 0).toLocaleString('zh-TW');

export function renderPage(title, body, plain = false) {
  return `<!doctype html><html lang="zh-Hant"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>
<style>
:root{color-scheme:light;font:16px/1.55 'Inter','Microsoft JhengHei',sans-serif;color:#142724;background:#eef3ef}
*{box-sizing:border-box}body{margin:0}header{background:#152d27;color:#f7fbf5;padding:32px max(5vw,20px)}
h1,h2,h3,p{margin:0}h1{font-size:clamp(1.6rem,4vw,2.6rem);letter-spacing:-.035em}h2{font-size:1.12rem}
main{max-width:1240px;margin:auto;padding:24px max(3vw,16px) 52px}.layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:20px;align-items:start}
.panel{background:#fff;border:1px solid #cfddd2;border-radius:16px;padding:22px;min-width:0}.panel+.panel{margin-top:16px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.scroll{overflow:auto}
table{width:100%;border-collapse:collapse;text-align:left;font-size:.9rem}th,td{padding:11px 8px;border-bottom:1px solid #e3ebe4}th{color:#415b4d;white-space:nowrap}td:first-child{min-width:130px;overflow-wrap:anywhere}
a{color:#206348}a:hover{text-decoration-thickness:2px}.button,button{display:inline-block;padding:8px 14px;border-radius:8px;background:#216249;color:white;border:0;text-decoration:none;cursor:pointer;font:inherit;white-space:nowrap}
.muted,small{color:#52665b}label{display:block;margin-top:12px;font-weight:650;font-size:.9rem}input:not([type=checkbox]),textarea,select{width:100%;padding:8px 10px;border:1px solid #9fb3a5;border-radius:8px;font:inherit;color:inherit;background:#fafdf9;margin-top:4px}textarea{min-height:62px;resize:vertical}input[type=checkbox]{accent-color:#216249}code{overflow-wrap:anywhere}.actions{margin-top:14px;display:flex;gap:12px;align-items:center}
.notice{background:#fff4d2;border:1px solid #e4cc82;padding:10px 14px;border-radius:8px;margin-bottom:15px}.copy{white-space:pre-wrap;overflow-wrap:anywhere;max-width:760px;margin:auto}.status{white-space:nowrap}
@media(max-width:850px){.layout{grid-template-columns:1fr}.panel{padding:16px}}
body:has(.sidebar){background:#f5f6fa;color:#242231}body:has(.sidebar)>header{background:#fff;color:#242231;margin-left:220px;padding:18px 28px;box-shadow:0 2px 12px #2513310b}body:has(.sidebar)>header h1{font-size:1.25rem}body:has(.sidebar)>main{max-width:none;margin-left:220px;padding:28px}
.sidebar{position:fixed;inset:0 auto 0 0;width:220px;background:#fff;border-right:1px solid #e9e6ef;display:flex;flex-direction:column}.sidebar strong{color:#6921ab;padding:17px 20px;font-size:1.25rem}.sidebar a{padding:12px 20px;text-decoration:none;color:#322c40}.sidebar a[aria-current]{background:#f6edfe;color:#7520c5;font-weight:700}
.workspace .panel{border:0;box-shadow:0 4px 16px #2614380b}.workspace th{background:#f5f4f8;color:#362c42}.workspace a,.dialog a{color:#7520c5}.workspace .button,.dialog button{background:#8327d4;color:#fff}.small-button{padding:6px 10px}.target{max-width:195px;overflow-wrap:anywhere}.operations{white-space:nowrap}.operations a{margin-right:6px}.badge{border-radius:5px;padding:4px 7px;font-size:.8rem;white-space:nowrap}.badge.on{background:#e6f7e5;color:#25652a}.badge.off{background:#fae6e8;color:#942637}
.charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:20px}.charts .panel{margin:0}.chart{display:flex;flex-wrap:wrap;align-items:center;gap:18px;margin-top:12px;padding:16px;background:#f7f7fa;border-radius:12px}.ring{width:105px;height:105px;border-radius:50%;display:grid;place-items:center}.ring:before{content:'';width:54px;height:54px;border-radius:50%;background:#f7f7fa}.chart ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px 14px;flex:1;min-width:145px;font-size:.83rem}.chart i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.overlay{position:fixed;inset:0;background:#16122177;display:grid;place-items:center;padding:12px;z-index:2}.dialog{width:min(100%,600px);max-height:calc(100dvh - 24px);overflow:auto;border-radius:12px;background:#fff;box-shadow:0 16px 60px #1810214a}.dialog header{background:#f7f6fa;color:#242231;padding:16px 22px;display:flex;justify-content:space-between;align-items:center}.dialog header a{text-decoration:none;font-size:1.4rem}.dialog-body{padding:18px 22px}.dialog h3,.dialog details{margin-top:16px}.dialog .actions{justify-content:flex-end}.dialog input:not([type=checkbox]),.dialog textarea,.dialog select{background:#fff;border-color:#d2ccd9}.time{display:grid;grid-template-columns:1fr 1fr;gap:12px}.workspace:has(+.overlay) .notice{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:3;width:max-content;max-width:90vw;margin:0}
@media(max-width:980px){.charts{grid-template-columns:1fr}}@media(max-width:660px){.sidebar{position:static;width:auto;flex-direction:row;align-items:center;flex-wrap:wrap}body:has(.sidebar)>header,body:has(.sidebar)>main{margin-left:0}body:has(.sidebar)>main{padding:0} .workspace{padding:14px}.sidebar strong,.sidebar a{padding:10px 12px}}
</style><body><header><h1>${escape(title)}</h1></header><main>${plain ? `<div class="panel copy">${escape(body)}</div>` : body}</main></body></html>`;
}

import { devices, emptyRules, platforms } from './rules.mjs';

const dateFormat = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei', dateStyle: 'short', timeStyle: 'short',
});
const colors = ['#8327d4','#03958a','#49a54c','#2196f3','#fa9b24','#e92b6a','#4552b4'];

function chart(title, entries) {
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  let position = 0;
  const stops = entries.map(([, count], index) => {
    const start = position;
    position += total ? 100 * count / total : 0;
    return colors[index % colors.length] + ' ' + start + '% ' + position + '%';
  });
  return '<section class="panel"><h2>' + title + '</h2><div class="chart"><div class="ring" aria-hidden="true" style="background:' +
    (total ? 'conic-gradient(' + stops.join(',') + ')' : '#e3e2eb') + '"></div><ul>' +
    entries.map(([label, count], index) => '<li><i style="background:' + colors[index % colors.length] + '"></i>' +
      escape(label) + '（' + number(count) + '）</li>').join('') + '</ul></div></section>';
}

function options(entries, selected) {
  return entries.map(([value, label]) => '<option value="' + escape(value) + '"' +
    (value === selected ? ' selected' : '') + '>' + escape(label) + '</option>').join('');
}

function modal(title, content) {
  return '<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<header><h2 id="dialog-title">' + title + '</h2><a href="/admin" aria-label="關閉">×</a></header>' +
    '<div class="dialog-body">' + content + '</div></section></div>';
}

function hidden(csrf, original, action = '') {
  return '<input type="hidden" name="csrf" value="' + escape(csrf) + '">' +
    '<input type="hidden" name="original" value="' + escape(original) + '">' +
    '<input type="hidden" name="action" value="' + action + '">';
}

function routeForm(csrf, current, draft) {
  const values = draft || current || { mode: 'redirect', weight: 0, enabled: 1, platform: '其他' };
  const path = current ? '?edit=' + escape(current.slug) : '?new=1';
  return modal(current ? '編輯路由' : '新增路由',
    '<form method="post" action="/admin' + path + '">' + hidden(csrf, current?.slug) +
    '<label>路由名稱<input name="title" maxlength="100" required value="' + escape(values.title) + '"></label>' +
    '<label>路由類型<select name="platform">' + options(platforms.map(item => [item, item]), values.platform) + '</select></label>' +
    '<label>原始頁面（A）<textarea name="a" maxlength="2000" required>' + escape(values.a) + '</textarea></label>' +
    '<label>落地頁面（B）<textarea name="b" maxlength="2000" required>' + escape(values.b) + '</textarea></label>' +
    '<label>狀態<select name="enabled">' + options([['1','啟用'],['0','停用']], String(values.enabled)) + '</select></label>' +
    '<details><summary>分流與連結選項</summary>' +
    '<label>顯示方式<select name="mode">' + options([['redirect','跳轉完整網址'],['inline','同網址顯示純文字']], values.mode) + '</select></label>' +
    '<label>A 流量比例（%）<input name="weight" type="number" min="0" max="100" required value="' + escape(values.weight) + '"></label>' +
    '<label>網址代號<input name="slug" pattern="[a-z0-9][a-z0-9\-]*" maxlength="48" value="' + escape(values.slug) + '"' +
    (current ? ' readonly' : ' placeholder="留空自動產生"') + '></label></details>' +
    '<div class="actions"><a href="/admin">取消</a><button type="submit">儲存</button></div></form>');
}

function ruleForm(csrf, current, draft) {
  const rules = draft || { ...emptyRules, ...JSON.parse(current.rules) };
  return modal('修改規則', '<form method="post" action="/admin?rules=' + escape(current.slug) + '">' +
    hidden(csrf, current.slug, 'rules') +
    '<p class="muted">符合條件的訪客依 A/B 比例分流，其餘進入原始頁面（A）。</p>' +
    '<label>允許國家<input name="countries" maxlength="250" placeholder="TW, US, JP" value="' + escape(rules.countries) + '"></label>' +
    '<label>允許地區<input name="regions" maxlength="500" placeholder="例如 Taipei, Tokyo" value="' + escape(rules.regions) + '"></label>' +
    '<label>裝置限制<select name="device">' + options(Object.entries(devices), rules.device) + '</select></label>' +
    '<div class="time"><label>推廣開始<input name="start" type="time" value="' + escape(rules.start) + '"></label>' +
    '<label>推廣結束<input name="end" type="time" value="' + escape(rules.end) + '"></label></div>' +
    '<small>使用台北時間，兩欄留空表示全天。</small>' +
    '<h3>安全檢測</h3><label>排除 ASN<input name="asns" maxlength="500" placeholder="例如 AS64500" value="' + escape(rules.asns) + '"></label>' +
    '<small>國家、地區與 ASN 需由已設定的反向代理提供。缺少已啟用條件所需的資料時，會顯示 A。</small>' +
    '<div class="actions"><a href="/admin">取消</a><button type="submit">儲存</button></div></form>');
}

export function renderDashboard({ campaigns, counts, sources, current, draft, csrf, message, page, link }) {
  const tally = new Map(counts.map(row => [row.slug + ':' + row.variant, row.visits]));
  const active = campaigns.filter(row => row.enabled).length;
  const platformCounts = new Map(platforms.map(platform => [platform, 0]));
  const rows = campaigns.map(row => {
    platformCounts.set(row.platform, (platformCounts.get(row.platform) || 0) + 1);
    const slug = escape(row.slug);
    const a = escape(row.a);
    const b = escape(row.b);
    return '<tr><td><strong>' + escape(row.title) + '</strong></td><td>' + escape(row.platform) + '</td>' +
      '<td class="target">' + (row.mode === 'redirect' ? '<a href="' + a + '" rel="noreferrer">' + a + '</a>' : a) + '</td>' +
      '<td class="target">' + (row.mode === 'redirect' ? '<a href="' + b + '" rel="noreferrer">' + b + '</a>' : b) + '</td>' +
      '<td><span class="badge ' + (row.enabled ? 'on">啟用' : 'off">停用') + '</span></td>' +
      '<td class="operations"><a href="?rules=' + slug + '">規則</a> <a href="?edit=' + slug + '">編輯</a> <a href="?delete=' + slug + '">刪除</a></td>' +
      '<td>' + (row.created_at ? dateFormat.format(new Date(row.created_at)) : '—') + '</td>' +
      '<td><a class="button small-button" href="?link=' + slug + '">取得連結</a></td></tr>';
  }).join('');
  const stats = campaigns.map(row => '<tr><td><a href="?link=' + escape(row.slug) + '">' + escape(row.title) + '</a></td><td>' +
    number(tally.get(row.slug + ':A')) + '</td><td>' + number(tally.get(row.slug + ':B')) + '</td></tr>').join('');
  let dialog = '';
  if (page === 'new' || (page === 'edit' && current)) dialog = routeForm(csrf, current, draft);
  if (page === 'rules' && current) dialog = ruleForm(csrf, current, draft);
  if (page === 'delete' && current) dialog = modal('刪除路由',
    '<p>刪除「' + escape(current.title) + '」及其點擊紀錄？</p><form method="post" action="/admin?delete=' + escape(current.slug) + '">' +
    hidden(csrf, current.slug, 'delete') + '<div class="actions"><a href="/admin">取消</a><button type="submit">確認刪除</button></div></form>');
  if (page === 'link' && current) dialog = modal('取得推廣連結',
    '<label>推廣網址<input readonly value="' + escape(link) + '"></label><p><a href="/r/' + escape(current.slug) + '" target="_blank" rel="noopener">開啟連結</a></p>' +
    '<h3>流量來源</h3><table><thead><tr><th>UTM 來源</th><th>瀏覽次數</th></tr></thead><tbody>' +
    (sources.map(row => '<tr><td>' + escape(row.source) + '</td><td>' + number(row.visits) + '</td></tr>').join('') ||
      '<tr><td colspan="2">尚無紀錄</td></tr>') + '</tbody></table>');
  const overview = page === 'overview';
  return renderPage(overview ? '儀表板' : '路由管理',
    '<nav class="sidebar" aria-label="後台"><strong>活動分流</strong><a href="/admin?overview=1"' + (overview ? ' aria-current="page"' : '') +
    '>儀表板</a><a href="/admin"' + (!overview ? ' aria-current="page"' : '') + '>路由管理</a></nav>' +
    '<div class="workspace">' + (message ? '<p class="notice" role="status">' + escape(message) + '</p>' : '') +
    (overview ? '<section class="panel"><div class="top"><h2>流量統計</h2><span>' + active + ' 條啟用中</span></div>' +
      '<table><thead><tr><th>路由</th><th>A 次數</th><th>B 次數</th></tr></thead><tbody>' +
      (stats || '<tr><td colspan="3">尚無路由</td></tr>') + '</tbody></table></section>' :
      '<section class="panel"><div class="top"><h2>路由列表</h2><a class="button" href="?new=1">＋ 新增路由</a></div>' +
      '<div class="scroll"><table><thead><tr><th>路由名稱</th><th>路由類型</th><th>原始頁面</th><th>落地頁面</th><th>狀態</th><th>操作</th><th>建立時間</th><th>推廣連結</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="8">新增第一條路由後即可取得推廣連結。</td></tr>') + '</tbody></table></div></section>' +
      '<div class="charts">' + chart('路由類型分布', [...platformCounts]) +
      chart('路由狀態分布', [['啟用', active], ['停用', campaigns.length - active]]) + '</div>') + '</div>' + dialog);
}
