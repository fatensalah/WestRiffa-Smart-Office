
function renderDashboard(){
  const a=wrGetRecords();
  $("statAll").textContent=a.length;
  $("statActivities").textContent=a.filter(x=>x.type==="activity").length;
  $("statMeetings").textContent=a.filter(x=>["meeting","invitation","attendance","recommendation"].includes(x.type)).length;
  $("statCertificates").textContent=a.filter(x=>x.type==="certificate").length;
  const box=$("recentList");
  box.innerHTML=a.length?"":'<div class="empty">لا توجد عمليات محفوظة بعد.</div>';
  a.slice(0,6).forEach(r=>{
    const row=document.createElement("div");row.className="recent-row";
    row.innerHTML=`<div><strong>${r.title}</strong>
    <div style="color:#6b7a72;font-size:13px;margin-top:4px">${new Date(r.createdAt).toLocaleString("ar-BH")}</div></div>
    <span class="tag">${wrTypeLabel(r.type)}</span>`;
    box.appendChild(row);
  });
}
window.addEventListener("wr-records-changed",renderDashboard);
document.addEventListener("DOMContentLoaded",renderDashboard);