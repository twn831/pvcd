var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-gIzKnB/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-gIzKnB/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// index.js
var USERNAME = "nam";
var PASSWORD = "0000";
var COOKIE_NAME = "disk_auth_v2";
var COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
async function createAuthToken(username, password) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(username + ":private_drive_v2"));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
__name(createAuthToken, "createAuthToken");
function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name)
      return rest.join("=");
  }
  return null;
}
__name(getCookie, "getCookie");
async function isLoggedIn(request) {
  const token = getCookie(request, COOKIE_NAME);
  if (!token)
    return false;
  const expected = await createAuthToken(USERNAME, PASSWORD);
  return token === expected;
}
__name(isLoggedIn, "isLoggedIn");
function buildAuthCookie(token) {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}
__name(buildAuthCookie, "buildAuthCookie");
function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "\u672A\u6388\u6B0A\uFF0C\u8ACB\u5148\u767B\u5165" }), {
    status: 401,
    headers: { "Content-Type": "application/json" }
  });
}
__name(unauthorizedResponse, "unauthorizedResponse");
function getFileType(name) {
  const ext = name.split(".").pop().toLowerCase();
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"];
  const pdfExts = ["pdf"];
  const textExts = ["txt", "md", "js", "ts", "jsx", "tsx", "json", "html", "css", "scss", "xml", "yml", "yaml", "sh", "bat", "ps1", "py", "java", "c", "cpp", "h", "hpp", "cs", "go", "rs", "rb", "php", "sql", "log", "ini", "cfg", "conf"];
  const videoExts = ["mp4", "avi", "mov", "mkv", "webm", "flv", "wmv", "m4v"];
  const audioExts = ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"];
  const docExts = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp"];
  if (imageExts.includes(ext))
    return "image";
  if (pdfExts.includes(ext))
    return "pdf";
  if (textExts.includes(ext))
    return "text";
  if (videoExts.includes(ext))
    return "video";
  if (audioExts.includes(ext))
    return "audio";
  if (archiveExts.includes(ext))
    return "archive";
  if (docExts.includes(ext))
    return "document";
  return "other";
}
__name(getFileType, "getFileType");
function parseFileList(objects, currentPath) {
  const folders = /* @__PURE__ */ new Set();
  const files = [];
  for (const obj of objects) {
    if (!obj.key.startsWith(currentPath))
      continue;
    const relativePath = obj.key.substring(currentPath.length);
    if (relativePath.includes("/")) {
      const parts = relativePath.split("/");
      if (parts.length === 2 && parts[1]) {
        const folderName = parts[0];
        folders.add({
          name: folderName,
          path: currentPath + folderName + "/",
          type: "folder",
          size: 0
        });
        files.push({
          name: parts[1],
          path: obj.key,
          size: obj.size,
          uploaded: obj.uploaded ? new Date(obj.uploaded).toISOString() : null,
          type: getFileType(parts[1]),
          isFolder: false
        });
      }
    } else if (relativePath && !relativePath.endsWith("/")) {
      files.push({
        name: relativePath,
        path: obj.key,
        size: obj.size,
        uploaded: obj.uploaded ? new Date(obj.uploaded).toISOString() : null,
        type: getFileType(relativePath),
        isFolder: false
      });
    }
  }
  const result = [...folders];
  result.push(...files);
  return result;
}
__name(parseFileList, "parseFileList");
async function getFileMetadata(env, filePath) {
  try {
    const metadata = await env.DISK_META.get(filePath, "json");
    if (metadata)
      return metadata;
  } catch (e) {
  }
  return { uploaded: (/* @__PURE__ */ new Date()).toISOString() };
}
__name(getFileMetadata, "getFileMetadata");
async function setFileMetadata(env, filePath, metadata) {
  try {
    await env.DISK_META.put(filePath, JSON.stringify(metadata));
  } catch (e) {
    console.error("Failed to save metadata:", e);
  }
}
__name(setFileMetadata, "setFileMetadata");
var SHARED_JS = `
// \u4E3B\u984C\u5207\u63DB
(function() {
  var saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  // \u901A\u77E5\u670D\u52D9\u5668\u4FDD\u5B58\u504F\u597D
  try {
    fetch('/api/theme?theme=' + next, { method: 'POST' });
  } catch(e) {}
}

// \u683C\u5F0F\u5316\u6587\u4EF6\u5927\u5C0F
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

// \u683C\u5F0F\u5316\u65E5\u671F\u6642\u9593
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  // 24\u5C0F\u6642\u5167
  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return '\u4ECA\u5929 ' + date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' });
  }
  // \u6628\u5929
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
    return '\u6628\u5929 ' + date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' });
  }
  // \u672C\u5E74
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' });
  }
  // \u5176\u4ED6
  return date.toLocaleDateString('zh-HK', { year: 'numeric', month: 'short', day: 'numeric' });
}

// \u7372\u53D6\u6587\u4EF6\u5716\u6A19
function getFileIcon(name, isFolder) {
  if (isFolder) return '\u{1F4C1}';
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    pdf:'\u{1F4C4}', doc:'\u{1F4DD}', docx:'\u{1F4DD}', txt:'\u{1F4DD}',
    xls:'\u{1F4CA}', xlsx:'\u{1F4CA}', csv:'\u{1F4CA}', ppt:'\u{1F4CA}', pptx:'\u{1F4CA}',
    jpg:'\u{1F5BC}\uFE0F', jpeg:'\u{1F5BC}\uFE0F', png:'\u{1F5BC}\uFE0F', gif:'\u{1F5BC}\uFE0F', webp:'\u{1F5BC}\uFE0F', svg:'\u{1F5BC}\uFE0F', bmp:'\u{1F5BC}\uFE0F',
    mp4:'\u{1F3AC}', avi:'\u{1F3AC}', mov:'\u{1F3AC}', mkv:'\u{1F3AC}', webm:'\u{1F3AC}',
    mp3:'\u{1F3B5}', wav:'\u{1F3B5}', flac:'\u{1F3B5}', aac:'\u{1F3B5}',
    zip:'\u{1F5DC}\uFE0F', rar:'\u{1F5DC}\uFE0F', '7z':'\u{1F5DC}\uFE0F', tar:'\u{1F5DC}\uFE0F', gz:'\u{1F5DC}\uFE0F',
    js:'\u{1F4BB}', ts:'\u{1F4BB}', jsx:'\u{1F4BB}', tsx:'\u{1F4BB}', json:'\u{1F4BB}',
    html:'\u{1F310}', css:'\u{1F3A8}', scss:'\u{1F3A8}',
    eot:'\u{1F524}', otf:'\u{1F524}', ttf:'\u{1F524}', woff:'\u{1F524}', woff2:'\u{1F524}',
  };
  return map[ext] || '\u{1F4CE}';
}

// \u986F\u793A Toast \u6D88\u606F
function showToast(message, type) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'info');
  toast.innerHTML = '<span>' + message + '</span>';
  container.appendChild(toast);
  
  // \u52D5\u756B
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// \u78BA\u8A8D\u5C0D\u8A71\u6846
function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = \`
      <div class="modal-box">
        <div class="modal-icon">\u26A0\uFE0F</div>
        <p class="modal-message">\${message}</p>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').dataset.result='cancel'; this.closest('.modal-overlay').remove()">\u53D6\u6D88</button>
          <button class="btn-danger" onclick="this.closest('.modal-overlay').dataset.result='confirm'; this.closest('.modal-overlay').remove()">\u78BA\u8A8D</button>
        </div>
      </div>
    \`;
    document.body.appendChild(overlay);
    
    overlay.addEventListener('transitionend', () => {
      if (overlay.dataset.result === 'confirm') resolve(true);
      else if (overlay.dataset.result === 'cancel') resolve(false);
    });
    
    setTimeout(() => overlay.remove(), 60000);
  });
}

// \u5275\u5EFA\u6587\u4EF6\u593E\u5C0D\u8A71\u6846
function showCreateFolderDialog() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = \`
      <div class="modal-box">
        <h3 class="modal-title">\u{1F4C1} \u65B0\u5EFA\u6587\u4EF6\u593E</h3>
        <input type="text" class="modal-input" id="folderNameInput" placeholder="\u8F38\u5165\u6587\u4EF6\u593E\u540D\u7A31" autocomplete="off">
        <div class="modal-actions">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').dataset.result='cancel'; this.closest('.modal-overlay').remove()">\u53D6\u6D88</button>
          <button class="btn-primary" onclick="this.closest('.modal-overlay').dataset.result='confirm'; this.closest('.modal-overlay').remove()">\u5275\u5EFA</button>
        </div>
      </div>
    \`;
    document.body.appendChild(overlay);
    
    const input = overlay.querySelector('#folderNameInput');
    setTimeout(() => input.focus(), 100);
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        overlay.dataset.result = 'confirm';
        overlay.remove();
      } else if (e.key === 'Escape') {
        overlay.dataset.result = 'cancel';
        overlay.remove();
      }
    });
    
    overlay.addEventListener('transitionend', () => {
      if (overlay.dataset.result === 'confirm') resolve(input.value.trim());
      else resolve(null);
    });
  });
}

// \u91CD\u547D\u540D\u5C0D\u8A71\u6846
function showRenameDialog(currentName) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = \`
      <div class="modal-box">
        <h3 class="modal-title">\u270F\uFE0F \u91CD\u547D\u540D</h3>
        <input type="text" class="modal-input" id="newNameInput" value="\${currentName}" autocomplete="off">
        <div class="modal-actions">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').dataset.result='cancel'; this.closest('.modal-overlay').remove()">\u53D6\u6D88</button>
          <button class="btn-primary" onclick="this.closest('.modal-overlay').dataset.result='confirm'; this.closest('.modal-overlay').remove()">\u78BA\u5B9A</button>
        </div>
      </div>
    \`;
    document.body.appendChild(overlay);
    
    const input = overlay.querySelector('#newNameInput');
    const ext = currentName.includes('.') ? '.' + currentName.split('.').pop() : '';
    const nameWithoutExt = ext ? currentName.slice(0, -ext.length) : currentName;
    
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(0, nameWithoutExt.length);
    }, 100);
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        overlay.dataset.result = 'confirm';
        overlay.remove();
      } else if (e.key === 'Escape') {
        overlay.dataset.result = 'cancel';
        overlay.remove();
      }
    });
    
    overlay.addEventListener('transitionend', () => {
      if (overlay.dataset.result === 'confirm') resolve(input.value.trim());
      else resolve(null);
    });
  });
}

// \u79FB\u52D5\u5230\u6587\u4EF6\u593E\u5C0D\u8A71\u6846
function showMoveToFolderDialog(folders, currentPath) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    let folderList = '<div class="folder-item' + (currentPath === '' ? ' active' : '') + '" data-path="">\u{1F3E0} \u6839\u76EE\u9304</div>';
    folderList += '<div class="folder-item' + (currentPath === '/' ? ' active' : '') + '" data-path="/">\u{1F4C1} \u6839\u76EE\u9304</div>';
    
    folders.filter(f => f.isFolder && f.path !== currentPath).forEach(f => {
      const displayPath = f.path.replace(/^//, '').replace(//$/, '') || '/';
      const isParent = currentPath.startsWith(f.path);
      if (!isParent || currentPath === '') {
        folderList += '<div class="folder-item" data-path="' + f.path + '">' + (f.isFolder ? '\u{1F4C1} ' : '\u{1F4CE} ') + f.name + '</div>';
      }
    });
    
    overlay.innerHTML = \`
      <div class="modal-box modal-box-wide">
        <h3 class="modal-title">\u{1F4C2} \u79FB\u52D5\u5230...</h3>
        <div class="folder-list">\${folderList}</div>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').dataset.result='cancel'; this.closest('.modal-overlay').remove()">\u53D6\u6D88</button>
          <button class="btn-primary" onclick="this.closest('.modal-overlay').dataset.result='confirm'; this.closest('.modal-overlay').remove()">\u79FB\u52D5</button>
        </div>
      </div>
    \`;
    document.body.appendChild(overlay);
    
    overlay.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', () => {
        overlay.querySelectorAll('.folder-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
    
    overlay.addEventListener('transitionend', () => {
      if (overlay.dataset.result === 'confirm') {
        const selected = overlay.querySelector('.folder-item.active');
        resolve(selected ? selected.dataset.path : null);
      } else {
        resolve(null);
      }
    });
  });
}

// \u9810\u89BD\u6587\u4EF6
function previewFile(file) {
  const overlay = document.createElement('div');
  overlay.className = 'preview-overlay';
  
  let content = '';
  const fileType = file.type || getFileType(file.name);
  
  if (fileType === 'image') {
    content = '<img src="/api/preview?path=' + encodeURIComponent(file.path) + '" alt="' + file.name + '" class="preview-image" onerror="this.parentElement.innerHTML=\\'<div class=preview-error>\u5716\u7247\u8F09\u5165\u5931\u6557</div>\\'">';
  } else if (fileType === 'pdf') {
    content = '<iframe src="/api/preview?path=' + encodeURIComponent(file.path) + '" class="preview-pdf"></iframe>';
  } else if (fileType === 'text') {
    content = '<div class="preview-loading">\u8F09\u5165\u4E2D...</div>';
    // \u7570\u6B65\u52A0\u8F09\u6587\u672C\u5167\u5BB9
    fetch('/api/preview?path=' + encodeURIComponent(file.path))
      .then(r => r.text())
      .then(text => {
        overlay.querySelector('.preview-text').innerHTML = '<pre>' + escapeHtml(text) + '</pre>';
      })
      .catch(() => {
        overlay.querySelector('.preview-text').innerHTML = '<div class="preview-error">\u7121\u6CD5\u8F09\u5165\u6587\u4EF6\u5167\u5BB9</div>';
      });
    content = '<div class="preview-text">' + content + '</div>';
  } else {
    content = '<div class="preview-unsupported"><div class="preview-icon">' + getFileIcon(file.name) + '</div><p>\u6B64\u6587\u4EF6\u985E\u578B\u66AB\u4E0D\u652F\u63F4\u9810\u89BD</p></div>';
  }
  
  overlay.innerHTML = \`
    <div class="preview-container">
      <div class="preview-header">
        <span class="preview-title">\${getFileIcon(file.name)} \${file.name}</span>
        <div class="preview-actions">
          <a href="/api/download?path=\${encodeURIComponent(file.path)}" class="btn-icon" title="\u4E0B\u8F09">\u2B07\uFE0F \u4E0B\u8F09</a>
          <button class="btn-icon close-btn" onclick="this.closest('.preview-overlay').remove()">\u2716\uFE0F \u95DC\u9589</button>
        </div>
      </div>
      <div class="preview-body">\${content}</div>
    </div>
  \`;
  document.body.appendChild(overlay);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// \u5275\u5EFA\u4E0A\u50B3\u9032\u5EA6\u5F48\u7A97
function showUploadProgress(files) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'uploadProgressModal';
  
  let fileList = '';
  for (const f of files) {
    fileList += '<div class="upload-item" id="upload-item-' + f.name.replace(/[^a-zA-Z0-9]/g, '_') + '">' +
      '<span class="upload-item-name">' + getFileIcon(f.name) + ' ' + f.name + '</span>' +
      '<span class="upload-item-status" data-status="pending">\u7B49\u5F85\u4E2D...</span>' +
    '</div>';
  }
  
  overlay.innerHTML = \`
    <div class="modal-box modal-box-wide">
      <h3 class="modal-title">\u{1F4E4} \u4E0A\u50B3\u6A94\u6848\u4E2D...</h3>
      <div class="upload-list">\${fileList}</div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="if(this.innerText==='\u5B8C\u6210') { this.closest('.modal-overlay').remove(); location.reload(); }">\u7B49\u5F85...</button>
      </div>
    </div>
  \`;
  document.body.appendChild(overlay);
  
  return {
    updateStatus: (name, status, progress) => {
      const item = document.getElementById('upload-item-' + name.replace(/[^a-zA-Z0-9]/g, '_'));
      if (item) {
        const statusEl = item.querySelector('.upload-item-status');
        statusEl.textContent = status;
        statusEl.dataset.status = progress !== undefined ? 'progress' : 'done';
      }
    },
    complete: () => {
      const btn = overlay.querySelector('.btn-secondary');
      btn.innerText = '\u5B8C\u6210';
      btn.onclick = () => { overlay.remove(); location.reload(); };
    }
  };
}
`;
var SHARED_STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; }
:root, [data-theme="light"] {
  --bg-base: #f8fafc;
  --bg-gradient-1: #e2e8f0;
  --bg-gradient-2: #f1f5f9;
  --bg-gradient-3: #e0f2fe;
  --card-bg: rgba(255, 255, 255, 0.85);
  --card-border: rgba(255, 255, 255, 0.9);
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --accent-soft: rgba(99, 102, 241, 0.1);
  --accent-light: rgba(99, 102, 241, 0.05);
  --success: #10b981;
  --success-soft: rgba(16, 185, 129, 0.1);
  --warning: #f59e0b;
  --warning-soft: rgba(245, 158, 11, 0.1);
  --danger: #ef4444;
  --danger-hover: #dc2626;
  --danger-soft: rgba(239, 68, 68, 0.1);
  --border: rgba(148, 163, 184, 0.2);
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 4px 16px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 12px 40px rgba(15, 23, 42, 0.12);
  --input-bg: rgba(255, 255, 255, 0.9);
  --hover-bg: rgba(99, 102, 241, 0.05);
  --selected-bg: rgba(99, 102, 241, 0.1);
  --orb-1: rgba(99, 102, 241, 0.15);
  --orb-2: rgba(168, 85, 247, 0.12);
  --orb-3: rgba(34, 211, 238, 0.1);
}
[data-theme="dark"] {
  --bg-base: #0f172a;
  --bg-gradient-1: #1e293b;
  --bg-gradient-2: #0f172a;
  --bg-gradient-3: #1e1b4b;
  --card-bg: rgba(30, 41, 59, 0.7);
  --card-border: rgba(255, 255, 255, 0.06);
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent: #818cf8;
  --accent-hover: #a5b4fc;
  --accent-soft: rgba(129, 140, 248, 0.15);
  --accent-light: rgba(129, 140, 248, 0.05);
  --success: #34d399;
  --success-soft: rgba(52, 211, 153, 0.15);
  --warning: #fbbf24;
  --warning-soft: rgba(251, 191, 36, 0.15);
  --danger: #f87171;
  --danger-hover: #fca5a5;
  --danger-soft: rgba(248, 113, 113, 0.15);
  --border: rgba(255, 255, 255, 0.06);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.5);
  --input-bg: rgba(15, 23, 42, 0.6);
  --hover-bg: rgba(129, 140, 248, 0.08);
  --selected-bg: rgba(129, 140, 248, 0.12);
  --orb-1: rgba(99, 102, 241, 0.2);
  --orb-2: rgba(168, 85, 247, 0.15);
  --orb-3: rgba(34, 211, 238, 0.08);
}
html, body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif;
  min-height: 100vh;
  color: var(--text-primary);
  background: var(--bg-base);
  transition: background 0.3s ease, color 0.3s ease;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* \u80CC\u666F\u88DD\u98FE */
.page-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background: linear-gradient(135deg, var(--bg-gradient-1) 0%, var(--bg-gradient-2) 50%, var(--bg-gradient-3) 100%);
  transition: background 0.3s ease;
}
.page-bg .orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  animation: float 20s ease-in-out infinite;
}
.page-bg .orb-1 { width: 500px; height: 500px; background: var(--orb-1); top: -150px; right: -100px; }
.page-bg .orb-2 { width: 400px; height: 400px; background: var(--orb-2); bottom: -100px; left: -80px; animation-delay: -6s; }
.page-bg .orb-3 { width: 300px; height: 300px; background: var(--orb-3); top: 50%; left: 50%; transform: translate(-50%, -50%); animation-delay: -12s; }
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* \u4E3B\u984C\u5207\u63DB\u6309\u9215 */
.theme-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100;
  width: 44px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
}
.theme-toggle:hover { transform: scale(1.05); box-shadow: var(--shadow-md); }
[data-theme="light"] .icon-sun { display: none; }
[data-theme="dark"] .icon-moon { display: none; }

/* \u73BB\u7483\u5361\u7247 */
.glass-card {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  box-shadow: var(--shadow-md);
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
}

/* \u6309\u9215 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-primary {
  background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45); }
.btn-primary:active { transform: translateY(0); }
.btn-secondary {
  background: var(--input-bg);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
.btn-secondary:hover { background: var(--hover-bg); border-color: var(--accent); }
.btn-danger {
  background: var(--danger-soft);
  color: var(--danger);
  border: 1px solid transparent;
}
.btn-danger:hover { background: var(--danger); color: #fff; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35); }
.btn-icon {
  background: var(--input-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  padding: 8px 12px;
  font-size: 13px;
}
.btn-icon:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

/* Toast \u901A\u77E5 */
#toastContainer { position: fixed; top: 80px; right: 20px; z-index: 200; display: flex; flex-direction: column; gap: 10px; }
.toast {
  background: var(--card-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 20px;
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  font-weight: 500;
  opacity: 0;
  transform: translateX(100px);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 320px;
}
.toast.show { opacity: 1; transform: translateX(0); }
.toast-success { border-left: 4px solid var(--success); }
.toast-error { border-left: 4px solid var(--danger); }
.toast-info { border-left: 4px solid var(--accent); }
.toast-warning { border-left: 4px solid var(--warning); }

/* \u6A21\u614B\u6846 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-box {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 28px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.3s ease;
}
.modal-box-wide { max-width: 500px; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.modal-icon { font-size: 48px; text-align: center; margin-bottom: 16px; }
.modal-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; text-align: center; }
.modal-message { font-size: 15px; color: var(--text-secondary); text-align: center; margin-bottom: 24px; line-height: 1.6; }
.modal-input {
  width: 100%;
  padding: 14px 16px;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
  margin-bottom: 20px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.modal-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.modal-actions .btn { flex: 1; }

/* \u6587\u4EF6\u593E\u5217\u8868 */
.folder-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--input-bg);
}
.folder-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  font-size: 14px;
}
.folder-item:last-child { border-bottom: none; }
.folder-item:hover { background: var(--hover-bg); }
.folder-item.active { background: var(--selected-bg); color: var(--accent); font-weight: 600; }

/* \u4E0A\u50B3\u9032\u5EA6 */
.upload-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
}
.upload-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}
.upload-item:last-child { border-bottom: none; }
.upload-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 12px;
}
.upload-item-status {
  font-size: 12px;
  color: var(--text-muted);
}
.upload-item-status[data-status="done"] { color: var(--success); }
.upload-item-status[data-status="error"] { color: var(--danger); }
.upload-item-status[data-status="progress"] { color: var(--accent); }

/* \u6EFE\u52D5\u689D */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* \u97FF\u61C9\u5F0F */
@media (max-width: 640px) {
  .theme-toggle { top: 12px; right: 12px; width: 40px; height: 40px; }
  .modal-box { padding: 24px 20px; }
  .modal-actions { flex-direction: column-reverse; }
  #toastContainer { top: 70px; right: 12px; left: 12px; }
  .toast { max-width: none; }
}
`;
var LOGIN_HTML = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>\u767B\u5165 \xB7 \u79C1\u4EBA\u96F2\u76E4</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="\u79C1\u4EBA\u96F2\u76E4 - \u5B89\u5168\u5132\u5B58\u60A8\u7684\u6A94\u6848">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>\u{1F4E6}</text></svg>">
  <script>${SHARED_JS}<\/script>
  <style>
    ${SHARED_STYLES}
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      padding-top: max(24px, env(safe-area-inset-top));
      padding-bottom: max(24px, env(safe-area-inset-bottom));
    }
    .login-wrap {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 400px;
      animation: fadeUp 0.6s ease;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .login-card { padding: 40px 32px; }
    .login-logo {
      width: 72px;
      height: 72px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4);
      animation: pulse 3s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 12px 32px rgba(99, 102, 241, 0.4); }
      50% { box-shadow: 0 16px 40px rgba(99, 102, 241, 0.5); }
    }
    .login-card h1 {
      text-align: center;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .login-card .subtitle {
      text-align: center;
      color: var(--text-secondary);
      font-size: 14px;
      margin-bottom: 32px;
    }
    .field { margin-bottom: 20px; }
    .field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    .field input {
      width: 100%;
      padding: 14px 16px;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      font-size: 16px;
      color: var(--text-primary);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .field input::placeholder { color: var(--text-muted); }
    .field input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .login-btn {
      width: 100%;
      padding: 15px;
      margin-top: 8px;
      font-size: 16px;
      border-radius: 12px;
    }
    .login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
    .login-footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: var(--text-muted);
    }
    @media (max-width: 480px) {
      .login-card { padding: 32px 24px; }
      .login-card h1 { font-size: 22px; }
      .login-logo { width: 64px; height: 64px; font-size: 32px; }
    }
  </style>
</head>
<body>
  <div class="page-bg">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  </div>
  <button class="theme-toggle" onclick="toggleTheme()" aria-label="\u5207\u63DB\u6DF1\u6DFA\u8272\u6A21\u5F0F">
    <span class="icon-moon">\u{1F319}</span>
    <span class="icon-sun">\u2600\uFE0F</span>
  </button>
  <div class="login-wrap">
    <div class="glass-card login-card">
      <div class="login-logo">\u{1F4E6}</div>
      <h1>\u79C1\u4EBA\u96F2\u76E4</h1>
      <p class="subtitle">\u8ACB\u8F38\u5165\u5E33\u865F\u5BC6\u78BC\u4EE5\u767B\u5165</p>
      <form id="loginForm">
        <div class="field">
          <label for="username">\u5E33\u865F</label>
          <input type="text" id="username" name="username" placeholder="\u8ACB\u8F38\u5165\u5E33\u865F" autocomplete="username" required>
        </div>
        <div class="field">
          <label for="password">\u5BC6\u78BC</label>
          <input type="password" id="password" name="password" placeholder="\u8ACB\u8F38\u5165\u5BC6\u78BC" autocomplete="current-password" required>
        </div>
        <button type="submit" class="btn btn-primary login-btn" id="loginBtn">\u767B\u5165</button>
      </form>
      <p class="login-footer">\u5B89\u5168\u3001\u79C1\u5BC6\u3001\u53EA\u5C6C\u65BC\u60A8\u7684\u96F2\u7AEF\u5132\u5B58\u7A7A\u9593</p>
    </div>
  </div>
  <div id="toastContainer"></div>
  <script>
    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      
      if (!username || !password) {
        showToast('\u8ACB\u8F38\u5165\u5E33\u865F\u548C\u5BC6\u78BC', 'warning');
        return;
      }
      
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-dots">\u767B\u5165\u4E2D</span>';
      
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        if (res.ok) {
          showToast('\u767B\u5165\u6210\u529F\uFF01', 'success');
          setTimeout(() => location.href = '/', 500);
        } else {
          showToast('\u5E33\u865F\u6216\u5BC6\u78BC\u932F\u8AA4', 'error');
          btn.disabled = false;
          btn.innerText = '\u767B\u5165';
        }
      } catch (err) {
        showToast('\u7DB2\u7D61\u932F\u8AA4\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66', 'error');
        btn.disabled = false;
        btn.innerText = '\u767B\u5165';
      }
    };
  <\/script>
</body>
</html>
`;
var MAIN_HTML = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>\u79C1\u4EBA\u96F2\u76E4</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="\u79C1\u4EBA\u96F2\u76E4 - \u5B89\u5168\u5132\u5B58\u60A8\u7684\u6A94\u6848">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>\u{1F4E6}</text></svg>">
  <script>${SHARED_JS}<\/script>
  <style>
    ${SHARED_STYLES}
    
    .app {
      position: relative;
      z-index: 1;
      max-width: 1100px;
      margin: 0 auto;
      padding: 80px 20px 40px;
      padding-top: max(80px, calc(64px + env(safe-area-inset-top)));
      animation: fadeUp 0.5s ease;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* \u9802\u90E8\u5DE5\u5177\u6B04 */
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.3);
    }
    .logo-text h1 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .logo-text p {
      font-size: 12px;
      color: var(--text-muted);
    }
    .top-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    /* \u8DEF\u5F91\u5C0E\u822A */
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 12px 16px;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 14px;
      overflow-x: auto;
      white-space: nowrap;
    }
    .breadcrumb-item {
      color: var(--text-secondary);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .breadcrumb-item:hover { background: var(--hover-bg); color: var(--accent); }
    .breadcrumb-item.active { color: var(--text-primary); font-weight: 600; cursor: default; }
    .breadcrumb-item.active:hover { background: none; }
    .breadcrumb-sep { color: var(--text-muted); flex-shrink: 0; }
    
    /* \u5DE5\u5177\u6B04 */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .toolbar-left { display: flex; align-items: center; gap: 10px; flex: 1; flex-wrap: wrap; }
    .toolbar-right { display: flex; align-items: center; gap: 10px; }
    
    /* \u641C\u7D22\u6846 */
    .search-box {
      position: relative;
      flex: 1;
      min-width: 200px;
      max-width: 320px;
    }
    .search-box input {
      width: 100%;
      padding: 10px 16px 10px 40px;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 14px;
      color: var(--text-primary);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-box input::placeholder { color: var(--text-muted); }
    .search-box input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .search-box .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      pointer-events: none;
    }
    .search-box .clear-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      font-size: 14px;
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    .search-box .clear-btn:hover { opacity: 1; }
    
    /* \u6392\u5E8F\u4E0B\u62C9 */
    .sort-select {
      padding: 10px 32px 10px 12px;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 14px;
      color: var(--text-primary);
      cursor: pointer;
      outline: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      transition: border-color 0.2s;
    }
    .sort-select:hover { border-color: var(--accent); }
    .sort-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    
    /* \u9078\u64C7\u6A21\u5F0F */
    .selection-bar {
      display: none;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--accent);
      border-radius: 12px;
      color: #fff;
      margin-bottom: 16px;
      animation: slideDown 0.2s ease;
    }
    .selection-bar.show { display: flex; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .selection-count { font-weight: 600; }
    .selection-actions { display: flex; gap: 8px; margin-left: auto; }
    .selection-actions .btn {
      background: rgba(255,255,255,0.2);
      color: #fff;
      border: none;
      padding: 8px 12px;
      font-size: 13px;
    }
    .selection-actions .btn:hover { background: rgba(255,255,255,0.3); }
    
    /* \u4E0A\u50B3\u5340\u57DF */
    .upload-area {
      border: 2px dashed var(--border);
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      background: var(--accent-light);
      transition: all 0.25s;
      margin-bottom: 24px;
    }
    .upload-area:hover, .upload-area.dragover {
      border-color: var(--accent);
      background: var(--accent-soft);
      transform: scale(1.005);
    }
    .upload-area.dragover {
      border-style: solid;
      box-shadow: 0 0 0 4px var(--accent-soft);
    }
    .upload-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
    }
    .upload-area p {
      color: var(--text-secondary);
      font-size: 15px;
      line-height: 1.6;
    }
    .upload-area p strong { color: var(--accent); font-weight: 600; }
    .upload-area small { display: block; color: var(--text-muted); font-size: 12px; margin-top: 8px; }
    
    /* \u6587\u4EF6\u5217\u8868 */
    .file-list-header {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 12px 12px 0 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .file-list-header .col-name { flex: 1; min-width: 0; }
    .file-list-header .col-size { width: 100px; text-align: right; }
    .file-list-header .col-date { width: 140px; text-align: right; }
    .file-list-header .col-actions { width: 120px; text-align: center; }
    
    .file-list-body {
      border: 1px solid var(--border);
      border-top: none;
      border-radius: 0 0 12px 12px;
      overflow: hidden;
      background: var(--card-bg);
    }
    
    .file-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s;
      cursor: default;
    }
    .file-item:last-child { border-bottom: none; }
    .file-item:hover { background: var(--hover-bg); }
    .file-item.selected { background: var(--selected-bg); }
    .file-item.selecting { cursor: pointer; }
    
    .file-item .col-check {
      width: 32px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .file-item .col-check input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--accent);
    }
    
    .file-item .col-name {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .file-item .file-icon {
      width: 40px;
      height: 40px;
      background: var(--accent-soft);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .file-item.is-folder .file-icon { background: var(--warning-soft); }
    .file-item .file-name {
      flex: 1;
      min-width: 0;
    }
    .file-item .file-name-text {
      font-weight: 600;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }
    .file-item.is-folder .file-name-text { color: var(--warning); }
    .file-item .file-type {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    
    .file-item .col-size {
      width: 100px;
      text-align: right;
      font-size: 13px;
      color: var(--text-secondary);
      flex-shrink: 0;
    }
    .file-item .col-date {
      width: 140px;
      text-align: right;
      font-size: 13px;
      color: var(--text-secondary);
      flex-shrink: 0;
    }
    .file-item .col-actions {
      width: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .file-item .col-actions .btn {
      padding: 8px 10px;
      font-size: 12px;
    }
    
    /* \u9078\u4E2D\u6642\u96B1\u85CF\u64CD\u4F5C\u6309\u9215 */
    .file-item.selected .col-actions { display: none; }
    .file-item:not(.selecting) .col-check { display: none; }
    
    /* \u7A7A\u72C0\u614B */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }
    .empty-state .empty-icon { font-size: 64px; margin-bottom: 16px; opacity: 0.4; }
    .empty-state h3 { font-size: 18px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; }
    .empty-state p { font-size: 14px; }
    
    /* \u8F09\u5165\u72C0\u614B */
    .loading-state {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
    }
    .loading-dots::after {
      content: '';
      animation: dots 1.5s steps(4, end) infinite;
    }
    @keyframes dots {
      0% { content: ''; }
      25% { content: '.'; }
      50% { content: '..'; }
      75% { content: '...'; }
    }
    
    /* \u9810\u89BD\u5F48\u7A97 */
    .preview-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 400;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    }
    .preview-container {
      background: var(--card-bg);
      border-radius: 16px;
      width: 100%;
      max-width: 900px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }
    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .preview-title {
      font-weight: 700;
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .preview-actions { display: flex; gap: 8px; }
    .preview-body {
      flex: 1;
      overflow: auto;
      min-height: 300px;
      max-height: calc(90vh - 70px);
    }
    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .preview-pdf {
      width: 100%;
      height: 100%;
      min-height: 500px;
      border: none;
    }
    .preview-text {
      padding: 20px;
      overflow: auto;
      max-height: calc(90vh - 70px);
    }
    .preview-text pre {
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-all;
      color: var(--text-primary);
    }
    .preview-unsupported {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      color: var(--text-muted);
    }
    .preview-icon { font-size: 64px; margin-bottom: 16px; }
    .preview-loading { text-align: center; padding: 40px; color: var(--text-muted); }
    .preview-error { text-align: center; padding: 40px; color: var(--danger); }
    .close-btn { font-size: 13px; }
    
    /* \u97FF\u61C9\u5F0F */
    @media (max-width: 768px) {
      .app { padding: 64px 16px 32px; }
      .file-list-header .col-size,
      .file-list-header .col-date { display: none; }
      .file-item .col-size,
      .file-item .col-date { display: none; }
      .file-item .col-actions { width: auto; }
      .toolbar-left { width: 100%; }
      .search-box { max-width: none; }
    }
    @media (max-width: 480px) {
      .top-bar { flex-direction: column; align-items: stretch; }
      .logo-area { justify-content: center; }
      .top-actions { justify-content: center; }
      .toolbar { flex-direction: column; }
      .toolbar-left, .toolbar-right { width: 100%; justify-content: center; }
      .file-item .col-actions { flex-wrap: wrap; }
    }
  </style>
</head>
<body>
  <div class="page-bg">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  </div>
  <button class="theme-toggle" onclick="toggleTheme()" aria-label="\u5207\u63DB\u6DF1\u6DFA\u8272\u6A21\u5F0F">
    <span class="icon-moon">\u{1F319}</span>
    <span class="icon-sun">\u2600\uFE0F</span>
  </button>
  
  <div class="app">
    <!-- \u9802\u90E8\u5DE5\u5177\u6B04 -->
    <div class="top-bar">
      <div class="logo-area">
        <div class="logo-icon">\u{1F4E6}</div>
        <div class="logo-text">
          <h1>\u79C1\u4EBA\u96F2\u76E4</h1>
          <p id="storageInfo">\u8F09\u5165\u4E2D...</p>
        </div>
      </div>
      <div class="top-actions">
        <button class="btn btn-icon" onclick="logout()" title="\u767B\u51FA">\u{1F6AA} \u767B\u51FA</button>
      </div>
    </div>
    
    <!-- \u9EB5\u5305\u5C51\u5C0E\u822A -->
    <div class="breadcrumb" id="breadcrumb"></div>
    
    <!-- \u9078\u4E2D\u5DE5\u5177\u6B04 -->
    <div class="selection-bar" id="selectionBar">
      <span class="selection-count">\u5DF2\u9078\u64C7 <strong id="selectedCount">0</strong> \u9805</span>
      <div class="selection-actions">
        <button class="btn" onclick="downloadSelected()">\u2B07\uFE0F \u4E0B\u8F09</button>
        <button class="btn" onclick="deleteSelected()">\u{1F5D1}\uFE0F \u522A\u9664</button>
        <button class="btn" onclick="clearSelection()">\u2715 \u53D6\u6D88</button>
      </div>
    </div>
    
    <!-- \u4E3B\u8981\u5DE5\u5177\u6B04 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-box">
          <span class="search-icon">\u{1F50D}</span>
          <input type="text" id="searchInput" placeholder="\u641C\u5C0B\u6A94\u6848\u6216\u6587\u4EF6\u593E..." oninput="handleSearch()">
        </div>
        <select class="sort-select" id="sortSelect" onchange="handleSort()">
          <option value="name">\u540D\u7A31\u6392\u5E8F</option>
          <option value="size">\u5927\u5C0F\u6392\u5E8F</option>
          <option value="date">\u65E5\u671F\u6392\u5E8F</option>
          <option value="type">\u985E\u578B\u6392\u5E8F</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-secondary" onclick="toggleSelectMode()" id="selectModeBtn">\u2611\uFE0F \u9078\u64C7</button>
        <button class="btn btn-primary" onclick="createFolder()">\u{1F4C1} \u65B0\u5EFA\u6587\u4EF6\u593E</button>
        <button class="btn btn-primary" onclick="document.getElementById('fileInput').click()">\u2B06\uFE0F \u4E0A\u50B3</button>
      </div>
    </div>
    
    <!-- \u4E0A\u50B3\u5340\u57DF -->
    <div class="upload-area glass-card" id="dropzone">
      <div class="upload-icon">\u2B06\uFE0F</div>
      <p>\u5C07\u6A94\u6848<strong>\u62D6\u66F3</strong>\u5230\u9019\u88E1\u4E0A\u50B3\uFF0C\u6216<strong>\u9EDE\u64CA</strong>\u9078\u64C7\u6A94\u6848</p>
      <small>\u652F\u63F4\u5716\u7247\u3001\u6587\u6A94\u3001\u5F71\u7247\u3001\u58D3\u7E2E\u5305\u7B49\u591A\u7A2E\u683C\u5F0F</small>
    </div>
    <input type="file" id="fileInput" style="display:none" multiple onchange="handleFileSelect(event)">
    
    <!-- \u6587\u4EF6\u5217\u8868 -->
    <div id="fileListContainer">
      <div class="loading-state"><span class="loading-dots">\u8F09\u5165\u4E2D</span></div>
    </div>
  </div>
  
  <div id="toastContainer"></div>
  
  <script>
    // \u5168\u5C40\u72C0\u614B
    let currentPath = '';
    let allFiles = [];
    let filteredFiles = [];
    let selectedItems = new Set();
    let isSelectMode = false;
    let uploadProgress = null;
    
    // \u521D\u59CB\u5316
    document.addEventListener('DOMContentLoaded', () => {
      initDropzone();
      loadFiles();
      updateStorageInfo();
    });
    
    // \u521D\u59CB\u5316\u62D6\u653E\u4E0A\u50B3
    function initDropzone() {
      const dropzone = document.getElementById('dropzone');
      const fileInput = document.getElementById('fileInput');
      
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
      });
    }
    
    // \u8655\u7406\u6587\u4EF6\u9078\u64C7
    function handleFileSelect(e) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
    
    // \u8655\u7406\u6587\u4EF6\u4E0A\u50B3
    async function handleFiles(files) {
      if (!files || files.length === 0) return;
      
      uploadProgress = showUploadProgress(Array.from(files));
      
      for (const file of files) {
        await uploadFile(file, uploadProgress);
      }
      
      uploadProgress.complete();
      loadFiles();
      updateStorageInfo();
    }
    
    // \u4E0A\u50B3\u55AE\u500B\u6587\u4EF6
    async function uploadFile(file, progress) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = currentPath + safeName;
      
      try {
        progress.updateStatus(safeName, '\u4E0A\u50B3\u4E2D...');
        
        const res = await fetch('/api/upload?path=' + encodeURIComponent(path), {
          method: 'POST',
          body: file
        });
        
        if (res.ok) {
          progress.updateStatus(safeName, '\u2713 \u5B8C\u6210', 'done');
        } else if (res.status === 401) {
          showToast('\u767B\u5165\u5DF2\u904E\u671F\uFF0C\u8ACB\u91CD\u65B0\u767B\u5165', 'error');
          location.reload();
        } else {
          progress.updateStatus(safeName, '\u2717 \u5931\u6557', 'error');
        }
      } catch (err) {
        progress.updateStatus(safeName, '\u2717 \u932F\u8AA4', 'error');
      }
    }
    
    // \u8F09\u5165\u6587\u4EF6\u5217\u8868
    async function loadFiles() {
      try {
        const res = await fetch('/api/list?path=' + encodeURIComponent(currentPath));
        if (res.status === 401) {
          location.reload();
          return;
        }
        
        const data = await res.json();
        allFiles = data.files || [];
        filteredFiles = [...allFiles];
        
        renderFiles();
      } catch (err) {
        showToast('\u8F09\u5165\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66', 'error');
      }
    }
    
    // \u6E32\u67D3\u6587\u4EF6\u5217\u8868
    function renderFiles() {
      const container = document.getElementById('fileListContainer');
      const searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();
      const sortBy = document.getElementById('sortSelect').value;
      
      // \u904E\u6FFE
      if (searchQuery) {
        filteredFiles = allFiles.filter(f => 
          f.name.toLowerCase().includes(searchQuery)
        );
      } else {
        filteredFiles = [...allFiles];
      }
      
      // \u6392\u5E8F
      filteredFiles.sort((a, b) => {
        // \u6587\u4EF6\u593E\u512A\u5148
        if (a.isFolder !== b.isFolder) {
          return a.isFolder ? -1 : 1;
        }
        
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name, 'zh-Hant');
          case 'size':
            return (b.size || 0) - (a.size || 0);
          case 'date':
            return new Date(b.uploaded || 0) - new Date(a.uploaded || 0);
          case 'type':
            const typeA = a.isFolder ? 'folder' : (a.name.split('.').pop() || 'file');
            const typeB = b.isFolder ? 'folder' : (b.name.split('.').pop() || 'file');
            return typeA.localeCompare(typeB, 'zh-Hant');
          default:
            return 0;
        }
      });
      
      // \u6E32\u67D3
      if (filteredFiles.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <div class="empty-icon">\${searchQuery ? '\u{1F50D}' : '\u{1F4ED}'}</div>
            <h3>\${searchQuery ? '\u627E\u4E0D\u5230\u7B26\u5408\u7684\u7D50\u679C' : '\u9019\u500B\u6587\u4EF6\u593E\u662F\u7A7A\u7684'}</h3>
            <p>\${searchQuery ? '\u8ACB\u5617\u8A66\u5176\u4ED6\u95DC\u9375\u5B57' : '\u4E0A\u50B3\u4E00\u4E9B\u6A94\u6848\u6216\u5275\u5EFA\u6587\u4EF6\u593E\u5427'}</p>
          </div>
        \`;
        return;
      }
      
      let html = \`
        <div class="file-list-header">
          <div class="col-check"></div>
          <div class="col-name">\u540D\u7A31</div>
          <div class="col-size">\u5927\u5C0F</div>
          <div class="col-date">\u4FEE\u6539\u6642\u9593</div>
          <div class="col-actions">\u64CD\u4F5C</div>
        </div>
        <div class="file-list-body">
      \`;
      
      for (const file of filteredFiles) {
        const isFolder = file.isFolder;
        const icon = getFileIcon(file.name, isFolder);
        const typeLabel = isFolder ? '\u6587\u4EF6\u593E' : (file.name.split('.').pop() || '\u6A94\u6848').toUpperCase();
        const sizeStr = isFolder ? '-' : formatSize(file.size);
        const dateStr = file.uploaded ? formatDate(file.uploaded) : '-';
        const selectedClass = selectedItems.has(file.path) ? 'selected' : '';
        const selectingClass = isSelectMode ? 'selecting' : '';
        
        html += \`
          <div class="file-item \${isFolder ? 'is-folder' : ''} \${selectedClass} \${selectingClass}" 
               data-path="\${file.path}" data-name="\${file.name}" data-folder="\${isFolder}"
               onclick="handleItemClick(event, '\${encodeURIComponent(file.path)}', '\${isFolder}')">
            <div class="col-check">
              <input type="checkbox" \${selectedItems.has(file.path) ? 'checked' : ''} 
                     onclick="event.stopPropagation(); toggleSelect('\${encodeURIComponent(file.path)}')">
            </div>
            <div class="col-name">
              <div class="file-icon">\${icon}</div>
              <div class="file-name">
                <span class="file-name-text" title="\${file.name}">\${file.name}</span>
                <span class="file-type">\${typeLabel}</span>
              </div>
            </div>
            <div class="col-size">\${sizeStr}</div>
            <div class="col-date">\${dateStr}</div>
            <div class="col-actions">
              \${isFolder ? \`
                <button class="btn btn-icon" onclick="event.stopPropagation(); enterFolder('\${encodeURIComponent(file.path)}')" title="\u9032\u5165">\u{1F4C2} \u9032\u5165</button>
              \` : \`
                <button class="btn btn-icon" onclick="event.stopPropagation(); previewItem('\${encodeURIComponent(file.path)}', '\${encodeURIComponent(file.name)}', '\${file.type}')" title="\u9810\u89BD">\u{1F441}\uFE0F</button>
                <a href="/api/download?path=\${encodeURIComponent(file.path)}" class="btn btn-icon" title="\u4E0B\u8F09" onclick="event.stopPropagation()">\u2B07\uFE0F</a>
              \`}
              <button class="btn btn-icon" onclick="event.stopPropagation(); renameItem('\${encodeURIComponent(file.path)}', '\${encodeURIComponent(file.name)}')" title="\u91CD\u547D\u540D">\u270F\uFE0F</button>
              <button class="btn btn-icon" onclick="event.stopPropagation(); deleteItem('\${encodeURIComponent(file.path)}', '\${encodeURIComponent(file.name)}')" title="\u522A\u9664">\u{1F5D1}\uFE0F</button>
            </div>
          </div>
        \`;
      }
      
      html += '</div>';
      container.innerHTML = html;
      
      updateBreadcrumb();
    }
    
    // \u8655\u7406\u9805\u76EE\u9EDE\u64CA
    function handleItemClick(event, path, isFolder) {
      if (isSelectMode) {
        toggleSelect(path);
        return;
      }
      
      if (isFolder === 'true') {
        enterFolder(path);
      } else {
        const name = decodeURIComponent(path).split('/').pop();
        const type = getFileType(name);
        previewItem(path, encodeURIComponent(name), type);
      }
    }
    
    // \u9032\u5165\u6587\u4EF6\u593E
    function enterFolder(path) {
      currentPath = decodeURIComponent(path);
      selectedItems.clear();
      isSelectMode = false;
      updateSelectModeUI();
      loadFiles();
    }
    
    // \u9810\u89BD\u9805\u76EE
    function previewItem(path, name, type) {
      const file = {
        path: decodeURIComponent(path),
        name: decodeURIComponent(name),
        type: type
      };
      previewFile(file);
    }
    
    // \u91CD\u547D\u540D
    async function renameItem(path, name) {
      const currentPath = decodeURIComponent(path);
      const currentName = decodeURIComponent(name);
      
      const newName = await showRenameDialog(currentName);
      if (!newName || newName === currentName) return;
      
      try {
        const res = await fetch('/api/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPath: currentPath, newName })
        });
        
        if (res.ok) {
          showToast('\u5DF2\u91CD\u547D\u540D', 'success');
          loadFiles();
          updateStorageInfo();
        } else if (res.status === 401) {
          location.reload();
        } else {
          showToast('\u91CD\u547D\u540D\u5931\u6557', 'error');
        }
      } catch (err) {
        showToast('\u64CD\u4F5C\u5931\u6557', 'error');
      }
    }
    
    // \u522A\u9664
    async function deleteItem(path, name) {
      const itemPath = decodeURIComponent(path);
      const itemName = decodeURIComponent(name);
      
      const confirmed = await confirmDialog('\u78BA\u5B9A\u8981\u522A\u9664\u300C' + itemName + '\u300D\u55CE\uFF1F\\n\u6B64\u64CD\u4F5C\u7121\u6CD5\u64A4\u92B7\u3002');
      if (!confirmed) return;
      
      try {
        const res = await fetch('/api/delete?path=' + encodeURIComponent(itemPath), {
          method: 'DELETE'
        });
        
        if (res.ok) {
          showToast('\u5DF2\u522A\u9664', 'success');
          selectedItems.delete(itemPath);
          updateSelectionUI();
          loadFiles();
          updateStorageInfo();
        } else if (res.status === 401) {
          location.reload();
        } else {
          showToast('\u522A\u9664\u5931\u6557', 'error');
        }
      } catch (err) {
        showToast('\u64CD\u4F5C\u5931\u6557', 'error');
      }
    }
    
    // \u5275\u5EFA\u6587\u4EF6\u593E
    async function createFolder() {
      const folderName = await showCreateFolderDialog();
      if (!folderName) return;
      
      const path = currentPath + folderName + '/';
      
      try {
        const res = await fetch('/api/createFolder?path=' + encodeURIComponent(path), {
          method: 'POST'
        });
        
        if (res.ok) {
          showToast('\u6587\u4EF6\u593E\u5DF2\u5275\u5EFA', 'success');
          loadFiles();
        } else if (res.status === 401) {
          location.reload();
        } else {
          showToast('\u5275\u5EFA\u5931\u6557', 'error');
        }
      } catch (err) {
        showToast('\u64CD\u4F5C\u5931\u6557', 'error');
      }
    }
    
    // \u5207\u63DB\u9078\u64C7\u6A21\u5F0F
    function toggleSelectMode() {
      isSelectMode = !isSelectMode;
      if (!isSelectMode) {
        selectedItems.clear();
      }
      updateSelectModeUI();
      renderFiles();
    }
    
    function updateSelectModeUI() {
      const btn = document.getElementById('selectModeBtn');
      btn.innerHTML = isSelectMode ? '\u2715 \u53D6\u6D88' : '\u2611\uFE0F \u9078\u64C7';
      btn.classList.toggle('btn-primary', isSelectMode);
      btn.classList.toggle('btn-secondary', !isSelectMode);
    }
    
    // \u5207\u63DB\u9078\u64C7
    function toggleSelect(path) {
      if (selectedItems.has(path)) {
        selectedItems.delete(path);
      } else {
        selectedItems.add(path);
      }
      updateSelectionUI();
      renderFiles();
    }
    
    function updateSelectionUI() {
      const bar = document.getElementById('selectionBar');
      const count = document.getElementById('selectedCount');
      count.textContent = selectedItems.size;
      bar.classList.toggle('show', selectedItems.size > 0);
    }
    
    function clearSelection() {
      selectedItems.clear();
      isSelectMode = false;
      updateSelectModeUI();
      updateSelectionUI();
      renderFiles();
    }
    
    // \u6279\u91CF\u4E0B\u8F09
    async function downloadSelected() {
      if (selectedItems.size === 0) return;
      
      showToast('\u6E96\u5099\u4E0B\u8F09...', 'info');
      
      for (const path of selectedItems) {
        const link = document.createElement('a');
        link.href = '/api/download?path=' + encodeURIComponent(path);
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(r => setTimeout(r, 300));
      }
      
      showToast('\u4E0B\u8F09\u5DF2\u958B\u59CB', 'success');
    }
    
    // \u6279\u91CF\u522A\u9664
    async function deleteSelected() {
      if (selectedItems.size === 0) return;
      
      const confirmed = await confirmDialog('\u78BA\u5B9A\u8981\u522A\u9664\u9078\u4E2D\u7684 ' + selectedItems.size + ' \u500B\u9805\u76EE\u55CE\uFF1F\\n\u6B64\u64CD\u4F5C\u7121\u6CD5\u64A4\u92B7\u3002');
      if (!confirmed) return;
      
      let success = 0;
      let failed = 0;
      
      for (const path of selectedItems) {
        try {
          const res = await fetch('/api/delete?path=' + encodeURIComponent(path), {
            method: 'DELETE'
          });
          if (res.ok) success++;
          else failed++;
        } catch {
          failed++;
        }
      }
      
      selectedItems.clear();
      updateSelectionUI();
      loadFiles();
      updateStorageInfo();
      
      if (failed === 0) {
        showToast('\u5DF2\u522A\u9664 ' + success + ' \u500B\u9805\u76EE', 'success');
      } else {
        showToast('\u522A\u9664\u5B8C\u6210\uFF1A' + success + ' \u6210\u529F\uFF0C' + failed + ' \u5931\u6557', 'warning');
      }
    }
    
    // \u641C\u7D22
    function handleSearch() {
      renderFiles();
    }
    
    // \u6392\u5E8F
    function handleSort() {
      renderFiles();
    }
    
    // \u66F4\u65B0\u9EB5\u5305\u5C51
    function updateBreadcrumb() {
      const container = document.getElementById('breadcrumb');
      const parts = currentPath.split('/').filter(Boolean);
      
      let html = '<span class="breadcrumb-item' + (currentPath === '' ? ' active' : '') + '" onclick="navigateTo(\\'\\')">\u{1F3E0} \u96F2\u76E4</span>';
      
      let path = '';
      for (let i = 0; i < parts.length; i++) {
        path += parts[i] + '/';
        const isLast = i === parts.length - 1;
        html += '<span class="breadcrumb-sep">\u203A</span>';
        html += '<span class="breadcrumb-item' + (isLast ? ' active' : '') + '" onclick="' + (isLast ? '' : "navigateTo('" + path + "')") + '">' + parts[i] + '</span>';
      }
      
      container.innerHTML = html;
    }
    
    // \u5C0E\u822A\u5230\u8DEF\u5F91
    function navigateTo(path) {
      currentPath = path;
      selectedItems.clear();
      isSelectMode = false;
      updateSelectModeUI();
      loadFiles();
    }
    
    // \u66F4\u65B0\u5B58\u5132\u4FE1\u606F
    async function updateStorageInfo() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const stats = await res.json();
          document.getElementById('storageInfo').textContent = stats.fileCount + ' \u500B\u6A94\u6848 \xB7 ' + formatSize(stats.totalSize);
        }
      } catch (err) {}
    }
    
    // \u767B\u51FA
    async function logout() {
      const confirmed = await confirmDialog('\u78BA\u5B9A\u8981\u767B\u51FA\u55CE\uFF1F');
      if (!confirmed) return;
      
      document.cookie = '${COOKIE_NAME}=; Path=/; Max-Age=0';
      location.reload();
    }
  <\/script>
</body>
</html>
`;
var PrivateCloudDrive_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/api/login" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (body.username === USERNAME && body.password === PASSWORD) {
        const token = await createAuthToken(USERNAME, PASSWORD);
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": buildAuthCookie(token)
          }
        });
      }
      return new Response(JSON.stringify({ error: "\u5E33\u865F\u6216\u5BC6\u78BC\u932F\u8AA4" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (path === "/api/theme" && request.method === "POST") {
      const theme = url.searchParams.get("theme");
      if (theme) {
        return new Response("OK");
      }
      return new Response("Bad Request", { status: 400 });
    }
    const loggedIn = await isLoggedIn(request);
    if (path === "/" && request.method === "GET" && !loggedIn) {
      return new Response(LOGIN_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    if (path === "/" && request.method === "GET" && loggedIn) {
      return new Response(MAIN_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    if (!loggedIn && path.startsWith("/api/")) {
      return unauthorizedResponse();
    }
    if (path === "/api/list" && request.method === "GET") {
      const currentPath = url.searchParams.get("path") || "";
      const bucket = env.MY_DISK;
      const objects = await bucket.list();
      const files = parseFileList(objects.objects, currentPath);
      return new Response(JSON.stringify({ files }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (path === "/api/upload" && request.method === "POST") {
      const filePath = url.searchParams.get("path");
      if (!filePath) {
        return new Response(JSON.stringify({ error: "\u7F3A\u5C11\u8DEF\u5F91\u53C3\u6578" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const bucket = env.MY_DISK;
      const contentType = request.headers.get("Content-Type") || "application/octet-stream";
      const metadata = {
        uploaded: (/* @__PURE__ */ new Date()).toISOString(),
        contentType,
        originalName: filePath.split("/").pop()
      };
      await bucket.put(filePath, request.body, {
        httpMetadata: {
          contentType
        }
      });
      await setFileMetadata(env, filePath, metadata);
      return new Response("OK");
    }
    if (path === "/api/download" && request.method === "GET") {
      const filePath = url.searchParams.get("path");
      if (!filePath) {
        return new Response("\u7F3A\u5C11\u8DEF\u5F91\u53C3\u6578", { status: 400 });
      }
      const bucket = env.MY_DISK;
      const object = await bucket.get(filePath);
      if (!object) {
        return new Response("\u6A94\u6848\u4E0D\u5B58\u5728", { status: 404 });
      }
      const fileName = filePath.split("/").pop();
      const metadata = await getFileMetadata(env, filePath);
      const contentType = metadata.contentType || "application/octet-stream";
      return new Response(object.body, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
          "Content-Length": object.httpMetadata?.contentLength || object.size || ""
        }
      });
    }
    if (path === "/api/preview" && request.method === "GET") {
      const filePath = url.searchParams.get("path");
      if (!filePath) {
        return new Response("\u7F3A\u5C11\u8DEF\u5F91\u53C3\u6578", { status: 400 });
      }
      const bucket = env.MY_DISK;
      const object = await bucket.get(filePath);
      if (!object) {
        return new Response("\u6A94\u6848\u4E0D\u5B58\u5728", { status: 404 });
      }
      const metadata = await getFileMetadata(env, filePath);
      const contentType = metadata.contentType || "application/octet-stream";
      return new Response(object.body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
    if (path === "/api/delete" && request.method === "DELETE") {
      const filePath = url.searchParams.get("path");
      if (!filePath) {
        return new Response(JSON.stringify({ error: "\u7F3A\u5C11\u8DEF\u5F91\u53C3\u6578" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const bucket = env.MY_DISK;
      if (filePath.endsWith("/")) {
        const objects = await bucket.list({ prefix: filePath });
        for (const obj of objects.objects) {
          await bucket.delete(obj.key);
          await env.DISK_META.delete(obj.key);
        }
      } else {
        await bucket.delete(filePath);
        await env.DISK_META.delete(filePath);
      }
      return new Response("OK");
    }
    if (path === "/api/rename" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const { oldPath, newName } = body;
      if (!oldPath || !newName) {
        return new Response(JSON.stringify({ error: "\u7F3A\u5C11\u53C3\u6578" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const bucket = env.MY_DISK;
      const oldObject = await bucket.get(oldPath);
      if (!oldObject) {
        return new Response(JSON.stringify({ error: "\u539F\u59CB\u6A94\u6848\u4E0D\u5B58\u5728" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      const pathParts = oldPath.split("/");
      pathParts.pop();
      const newPath = pathParts.join("/") + "/" + newName;
      if (oldPath.endsWith("/")) {
        const objects = await bucket.list({ prefix: oldPath });
        for (const obj of objects.objects) {
          const relativePath = obj.key.substring(oldPath.length);
          const objData = await bucket.get(obj.key);
          const newKey = newPath + relativePath;
          await bucket.put(newKey, objData.body, {
            httpMetadata: obj.httpMetadata
          });
          await bucket.delete(obj.key);
        }
        await bucket.delete(oldPath);
      } else {
        await bucket.put(newPath, oldObject.body, {
          httpMetadata: oldObject.httpMetadata
        });
        await bucket.delete(oldPath);
        const metadata = await getFileMetadata(env, oldPath);
        await setFileMetadata(env, newPath, metadata);
        await env.DISK_META.delete(oldPath);
      }
      return new Response("OK");
    }
    if (path === "/api/createFolder" && request.method === "POST") {
      const folderPath = url.searchParams.get("path");
      if (!folderPath) {
        return new Response(JSON.stringify({ error: "\u7F3A\u5C11\u8DEF\u5F91\u53C3\u6578" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const bucket = env.MY_DISK;
      await bucket.put(folderPath, "");
      await setFileMetadata(env, folderPath, {
        isFolder: true,
        created: (/* @__PURE__ */ new Date()).toISOString()
      });
      return new Response("OK");
    }
    if (path === "/api/stats" && request.method === "GET") {
      const bucket = env.MY_DISK;
      const objects = await bucket.list();
      let totalSize = 0;
      let fileCount = 0;
      for (const obj of objects.objects) {
        if (!obj.key.endsWith("/")) {
          totalSize += obj.size || 0;
          fileCount++;
        }
      }
      return new Response(JSON.stringify({ totalSize, fileCount }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (path === "/api/move" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "\u8ACB\u6C42\u683C\u5F0F\u932F\u8AA4" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const { sourcePath, targetPath } = body;
      if (!sourcePath || targetPath === void 0) {
        return new Response(JSON.stringify({ error: "\u7F3A\u5C11\u53C3\u6578" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const bucket = env.MY_DISK;
      const object = await bucket.get(sourcePath);
      if (!object) {
        return new Response(JSON.stringify({ error: "\u539F\u59CB\u6A94\u6848\u4E0D\u5B58\u5728" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      const fileName = sourcePath.split("/").pop();
      const newPath = targetPath + (targetPath.endsWith("/") ? "" : "/") + fileName;
      await bucket.put(newPath, object.body, {
        httpMetadata: object.httpMetadata
      });
      await bucket.delete(sourcePath);
      const metadata = await getFileMetadata(env, sourcePath);
      await setFileMetadata(env, newPath, metadata);
      await env.DISK_META.delete(sourcePath);
      return new Response("OK");
    }
    return new Response("Not Found", { status: 404 });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-gIzKnB/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = PrivateCloudDrive_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-gIzKnB/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
