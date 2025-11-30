// script.js
const API_STATUS = "/api/status";
const API_PICK = "/api/pick";

const gridEl = document.getElementById("grid");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const toast = document.getElementById("toast");

let state = null; // latest status from server
let myPick = null; // index picked by this IP (if any)
let names = [];

// load and render
async function loadStatus(){
  try{
    const res = await fetch(API_STATUS, {cache: "no-store"});
    if(!res.ok) throw new Error("status error");
    const data = await res.json();
    state = data;
    names = (data.numbers || []).map(n=>n.name);
    myPick = data.my_pick;
    renderGrid();
  }catch(err){
    console.error("Failed to load status", err);
    modalShow("Error", "Could not load status from server. Refresh to try again.");
  }
}

function renderGrid(){
  gridEl.innerHTML = "";
  const numbers = state.numbers;
  numbers.forEach((n, idx)=>{
    const card = document.createElement("div");
    card.className = "card";
    // style classes: taken (someone picked), mine (this IP picked), available
    if(n.picked){
      card.classList.add("taken");
      if(n.picked_by_me) card.classList.add("mine");
    } else {
      card.classList.add("available");
    }

    // number or placeholder
    const num = document.createElement("div");
    num.className = "num";
    num.textContent = idx+1;
    card.appendChild(num);

    // label (show 'chosen' or 'tap to choose')
    const label = document.createElement("div");
    label.className = "label";
    if(n.picked){
      if(n.picked_by_me){
        label.textContent = "Your pick — tap to view";
      } else {
        label.textContent = "Taken";
      }
    } else {
      label.textContent = "Tap to choose";
    }
    card.appendChild(label);

    card.addEventListener("click", ()=>onCardClick(idx, n));
    gridEl.appendChild(card);
  });
}

async function onCardClick(idx, info){
  // If number already picked by someone else -> cheater popup
  if(info.picked && !info.picked_by_me){
    showCheaterPopup();
    return;
  }

  // If it's your picked number -> show popup with the name
  if(info.picked && info.picked_by_me){
    modalShow("This is the person you chose", `<div style="padding:8px;border-radius:8px;background:linear-gradient(180deg,#062c18,#0a4224);font-weight:800;color:#cfffdd;text-align:center">${escapeHtml(info.name)}</div>`);
    return;
  }

  // else number is available and you haven't picked yet (or picking same number again)
  if(myPick !== null && myPick !== undefined){
    // you already picked a different number -> cheater popup
    showCheaterPopup();
    return;
  }

  // Proceed to claim: call API
  try{
    const res = await fetch(API_PICK, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({index: idx})
    });
    if(res.status === 200){
      const json = await res.json();
      myPick = idx;
      // refresh state
      await loadStatus();
      // show popup with chosen name
      modalShow("This is the person you chose", `<div style="padding:8px;border-radius:8px;background:linear-gradient(180deg,#062c18,#0a4224);font-weight:800;color:#cfffdd;text-align:center">${escapeHtml(json.name)}</div>`);
      return;
    } else if(res.status === 403){
      const json = await res.json();
      // user already has a pick
      myPick = json.your_pick;
      await loadStatus();
      showToast("You already have a picked number.");
      return;
    } else if(res.status === 409){
      showCheaterPopup();
      await loadStatus();
      return;
    } else {
      const txt = await res.text();
      modalShow("Error", "Server error: " + txt);
    }
  }catch(err){
    modalShow("Error", "Network error while picking. Try again.");
    console.error(err);
  }
}

function modalShow(title, html){
  modalBody.innerHTML = `<strong style="display:block;margin-bottom:8px">${escapeHtml(title)}</strong>` + html;
  modal.style.display = "flex";
}

modalClose.addEventListener("click", ()=>{ modal.style.display = "none"; });
modal.addEventListener("click", (e)=>{ if(e.target === modal) modal.style.display = "none"; });

function showToast(text){
  toast.textContent = text;
  toast.style.display = "block";
  setTimeout(()=>{ toast.style.display = "none"; }, 2000);
}

function showCheaterPopup(){
  const popup = document.getElementById("cheaterPopup");
  popup.style.display = "flex";
}

document.getElementById("cheaterOkBtn").addEventListener("click", ()=>{
  document.getElementById("cheaterPopup").style.display = "none";
});

function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// init
loadStatus();
// refresh periodically so new picks by others appear quickly:
setInterval(loadStatus, 3000);