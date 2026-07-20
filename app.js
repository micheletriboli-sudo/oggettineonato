(function () {
  const STORAGE_KEY = "oggetti-bebe-items";
  const ICONS = {
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    reopen: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  };
  const STATUS_LABEL = { in_uso: "In uso", da_restituire: "Da restituire", restituito: "Restituito" };

  let items = load();
  let query = "";
  let showForm = false;
  let collapsed = {};
  let formPhoto = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function resizeImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 480;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  function render() {
    const app = document.getElementById("app");
    const q = query.trim().toLowerCase();
    const filtered = items.filter(
      (it) => !q || it.persona.toLowerCase().includes(q) || it.nome.toLowerCase().includes(q)
    );
    const groups = {};
    filtered.forEach((it) => {
      (groups[it.persona] = groups[it.persona] || []).push(it);
    });
    const people = Object.keys(groups).sort((a, b) => a.localeCompare(b));

    let html = `<div class="wrap">
      <div class="header">
        <div>
          <h1 class="serif">Oggetti del bebè</h1>
          <p>Chi ti ha prestato cosa, e cosa resta da restituire</p>
        </div>
        <button class="btn-add" id="toggle-form">${ICONS.plus} Aggiungi</button>
      </div>`;

    if (items.length > 0) {
      html += `<div class="search-wrap">
        <span class="search-icon">${ICONS.search}</span>
        <input id="search-input" placeholder="Cerca per persona o oggetto..." value="${esc(query)}" />
      </div>`;
    }

    if (showForm) {
      html += `<form class="form-card" id="add-form">
        <div class="form-row">
          <button type="button" class="photo-btn" id="photo-btn">
            ${formPhoto ? `<img src="${formPhoto}" />` : ICONS.camera}
          </button>
          <input type="file" accept="image/*" capture="environment" id="photo-input" style="display:none" />
          <div class="form-fields">
            <input id="f-nome" placeholder="Cosa? (es. Tutina 0-3 mesi)" />
            <input id="f-persona" placeholder="Da chi? (nome)" />
          </div>
        </div>
        <div class="tipo-toggle">
          <button type="button" data-tipo="prestito" class="active">In prestito</button>
          <button type="button" data-tipo="regalo">Regalo</button>
        </div>
        <textarea id="f-note" rows="2" placeholder="Note (taglia, dove si trova, ecc.) - facoltativo"></textarea>
        <div class="form-actions">
          <button type="button" class="cancel" id="cancel-form">Annulla</button>
          <button type="submit" class="save">Salva</button>
        </div>
      </form>`;
    }

    if (items.length === 0 && !showForm) {
      html += `<div class="empty">${ICONS.image}<p style="margin-top:10px">Nessun oggetto ancora.</p><p>Tocca "Aggiungi" per iniziare a tracciare.</p></div>`;
    }

    people.forEach((persona) => {
      const personItems = groups[persona];
      const daRestituire = personItems.filter((i) => i.status === "da_restituire").length;
      const isCollapsed = !!collapsed[persona];
      html += `<div class="group">
        <button class="group-header toggle-group" data-persona="${esc(persona)}">
          <span><span class="name serif">${esc(persona)}</span><span class="count">${personItems.length} ${personItems.length === 1 ? "oggetto" : "oggetti"}</span></span>
          <span style="display:flex;align-items:center">
            ${daRestituire > 0 ? `<span class="badge-return">${daRestituire} da restituire</span>` : ""}
            <span class="chevron ${isCollapsed ? "" : "open"}">${ICONS.chevron}</span>
          </span>
        </button>`;
      if (!isCollapsed) {
        html += `<div class="items-grid">`;
        personItems.forEach((it) => {
          html += `<div class="item-card">
            <button class="item-del" data-del="${it.id}">${ICONS.trash}</button>
            <div class="item-photo">${it.photo ? `<img src="${it.photo}" />` : ICONS.image}</div>
            <div class="item-body">
              <p class="item-name">${esc(it.nome)}</p>
              ${it.note ? `<p class="item-note">${esc(it.note)}</p>` : ""}
              ${
                it.tipo === "regalo"
                  ? `<span class="status-pill pill-regalo">Regalo</span>`
                  : `<span class="status-pill pill-${it.status}"><span class="dot"></span>${STATUS_LABEL[it.status]}</span>`
              }
              ${
                it.tipo === "prestito" && it.status !== "restituito"
                  ? `<button class="status-btn" data-advance="${it.id}">${
                      it.status === "in_uso" ? "Segna da restituire" : ICONS.check + " Segna restituito"
                    }</button>`
                  : ""
              }
              ${
                it.tipo === "prestito" && it.status === "restituito"
                  ? `<button class="reopen-btn" data-reopen="${it.id}">${ICONS.reopen} Riapri</button>`
                  : ""
              }
            </div>
          </div>`;
        });
        html += `</div>`;
      }
      html += `</div>`;
    });

    html += `<p class="footer-note">I dati restano solo su questo telefono.</p></div>`;
    app.innerHTML = html;
    attachEvents();
  }

  function attachEvents() {
    const toggleFormBtn = document.getElementById("toggle-form");
    if (toggleFormBtn) toggleFormBtn.onclick = () => { showForm = !showForm; formPhoto = null; render(); };

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.oninput = (e) => { query = e.target.value; render(); document.getElementById("search-input").focus(); document.getElementById("search-input").selectionStart = document.getElementById("search-input").value.length; };
    }

    const cancelBtn = document.getElementById("cancel-form");
    if (cancelBtn) cancelBtn.onclick = () => { showForm = false; formPhoto = null; render(); };

    const photoBtn = document.getElementById("photo-btn");
    const photoInput = document.getElementById("photo-input");
    if (photoBtn && photoInput) {
      photoBtn.onclick = () => photoInput.click();
      photoInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        formPhoto = await resizeImage(file);
        render();
      };
    }

    document.querySelectorAll(".tipo-toggle button").forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll(".tipo-toggle button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });

    const form = document.getElementById("add-form");
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const nome = document.getElementById("f-nome").value.trim();
        const persona = document.getElementById("f-persona").value.trim();
        const note = document.getElementById("f-note").value.trim();
        const tipo = document.querySelector(".tipo-toggle button.active").dataset.tipo;
        if (!nome || !persona) return;
        items.unshift({
          id: uid(),
          nome,
          persona,
          tipo,
          note,
          photo: formPhoto,
          status: tipo === "prestito" ? "in_uso" : null,
          dataAggiunta: new Date().toISOString(),
        });
        save();
        showForm = false;
        formPhoto = null;
        render();
      };
    }

    document.querySelectorAll(".toggle-group").forEach((btn) => {
      btn.onclick = () => {
        const p = btn.dataset.persona;
        collapsed[p] = !collapsed[p];
        render();
      };
    });

    document.querySelectorAll("[data-del]").forEach((btn) => {
      btn.onclick = () => {
        items = items.filter((it) => it.id !== btn.dataset.del);
        save();
        render();
      };
    });

    document.querySelectorAll("[data-advance]").forEach((btn) => {
      btn.onclick = () => {
        const it = items.find((i) => i.id === btn.dataset.advance);
        it.status = it.status === "in_uso" ? "da_restituire" : "restituito";
        save();
        render();
      };
    });

    document.querySelectorAll("[data-reopen]").forEach((btn) => {
      btn.onclick = () => {
        const it = items.find((i) => i.id === btn.dataset.reopen);
        it.status = "in_uso";
        save();
        render();
      };
    });
  }

  render();
})();
