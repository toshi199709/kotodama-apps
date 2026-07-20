const STORAGE_KEY = "lifeDebugEntries";
const DISCOVERY_DATE_KEY = "lifeDebugDiscoveryDate";
const DISCOVERY_INDEX_KEY = "lifeDebugDiscoveryIndex";

const openBugFormButton = document.getElementById("openBugFormButton");
const closeBugFormButton = document.getElementById("closeBugFormButton");
const bugFormSection = document.getElementById("bugFormSection");
const bugForm = document.getElementById("bugForm");

const bugTitleInput = document.getElementById("bugTitle");
const lostMinutesSelect = document.getElementById("lostMinutes");
const bugMemoInput = document.getElementById("bugMemo");

const watchingCount = document.getElementById("watchingCount");
const resolvedCount = document.getElementById("resolvedCount");
const totalUpdateCount = document.getElementById("totalUpdateCount");

const emptyState = document.getElementById("emptyState");
const bugList = document.getElementById("bugList");
const toast = document.getElementById("toast");

const dailyDiscoveryCard =
  document.getElementById("dailyDiscoveryCard");

const dailyDiscoveryText =
  document.getElementById("dailyDiscoveryText");

const dailyDiscoverySubtext =
  document.getElementById("dailyDiscoverySubtext");

const appVersion =
  document.getElementById("appVersion");

const lifeUpdateVersion =
  document.getElementById("lifeUpdateVersion");

const lifeUpdateContent =
  document.getElementById("lifeUpdateContent");

let entries = loadEntries();
let toastTimer = null;

/* =========================
   保存データ
========================= */

function loadEntries() {
  const savedEntries = localStorage.getItem(STORAGE_KEY);

  if (!savedEntries) {
    return [];
  }

  try {
    const parsedEntries = JSON.parse(savedEntries);

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries.map(normalizeEntry);
  } catch (error) {
    console.error("保存データの読み込みに失敗しました。", error);

    return [];
  }
}

function normalizeEntry(entry) {
  return {
    id: entry.id || createId(),
    title: entry.title || "名前のない発見",
    memo: entry.memo || "",
    lostMinutes: Number(entry.lostMinutes) || 0,
    status: entry.status || "watching",
    occurrenceCount: Number(entry.occurrenceCount) || 1,
    solution: entry.solution || "",
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt:
      entry.updatedAt ||
      entry.createdAt ||
      new Date().toISOString(),
    resolvedAt: entry.resolvedAt || null
  };
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

/* =========================
   登録フォーム
========================= */

function openBugForm() {
  bugFormSection.classList.remove("is-hidden");

  window.requestAnimationFrame(() => {
    bugFormSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    bugTitleInput.focus({
      preventScroll: true
    });
  });
}

function closeBugForm() {
  bugFormSection.classList.add("is-hidden");
  bugForm.reset();
}

function createEntry() {
  return {
    id: createId(),
    title: bugTitleInput.value.trim(),
    memo: bugMemoInput.value.trim(),
    lostMinutes: Number(lostMinutesSelect.value),
    status: "watching",
    occurrenceCount: 1,
    solution: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null
  };
}

function handleBugFormSubmit(event) {
  event.preventDefault();

  const title = bugTitleInput.value.trim();

  if (!title) {
    bugTitleInput.focus();

    return;
  }

  entries.push(createEntry());

  saveEntries();
  renderEntries();

  bugForm.reset();
  bugFormSection.classList.add("is-hidden");

  showToast(
    "新しい発見を記録しました",
    "気づけたことが、最初のアップデートです。"
  );
}

/* =========================
   表示用の変換
========================= */

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getLostMinutesText(minutes) {
  const numericMinutes = Number(minutes);

  if (numericMinutes === 0) {
    return "時間ロスはほとんどなし";
  }

  if (numericMinutes >= 30) {
    return "約30分以上";
  }

  return `約${numericMinutes}分`;
}

/* =========================
   今日の発見
========================= */

function getTodayDateKey() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDailyDiscoveryIndex(discoveryCount) {
  if (discoveryCount <= 1) {
    return 0;
  }

  const todayKey = getTodayDateKey();

  const savedDate =
    localStorage.getItem(DISCOVERY_DATE_KEY);

  const savedIndex = Number(
    localStorage.getItem(DISCOVERY_INDEX_KEY)
  );

  if (
    savedDate === todayKey &&
    Number.isInteger(savedIndex) &&
    savedIndex >= 0 &&
    savedIndex < discoveryCount
  ) {
    return savedIndex;
  }

  const newIndex =
    Math.floor(Math.random() * discoveryCount);

  localStorage.setItem(
    DISCOVERY_DATE_KEY,
    todayKey
  );

  localStorage.setItem(
    DISCOVERY_INDEX_KEY,
    String(newIndex)
  );

  return newIndex;
}

function getTotalOccurrenceCount() {
  return entries.reduce((total, entry) => {
    return total + entry.occurrenceCount;
  }, 0);
}

function getTotalLostMinutes() {
  return entries.reduce((total, entry) => {
    return (
      total +
      Number(entry.lostMinutes) *
      Number(entry.occurrenceCount)
    );
  }, 0);
}

function getMostFrequentEntry() {
  if (entries.length === 0) {
    return null;
  }

  return [...entries].sort((a, b) => {
    return b.occurrenceCount - a.occurrenceCount;
  })[0];
}

function getMostRecentlyResolvedEntry() {
  const resolvedEntries = entries.filter((entry) => {
    return entry.status === "resolved";
  });

  if (resolvedEntries.length === 0) {
    return null;
  }

  return [...resolvedEntries].sort((a, b) => {
    return (
      new Date(b.resolvedAt || b.updatedAt) -
      new Date(a.resolvedAt || a.updatedAt)
    );
  })[0];
}

function getEntryWithSolution() {
  const entriesWithSolution = entries.filter((entry) => {
    return Boolean(entry.solution);
  });

  if (entriesWithSolution.length === 0) {
    return null;
  }

  return [...entriesWithSolution].sort((a, b) => {
    return (
      new Date(b.updatedAt) -
      new Date(a.updatedAt)
    );
  })[0];
}

function createDailyDiscoveries() {
  const isSameLocalDate = (
    dateString,
    targetDate = new Date()
  ) => {
    if (!dateString) {
      return false;
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return (
      date.getFullYear() ===
      targetDate.getFullYear() &&
      date.getMonth() ===
      targetDate.getMonth() &&
      date.getDate() ===
      targetDate.getDate()
    );
  };

  const watchingEntries = entries.filter((entry) => {
    return entry.status === "watching";
  });

  const resolvedEntries = entries.filter((entry) => {
    return entry.status === "resolved";
  });

  /* =========================
     優先度1
     3回以上繰り返している
  ========================= */

  const repeatedEntry = [...watchingEntries]
    .filter((entry) => {
      return entry.occurrenceCount >= 3;
    })
    .sort((a, b) => {
      if (
        b.occurrenceCount !==
        a.occurrenceCount
      ) {
        return (
          b.occurrenceCount -
          a.occurrenceCount
        );
      }

      return (
        new Date(b.updatedAt) -
        new Date(a.updatedAt)
      );
    })[0];

  if (repeatedEntry) {
    return {
      type: "observation",
      text:
        `「${repeatedEntry.title}」が${repeatedEntry.occurrenceCount}回起きています。`,
      subtext:
        "繰り返しは、次に整える場所を教えてくれる大切なサインです。"
    };
  }

  /* =========================
     優先度2
     今日整ったものがある
  ========================= */

  const resolvedToday = [...resolvedEntries]
    .filter((entry) => {
      return isSameLocalDate(
        entry.resolvedAt ||
        entry.updatedAt
      );
    })
    .sort((a, b) => {
      return (
        new Date(
          b.resolvedAt ||
          b.updatedAt
        ) -
        new Date(
          a.resolvedAt ||
          a.updatedAt
        )
      );
    })[0];

  if (resolvedToday) {
    return {
      type: "growth",
      text:
        `今日、「${resolvedToday.title}」が整いました。`,
      subtext:
        "小さな改善も、未来の自分を楽にする立派なアップデートです。"
    };
  }

  /* =========================
     優先度3
     今日新しく記録した
  ========================= */

  const createdToday = [...entries]
    .filter((entry) => {
      return isSameLocalDate(
        entry.createdAt
      );
    })
    .sort((a, b) => {
      return (
        new Date(b.createdAt) -
        new Date(a.createdAt)
      );
    })[0];

  if (createdToday) {
    return {
      type: "observation",
      text:
        `今日、「${createdToday.title}」という小さな不便を発見しました。`,
      subtext:
        "気づけたことが、暮らしを整える最初のアップデートです。"
    };
  }

  /* =========================
     優先度4
     整える方法がある
  ========================= */

  const solutionEntry = [...entries]
    .filter((entry) => {
      return Boolean(entry.solution);
    })
    .sort((a, b) => {
      return (
        new Date(b.updatedAt) -
        new Date(a.updatedAt)
      );
    })[0];

  if (solutionEntry) {
    return {
      type: "growth",
      text:
        `「${solutionEntry.title}」には、整える方法があります。`,
      subtext:
        `試している方法：${solutionEntry.solution}`
    };
  }

  /* =========================
     優先度5
     整った記録が3件以上
  ========================= */

  if (resolvedEntries.length >= 3) {
    return {
      type: "growth",
      text:
        `これまでに${resolvedEntries.length}つ、暮らしが整いました。`,
      subtext:
        "積み重ねた小さな改善が、あなたのLife OSを少しずつ更新しています。"
    };
  }

  /* =========================
     優先度6
     観察中が5件以上
  ========================= */

  if (watchingEntries.length >= 5) {
    return {
      type: "observation",
      text:
        `現在、${watchingEntries.length}件の小さな不便を観察しています。`,
      subtext:
        "全部を一度に直さなくても大丈夫です。まずは一番繰り返すものから見てみましょう。"
    };
  }

  /* =========================
     記録がまだない
  ========================= */

  if (entries.length === 0) {
    return {
      type: "rest",
      text:
        "まだ記録はありません。今日は、少しだけ面倒だったことを探してみましょう。",
      subtext:
        "大きな悩みでなくても大丈夫です。小さな気づきが暮らしを整える入口になります。"
    };
  }

  /* =========================
     優先度7
     通常のことだま
  ========================= */

  return {
    type: "rest",
    text:
      "今日も、暮らしの小さな違和感をひとつだけ観察してみましょう。",
    subtext:
      "直せなくても大丈夫です。気づいて記録するだけで、次のアップデートにつながります。"
  };
}

function renderDailyDiscovery() {
  if (
    !dailyDiscoveryCard ||
    !dailyDiscoveryText ||
    !dailyDiscoverySubtext
  ) {
    return;
  }

  const discovery =
    createDailyDiscoveries();

  dailyDiscoveryCard.classList.remove(
    "is-growth",
    "is-observation",
    "is-rest"
  );

  dailyDiscoveryCard.classList.add(
    `is-${discovery.type}`
  );

  dailyDiscoveryText.textContent =
    discovery.text;

  dailyDiscoverySubtext.textContent =
    discovery.subtext;
}

/* =========================
   Life Update
========================= */

function getLifeUpdateVersion() {
  const resolvedEntries = entries.filter((entry) => {
    return entry.status === "resolved";
  });

  return `1.0.${resolvedEntries.length}`;
}

function createLifeUpdateItem(text) {
  const item = document.createElement("li");
  item.className = "life-update-item";

  const icon = document.createElement("span");
  icon.className = "life-update-item__icon";
  icon.textContent = "✓";

  const content = document.createElement("span");
  content.textContent = text;

  item.append(icon, content);

  return item;
}

function createLifeUpdatePanel(titleText, items, isWide = false) {
  const panel = document.createElement("section");
  panel.className = "life-update-panel";

  if (isWide) {
    panel.classList.add("life-update-panel--wide");
  }

  const title = document.createElement("p");
  title.className = "life-update-panel__title";
  title.textContent = titleText;

  panel.appendChild(title);

  if (Array.isArray(items)) {
    const list = document.createElement("ul");
    list.className = "life-update-list";

    items.forEach((itemText) => {
      list.appendChild(createLifeUpdateItem(itemText));
    });

    panel.appendChild(list);
  } else {
    const note = document.createElement("p");
    note.className = "life-update-note";
    note.textContent = items;

    panel.appendChild(note);
  }

  return panel;
}

function getLatestResolvedEntries() {
  return entries
    .filter((entry) => entry.status === "resolved")
    .sort((a, b) => {
      return (
        new Date(b.resolvedAt || b.updatedAt) -
        new Date(a.resolvedAt || a.updatedAt)
      );
    })
    .slice(0, 3);
}

function createLifeUpdateLearning() {
  const mostFrequentEntry = getMostFrequentEntry();
  const entryWithSolution = getEntryWithSolution();

  if (
    mostFrequentEntry &&
    mostFrequentEntry.occurrenceCount >= 2
  ) {
    return `「${mostFrequentEntry.title}」は${mostFrequentEntry.occurrenceCount}回起きています。繰り返しが、次に整える場所を教えてくれています。`;
  }

  if (entryWithSolution) {
    return `「${entryWithSolution.title}」に対して、整える方法が見つかっています。`;
  }

  return "記録が増えると、繰り返しや改善の傾向がここに表示されます。";
}

function renderLifeUpdate() {
  if (
    !lifeUpdateVersion ||
    !lifeUpdateContent
  ) {
    return;
  }

  const version = getLifeUpdateVersion();
  const latestResolvedEntries =
    getLatestResolvedEntries();

  lifeUpdateVersion.textContent =
    `Version ${version}`;

  if (appVersion) {
    appVersion.textContent =
      `Life OS v${version}`;
  }

  lifeUpdateContent.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "life-update-empty";
    empty.textContent =
      "最初の発見を記録すると、あなたの暮らしのパッチノートがここから始まります。";

    lifeUpdateContent.appendChild(empty);

    return;
  }

  const improvementItems =
    latestResolvedEntries.map((entry) => {
      const savedMinutes =
        Number(entry.lostMinutes) *
        Number(entry.occurrenceCount);

      if (savedMinutes > 0) {
        return `${entry.title}　約${savedMinutes}分ぶんの不便を改善`;
      }

      return `${entry.title}　暮らしをひとつ改善`;
    });

  if (improvementItems.length === 0) {
    improvementItems.push(
      "現在は観察中です。整ったことが増えると、改善内容がここに追加されます。"
    );
  }

  const observationItems = [
    `小さな不便を合計${getTotalOccurrenceCount()}回発見`,
    `観察データは${entries.length}種類`,
    `記録された時間ロスは約${getTotalLostMinutes()}分`
  ];

  lifeUpdateContent.append(
    createLifeUpdatePanel(
      "改善",
      improvementItems
    ),
    createLifeUpdatePanel(
      "観察データ",
      observationItems
    ),
    createLifeUpdatePanel(
      "新しく分かったこと",
      createLifeUpdateLearning(),
      true
    )
  );
}

/* =========================
   観察中カード
========================= */

function createBugCard(entry) {
  const article = document.createElement("article");
  article.className = "bug-card";
  article.dataset.entryId = entry.id;

  const top = document.createElement("div");
  top.className = "bug-card__top";

  const title = document.createElement("h3");
  title.className = "bug-card__title";
  title.textContent = entry.title;

  const date = document.createElement("time");
  date.className = "bug-card__date";
  date.dateTime = entry.createdAt;
  date.textContent = formatDate(entry.createdAt);

  top.append(title, date);

  const meta = document.createElement("div");
  meta.className = "bug-card__meta";

  const statusBadge = document.createElement("span");
  statusBadge.className = "bug-card__badge";
  statusBadge.textContent = "🌱 観察中";

  const timeBadge = document.createElement("span");
  timeBadge.className = "bug-card__badge";
  timeBadge.textContent =
    `⏱ ${getLostMinutesText(entry.lostMinutes)}`;

  const occurrenceBadge =
    document.createElement("span");

  occurrenceBadge.className =
    "bug-card__badge bug-card__occurrence";

  occurrenceBadge.textContent =
    `🔍 気づいた回数 ${entry.occurrenceCount}回`;

  meta.append(
    statusBadge,
    timeBadge,
    occurrenceBadge
  );

  article.append(top, meta);

  if (entry.memo) {
    const memo = document.createElement("p");
    memo.className = "bug-card__memo";
    memo.textContent = entry.memo;

    article.appendChild(memo);
  }

  if (entry.solution) {
    const solution = document.createElement("p");
    solution.className = "bug-card__solution";

    const solutionLabel =
      document.createElement("span");

    solutionLabel.className =
      "bug-card__solution-label";

    solutionLabel.textContent =
      "整えるためのアイデア";

    solution.append(
      solutionLabel,
      document.createTextNode(entry.solution)
    );

    article.appendChild(solution);
  }

  const actions = document.createElement("div");
  actions.className = "bug-card__actions";

  const againButton = createActionButton(
    "🔁 もう一度起きた",
    "bug-action-button bug-action-button--again",
    () => recordOccurrence(entry.id)
  );

  const solutionButton = createActionButton(
    entry.solution
      ? "✏️ 方法を見直す"
      : "💡 整える方法",
    "bug-action-button bug-action-button--solution",
    () => openSolutionEditor(entry.id, article)
  );

  const resolvedButton = createActionButton(
    "🌿 整ったことにする",
    "bug-action-button bug-action-button--resolved",
    () => resolveEntry(entry.id)
  );

  actions.append(
    againButton,
    solutionButton,
    resolvedButton
  );

  article.appendChild(actions);

  return article;
}

function createActionButton(
  text,
  className,
  clickHandler
) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = className;
  button.textContent = text;

  button.addEventListener("click", clickHandler);

  return button;
}

/* =========================
   もう一度起きた
========================= */

function recordOccurrence(entryId) {
  const entry = entries.find((item) => {
    return item.id === entryId;
  });

  if (!entry) {
    return;
  }

  entry.occurrenceCount += 1;
  entry.updatedAt = new Date().toISOString();

  saveEntries();
  renderEntries();

  showToast(
    "新しい観察を追加しました",
    "繰り返しに気づくと、整えるヒントが見つかりやすくなります。"
  );
}

/* =========================
   整える方法
========================= */

function openSolutionEditor(
  entryId,
  cardElement
) {
  const existingEditor =
    cardElement.querySelector(".solution-editor");

  if (existingEditor) {
    existingEditor.remove();

    return;
  }

  document
    .querySelectorAll(".solution-editor")
    .forEach((editor) => editor.remove());

  const entry = entries.find((item) => {
    return item.id === entryId;
  });

  if (!entry) {
    return;
  }

  const editor = document.createElement("div");
  editor.className = "solution-editor";

  const label = document.createElement("label");
  label.className = "solution-editor__label";
  label.textContent =
    "暮らしを少し楽にする方法を考えてみましょう";

  const textarea =
    document.createElement("textarea");

  textarea.className = "solution-editor__input";
  textarea.maxLength = 200;
  textarea.placeholder =
    "例：玄関の右側に鍵を置く場所を作る";

  textarea.value = entry.solution;

  const buttonArea =
    document.createElement("div");

  buttonArea.className =
    "solution-editor__buttons";

  const cancelButton =
    document.createElement("button");

  cancelButton.type = "button";

  cancelButton.className =
    "solution-editor__button solution-editor__button--cancel";

  cancelButton.textContent = "閉じる";

  const saveButton =
    document.createElement("button");

  saveButton.type = "button";

  saveButton.className =
    "solution-editor__button solution-editor__button--save";

  saveButton.textContent = "方法を保存する";

  cancelButton.addEventListener("click", () => {
    editor.remove();
  });

  saveButton.addEventListener("click", () => {
    saveSolution(entryId, textarea.value);
  });

  buttonArea.append(
    cancelButton,
    saveButton
  );

  editor.append(
    label,
    textarea,
    buttonArea
  );

  cardElement.appendChild(editor);

  textarea.focus();
}

function saveSolution(entryId, solutionText) {
  const entry = entries.find((item) => {
    return item.id === entryId;
  });

  if (!entry) {
    return;
  }

  const solution = solutionText.trim();

  if (!solution) {
    showToast(
      "まだ空欄のようです",
      "小さなアイデアで大丈夫です。思いついた方法を残してみましょう。"
    );

    return;
  }

  entry.solution = solution;
  entry.updatedAt = new Date().toISOString();

  saveEntries();
  renderEntries();

  showToast(
    "整える方法を保存しました",
    "完璧な方法でなくても、試してみることがアップデートになります。"
  );
}

/* =========================
   整ったことにする
========================= */

function resolveEntry(entryId) {
  const entry = entries.find((item) => {
    return item.id === entryId;
  });

  if (!entry) {
    return;
  }

  entry.status = "resolved";
  entry.resolvedAt = new Date().toISOString();
  entry.updatedAt = new Date().toISOString();

  saveEntries();
  renderEntries();

  showToast(
    "暮らしがひとつ整いました",
    "大きさに関係なく、楽になった変化は大切なアップデートです。"
  );
}

/* =========================
   整った記録
========================= */

function createResolvedSection() {
  let section =
    document.getElementById("resolvedSection");

  if (section) {
    return section;
  }

  section = document.createElement("section");
  section.className = "resolved-section";
  section.id = "resolvedSection";

  const listSection =
    document.querySelector(".list-section");

  listSection.insertAdjacentElement(
    "afterend",
    section
  );

  return section;
}

function createResolvedCard(entry) {
  const article = document.createElement("article");
  article.className = "resolved-card";

  const top = document.createElement("div");
  top.className = "resolved-card__top";

  const title = document.createElement("h3");
  title.className = "resolved-card__title";
  title.textContent = `🌿 ${entry.title}`;

  const date = document.createElement("time");
  date.className = "resolved-card__date";
  date.dateTime =
    entry.resolvedAt || entry.updatedAt;

  date.textContent = formatDate(
    entry.resolvedAt || entry.updatedAt
  );

  top.append(title, date);

  const message = document.createElement("p");
  message.className =
    "resolved-card__message";

  message.textContent =
    `気づいた回数：${entry.occurrenceCount}回`;

  article.append(top, message);

  if (entry.solution) {
    const solution =
      document.createElement("p");

    solution.className =
      "bug-card__solution";

    const solutionLabel =
      document.createElement("span");

    solutionLabel.className =
      "bug-card__solution-label";

    solutionLabel.textContent = "試した方法";

    solution.append(
      solutionLabel,
      document.createTextNode(entry.solution)
    );

    article.appendChild(solution);
  }

  return article;
}

function renderResolvedEntries(resolvedEntries) {
  const section = createResolvedSection();

  section.innerHTML = "";

  const headingArea =
    document.createElement("div");

  headingArea.className =
    "section-title-row";

  const headingText =
    document.createElement("div");

  const label = document.createElement("p");
  label.className = "section-label";
  label.textContent = "Resolved Log";

  const heading = document.createElement("h2");
  heading.textContent = "整ったこと";

  headingText.append(label, heading);
  headingArea.appendChild(headingText);

  section.appendChild(headingArea);

  if (resolvedEntries.length === 0) {
    const empty = document.createElement("div");

    empty.className = "resolved-empty";

    empty.textContent =
      "整った記録はまだありません。観察するだけでも、暮らしを知る大切な一歩です。";

    section.appendChild(empty);

    return;
  }

  const list = document.createElement("div");
  list.className = "resolved-list";

  const newestFirstEntries =
    [...resolvedEntries].sort((a, b) => {
      return (
        new Date(
          b.resolvedAt || b.updatedAt
        ) -
        new Date(
          a.resolvedAt || a.updatedAt
        )
      );
    });

  newestFirstEntries.forEach((entry) => {
    list.appendChild(
      createResolvedCard(entry)
    );
  });

  section.appendChild(list);
}

/* =========================
   Life Bug Ranking
========================= */

function getRankingEntries() {
  return [...entries]
    .sort((a, b) => {
      const aLostMinutes =
        Number(a.lostMinutes) *
        Number(a.occurrenceCount);

      const bLostMinutes =
        Number(b.lostMinutes) *
        Number(b.occurrenceCount);

      if (bLostMinutes !== aLostMinutes) {
        return bLostMinutes - aLostMinutes;
      }

      if (
        b.occurrenceCount !==
        a.occurrenceCount
      ) {
        return (
          b.occurrenceCount -
          a.occurrenceCount
        );
      }

      return (
        new Date(b.updatedAt) -
        new Date(a.updatedAt)
      );
    })
    .slice(0, 3);
}

function getRankingMedal(index) {
  const medals = [
    "🥇",
    "🥈",
    "🥉"
  ];

  return medals[index] || "🏅";
}

function createRankingStat(
  labelText,
  valueText
) {
  const stat =
    document.createElement("div");

  stat.className =
    "ranking-card__stat";

  const label =
    document.createElement("p");

  label.className =
    "ranking-card__label";

  label.textContent = labelText;

  const value =
    document.createElement("p");

  value.className =
    "ranking-card__value";

  value.textContent = valueText;

  stat.append(label, value);

  return stat;
}

function createRankingCard(
  entry,
  index
) {
  const article =
    document.createElement("article");

  article.className = "ranking-card";

  const top =
    document.createElement("div");

  top.className =
    "ranking-card__top";

  const title =
    document.createElement("h3");

  title.className =
    "ranking-card__title";

  title.textContent = entry.title;

  const rank =
    document.createElement("span");

  rank.className =
    "ranking-card__rank";

  rank.textContent =
    getRankingMedal(index);

  top.append(rank, title);

  const stats =
    document.createElement("div");

  stats.className =
    "ranking-card__stats";

  const totalLostMinutes =
    Number(entry.lostMinutes) *
    Number(entry.occurrenceCount);

  stats.append(
    createRankingStat(
      "発生回数",
      `${entry.occurrenceCount}回`
    ),
    createRankingStat(
      "合計時間ロス",
      totalLostMinutes > 0
        ? `約${totalLostMinutes}分`
        : "ほぼなし"
    )
  );

  const message =
    document.createElement("p");

  message.className =
    "ranking-card__message";

  if (index === 0) {
    message.textContent =
      "現在、最も優先して整える効果が大きいLife Bugです。";
  } else if (entry.status === "resolved") {
    message.textContent =
      "すでに整った記録です。改善によって得られた効果を振り返れます。";
  } else if (entry.solution) {
    message.textContent =
      "整える方法が記録されています。次は実際に試してみましょう。";
  } else {
    message.textContent =
      "繰り返しや時間ロスを観察しながら、整える方法を考えてみましょう。";
  }

  article.append(
    top,
    stats,
    message
  );

  return article;
}

function renderRanking() {
  const rankingSection =
    document.getElementById(
      "rankingSection"
    );

  const rankingList =
    document.getElementById(
      "rankingList"
    );

  if (
    !rankingSection ||
    !rankingList
  ) {
    return;
  }

  rankingList.innerHTML = "";

  const rankingEntries =
    getRankingEntries();

  if (rankingEntries.length === 0) {
    const empty =
      document.createElement("div");

    empty.className =
      "resolved-empty";

    empty.textContent =
      "Life Bugを記録すると、改善効果の大きいものがここに表示されます。";

    rankingList.appendChild(empty);

    return;
  }

  rankingEntries.forEach(
    (entry, index) => {
      rankingList.appendChild(
        createRankingCard(
          entry,
          index
        )
      );
    }
  );
}
/* =========================
   Life Priority
========================= */

function createPriorityStat(labelText, valueText) {
  const stat = document.createElement("div");
  stat.className = "priority-card__stat";

  const label = document.createElement("p");
  label.className = "priority-card__stat-label";
  label.textContent = labelText;

  const value = document.createElement("p");
  value.className = "priority-card__stat-value";
  value.textContent = valueText;

  stat.append(label, value);

  return stat;
}

function renderLifePriority() {

  const container =
    document.getElementById("priorityContent");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const target = getRankingEntries()[0];

  if (!target) {

    const empty =
      document.createElement("p");

    empty.className =
      "priority-card__empty";

    empty.textContent =
      "Life Bugを記録すると、今日一番整えると効果が大きいものが表示されます。";

    container.appendChild(empty);

    return;
  }

  const title =
    document.createElement("h3");

  title.className =
    "priority-card__title";

  title.textContent =
    `今日は「${target.title}」を整えてみましょう`;

  const stats =
    document.createElement("div");

  stats.className =
    "priority-card__stats";

  stats.append(
    createPriorityStat(
      "発生回数",
      `${target.occurrenceCount}回`
    ),
    createPriorityStat(
      "時間ロス",
      target.lostMinutes *
        target.occurrenceCount > 0
        ? `約${target.lostMinutes * target.occurrenceCount}分`
        : "ほぼなし"
    )
  );

  const message =
    document.createElement("p");

  message.className =
    "priority-card__message";

  message.textContent =
    "今日は全部改善しようとしなくて大丈夫です。この1つだけ意識すると、一番効果が期待できます。";

  container.append(
    title,
    stats,
    message
  );

  if (target.solution) {

    const solution =
      document.createElement("div");

    solution.className =
      "priority-card__solution";

    solution.innerHTML =
      `<span class="priority-card__solution-label">おすすめの整え方</span>${target.solution}`;

    container.appendChild(solution);

  }

}
/* =========================
   全体表示
========================= */

function renderEntries() {
  bugList.innerHTML = "";

  const watchingEntries = entries.filter(
    (entry) => entry.status === "watching"
  );

  const resolvedEntries = entries.filter(
    (entry) => entry.status === "resolved"
  );

  watchingCount.textContent =
    watchingEntries.length;

  resolvedCount.textContent =
    resolvedEntries.length;

  const totalDiscoveries =
    getTotalOccurrenceCount();

  totalUpdateCount.textContent =
    totalDiscoveries;

  if (watchingEntries.length === 0) {
    emptyState.classList.remove("is-hidden");
  } else {
    emptyState.classList.add("is-hidden");
  }

  const newestFirstEntries =
    [...watchingEntries].sort((a, b) => {
      return (
        new Date(b.updatedAt) -
        new Date(a.updatedAt)
      );
    });

  newestFirstEntries.forEach((entry) => {
    bugList.appendChild(
      createBugCard(entry)
    );
  });

  renderResolvedEntries(resolvedEntries);
  renderDailyDiscovery();
  renderLifeUpdate();
  renderRanking();
  renderLifePriority();
}

/* =========================
   メッセージ表示
========================= */

function showToast(titleText, messageText) {
  const toastTitle =
    toast.querySelector(".toast__title");

  const toastMessage =
    toast.querySelector(".toast__message");

  toastTitle.textContent = titleText;
  toastMessage.textContent = messageText;

  toast.classList.add("is-visible");

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3400);
}

/* =========================
   イベント
========================= */

openBugFormButton.addEventListener(
  "click",
  openBugForm
);

closeBugFormButton.addEventListener(
  "click",
  closeBugForm
);

bugForm.addEventListener(
  "submit",
  handleBugFormSubmit
);

renderEntries();