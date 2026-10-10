const STORAGE_KEY = "age-calculator:birth-date";
const MIN_YEAR = 1900;
const MS_PER_DAY = 86400000;
const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const ageForm = document.getElementById("ageForm");
const birthInput = document.getElementById("birthDate");
const formMessage = document.getElementById("formMessage");
const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");
const yearsEl = document.getElementById("years");
const monthsEl = document.getElementById("months");
const daysEl = document.getElementById("days");
const yearsLabel = document.getElementById("yearsLabel");
const monthsLabel = document.getElementById("monthsLabel");
const daysLabel = document.getElementById("daysLabel");
const totalDaysEl = document.getElementById("totalDays");
const nextBirthdayEl = document.getElementById("nextBirthday");
const nextBirthdayNote = document.getElementById("nextBirthdayNote");

function pad(number) {
    return String(number).padStart(2, "0");
}

function getToday() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

function toInputValue(date) {
    return date.year + "-" + pad(date.month + 1) + "-" + pad(date.day);
}

// whole-day number in utc, so daylight saving never shifts a day
function dayNumber(date) {
    return Date.UTC(date.year, date.month, date.day) / MS_PER_DAY;
}

function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) {
        return null;
    }
    return { year: year, month: month, day: day };
}

// jan 31 + 1 month lands on feb 28/29 instead of rolling into march
function addMonths(date, count) {
    const total = date.month + count;
    const year = date.year + Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12;
    const day = Math.min(date.day, daysInMonth(year, month));
    return { year: year, month: month, day: day };
}

function getExactAge(birth, today) {
    let totalMonths = (today.year - birth.year) * 12 + (today.month - birth.month);
    let anchor = addMonths(birth, totalMonths);

    if (dayNumber(anchor) > dayNumber(today)) {
        totalMonths -= 1;
        anchor = addMonths(birth, totalMonths);
    }

    return {
        years: Math.floor(totalMonths / 12),
        months: totalMonths % 12,
        days: dayNumber(today) - dayNumber(anchor)
    };
}

function getNextBirthday(birth, today) {
    let year = today.year;
    let next = { year: year, month: birth.month, day: Math.min(birth.day, daysInMonth(year, birth.month)) };

    if (dayNumber(next) < dayNumber(today)) {
        year += 1;
        next = { year: year, month: birth.month, day: Math.min(birth.day, daysInMonth(year, birth.month)) };
    }

    return {
        date: next,
        daysLeft: dayNumber(next) - dayNumber(today),
        turning: next.year - birth.year,
        weekDay: WEEK_DAYS[new Date(Date.UTC(next.year, next.month, next.day)).getUTCDay()]
    };
}

function plural(count, word) {
    return count === 1 ? word : word + "s";
}

function validate(value, today) {
    if (!value) {
        return { error: "Please pick your date of birth first." };
    }
    const birth = parseDate(value);
    if (!birth) {
        return { error: "That does not look like a real date. Please check it." };
    }
    if (birth.year < MIN_YEAR) {
        return { error: "Please pick a date from " + MIN_YEAR + " onwards." };
    }
    if (dayNumber(birth) > dayNumber(today)) {
        return { error: "Your date of birth cannot be in the future. Pick today or an earlier date." };
    }
    return { birth: birth };
}

function showError(message) {
    formMessage.textContent = message;
    birthInput.setAttribute("aria-invalid", "true");
    birthInput.focus();
}

function clearError() {
    formMessage.textContent = "";
    birthInput.removeAttribute("aria-invalid");
}

function showEmpty() {
    resultContent.hidden = true;
    emptyState.hidden = false;
}

function renderResult(birth, today) {
    const age = getExactAge(birth, today);
    const next = getNextBirthday(birth, today);
    const totalDays = dayNumber(today) - dayNumber(birth);

    yearsEl.textContent = age.years;
    monthsEl.textContent = age.months;
    daysEl.textContent = age.days;
    yearsLabel.textContent = plural(age.years, "year");
    monthsLabel.textContent = plural(age.months, "month");
    daysLabel.textContent = plural(age.days, "day");

    totalDaysEl.textContent = totalDays.toLocaleString() + " " + plural(totalDays, "day");

    const dateText = next.weekDay + ", " + next.date.day + " " + MONTHS[next.date.month] + " " + next.date.year;
    if (next.daysLeft === 0) {
        nextBirthdayEl.textContent = "Today. Happy birthday!";
        nextBirthdayNote.textContent = "You turned " + next.turning + " today.";
    } else {
        nextBirthdayEl.textContent = "In " + next.daysLeft.toLocaleString() + " " + plural(next.daysLeft, "day");
        nextBirthdayNote.textContent = "You turn " + next.turning + " on " + dateText + ".";
    }

    emptyState.hidden = true;
    resultContent.hidden = false;
}

function saveBirthDate(value) {
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
        // storage can be blocked in private mode, the page still works without it
    }
}

function loadBirthDate() {
    try {
        return localStorage.getItem(STORAGE_KEY) || "";
    } catch (error) {
        return "";
    }
}

function handleSubmit(event) {
    event.preventDefault();
    const today = getToday();
    const check = validate(birthInput.value, today);

    if (check.error) {
        showError(check.error);
        showEmpty();
        return;
    }

    clearError();
    renderResult(check.birth, today);
    saveBirthDate(birthInput.value);
}

function init() {
    const today = getToday();
    birthInput.max = toInputValue(today);
    birthInput.min = MIN_YEAR + "-01-01";

    const saved = loadBirthDate();
    const check = validate(saved, today);
    if (saved && !check.error) {
        birthInput.value = saved;
        renderResult(check.birth, today);
    }
}

ageForm.addEventListener("submit", handleSubmit);
birthInput.addEventListener("input", clearError);
init();
