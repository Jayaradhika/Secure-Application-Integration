// Server-side validation for application form data.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[0-9+\-\s]{7,15}$/;

function validateApplication(body) {
  const b = body && typeof body === "object" ? body : {};
  const errors = [];
  const value = {};

  if (!Number.isInteger(b.internship_id) || b.internship_id < 1) {
    errors.push({ field: "internship_id", message: "internship_id must be a positive integer" });
  } else value.internship_id = b.internship_id;

  const name = typeof b.full_name === "string" ? b.full_name.trim() : "";
  if (name.length < 2 || name.length > 100) {
    errors.push({ field: "full_name", message: "Name must be 2 to 100 characters" });
  } else value.full_name = name;

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL.test(email)) {
    errors.push({ field: "email", message: "Enter a valid email address" });
  } else value.email = email;

  if (b.phone !== undefined && b.phone !== null && b.phone !== "") {
    if (typeof b.phone !== "string" || !PHONE.test(b.phone.trim())) {
      errors.push({ field: "phone", message: "Phone must be 7 to 15 digits (+, - and spaces allowed)" });
    } else value.phone = b.phone.trim();
  } else value.phone = null;

  const note = typeof b.cover_note === "string" ? b.cover_note.trim() : "";
  if (note.length < 20 || note.length > 1000) {
    errors.push({ field: "cover_note", message: "Cover note must be 20 to 1000 characters" });
  } else value.cover_note = note;

  return { errors, value };
}

module.exports = { validateApplication };
