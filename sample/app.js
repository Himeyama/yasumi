const DATA_URL = new URL("./data/jp-holidays.json", document.currentScript.src).href;
const TYPE_LABELS = {
  national_holiday: "国民の祝日",
  substitute_holiday: "振替休日",
  citizen_holiday: "国民の休日",
};

const elements = {
  headerPeriod: document.querySelector("#header-period"),
  dataStatus: document.querySelector("#data-status"),
  monthLabel: document.querySelector("#month-label"),
  calendarGrid: document.querySelector("#calendar-grid"),
  previousMonth: document.querySelector("#previous-month"),
  nextMonth: document.querySelector("#next-month"),
  todayButton: document.querySelector("#today-button"),
  lookupForm: document.querySelector("#lookup-form"),
  dateInput: document.querySelector("#date-input"),
  lookupResult: document.querySelector("#lookup-result"),
  datasetCount: document.querySelector("#dataset-count"),
};

let holidayByDate = new Map();
let dateRange = { from: "1955-01-01", through: "2027-12-31" };
let selectedDate = "";
let displayedYear = 0;
let displayedMonth = 0;
let today = "";

function japanDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(key, options = { dateStyle: "full" }) {
  return new Intl.DateTimeFormat("ja-JP", {
    ...options,
    timeZone: "UTC",
  }).format(dateFromKey(key));
}

function isInRange(key) {
  return key >= dateRange.from && key <= dateRange.through;
}

function setResultMessage(message, className = "result-placeholder") {
  const placeholder = document.createElement("div");
  placeholder.className = className;
  placeholder.textContent = message;
  elements.lookupResult.replaceChildren(placeholder);
}

function renderResult(key) {
  elements.lookupResult.replaceChildren();

  if (!isInRange(key)) {
    const warning = document.createElement("p");
    warning.className = "result-holiday-name range-warning";
    warning.textContent = "データ対象期間外です";
    const detail = document.createElement("p");
    detail.className = "result-type";
    detail.textContent = `${dateRange.from.slice(0, 4)}〜${dateRange.through.slice(0, 4)}年の範囲で確認できます。`;
    elements.lookupResult.append(warning, detail);
    return;
  }

  const holiday = holidayByDate.get(key);
  const dateLine = document.createElement("p");
  dateLine.className = "result-date";
  dateLine.textContent = formatDate(key);

  const state = document.createElement("span");
  state.className = `result-state${holiday ? "" : " result-state--regular"}`;
  state.textContent = holiday ? "祝日・休日です" : "祝日・休日ではありません";
  elements.lookupResult.append(dateLine, state);

  if (holiday) {
    const name = document.createElement("p");
    name.className = "result-holiday-name";
    name.textContent = holiday.name;
    const type = document.createElement("p");
    type.className = "result-type";
    type.textContent = TYPE_LABELS[holiday.type] ?? "国民の祝日・休日";
    elements.lookupResult.append(name, type);
  }
}

function makeEmptyCell() {
  const cell = document.createElement("span");
  cell.className = "day-cell day-cell--empty";
  cell.setAttribute("aria-hidden", "true");
  return cell;
}

function renderCalendar() {
  const firstDay = new Date(Date.UTC(displayedYear, displayedMonth - 1, 1));
  const firstWeekday = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(displayedYear, displayedMonth, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const fragment = document.createDocumentFragment();

  elements.monthLabel.textContent = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(firstDay);

  for (let index = 0; index < cellCount; index += 1) {
    const dayNumber = index - firstWeekday + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      fragment.append(makeEmptyCell());
      continue;
    }

    const date = new Date(Date.UTC(displayedYear, displayedMonth - 1, dayNumber));
    const key = `${displayedYear}-${String(displayedMonth).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    const weekday = date.getUTCDay();
    const holiday = holidayByDate.get(key);
    const classes = ["day-cell"];

    if (weekday === 0) classes.push("day-cell--sunday");
    if (weekday === 6) classes.push("day-cell--saturday");
    if (holiday) classes.push("day-cell--holiday");
    if (key === today) classes.push("day-cell--today");
    if (key === selectedDate) classes.push("day-cell--selected");

    const button = document.createElement("button");
    button.type = "button";
    button.className = classes.join(" ");
    button.setAttribute("aria-pressed", String(key === selectedDate));
    button.setAttribute("aria-label", holiday ? `${formatDate(key)}、${holiday.name}` : formatDate(key));
    button.title = holiday ? holiday.name : formatDate(key, { month: "long", day: "numeric" });

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(dayNumber);
    button.append(number);

    if (holiday) {
      const holidayName = document.createElement("span");
      holidayName.className = "holiday-name";
      holidayName.textContent = holiday.name;
      button.append(holidayName);
    }

    button.addEventListener("click", () => selectDate(key));
    fragment.append(button);
  }

  elements.calendarGrid.replaceChildren(fragment);
  updateMonthControls();
}

function updateMonthControls() {
  const monthKey = `${displayedYear}-${String(displayedMonth).padStart(2, "0")}`;
  const startMonth = dateRange.from.slice(0, 7);
  const endMonth = dateRange.through.slice(0, 7);
  elements.previousMonth.disabled = monthKey <= startMonth;
  elements.nextMonth.disabled = monthKey >= endMonth;
}

function setDisplayedMonth(year, month) {
  const normalized = new Date(Date.UTC(year, month - 1, 1));
  displayedYear = normalized.getUTCFullYear();
  displayedMonth = normalized.getUTCMonth() + 1;
  renderCalendar();
}

function selectDate(key) {
  selectedDate = key;
  elements.dateInput.value = key;
  const date = dateFromKey(key);
  setDisplayedMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  renderResult(key);
}

function moveMonth(amount) {
  setDisplayedMonth(displayedYear, displayedMonth + amount);
}

function enableControls() {
  elements.dateInput.disabled = false;
  elements.dateInput.min = dateRange.from;
  elements.dateInput.max = dateRange.through;
  elements.lookupForm.querySelector("button[type='submit']").disabled = false;
  elements.previousMonth.disabled = false;
  elements.nextMonth.disabled = false;
  elements.todayButton.disabled = false;
}

async function initialize() {
  today = japanDateKey();
  try {
    let data = window.JP_HOLIDAYS_DATA;
    if (!data) {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    }
    dateRange = data.dateRange;
    holidayByDate = new Map(data.holidays.map((holiday) => [holiday.date, holiday]));

    const startYear = dateRange.from.slice(0, 4);
    const endYear = dateRange.through.slice(0, 4);
    elements.headerPeriod.textContent = `${startYear}–${endYear}年のデータ`;
    elements.datasetCount.textContent = `${data.holidays.length.toLocaleString("ja-JP")}件 · UTF-8 JSON`;
    enableControls();

    const initialDate = isInRange(today) ? today : dateRange.from;
    selectedDate = initialDate;
    elements.dateInput.value = initialDate;
    const initial = dateFromKey(initialDate);
    displayedYear = initial.getUTCFullYear();
    displayedMonth = initial.getUTCMonth() + 1;
    renderCalendar();
    renderResult(initialDate);
  } catch (error) {
    console.error("祝日データの読み込みに失敗しました:", error);
    elements.headerPeriod.textContent = "データを読み込めません";
    elements.monthLabel.textContent = "カレンダーを表示できません";
    elements.dataStatus.hidden = false;
    elements.dataStatus.textContent = "祝日データを読み込めませんでした。data/jp-holidays.js があることを確認するか、プロジェクトのルートで python -m http.server 8000 を実行して http://localhost:8000/sample/ を開いてください。";
    setResultMessage("祝日データを読み込めませんでした。");
  }
}

elements.lookupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!elements.dateInput.value) return;
  selectDate(elements.dateInput.value);
});

elements.previousMonth.addEventListener("click", () => moveMonth(-1));
elements.nextMonth.addEventListener("click", () => moveMonth(1));
elements.todayButton.addEventListener("click", () => {
  const target = isInRange(today) ? today : dateRange.from;
  selectDate(target);
});

initialize();
