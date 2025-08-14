// header.js
/* ========= User state ========= */
function checkUserStatus() {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  const loginLink = document.getElementById("loginLink");
  const userDropdown = document.getElementById("userDropdown");
  const userGreeting = document.getElementById("userGreeting");

  if (token && username) {
    if (userGreeting) userGreeting.innerText = `Hi, ${username}!`;
    if (loginLink) loginLink.style.display = "none";
    if (userDropdown) userDropdown.style.display = "inline-block";
  } else {
    if (loginLink) loginLink.style.display = "inline-block";
    if (userDropdown) userDropdown.style.display = "none";
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.reload();
}

/* ========= Search + history (dropdown) ========= */
const KEY = "searchHistory";

// 주입된 #header 내부에서 요소를 매번 재조회 (초기엔 없음 → 나중엔 생김)
function getEls(){
  const root = document.getElementById("header") || document;
  return {
    inputEl:  root.querySelector("#movieTitle"),
    dd:       root.querySelector("#searchDropdown"),
    listEl:   root.querySelector("#historyList"),
    clearBtn: root.querySelector("#clearHistoryBtn"),
    goBtn:    root.querySelector(".go"),
  };
}

function getHistory(){ return JSON.parse(localStorage.getItem(KEY) || "[]"); }
function setHistory(arr){ localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 8))); }
function addHistory(term){
  if(!term) return;
  const h = getHistory().filter(t => t !== term);
  h.unshift(term);
  setHistory(h);
}

function renderDropdown(){
  const { listEl } = getEls();
  if (!listEl) return; // 아직 헤더 미주입
  const items = getHistory();
  listEl.innerHTML = "";
  if(items.length === 0){
    listEl.innerHTML = `<li class="suggest-item" style="color:#888; cursor:default;">
      <i class="fa-regular fa-clock"></i> No recent searches
    </li>`;
    return;
  }
  items.forEach((t)=>{
    const li = document.createElement("li");
    li.className = "suggest-item";
    li.innerHTML = `<i class="fa-regular fa-clock"></i><span>${t}</span>`;
    li.onclick = ()=>{ 
      const { inputEl } = getEls();
      if (inputEl) inputEl.value = t; 
      searchMovie(); 
      hideDropdown(); 
    };
    listEl.appendChild(li);
  });
}

function showDropdown(){ renderDropdown(); const { dd } = getEls(); if (dd) dd.hidden = false; }
function hideDropdown(){ const { dd } = getEls(); if (dd) dd.hidden = true; }

/* keyboard navigation */
let activeIdx = -1;
function resetActive(){ activeIdx = -1; }

// 실제 검색 함수 (전역 노출)
function searchMovie() {
  const { inputEl } = getEls();
  const movieTitle = inputEl?.value.trim();
  if (!movieTitle) return alert("Please enter a movie title");

  addHistory(movieTitle);
  hideDropdown();

  fetch(`/api/search?query=${encodeURIComponent(movieTitle)}`)
    .then(res => res.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        const movieId = data.results[0].id;
        localStorage.setItem("selectedMovieId", movieId);
        window.location.href = `/movie.html?id=${movieId}`;
      } else {
        alert("No results found.");
      }
    })
    .catch(err => console.error("Search error:", err));
}
window.searchMovie = searchMovie; // 인라인 onclick 호환

// 헤더가 붙은 뒤에만 이벤트 바인딩
let wired = false;
function wireHeaderSearch(){
  if (wired) return;
  const { inputEl, clearBtn, goBtn, listEl } = getEls();
  if (!inputEl) return; // 아직 헤더 미주입이면 다음 기회에

  inputEl.addEventListener("focus", showDropdown);
  inputEl.addEventListener("input", showDropdown);
  inputEl.addEventListener("blur", () => setTimeout(hideDropdown, 120));
  inputEl.addEventListener("keydown",(e)=>{
    if (e.key === "Enter"){ e.preventDefault(); searchMovie(); return; }
    // 아래는 히스토리 항목 있을 때만 작동
    const { listEl } = getEls();
    if (!listEl) return;
    const items = [...listEl.querySelectorAll(".suggest-item")].filter(li => !li.style.cursor);
    if(!items.length) return;
    if(e.key === "ArrowDown"){ e.preventDefault(); activeIdx = (activeIdx+1)%items.length; }
    if(e.key === "ArrowUp"){ e.preventDefault(); activeIdx = (activeIdx-1+items.length)%items.length; }
    if(e.key === "Enter" && activeIdx>=0){ e.preventDefault(); items[activeIdx].click(); }
    items.forEach((li,i)=> li.classList.toggle("active", i===activeIdx));
  });
  if (goBtn) goBtn.addEventListener("click", () => searchMovie());
  if (clearBtn) clearBtn.addEventListener("click", ()=>{ setHistory([]); renderDropdown(); resetActive(); });

  wired = true;
}
window.wireHeaderSearch = wireHeaderSearch;

// DOM 준비되면 1차 시도 (정적 헤더 페이지용)
document.addEventListener("DOMContentLoaded", wireHeaderSearch);

// #header에 나중에 내용 들어오는 페이지(home.html 등) 감시
const headerRoot = document.getElementById("header");
if (headerRoot) {
  const mo = new MutationObserver(() => wireHeaderSearch());
  mo.observe(headerRoot, { childList: true, subtree: true });
}


/* ========= init ========= */
window.addEventListener("load", () => {
  checkUserStatus();
});
