(function () {
  const STORAGE_KEY = "oggetti-bebe-items";
  const CATEGORY_KEY = "oggetti-bebe-categorie";
  const NEW_CATEGORY_VALUE = "__new__";
  const DEFAULT_CATEGORIES = [
    "Biberon", "Bilancia", "Body", "Box", "Calze/Scarpe", "Cappello/Cuffia",
    "Cappottino", "Coperta", "Culla", "Fascia/Marsupio", "Felpa/Maglione",
    "Giacca", "Giochi", "Lettino", "Maglietta", "Ovetto", "Pantaloni",
    "Passeggino", "Pigiama", "Sacco nanna", "Scaldabiberon", "Sterilizzatore",
    "Tiralatte", "Tutina", "Vaschetta bagno", "Altro",
  ];
  const OLD_DEFAULT_CATEGORIES = [
    "Tutina", "Body", "Pigiama", "Cappottino", "Copertina",
    "Passeggino", "Ovetto/Seggiolino auto", "Culla", "Lettino",
    "Vaschetta per il bagno", "Fascia/Marsupio", "Sterilizzatore",
    "Scaldabiberon", "Ciuccio", "Box", "Girello", "Altro",
  ];
  const ICONS = {
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    edit: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
    check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    reopen: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  };
  const STATUS_LABEL = { in_uso: "In uso", da_restituire: "Da restituire", restituito: "Restituito" };

  let items = load();
  let categories = loadCategories();
  let query = "";
  let showForm = false;
  let collapsed = {};
  let editingId = null;
  let formPhoto = null;
  let formTipo = "prestito";
  let selectValue = categories[0] || NEW_CATEGORY_VALUE;
  let draft = { persona: "", note: "", valore: "", customNome: "" };

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

  function loadCategories() {
    let stored = [];
    try {
      const raw = localStorage.getItem(CATEGORY_KEY);
      stored = raw ? JSON.parse(raw) : [];
    } catch (e) {
      stored = [];
    }
    const existingItems = load();
    const usedNames = new Set(existingItems.map((it) => it.nome).filter(Boolean));
    // Drop unused old default entries that aren't part of the new list
    const dropSet = new Set(
      OLD_DEFAULT_CATEGORIES.filter((c) => !DEFAULT_CATEGORIES.includes(c) && !usedNames.has(c))
    );
    const merged = new Set();
    DEFAULT_CATEGORIES.forEach((c) => merged.add(c));
    stored.forEach((c) => { if (!dropSet.has(c)) merged.add(c); });
    usedNames.forEach((c) => merged.add(c));
    merged.delete("Altro");
    const sorted = Array.from(merged).sort((a, b) => a.localeCompare(b, "it"));
    sorted.push("Altro");
    saveCategories(sorted);
    return sorted;
  }

  function saveCategories(cats) {
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(cats));
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

  function resetForm() {
    editingId = null;
    formPhoto = null;
    formTipo = "prestito";
    selectValue = categories[0] || NEW_CATEGORY_VALUE;
    draft = { persona: "", note: "", valore: "", customNome: "" };
  }

  function startEdit(it) {
    editingId = it.id;
    formPhoto = it.photo || null;
    formTipo = it.tipo;
    selectValue = categories.includes(it.nome) ? it.nome : NEW_CATEGORY_VALUE;
    draft = {
      persona: it.persona,
      note: it.note || "",
      valore: it.valore != null ? String(it.valore) : "",
      customNome: categories.includes(it.nome) ? "" : it.nome,
    };
    showForm = true;
    render();
    const formEl = document.getElementById("add-form");
    if (formEl && typeof formEl.scrollIntoView === "function") {
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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

    const totaleRisparmiato = items
      .filter((it) => it.tipo === "prestito" && it.valore)
      .reduce((sum, it) => sum + it.valore, 0);

    let html = `<div class="wrap">
      <div class="header">
        <div>
          <h1 class="serif">Oggetti del bebè</h1>
          <p>Chi ti ha prestato cosa, e cosa resta da restituire</p>
        </div>
        <button class="btn-add" id="toggle-form">${ICONS.plus} Aggiungi</button>
      </div>`;

    if (totaleRisparmiato > 0) {
      html += `<div class="savings-card">
        <span class="savings-label">Risparmiati finora grazie ai prestiti</span>
        <span class="savings-amount">€ ${totaleRisparmiato.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
      </div>`;
    }

    if (items.length > 0) {
      html += `<div class="search-wrap">
        <span class="search-icon">${ICONS.search}</span>
        <input id="search-input" placeholder="Cerca per persona o oggetto..." value="${esc(query)}" />
      </div>`;
    }

    if (showForm) {
      const catOptions = categories
        .map((c) => `<option value="${esc(c)}" ${selectValue === c ? "selected" : ""}>${esc(c)}</option>`)
        .join("");
      html += `<form class="form-card" id="add-form">
        <p class="form-title">${editingId ? "Modifica oggetto" : "Nuovo oggetto"}</p>
        <div class="form-row">
          <div class="photo-preview" id="photo-preview">
            ${formPhoto ? `<img src="${formPhoto}" />` : ICONS.camera}
          </div>
          <div class="form-fields">
            <select id="f-nome-select">
              ${catOptions}
              <option value="${NEW_CATEGORY_VALUE}" ${selectValue === NEW_CATEGORY_VALUE ? "selected" : ""}>+ Aggiungi nuova voce...</option>
            </select>
            ${
              selectValue === NEW_CATEGORY_VALUE
                ? `<input id="f-nome-custom" placeholder="Nome nuovo oggetto" value="${esc(draft.customNome)}" />`
                : ""
            }
            <input id="f-persona" placeholder="Da chi? (nome)" value="${esc(draft.persona)}" />
          </div>
        </div>
        <div class="photo-actions">
          <button type="button" id="btn-camera">${ICONS.camera} Scatta foto</button>
          <button type="button" id="btn-gallery">${ICONS.image} Dalla galleria</button>
        </div>
        <input type="file" accept="image/*" capture="environment" id="photo-input-camera" style="display:none" />
        <input type="file" accept="image/*" id="photo-input-gallery" style="display:none" />
        <div class="tipo-toggle">
          <button type="button" data-tipo="prestito" class="${formTipo === "prestito" ? "active" : ""}">In prestito</button>
          <button type="button" data-tipo="regalo" class="${formTipo === "regalo" ? "active" : ""}">Regalo</button>
        </div>
        <input id="f-valore" type="number" min="0" step="0.5" placeholder="Valore stimato € (facoltativo)" value="${esc(draft.valore)}" style="margin-bottom:12px" />
        <textarea id="f-note" rows="2" placeholder="Note (taglia, dove si trova, ecc.) - facoltativo">${esc(draft.note)}</textarea>
        <div class="form-actions">
          <button type="button" class="cancel" id="cancel-form">Annulla</button>
          <button type="submit" class="save">${editingId ? "Aggiorna" : "Salva"}</button>
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
            <div class="item-card-actions">
              <button class="item-action" data-edit="${it.id}">${ICONS.edit}</button>
              <button class="item-action" data-del="${it.id}">${ICONS.trash}</button>
            </div>
            <div class="item-photo">${it.photo ? `<img src="${it.photo}" />` : ICONS.image}</div>
            <div class="item-body">
              <p class="item-name">${esc(it.nome)}</p>
              ${it.note ? `<p class="item-note">${esc(it.note)}</p>` : ""}
              ${it.valore ? `<p class="item-note">€ ${it.valore.toLocaleString("it-IT")}</p>` : ""}
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
    if (toggleFormBtn) toggleFormBtn.onclick = () => {
      if (showForm) { showForm = false; } else { resetForm(); showForm = true; }
      render();
    };

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.oninput = (e) => {
        query = e.target.value;
        render();
        const el = document.getElementById("search-input");
        el.focus();
        el.selectionStart = el.value.length;
      };
    }

    const cancelBtn = document.getElementById("cancel-form");
    if (cancelBtn) cancelBtn.onclick = () => { showForm = false; resetForm(); render(); };

    const btnCamera = document.getElementById("btn-camera");
    const inputCamera = document.getElementById("photo-input-camera");
    const btnGallery = document.getElementById("btn-gallery");
    const inputGallery = document.getElementById("photo-input-gallery");
    const handlePhotoFile = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      formPhoto = await resizeImage(file);
      render();
    };
    if (btnCamera && inputCamera) {
      btnCamera.onclick = () => inputCamera.click();
      inputCamera.onchange = handlePhotoFile;
    }
    if (btnGallery && inputGallery) {
      btnGallery.onclick = () => inputGallery.click();
      inputGallery.onchange = handlePhotoFile;
    }

    document.querySelectorAll(".tipo-toggle button").forEach((btn) => {
      btn.onclick = () => { formTipo = btn.dataset.tipo; render(); };
    });

    const selectEl = document.getElementById("f-nome-select");
    if (selectEl) selectEl.onchange = (e) => { selectValue = e.target.value; render(); };

    const customNomeEl = document.getElementById("f-nome-custom");
    if (customNomeEl) customNomeEl.oninput = (e) => { draft.customNome = e.target.value; };

    const personaEl = document.getElementById("f-persona");
    if (personaEl) personaEl.oninput = (e) => { draft.persona = e.target.value; };

    const noteEl = document.getElementById("f-note");
    if (noteEl) noteEl.oninput = (e) => { draft.note = e.target.value; };

    const valoreEl = document.getElementById("f-valore");
    if (valoreEl) valoreEl.oninput = (e) => { draft.valore = e.target.value; };

    const form = document.getElementById("add-form");
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        let nome = selectValue === NEW_CATEGORY_VALUE ? draft.customNome.trim() : selectValue;
        const persona = draft.persona.trim();
        const note = draft.note.trim();
        const tipo = formTipo;
        const valore = draft.valore ? parseFloat(draft.valore) : null;
        if (!nome || !persona) return;

        if (!categories.includes(nome)) {
          categories.push(nome);
          saveCategories(categories);
        }

        if (editingId) {
          const it = items.find((i) => i.id === editingId);
          it.nome = nome;
          it.persona = persona;
          it.tipo = tipo;
          it.note = note;
          it.valore = valore;
          it.photo = formPhoto;
          if (tipo === "regalo") it.status = null;
          else if (!it.status) it.status = "in_uso";
        } else {
          items.unshift({
            id: uid(),
            nome,
            persona,
            tipo,
            note,
            valore,
            photo: formPhoto,
            status: tipo === "prestito" ? "in_uso" : null,
            dataAggiunta: new Date().toISOString(),
          });
        }
        save();
        showForm = false;
        resetForm();
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

    document.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.onclick = () => {
        const it = items.find((i) => i.id === btn.dataset.edit);
        if (it) startEdit(it);
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
