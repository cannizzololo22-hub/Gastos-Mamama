/* =========================================================
   Mis Gastos — lógica de la aplicación
   Sin dependencias externas: 100% HTML + CSS + JS puro.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. DATOS / ALMACENAMIENTO
  --------------------------------------------------------- */

  const STORAGE_KEY = "misGastosApp:v1";

  const CATEGORIES = [
    { key: "comida",         label: "Comida",         icon: "🍽️", color: "#E8A33D",
      keywords: ["comida","comer","almuerzo","cena","desayuno","super","supermercado","mercado","restaurante","delivery","rappi","pedidosya","verduleria","carniceria","panaderia","kiosco","kiosko","snack","fiambreria","dietetica","comestibles"] },
    { key: "transporte",     label: "Transporte",     icon: "🚗", color: "#4A7FB5",
      keywords: ["transporte","nafta","gasolina","combustible","uber","taxi","remis","colectivo","bondi","bus","subte","tren","peaje","estacionamiento","auto","mecanico","service","cochera","viaje"] },
    { key: "luz",             label: "Luz",             icon: "💡", color: "#F0B429",
      keywords: ["luz","electricidad","edenor","edesur","epec"] },
    { key: "agua",            label: "Agua",            icon: "🚿", color: "#48A9E6",
      keywords: ["agua","aysa"] },
    { key: "gas",             label: "Gas",             icon: "🔥", color: "#C2542D",
      keywords: ["gas","garrafa","metrogas"] },
    { key: "internet",        label: "Internet/Cel.",   icon: "📶", color: "#5A6ACF",
      keywords: ["internet","wifi","telefono","celular","cable","netflix","spotify","streaming","claro","movistar","personal","abono"] },
    { key: "salud",           label: "Salud",           icon: "⚕️", color: "#E8607A",
      keywords: ["salud","farmacia","remedio","remedios","medicamento","medico","doctor","dentista","obra social","prepaga","hospital","psicologa","psicologo","analisis"] },
    { key: "ropa",            label: "Ropa",            icon: "👕", color: "#9B6FD6",
      keywords: ["ropa","zapatillas","zapatos","remera","pantalon","vestido","calzado","campera","indumentaria"] },
    { key: "entretenimiento", label: "Entretenimiento", icon: "🎉", color: "#EC7C8C",
      keywords: ["entretenimiento","cine","salida","bar","cerveza","boliche","juego","cumpleanos","regalo","paseo","salidas"] },
    { key: "hogar",           label: "Hogar",           icon: "🏠", color: "#6B9080",
      keywords: ["hogar","casa","limpieza","muebles","ferreteria","reparacion","alquiler","expensas","electrodomestico"] },
    { key: "educacion",       label: "Educación",       icon: "📚", color: "#4F6D7A",
      keywords: ["educacion","colegio","escuela","universidad","curso","libros","utiles","cuota"] },
    { key: "mascotas",        label: "Mascotas",        icon: "🐾", color: "#8D6E63",
      keywords: ["mascota","perro","gato","veterinaria","balanceado"] },
    { key: "otros",           label: "Otros",           icon: "🧾", color: "#8A8F87",
      keywords: [] }
  ];

  function getCategory(key) {
    return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function defaultData() {
    return { expenses: [], debts: [], chatLog: [] };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultData(), parsed);
    } catch (e) {
      console.error("No se pudo leer localStorage", e);
      return defaultData();
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("No se pudo guardar en localStorage", e);
      showToast("No se pudo guardar. ¿Falta espacio en el celular?");
    }
  }

  let state = loadData();

  /* ---------------------------------------------------------
     2. UTILIDADES DE TEXTO / MONTOS
  --------------------------------------------------------- */

  function stripAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function normalize(str) {
    return stripAccents(str.toLowerCase()).trim();
  }

  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    const opts = Number.isInteger(n)
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return "$" + n.toLocaleString("es-AR", opts);
  }

  function formatDateHuman(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.round((t0 - new Date(y, m - 1, d)) / 86400000);
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return d + " " + months[m - 1] + (date.getFullYear() !== today.getFullYear() ? " " + date.getFullYear() : "");
  }

  /**
   * Extrae un monto de un texto en español, tolerando separadores de miles
   * ("5.000", "12,000"), el sufijo "k"/"mil" (3k -> 3000) y el símbolo "$".
   */
  function extractAmount(text) {
    const match = text.match(/\$?\s*(\d[\d.,]*)\s*(k|mil)?/i);
    if (!match) return null;
    let raw = match[1];
    const suffix = match[2];

    // ¿Es un decimal simple tipo "12.5" o "12,5" (una sola coma/punto, 1-2 dígitos después)?
    const decimalMatch = raw.match(/^(\d+)[.,](\d{1,2})$/);
    let amount;
    if (decimalMatch && !raw.match(/[.,].*[.,]/)) {
      amount = parseFloat(decimalMatch[1] + "." + decimalMatch[2]);
    } else {
      amount = parseInt(raw.replace(/[.,]/g, ""), 10);
    }
    if (suffix) amount = amount * 1000;
    if (!isFinite(amount) || amount <= 0) return null;
    return { amount, matchedText: match[0] };
  }

  function detectCategory(normalizedText) {
    for (const cat of CATEGORIES) {
      for (const kw of cat.keywords) {
        const re = new RegExp("\\b" + kw.replace(/\s+/g, "\\s+") + "\\b", "i");
        if (re.test(normalizedText)) return cat.key;
      }
    }
    return "otros";
  }

  function parseExpenseInput(text) {
    const normalized = normalize(text);
    const amountInfo = extractAmount(normalized);
    if (!amountInfo) return null;
    const category = detectCategory(normalized);
    return { amount: amountInfo.amount, category };
  }

  /* ---------------------------------------------------------
     3. CRUD GASTOS / DEUDAS
  --------------------------------------------------------- */

  function addExpense({ amount, category, date, note }) {
    const exp = { id: uid(), amount, category, date: date || todayISO(), note: note || "", createdAt: new Date().toISOString() };
    state.expenses.push(exp);
    saveData();
    return exp;
  }

  function updateExpense(id, changes) {
    const exp = state.expenses.find(e => e.id === id);
    if (!exp) return;
    Object.assign(exp, changes);
    saveData();
  }

  function deleteExpense(id) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    saveData();
  }

  function addDebt({ name, total, paid, due }) {
    const debt = { id: uid(), name, total, paid: paid || 0, due: due || null, createdAt: new Date().toISOString() };
    state.debts.push(debt);
    saveData();
    return debt;
  }

  function updateDebt(id, changes) {
    const debt = state.debts.find(d => d.id === id);
    if (!debt) return;
    Object.assign(debt, changes);
    saveData();
  }

  function deleteDebt(id) {
    state.debts = state.debts.filter(d => d.id !== id);
    saveData();
  }

  /* ---------------------------------------------------------
     4. NAVEGACIÓN
  --------------------------------------------------------- */

  const views = {
    inicio: document.getElementById("view-inicio"),
    chat: document.getElementById("view-chat"),
    deudas: document.getElementById("view-deudas")
  };
  const navBtns = document.querySelectorAll(".nav-btn");
  const fabAddDebt = document.getElementById("fabAddDebt");

  function switchView(name) {
    Object.keys(views).forEach(k => views[k].classList.toggle("is-active", k === name));
    navBtns.forEach(b => b.classList.toggle("is-active", b.dataset.view === name));
    fabAddDebt.classList.toggle("is-hidden", name !== "deudas");
    if (name === "inicio") renderDashboard();
    if (name === "chat") { renderChatLog(); scrollChatToBottom(); focusChatInput(); }
    if (name === "deudas") renderDebts();
  }

  navBtns.forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  /* ---------------------------------------------------------
     5. TOAST
  --------------------------------------------------------- */

  const toastEl = document.getElementById("toast");
  let toastTimer = null;

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2400);
  }

  /* ---------------------------------------------------------
     6. DASHBOARD (stats + historial)
  --------------------------------------------------------- */

  const statHoy = document.getElementById("statHoy");
  const statMes = document.getElementById("statMes");
  const statTotal = document.getElementById("statTotal");
  const historyList = document.getElementById("historyList");
  const headerSubtitle = document.getElementById("headerSubtitle");

  function currentMonthKey() {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1);
  }

  function renderStats() {
    const today = todayISO();
    const monthKey = currentMonthKey();

    let hoy = 0, mes = 0, total = 0;
    for (const e of state.expenses) {
      total += e.amount;
      if (e.date === today) hoy += e.amount;
      if (e.date.slice(0, 7) === monthKey) mes += e.amount;
    }
    statHoy.textContent = formatCurrency(hoy);
    statMes.textContent = formatCurrency(mes);
    statTotal.textContent = formatCurrency(total);

    if (state.expenses.length === 0) {
      headerSubtitle.textContent = "Hola 👋 contame tu primer gasto";
    } else if (hoy > 0) {
      headerSubtitle.textContent = "Hoy llevás gastado " + formatCurrency(hoy);
    } else {
      headerSubtitle.textContent = "Hola 👋 así va tu mes";
    }
  }

  function renderHistory() {
    const sorted = [...state.expenses].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
    const recent = sorted.slice(0, 40);

    if (recent.length === 0) {
      historyList.innerHTML =
        '<div class="empty-state"><div class="empty-state__emoji">🧾</div>' +
        '<div class="empty-state__text">Todavía no registraste gastos.<br>Contámelo en el Chat.</div></div>';
      return;
    }

    historyList.innerHTML = recent.map(exp => {
      const cat = getCategory(exp.category);
      return (
        '<div class="expense-row" data-id="' + exp.id + '">' +
          '<div class="expense-row__icon" style="background:' + cat.color + '22;">' + cat.icon + '</div>' +
          '<div class="expense-row__body">' +
            '<div class="expense-row__cat">' + cat.label + '</div>' +
            '<div class="expense-row__date">' + formatDateHuman(exp.date) + '</div>' +
          '</div>' +
          '<div class="expense-row__amount">' + formatCurrency(exp.amount) + '</div>' +
          '<div class="expense-row__actions">' +
            '<button class="icon-btn" data-action="edit" aria-label="Editar">✏️</button>' +
            '<button class="icon-btn icon-btn--danger" data-action="delete" aria-label="Eliminar">🗑️</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  historyList.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;
    const row = ev.target.closest(".expense-row");
    const id = row.dataset.id;
    if (btn.dataset.action === "edit") openExpenseModal(id);
    if (btn.dataset.action === "delete") {
      if (confirm("¿Eliminar este gasto?")) {
        deleteExpense(id);
        renderDashboard();
        showToast("Gasto eliminado");
      }
    }
  });

  function renderDashboard() {
    renderStats();
    renderHistory();
    renderLineChart();
    renderPieChart();
  }

  /* ---------------------------------------------------------
     7. GRÁFICO DE LÍNEAS (canvas, sin librerías)
  --------------------------------------------------------- */

  function setupCanvasForDPR(canvas, cssHeight) {
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.parentElement.clientWidth;
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: cssWidth, height: cssHeight };
  }

  function renderLineChart() {
    const wrap = document.getElementById("lineChartWrap");
    const canvas = document.getElementById("lineChart");
    const DAYS = 14;
    const today = new Date();
    const days = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
      days.push(iso);
    }
    const totals = days.map(iso => state.expenses.filter(e => e.date === iso).reduce((s, e) => s + e.amount, 0));

    if (state.expenses.length === 0) {
      wrap.innerHTML = '<div class="chart-empty">Cuando registres gastos vas a ver acá la evolución día a día 📈</div>';
      return;
    }
    if (!document.getElementById("lineChart")) {
      wrap.innerHTML = '<canvas id="lineChart" height="150"></canvas>';
    }

    const { ctx, width, height } = setupCanvasForDPR(canvas, 150);
    ctx.clearRect(0, 0, width, height);

    const padL = 8, padR = 8, padT = 14, padB = 22;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const maxVal = Math.max(...totals, 1);

    const points = totals.map((v, i) => ({
      x: padL + (chartW * i) / (DAYS - 1),
      y: padT + chartH - (v / maxVal) * chartH
    }));

    // línea de base
    ctx.strokeStyle = "#E7E2D6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT + chartH);
    ctx.lineTo(padL + chartW, padT + chartH);
    ctx.stroke();

    // área bajo la curva
    const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad.addColorStop(0, "rgba(33,87,74,0.28)");
    grad.addColorStop(1, "rgba(33,87,74,0.02)");
    ctx.beginPath();
    ctx.moveTo(points[0].x, padT + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padT + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // línea
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = "#21574A";
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // puntos (sólo si > 0 o es el último día)
    points.forEach((p, i) => {
      if (totals[i] > 0 || i === points.length - 1) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, i === points.length - 1 ? 3.6 : 2.6, 0, Math.PI * 2);
        ctx.fillStyle = totals[i] > 0 ? "#E8A33D" : "#21574A";
        ctx.fill();
      }
    });

    // etiquetas de eje X (cada ~3 días)
    ctx.fillStyle = "#96988F";
    ctx.font = "10px " + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = "center";
    const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    days.forEach((iso, i) => {
      if (i % 3 === 0 || i === days.length - 1) {
        const [, m, d] = iso.split("-");
        ctx.fillText(parseInt(d, 10) + " " + months[parseInt(m, 10) - 1], points[i].x, height - 4);
      }
    });
  }

  /* ---------------------------------------------------------
     8. GRÁFICO CIRCULAR (canvas, sin librerías)
  --------------------------------------------------------- */

  function renderPieChart() {
    const wrap = document.getElementById("pieChartWrap");
    const legend = document.getElementById("pieLegend");
    const monthKey = currentMonthKey();
    const monthExpenses = state.expenses.filter(e => e.date.slice(0, 7) === monthKey);

    if (monthExpenses.length === 0) {
      wrap.innerHTML = '<div class="chart-empty">Todavía no hay gastos este mes para graficar 🥧</div>';
      legend.innerHTML = "";
      return;
    }
    if (!document.getElementById("pieChart")) {
      wrap.innerHTML = '<canvas id="pieChart" height="190"></canvas>';
    }

    const totalsByCategory = {};
    monthExpenses.forEach(e => {
      totalsByCategory[e.category] = (totalsByCategory[e.category] || 0) + e.amount;
    });
    const entries = Object.entries(totalsByCategory)
      .map(([key, value]) => ({ cat: getCategory(key), value }))
      .sort((a, b) => b.value - a.value);
    const total = entries.reduce((s, e) => s + e.value, 0);

    const canvas = document.getElementById("pieChart");
    const size = 190;
    const { ctx, width, height } = setupCanvasForDPR(canvas, size);
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2, cy = height / 2;
    const rOuter = Math.min(width, height) / 2 - 6;
    const rInner = rOuter * 0.6;

    let startAngle = -Math.PI / 2;
    entries.forEach(e => {
      const slice = (e.value / total) * Math.PI * 2;
      const endAngle = startAngle + slice;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, rOuter, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = e.cat.color;
      ctx.fill();
      startAngle = endAngle;
    });

    // agujero central (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(canvas.parentElement.closest(".card")).backgroundColor || "#FFFFFF";
    ctx.fill();

    // texto central
    ctx.fillStyle = "#1D2621";
    ctx.textAlign = "center";
    ctx.font = "700 15px " + getComputedStyle(document.body).fontFamily;
    ctx.fillText(formatCurrency(total), cx, cy + 2);
    ctx.fillStyle = "#96988F";
    ctx.font = "10px " + getComputedStyle(document.body).fontFamily;
    ctx.fillText("este mes", cx, cy + 16);

    legend.innerHTML = entries.map(e => {
      const pct = Math.round((e.value / total) * 100);
      return (
        '<div class="legend__item">' +
          '<span class="legend__dot" style="background:' + e.cat.color + ';"></span>' +
          e.cat.icon + ' ' + e.cat.label + ' · ' + pct + '%' +
        '</div>'
      );
    }).join("");
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (views.inicio.classList.contains("is-active")) {
        renderLineChart();
        renderPieChart();
      }
    }, 150);
  });

  /* ---------------------------------------------------------
     9. CHAT
  --------------------------------------------------------- */

  const chatStream = document.getElementById("chatStream");
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");

  function scrollChatToBottom() {
    requestAnimationFrame(() => { chatStream.scrollTop = chatStream.scrollHeight; });
  }

  function focusChatInput() {
    // No forzamos el foco automáticamente para no abrir el teclado sin querer
  }

  function pushChatLog(entry) {
    state.chatLog.push(entry);
    if (state.chatLog.length > 300) state.chatLog = state.chatLog.slice(-300);
    saveData();
  }

  function appendUserBubble(text, save) {
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg--user";
    div.innerHTML = '<div class="chat-bubble"></div>';
    div.querySelector(".chat-bubble").textContent = text;
    chatStream.appendChild(div);
    if (save) pushChatLog({ who: "user", text });
  }

  function appendBotText(text, save) {
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg--bot";
    div.innerHTML = '<div class="chat-bubble"></div>';
    div.querySelector(".chat-bubble").textContent = text;
    chatStream.appendChild(div);
    if (save) pushChatLog({ who: "bot", text });
  }

  function appendBotReceipt(expense, save) {
    const cat = getCategory(expense.category);
    const div = document.createElement("div");
    div.className = "chat-msg chat-msg--bot";
    div.innerHTML =
      '<div class="receipt" data-id="' + expense.id + '">' +
        '<div class="receipt__row">' +
          '<div class="receipt__icon" style="background:' + cat.color + '22;">' + cat.icon + '</div>' +
          '<div class="receipt__cat">' + cat.label + '</div>' +
          '<div class="receipt__amount">' + formatCurrency(expense.amount) + '</div>' +
        '</div>' +
        '<div class="receipt__foot">' +
          '<span class="receipt__stamp">✓ Registrado · ' + formatDateHuman(expense.date) + '</span>' +
          '<button class="receipt__edit" data-action="edit-receipt" data-id="' + expense.id + '">Editar</button>' +
        '</div>' +
      '</div>';
    chatStream.appendChild(div);
    if (save) pushChatLog({ who: "bot-receipt", expenseId: expense.id });
  }

  chatStream.addEventListener("click", (ev) => {
    const btn = ev.target.closest('[data-action="edit-receipt"]');
    if (!btn) return;
    openExpenseModal(btn.dataset.id);
  });

  function renderChatLog() {
    if (chatStream.dataset.rendered === "1") return;
    chatStream.dataset.rendered = "1";
    chatStream.innerHTML = "";

    if (state.chatLog.length === 0) {
      appendBotText("¡Hola! 👋 Contame tus gastos como si me escribieras un mensaje. Por ejemplo: \"Comida 5000\" o \"Luz 12000\".", false);
      return;
    }
    state.chatLog.forEach(entry => {
      if (entry.who === "user") appendUserBubble(entry.text, false);
      else if (entry.who === "bot") appendBotText(entry.text, false);
      else if (entry.who === "bot-receipt") {
        const exp = state.expenses.find(e => e.id === entry.expenseId);
        if (exp) appendBotReceipt(exp, false);
      }
    });
  }

  function handleChatSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    appendUserBubble(text, true);
    chatInput.value = "";
    autoresizeTextarea();

    const parsed = parseExpenseInput(text);
    if (!parsed) {
      appendBotText('No encontré un monto ahí 🤔 Probá escribiendo, por ejemplo: "Comida 5000".', true);
      scrollChatToBottom();
      return;
    }
    const exp = addExpense({ amount: parsed.amount, category: parsed.category, date: todayISO(), note: text });
    appendBotReceipt(exp, true);
    scrollChatToBottom();
  }

  chatSendBtn.addEventListener("click", handleChatSend);
  chatInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      handleChatSend();
    }
  });

  function autoresizeTextarea() {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 90) + "px";
  }
  chatInput.addEventListener("input", autoresizeTextarea);

  /* ---------------------------------------------------------
     10. MODAL EDITAR / ELIMINAR GASTO
  --------------------------------------------------------- */

  const expenseModal = document.getElementById("expenseModal");
  const expCategory = document.getElementById("expCategory");
  const expAmount = document.getElementById("expAmount");
  const expDate = document.getElementById("expDate");
  const expSaveBtn = document.getElementById("expSaveBtn");
  const expDeleteBtn = document.getElementById("expDeleteBtn");
  const expCancelBtn = document.getElementById("expCancelBtn");

  expCategory.innerHTML = CATEGORIES.map(c => '<option value="' + c.key + '">' + c.icon + ' ' + c.label + '</option>').join("");

  let editingExpenseId = null;

  function openExpenseModal(id) {
    const exp = state.expenses.find(e => e.id === id);
    if (!exp) return;
    editingExpenseId = id;
    expCategory.value = exp.category;
    expAmount.value = exp.amount;
    expDate.value = exp.date;
    openModal(expenseModal);
  }

  expSaveBtn.addEventListener("click", () => {
    const amount = parseFloat(expAmount.value);
    if (!amount || amount <= 0) {
      showToast("Ingresá un monto válido");
      return;
    }
    updateExpense(editingExpenseId, { category: expCategory.value, amount, date: expDate.value || todayISO() });
    closeModal(expenseModal);
    refreshReceiptInChat(editingExpenseId);
    renderDashboard();
    showToast("Gasto actualizado");
  });

  expDeleteBtn.addEventListener("click", () => {
    if (!confirm("¿Eliminar este gasto?")) return;
    deleteExpense(editingExpenseId);
    removeReceiptFromChat(editingExpenseId);
    closeModal(expenseModal);
    renderDashboard();
    showToast("Gasto eliminado");
  });

  expCancelBtn.addEventListener("click", () => closeModal(expenseModal));

  function refreshReceiptInChat(id) {
    const exp = state.expenses.find(e => e.id === id);
    if (!exp) return;
    const el = chatStream.querySelector('.receipt[data-id="' + id + '"]');
    if (!el) return;
    const cat = getCategory(exp.category);
    el.querySelector(".receipt__icon").style.background = cat.color + "22";
    el.querySelector(".receipt__icon").textContent = cat.icon;
    el.querySelector(".receipt__cat").textContent = cat.label;
    el.querySelector(".receipt__amount").textContent = formatCurrency(exp.amount);
    el.querySelector(".receipt__stamp").textContent = "✓ Registrado · " + formatDateHuman(exp.date);
  }

  function removeReceiptFromChat(id) {
    const el = chatStream.querySelector('.receipt[data-id="' + id + '"]');
    if (el) el.closest(".chat-msg").remove();
  }

  /* ---------------------------------------------------------
     11. DEUDAS
  --------------------------------------------------------- */

  const debtsList = document.getElementById("debtsList");
  const debtModal = document.getElementById("debtModal");
  const debtModalTitle = document.getElementById("debtModalTitle");
  const debtName = document.getElementById("debtName");
  const debtTotal = document.getElementById("debtTotal");
  const debtPaid = document.getElementById("debtPaid");
  const debtDue = document.getElementById("debtDue");
  const debtSaveBtn = document.getElementById("debtSaveBtn");
  const debtDeleteBtn = document.getElementById("debtDeleteBtn");
  const debtCancelBtn = document.getElementById("debtCancelBtn");

  let editingDebtId = null;

  function renderDebts() {
    if (state.debts.length === 0) {
      debtsList.innerHTML =
        '<div class="empty-state"><div class="empty-state__emoji">📋</div>' +
        '<div class="empty-state__text">No tenés deudas registradas.<br>Tocá el botón + para agregar una.</div></div>';
      return;
    }
    const sorted = [...state.debts].sort((a, b) => {
      const ra = a.total - a.paid, rb = b.total - b.paid;
      return rb - ra;
    });
    debtsList.innerHTML = sorted.map(d => {
      const remaining = Math.max(d.total - d.paid, 0);
      const pct = d.total > 0 ? Math.min((d.paid / d.total) * 100, 100) : 0;
      const dueText = d.due ? "Vence " + formatDateHuman(d.due) : "Sin fecha de vencimiento";
      const isPaidOff = remaining <= 0;
      return (
        '<div class="debt-card" data-id="' + d.id + '">' +
          '<div class="debt-card__head">' +
            '<div>' +
              '<div class="debt-card__name">' + escapeHtml(d.name) + '</div>' +
              '<div class="debt-card__due">' + (isPaidOff ? "✅ Saldada" : dueText) + '</div>' +
            '</div>' +
            '<div class="debt-card__amounts">' +
              '<div class="debt-card__remaining">' + formatCurrency(remaining) + '</div>' +
              '<div class="debt-card__total">de ' + formatCurrency(d.total) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="progress-track"><div class="progress-fill" style="width:' + pct.toFixed(0) + '%;"></div></div>' +
          '<div class="debt-card__foot">' +
            '<span class="debt-card__paid-label">Pagado: ' + formatCurrency(d.paid) + ' (' + pct.toFixed(0) + '%)</span>' +
            '<div class="debt-card__actions">' +
              '<button class="icon-btn" data-action="edit" aria-label="Editar">✏️</button>' +
              '<button class="icon-btn icon-btn--danger" data-action="delete" aria-label="Eliminar">🗑️</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  debtsList.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;
    const card = ev.target.closest(".debt-card");
    const id = card.dataset.id;
    if (btn.dataset.action === "edit") openDebtModal(id);
    if (btn.dataset.action === "delete") {
      if (confirm("¿Eliminar esta deuda?")) {
        deleteDebt(id);
        renderDebts();
        showToast("Deuda eliminada");
      }
    }
  });

  function openDebtModal(id) {
    editingDebtId = id || null;
    if (id) {
      const d = state.debts.find(x => x.id === id);
      debtModalTitle.textContent = "Editar deuda";
      debtName.value = d.name;
      debtTotal.value = d.total;
      debtPaid.value = d.paid;
      debtDue.value = d.due || "";
      debtDeleteBtn.classList.remove("hidden");
    } else {
      debtModalTitle.textContent = "Nueva deuda";
      debtName.value = "";
      debtTotal.value = "";
      debtPaid.value = "";
      debtDue.value = "";
      debtDeleteBtn.classList.add("hidden");
    }
    openModal(debtModal);
  }

  fabAddDebt.addEventListener("click", () => openDebtModal(null));

  debtSaveBtn.addEventListener("click", () => {
    const name = debtName.value.trim();
    const total = parseFloat(debtTotal.value);
    const paid = parseFloat(debtPaid.value) || 0;
    if (!name) { showToast("Ponele un nombre a la deuda"); return; }
    if (!total || total <= 0) { showToast("Ingresá un monto total válido"); return; }
    const due = debtDue.value || null;

    if (editingDebtId) {
      updateDebt(editingDebtId, { name, total, paid, due });
      showToast("Deuda actualizada");
    } else {
      addDebt({ name, total, paid, due });
      showToast("Deuda agregada");
    }
    closeModal(debtModal);
    renderDebts();
  });

  debtDeleteBtn.addEventListener("click", () => {
    if (!editingDebtId) return;
    if (!confirm("¿Eliminar esta deuda?")) return;
    deleteDebt(editingDebtId);
    closeModal(debtModal);
    renderDebts();
    showToast("Deuda eliminada");
  });

  debtCancelBtn.addEventListener("click", () => closeModal(debtModal));

  /* ---------------------------------------------------------
     12. MODALES (genérico)
  --------------------------------------------------------- */

  function openModal(modalEl) {
    modalEl.classList.add("is-open");
  }
  function closeModal(modalEl) {
    modalEl.classList.remove("is-open");
  }
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) closeModal(overlay);
    });
  });

  /* ---------------------------------------------------------
     13. INSTALACIÓN PWA
  --------------------------------------------------------- */

  let deferredPrompt = null;
  const installBanner = document.getElementById("installBanner");
  const installBtn = document.getElementById("installBtn");

  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    deferredPrompt = ev;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    if (!isStandalone) installBanner.classList.add("is-visible");
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBanner.classList.remove("is-visible");
  });

  window.addEventListener("appinstalled", () => {
    installBanner.classList.remove("is-visible");
    showToast("¡App instalada! 🎉");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(err => {
        console.error("Error registrando el Service Worker:", err);
      });
    });
  }

  /* ---------------------------------------------------------
     14. INICIO
  --------------------------------------------------------- */

  renderDashboard();
})();
