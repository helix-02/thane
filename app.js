// ========== Helper Functions ==========

// Simulate persistent storage using LocalStorage; fallback to in-memory if unavailable.
// In production, you'd connect these to backend APIs!
function getApps(){
  try{
    return JSON.parse(localStorage.getItem('thanePoliceApps')||'[]');
  } catch(e) { return []; }
}
function setApps(arr){
  try{
    localStorage.setItem('thanePoliceApps', JSON.stringify(arr));
  } catch(e){ }
}

// Generate a Tracking ID e.g. "TP-483026"
function generateTrackingID(){
  const num = Math.floor(100000 + Math.random()*900000);
  return "TP-" + num;
}

// Status stages (edit as needed)
const stages = [
  { code: "police", label: "At Police Station", officer: "SI Jadhav" },
  { code: "spoffice", label: "Forwarded to SP Office", officer: "SP Kale" },
  { code: "approved", label: "Approved at SP Office", officer: "ADM Patil" },
  { code: "dispatched", label: "Document Dispatched", officer: "Courier" },
  { code: "delivered", label: "Document Delivered", officer: "Recipient" },
  { code: "rejected", label: "Rejected", officer: "SP Office" }
];

// ========== Tab Controls ==========
const tabApply = document.getElementById("tab-apply");
const tabTrack = document.getElementById("tab-track");
const applySection = document.getElementById("apply-section");
const trackSection = document.getElementById("track-section");
tabApply.onclick = () => {
  tabApply.classList.add("active"); tabTrack.classList.remove("active");
  applySection.style.display = ""; trackSection.style.display = "none";
};
tabTrack.onclick = () => {
  tabTrack.classList.add("active"); tabApply.classList.remove("active");
  applySection.style.display = "none"; trackSection.style.display = "";
};

// ========== Application Form ==========
document.getElementById("applyForm").onsubmit = function(e){
  e.preventDefault();
  const data = Object.fromEntries(new FormData(this).entries());
  // Validate mobile (10 digit)
  if(!/^\d{10}$/.test(data.mobile)){
    alert("Please enter a valid 10-digit mobile number.");
    return;
  }
  // Create new application object
  const app = {
    id: generateTrackingID(),
    name: data.name,
    mobile: data.mobile,
    email: data.email,
    doctype: data.doctype,
    desc: data.desc,
    status: "police",
    statusHist: [ { code: "police", at: Date.now(), officer: stages[0].officer } ],
    created: Date.now()
  };
  // Store in local app list
  const apps = getApps();
  apps.push(app); setApps(apps);

  // Show mock SMS
  showSms(`Dear ${app.name}, Your application was received by Thane Police. Use Tracking ID <b>${app.id}</b> to monitor progress.`);

  // Optionally auto-advance status for demo (simulate progress)
  setTimeout(()=>simulateStatusAdvance(app.id,0), 8000);

  // Reset form
  this.reset();
  alert(`Application submitted! Your Tracking ID is: ${app.id} (also sent via SMS)`);
};

// ========== Mock SMS Modal ==========
function showSms(msg){
  document.getElementById("smsContent").innerHTML = msg;
  document.getElementById("smsModal").style.display = "flex";
}
document.getElementById("smsClose").onclick = ()=>{ document.getElementById("smsModal").style.display = "none"; };

// ========== Track Application ==========
document.getElementById("trackForm").onsubmit = function(e){
  e.preventDefault();
  const tid = this.trackid.value.trim().toUpperCase();
  const apps = getApps();
  const found = apps.find(app=>app.id===tid);
  const out = document.getElementById("trackResult");
  if(!found){
    out.innerHTML = `<div class="error">Invalid Tracking ID.</div>`;
    return;
  }
  renderTimeline(found, out);
};

// ========== Timeline Renderer ==========
function renderTimeline(app, outDiv){
  // Find stage index (active status)
  let curIdx = stages.findIndex(s=>s.code===app.status);
  // If rejected, last stage is rejection
  let hist = app.statusHist;

  // Timeline HTML construction
  let html = `
    <div><b>Applicant:</b> ${app.name} <br>
    <b>Mobile:</b> ${app.mobile} <br>
    <b>Email:</b> ${app.email}</div>
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.min((curIdx+1)*20,100)}%"></div></div>
    <div class="timeline">
  `;
  // Render each stage as node (yellow if complete)
  const timelineStages = ['police','spoffice','approved','dispatched','delivered','rejected'];
  for(let i=0;i<timelineStages.length;i++){
    const st = stages.find(s=>s.code===timelineStages[i]);
    if(st){
      let histItem = hist.find(h => h.code===st.code);
      let isActive = app.status===st.code;
      html += `
        <div class="timeline-step${histItem||isActive?' active':''}">
          <span class="timeline-dot"></span>
          <div class="timeline-content">
            <span class="timeline-title">${st.label}</span>
            ${histItem ? `<span class="timeline-date">${dateFmt(histItem.at)}` +
              (histItem.officer?` – <b>${histItem.officer}</b>`:'') + '</span>' : ''}
            ${st.code==='rejected' && app.rejectionReason ? `<div class="error">Reason: ${app.rejectionReason}</div>` : ''}
          </div>
        </div>
      `;
      // Stop timeline at rejection
      if(app.status==='rejected' && st.code==='rejected') break;
    }
  }
  html += "</div>";
  outDiv.innerHTML = html;
}

// Format timestamp to readable date
function dateFmt(ts){
  const d = new Date(ts);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

// ========== Admin Modal Logic ==========
const adminBtn = document.getElementById('adminBtn');
const adminModal = document.getElementById('adminModal');
const adminClose = document.getElementById('adminClose');
adminBtn.onclick = () => { adminModal.style.display = 'flex'; showLogin(); };
adminClose.onclick = () => { adminModal.style.display = 'none'; };
window.onclick = function(e){
  if(e.target===adminModal) adminModal.style.display = 'none';
};

// Show login or dashboard
function showLogin(){
  document.getElementById('adminLogin').style.display = '';
  document.getElementById('adminPanel').style.display = 'none';
}
// Login logic
document.getElementById('adminLoginForm').onsubmit = function(e){
  e.preventDefault();
  // Hardcoded credentials for demo
  if(this.username.value==="admin" && this.password.value==="thane@123"){
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminPanel').style.display = '';
    renderAdminTable();
  } else {
    document.getElementById('adminLoginError').textContent = "Invalid credentials.";
  }
};

function renderAdminTable(filter=""){
  const arr = getApps();
  const tbody = document.querySelector('#adminTable tbody');
  tbody.innerHTML = "";
  let apps = arr;
  // Filter by name/mobile/ID
  if(filter) apps = apps.filter(app =>
    (app.name && app.name.toLowerCase().includes(filter)) ||
    (app.mobile && app.mobile.includes(filter)) ||
    (app.id && app.id.toLowerCase().includes(filter))
  );
  if(apps.length===0){
    tbody.innerHTML = "<tr><td colspan='7'><i>No applications found.</i></td></tr>";
    return;
  }
  apps.forEach(app=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${app.id}</td>
      <td>${app.name}</td>
      <td>${app.mobile}</td>
      <td>${app.email}</td>
      <td>${app.doctype}</td>
      <td>${stageLabel(app.status)}</td>
      <td><button class="cta-btn" style="padding:5px 13px;font-size:0.98em;" onclick="editAppStatus('${app.id}')">Edit</button></td>
    `;
    tbody.appendChild(tr);
  });
}
window.editAppStatus = function(id){
  const arr = getApps();
  const app = arr.find(a=>a.id===id);
  if(!app) return;
  const modal = document.getElementById('adminStatusEditModal');
  const body = document.getElementById('adminStatusModalBody');
  let html = `<div>Tracking ID: <b>${app.id}</b></div>
  <div>Current status: <b>${stageLabel(app.status)}</b></div>
  <form id="editStatusForm">`;
  html += `<label>Change status to: 
    <select name="status">
      <option value="police">At Police Station</option>
      <option value="spoffice">Forwarded to SP Office</option>
      <option value="approved">Approved by SP Office</option>
      <option value="dispatched">Dispatched</option>
      <option value="delivered">Delivered</option>
      <option value="rejected">Rejected</option>
    </select>
  </label>`;
  html += `<label>Officer Name <input type="text" name="officer" value="${lastOfficer(app)}"></label>`;
  html += `<label id="rej-reason-area" style="display:${app.status==='rejected'?'':'none'}">Reason (If Rejection)<input type="text" name="reason" value="${app.rejectionReason||''}"></label>`;
  html += `<button class="cta-btn" type="submit">Update</button></form>`;
  body.innerHTML = html;
  // Set value
  const sel = body.querySelector('select[name=status]');
  sel.value = app.status;
  sel.onchange = function(){
    // Show/hide reason
    body.querySelector('#rej-reason-area').style.display = this.value==='rejected'?'':'none';
  };
  // Form submit update
  body.querySelector('#editStatusForm').onsubmit = function(e){
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(this).entries());
    app.status = fields.status;
    if(!app.statusHist) app.statusHist=[];
    app.statusHist.push({ code:fields.status, at:Date.now(), officer:fields.officer });
    // Set rejection reason if needed
    if(fields.status==="rejected") app.rejectionReason=fields.reason||"";
    setApps(arr);
    modal.style.display = "none";
    renderAdminTable(document.getElementById('adminSearch').value.trim().toLowerCase());
  };
  // Show modal
  modal.style.display = 'flex';
  // Close logic
  document.getElementById('adminStatusModalClose').onclick = ()=>{ modal.style.display='none';};
};

function lastOfficer(app){
  return (app.statusHist&&app.statusHist.length)
    ? app.statusHist[app.statusHist.length-1].officer||""
    : "";
}
function stageLabel(code){
  const s = stages.find(t=>t.code===code);
  return s ? s.label : code;
}

// Live search filter for admin table
document.getElementById('adminSearch').oninput = function(){
  renderAdminTable(this.value.trim().toLowerCase());
};

// ========== Auto Advance Status (for demo): Simulate progress ==========
function simulateStatusAdvance(tid, step=0){
  // For demo: after applying, status auto-advances every 12s.
  let arr = getApps();
  let app = arr.find(a=>a.id===tid);
  if(!app || app.status==="rejected" || app.status==="delivered") return;
  // 5% random chance of rejection at any but last step
  if(Math.random()<0.05 && app.status!=="delivered" && app.status!=="rejected"){
    app.status = "rejected";
    if(!app.statusHist) app.statusHist=[];
    app.statusHist.push({ code: "rejected", at: Date.now(), officer: "SP Office" });
    app.rejectionReason = "Insufficient documents";
    setApps(arr);
    return;
  }
  // Move to next stage
  const idx = stages.findIndex(s=>s.code===app.status);
  if(idx >= 0 && idx < stages.length-2){
    const nxt = stages[idx+1].code;
    app.status = nxt;
    if(!app.statusHist) app.statusHist=[];
    app.statusHist.push({ code: nxt, at: Date.now(), officer: stages[idx+1].officer });
    setApps(arr);
    // Continue progression
    setTimeout(()=>simulateStatusAdvance(tid,step+1), 12000);
  }
}

// ========== On Page Load: repaint admin/data if modal was left open ==========
window.onload = function(){
  // ensure clean modals
  document.getElementById("smsModal").style.display = "none";
  document.getElementById("adminModal").style.display = "none";
};

