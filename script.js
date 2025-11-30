const names = ["Shehan","Shehani","Sonal","Shamen"];
const passcodes = ["1111","2222","3333","4444"];
let selectedIndex = null;

const modal = document.getElementById("modal");
const passInput = document.getElementById("passInput");
const confirmBtn = document.getElementById("confirmBtn");
const cheat = document.getElementById("cheat");
const boxes = [];
for(let i=0;i<4;i++){
  boxes.push(document.getElementById(`box${i}`));
}

// Click box
boxes.forEach((box, index)=>{
  box.addEventListener("click", ()=>{
    if(box.classList.contains("locked")){
      showCheater();
      return;
    }
    selectedIndex = index;
    passInput.value = "";
    modal.style.display = "flex";
    document.getElementById("modalText").textContent = `Enter passcode for number ${index+1}:`;
    passInput.focus();
  });
});

// Confirm passcode
confirmBtn.addEventListener("click", ()=>{
  if(selectedIndex===null) return;
  const entered = passInput.value;
  if(entered === passcodes[selectedIndex]){
    boxes[selectedIndex].textContent = names[selectedIndex];
    boxes[selectedIndex].classList.add("locked");
    modal.style.display = "none";
    selectedIndex = null;
  } else {
    alert("❌ Wrong passcode! Try again.");
    passInput.value = "";
    passInput.focus();
  }
});

function showCheater(){
  cheat.style.display = "block";
  setTimeout(()=>{cheat.style.display = "none";},2000);
}

// Close modal clicking outside
modal.addEventListener("click",(e)=>{
  if(e.target === modal){
    modal.style.display = "none";
  }
});