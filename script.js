const appList = document.getElementById("appList");
const searchInput = document.getElementById("searchInput");
const categoryButtons = document.getElementById("categoryButtons");
const randomBtn = document.getElementById("randomBtn");

function setupSiteInfo() {
  document.title = SITE.name;
  document.getElementById("siteLogo").textContent = SITE.name;
  document.getElementById("siteBadge").textContent = SITE.badge;
  document.getElementById("siteSlogan").textContent = SITE.slogan;
  document.getElementById("siteDescription").textContent = SITE.description;
  document.getElementById("supportLink").href = SITE.supportUrl;
  document.getElementById("footerText").textContent = `© ${SITE.year} ${SITE.name}`;
}

function renderApps(list) {
  appList.innerHTML = "";

  if (list.length === 0) {
    appList.innerHTML = `<p class="empty">該当するアプリがありません。</p>`;
    return;
  }

  list.forEach(app => {
    const card = document.createElement("article");
    card.className = "app-card";

    card.innerHTML = `
      <div class="icon">${app.icon}</div>
      <p class="date">${app.date}</p>
      <h3>${app.name}</h3>
      <p>${app.description}</p>
      <span class="tag">${app.category}</span>
      <br><br>
      <a class="btn primary" href="${app.url}">使ってみる</a>
    `;

    appList.appendChild(card);
  });
}

function renderCategories() {
  const categories = ["すべて", ...new Set(APPS.map(app => app.category))];

  categoryButtons.innerHTML = "";

  categories.forEach(category => {
    const button = document.createElement("button");
    button.textContent = category;

    button.addEventListener("click", () => {
      if (category === "すべて") {
        renderApps(APPS);
      } else {
        renderApps(APPS.filter(app => app.category === category));
      }
    });

    categoryButtons.appendChild(button);
  });
}

function searchApps() {
  const keyword = searchInput.value.toLowerCase();

  const filteredApps = APPS.filter(app =>
    app.name.toLowerCase().includes(keyword) ||
    app.description.toLowerCase().includes(keyword) ||
    app.category.toLowerCase().includes(keyword)
  );

  renderApps(filteredApps);
}

function showRandomApp() {
  const randomApp = APPS[Math.floor(Math.random() * APPS.length)];
  alert(`今日のおすすめは「${randomApp.name}」です！`);
}

setupSiteInfo();
renderCategories();
renderApps(APPS);

searchInput.addEventListener("input", searchApps);
randomBtn.addEventListener("click", showRandomApp);