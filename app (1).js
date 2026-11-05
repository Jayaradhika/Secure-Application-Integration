const $ = (id) => document.getElementById(id);
const state = { page: 1, limit: 4, totalPages: 1 };
let searchTimer;

// ---------- Load and render ----------
async function loadInternships() {
  const box = $("state");
  box.className = "";
  box.textContent = "Loading internships...";
  $("list").replaceChildren();

  const params = new URLSearchParams({ page: state.page, limit: state.limit });
  if ($("status").value) params.set("status", $("status").value);
  if ($("search").value.trim()) params.set("q", $("search").value.trim());

  try {
    const res = await fetch(`/api/internships?${params}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message || "Request failed");

    state.totalPages = Math.max(body.meta.total_pages, 1);
    renderList(body.data);
    box.textContent = body.data.length ? "" : "No internships match your search.";
    $("page-info").textContent = `Page ${body.meta.page} of ${state.totalPages}`;
    $("prev").disabled = state.page <= 1;
    $("next").disabled = state.page >= state.totalPages;
  } catch (err) {
    box.className = "error";
    box.textContent = `Could not load internships. ${err.message} `;
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry";
    retry.addEventListener("click", loadInternships);
    box.append(retry);
    $("prev").disabled = true;
    $("next").disabled = true;
  }
}

function renderList(items) {
  const frag = document.createDocumentFragment();
  items.forEach((it) => {
    const li = document.createElement("li");
    li.className = "item";

    const info = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.textContent = it.title; // textContent: never insert API data as HTML
    const badge = document.createElement("span");
    badge.className = `badge ${it.status}`;
    badge.textContent = it.status;
    h3.append(badge);
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = `${it.company} | ${it.location} | ${it.work_mode} | ${it.duration_weeks} weeks | Stipend ${it.stipend}`;
    info.append(h3, meta);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Apply";
    btn.disabled = it.status !== "open";
    btn.addEventListener("click", () => openForm(it));

    li.append(info, btn);
    frag.append(li);
  });
  $("list").replaceChildren(frag);
}

// ---------- Application form ----------
const FIELDS = ["full_name", "email", "phone", "cover_note"];

function openForm(it) {
  $("internship_id").value = it.id;
  $("apply-for").textContent = `${it.title} at ${it.company}`;
  $("apply-form").reset();
  $("internship_id").value = it.id;
  clearErrors();
  setMessage("", "");
  $("apply-section").hidden = false;
  $("apply-section").scrollIntoView({ behavior: "smooth" });
  $("full_name").focus();
}

function clearErrors() {
  FIELDS.forEach((f) => {
    $(`err-${f}`).textContent = "";
    $(f).removeAttribute("aria-invalid");
  });
}

function showError(field, message) {
  const err = $(`err-${field}`);
  if (!err) return;
  err.textContent = message;
  $(field).setAttribute("aria-invalid", "true");
}

function setMessage(text, kind) {
  const m = $("form-message");
  m.textContent = text;
  m.className = `form-message ${kind}`;
}

// Client-side checks (the server repeats them: never trust the client alone)
function validateClient(v) {
  const errors = {};
  if (v.full_name.length < 2 || v.full_name.length > 100) errors.full_name = "Name must be 2 to 100 characters";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.email = "Enter a valid email address";
  if (v.phone && !/^[0-9+\-\s]{7,15}$/.test(v.phone)) errors.phone = "Phone must be 7 to 15 digits";
  if (v.cover_note.length < 20 || v.cover_note.length > 1000) errors.cover_note = "Cover note must be 20 to 1000 characters";
  return errors;
}

$("apply-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();
  setMessage("", "");

  const values = {
    full_name: $("full_name").value.trim(),
    email: $("email").value.trim(),
    phone: $("phone").value.trim(),
    cover_note: $("cover_note").value.trim(),
  };
  const errors = validateClient(values);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([f, m]) => showError(f, m));
    $(Object.keys(errors)[0]).focus();
    return;
  }

  const submit = $("submit");
  submit.disabled = true;
  submit.textContent = "Submitting...";

  try {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, internship_id: Number($("internship_id").value) }),
    });
    const body = res.status === 204 ? {} : await res.json();

    if (res.status === 201) {
      setMessage("Application submitted. Good luck!", "ok");
      $("apply-form").reset();
    } else if (res.status === 400 && body.error?.details) {
      body.error.details.forEach((d) => showError(d.field, d.message));
      setMessage("Please fix the highlighted fields.", "fail");
    } else {
      setMessage(body.error?.message || "Something went wrong. Please try again.", "fail");
    }
  } catch {
    setMessage("Network problem. Check your connection and try again.", "fail");
  } finally {
    submit.disabled = false;
    submit.textContent = "Submit application";
  }
});

$("cancel").addEventListener("click", () => ($("apply-section").hidden = true));

// ---------- Controls ----------
$("prev").addEventListener("click", () => { state.page--; loadInternships(); });
$("next").addEventListener("click", () => { state.page++; loadInternships(); });
$("status").addEventListener("change", () => { state.page = 1; loadInternships(); });
$("search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.page = 1; loadInternships(); }, 300);
});

loadInternships();
