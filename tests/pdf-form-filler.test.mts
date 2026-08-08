import assert from "node:assert/strict";
import test from "node:test";

import { PDFDocument } from "pdf-lib";

import { fillPdfForm, inspectPdfForm } from "../lib/pdf/forms.ts";

async function formFixture() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([500, 700]);
  const form = pdf.getForm();
  form
    .createTextField("person.name")
    .addToPage(page, { x: 40, y: 600, width: 200, height: 24 });
  form
    .createCheckBox("terms.accepted")
    .addToPage(page, { x: 40, y: 550, width: 18, height: 18 });
  const dropdown = form.createDropdown("country");
  dropdown.addOptions(["France", "Jersey", "United Kingdom"]);
  dropdown.addToPage(page, { x: 40, y: 500, width: 160, height: 24 });
  const radio = form.createRadioGroup("contact.method");
  radio.addOptionToPage("Email", page, {
    x: 40,
    y: 450,
    width: 18,
    height: 18,
  });
  radio.addOptionToPage("Phone", page, {
    x: 100,
    y: 450,
    width: 18,
    height: 18,
  });
  const list = form.createOptionList("interests");
  list.addOptions(["Design", "Engineering", "Writing"]);
  list.enableMultiselect();
  list.addToPage(page, { x: 40, y: 350, width: 160, height: 80 });
  return pdf.save();
}

test("form inspection reports field types, options, and initial values", async () => {
  const inspection = await inspectPdfForm(await formFixture());
  assert.equal(inspection.hasXfa, false);
  assert.deepEqual(
    inspection.fields.map((field) => field.type),
    ["text", "checkbox", "dropdown", "radio", "options"],
  );
  assert.deepEqual(
    inspection.fields.find((field) => field.name === "country")?.options,
    ["France", "Jersey", "United Kingdom"],
  );
});

test("form filling persists values for every supported field type", async () => {
  const output = await fillPdfForm(
    await formFixture(),
    {
      "person.name": "Ada Lovelace",
      "terms.accepted": true,
      "country": "Jersey",
      "contact.method": "Email",
      "interests": ["Design", "Writing"],
    },
    false,
  );
  const form = (await PDFDocument.load(output)).getForm();
  assert.equal(form.getTextField("person.name").getText(), "Ada Lovelace");
  assert.equal(form.getCheckBox("terms.accepted").isChecked(), true);
  assert.deepEqual(form.getDropdown("country").getSelected(), ["Jersey"]);
  assert.equal(form.getRadioGroup("contact.method").getSelected(), "Email");
  assert.deepEqual(form.getOptionList("interests").getSelected(), [
    "Design",
    "Writing",
  ]);
});

test("flattening removes interactive fields after baking appearances", async () => {
  const output = await fillPdfForm(
    await formFixture(),
    { "person.name": "Flattened" },
    true,
  );
  assert.equal(
    (await PDFDocument.load(output)).getForm().getFields().length,
    0,
  );
});
