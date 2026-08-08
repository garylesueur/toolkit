import {
  PDFButton,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
  StandardFonts,
} from "pdf-lib";

export type PdfFormFieldType =
  | "text"
  | "checkbox"
  | "dropdown"
  | "options"
  | "radio"
  | "button"
  | "signature"
  | "unknown";
export type PdfFormValue = string | string[] | boolean;
export type PdfFormFieldDescriptor = {
  name: string;
  options: string[];
  readOnly: boolean;
  required: boolean;
  type: PdfFormFieldType;
  value: PdfFormValue;
};

function fieldType(field: unknown): PdfFormFieldType {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "options";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFButton) return "button";
  if (field instanceof PDFSignature) return "signature";
  return "unknown";
}

export async function inspectPdfForm(
  source: Uint8Array,
): Promise<{ fields: PdfFormFieldDescriptor[]; hasXfa: boolean }> {
  const pdf = await PDFDocument.load(source);
  const form = pdf.getForm();
  const fields = form.getFields().map((field): PdfFormFieldDescriptor => {
    const type = fieldType(field);
    let options: string[] = [];
    let value: PdfFormValue = "";
    if (field instanceof PDFTextField) value = field.getText() ?? "";
    else if (field instanceof PDFCheckBox) value = field.isChecked();
    else if (field instanceof PDFDropdown) {
      options = field.getOptions();
      value = field.getSelected()[0] ?? "";
    } else if (field instanceof PDFOptionList) {
      options = field.getOptions();
      value = field.getSelected();
    } else if (field instanceof PDFRadioGroup) {
      options = field.getOptions();
      value = field.getSelected() ?? "";
    }
    return {
      name: field.getName(),
      options,
      readOnly: field.isReadOnly(),
      required: field.isRequired(),
      type,
      value,
    };
  });
  return { fields, hasXfa: form.hasXFA() };
}

export async function fillPdfForm(
  source: Uint8Array,
  values: Record<string, PdfFormValue>,
  flatten: boolean,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source);
  const form = pdf.getForm();
  if (form.hasXFA())
    throw new Error(
      "This PDF uses XFA forms, which cannot be filled reliably in the browser.",
    );
  for (const field of form.getFields()) {
    if (field.isReadOnly() || !(field.getName() in values)) continue;
    const value = values[field.getName()];
    if (field instanceof PDFTextField && typeof value === "string")
      field.setText(value);
    else if (field instanceof PDFCheckBox && typeof value === "boolean") {
      if (value) field.check();
      else field.uncheck();
    } else if (
      field instanceof PDFDropdown &&
      typeof value === "string" &&
      value
    )
      field.select(value);
    else if (field instanceof PDFOptionList && Array.isArray(value))
      field.select(value);
    else if (
      field instanceof PDFRadioGroup &&
      typeof value === "string" &&
      value
    )
      field.select(value);
  }
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  if (flatten) form.flatten({ updateFieldAppearances: false });
  pdf.setProducer("Toolkit — toolkit.lesueur.uk");
  return pdf.save({ useObjectStreams: true });
}
