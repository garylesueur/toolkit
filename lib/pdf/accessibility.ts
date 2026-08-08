import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFString,
} from "pdf-lib";
import type { PDFObject } from "pdf-lib";

export type AccessibilityFindingStatus =
  | "error"
  | "warning"
  | "pass"
  | "manual";

export type AccessibilityFinding = {
  id: string;
  title: string;
  status: AccessibilityFindingStatus;
  detail: string;
};

export type PdfAccessibilityFacts = {
  pages: number;
  title: string | null;
  language: string | null;
  tagged: boolean;
  structuredElements: number;
  figures: number;
  formFields: number;
  linkAnnotations: number;
};

export type PdfAccessibilityReport = {
  scope: string;
  facts: PdfAccessibilityFacts;
  findings: AccessibilityFinding[];
  summary: Record<AccessibilityFindingStatus, number>;
};

type StructureStats = {
  elements: number;
  figures: number;
  figuresMissingTextAlternative: number;
};

function finding(
  id: string,
  title: string,
  status: AccessibilityFindingStatus,
  detail: string,
): AccessibilityFinding {
  return { id, title, status, detail };
}

function counted(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function readText(dict: PDFDict, key: string): string | null {
  const value = dict.lookupMaybe(PDFName.of(key), PDFString, PDFHexString);
  return value?.decodeText().trim() || null;
}

function readBool(dict: PDFDict, key: string): boolean | null {
  const value = dict.lookupMaybe(PDFName.of(key), PDFBool);
  return value ? value.asBoolean() : null;
}

function readName(dict: PDFDict, key: string): string | null {
  const value = dict.lookupMaybe(PDFName.of(key), PDFName)?.asString();
  return value?.replace(/^\//, "") || null;
}

function inspectStructure(
  pdf: PDFDocument,
  root: PDFDict | undefined,
): StructureStats {
  const stats: StructureStats = {
    elements: 0,
    figures: 0,
    figuresMissingTextAlternative: 0,
  };
  if (!root) return stats;
  const seenRefs = new Set<string>();

  const visit = (input: PDFObject | undefined): void => {
    if (!input) return;
    if (input instanceof PDFRef) {
      const key = input.toString();
      if (seenRefs.has(key)) return;
      seenRefs.add(key);
      visit(pdf.context.lookup(input));
      return;
    }
    if (input instanceof PDFArray) {
      for (let index = 0; index < input.size(); index++)
        visit(input.get(index));
      return;
    }
    if (!(input instanceof PDFDict)) return;

    const role = readName(input, "S");
    if (role) {
      stats.elements += 1;
      if (role === "Figure") {
        stats.figures += 1;
        if (!readText(input, "Alt") && !readText(input, "ActualText")) {
          stats.figuresMissingTextAlternative += 1;
        }
      }
    }
    visit(input.get(PDFName.of("K")));
  };

  visit(root.get(PDFName.of("K")));
  return stats;
}

function inspectLinks(pdf: PDFDocument): {
  total: number;
  missingDescriptions: number;
} {
  let total = 0;
  let missingDescriptions = 0;
  for (const page of pdf.getPages()) {
    const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annotations) continue;
    for (let index = 0; index < annotations.size(); index++) {
      const annotation = annotations.lookupMaybe(index, PDFDict);
      if (!annotation || readName(annotation, "Subtype") !== "Link") {
        continue;
      }
      total += 1;
      if (!readText(annotation, "Contents")) missingDescriptions += 1;
    }
  }
  return { total, missingDescriptions };
}

function inspectForm(pdf: PDFDocument): {
  total: number;
  missingTooltips: number;
} {
  try {
    const fields = pdf.getForm().getFields();
    return {
      total: fields.length,
      missingTooltips: fields.filter(
        (field) => !readText(field.acroField.dict, "TU"),
      ).length,
    };
  } catch {
    return { total: 0, missingTooltips: 0 };
  }
}

export function summariseAccessibilityFindings(
  findings: AccessibilityFinding[],
): Record<AccessibilityFindingStatus, number> {
  return findings.reduce<Record<AccessibilityFindingStatus, number>>(
    (summary, item) => {
      summary[item.status] += 1;
      return summary;
    },
    { error: 0, warning: 0, pass: 0, manual: 0 },
  );
}

export async function analysePdfAccessibility(
  bytes: Uint8Array,
): Promise<PdfAccessibilityReport> {
  if (!bytes.byteLength) throw new Error("Choose a non-empty PDF first.");
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();
  const title = pdf.getTitle()?.trim() || null;
  const language = readText(pdf.catalog, "Lang");
  const markInfo = pdf.catalog.lookupMaybe(PDFName.of("MarkInfo"), PDFDict);
  const marked = markInfo ? readBool(markInfo, "Marked") === true : false;
  const structureRoot = pdf.catalog.lookupMaybe(
    PDFName.of("StructTreeRoot"),
    PDFDict,
  );
  const tagged = marked && !!structureRoot;
  const structure = inspectStructure(pdf, structureRoot);
  const pagesMissingStructureParents = pages.filter(
    (page) => !page.node.lookupMaybe(PDFName.of("StructParents"), PDFNumber),
  ).length;
  const viewerPreferences = pdf.catalog.getViewerPreferences();
  const displayDocumentTitle = viewerPreferences?.getDisplayDocTitle() === true;
  const form = inspectForm(pdf);
  const links = inspectLinks(pdf);
  const findings: AccessibilityFinding[] = [];

  findings.push(
    structureRoot
      ? finding(
          "structure-tree",
          "Document has a structure tree",
          "pass",
          "A StructTreeRoot is present for assistive technology.",
        )
      : finding(
          "structure-tree",
          "Document has no structure tree",
          "error",
          "The PDF is not structurally tagged, so reading order and semantic roles are unavailable to assistive technology.",
        ),
  );
  findings.push(
    marked
      ? finding(
          "marked-content",
          "Tagged-content flag is set",
          "pass",
          "MarkInfo declares the document as containing marked content.",
        )
      : finding(
          "marked-content",
          "Tagged-content flag is missing",
          "error",
          "MarkInfo /Marked is not true.",
        ),
  );
  findings.push(
    language
      ? finding(
          "document-language",
          "Document language is declared",
          "pass",
          `The catalogue language is ${language}.`,
        )
      : finding(
          "document-language",
          "Document language is missing",
          "warning",
          "Add a catalogue /Lang value such as en-GB so screen readers can choose suitable pronunciation rules.",
        ),
  );
  findings.push(
    title
      ? finding(
          "document-title",
          "Document title is present",
          "pass",
          `The metadata title is “${title}”.`,
        )
      : finding(
          "document-title",
          "Document title is missing",
          "warning",
          "Add a concise metadata title that identifies the document.",
        ),
  );
  findings.push(
    displayDocumentTitle
      ? finding(
          "display-document-title",
          "Viewer is asked to display the title",
          "pass",
          "ViewerPreferences /DisplayDocTitle is true.",
        )
      : finding(
          "display-document-title",
          "Display-document-title preference is not set",
          "warning",
          "PDF readers may show the filename instead of the meaningful document title.",
        ),
  );

  if (structureRoot) {
    findings.push(
      structure.elements > 0
        ? finding(
            "structure-content",
            "Structure tree contains semantic elements",
            "pass",
            `Found ${counted(structure.elements, "tagged structure element")}.`,
          )
        : finding(
            "structure-content",
            "Structure tree is empty",
            "error",
            "A structure-tree container exists, but it has no semantic elements.",
          ),
    );
    findings.push(
      pagesMissingStructureParents === 0
        ? finding(
            "page-structure-parent",
            "Every page is linked to the structure tree",
            "pass",
            `All ${counted(pages.length, "page")} contain StructParents references.`,
          )
        : finding(
            "page-structure-parent",
            "Some pages are not linked to the structure tree",
            "error",
            `${pagesMissingStructureParents} of ${counted(pages.length, "page")} ${pages.length === 1 ? "has" : "have"} no StructParents reference.`,
          ),
    );
  }

  if (structure.figures > 0) {
    findings.push(
      structure.figuresMissingTextAlternative === 0
        ? finding(
            "figure-alternatives",
            "Tagged figures have text alternatives",
            "pass",
            `${counted(structure.figures, "figure element")} ${structure.figures === 1 ? "contains" : "contain"} Alt or ActualText values.`,
          )
        : finding(
            "figure-alternatives",
            "Tagged figures lack text alternatives",
            "error",
            `${structure.figuresMissingTextAlternative} of ${counted(structure.figures, "figure element")} ${structure.figures === 1 ? "has" : "have"} no Alt or ActualText value.`,
          ),
    );
  }

  if (form.total > 0) {
    findings.push(
      form.missingTooltips === 0
        ? finding(
            "form-tooltips",
            "Form fields have accessible tooltips",
            "pass",
            `${counted(form.total, "form field")} ${form.total === 1 ? "contains" : "contain"} alternate field names.`,
          )
        : finding(
            "form-tooltips",
            "Form fields lack accessible tooltips",
            "error",
            `${form.missingTooltips} of ${counted(form.total, "form field")} ${form.total === 1 ? "has" : "have"} no /TU alternate field name.`,
          ),
    );
  }

  if (links.total > 0) {
    findings.push(
      links.missingDescriptions === 0
        ? finding(
            "link-descriptions",
            "Link annotations have descriptions",
            "pass",
            `${counted(links.total, "link annotation")} ${links.total === 1 ? "contains" : "contain"} Contents descriptions.`,
          )
        : finding(
            "link-descriptions",
            "Some link annotations lack descriptions",
            "warning",
            `${links.missingDescriptions} of ${counted(links.total, "link")} ${links.total === 1 ? "has" : "have"} no Contents description; verify the tagged link text manually.`,
          ),
    );
  }

  findings.push(
    finding(
      "manual-reading-order",
      "Reading order needs manual review",
      "manual",
      "Follow the tags with a screen reader or structure inspector; presence alone does not prove a sensible sequence.",
    ),
    finding(
      "manual-visual-content",
      "Contrast and visual meaning need manual review",
      "manual",
      "Colour contrast, colour-only meaning, text embedded in images, and reflow quality cannot be certified from these structures.",
    ),
    finding(
      "manual-content-quality",
      "Labels and alternatives need human review",
      "manual",
      "Machine checks can find missing text alternatives, but cannot decide whether descriptions, headings, or labels are accurate and useful.",
    ),
  );

  return {
    scope:
      "Local structural preflight only. This report is not a PDF/UA, WCAG, or legal-accessibility certification.",
    facts: {
      pages: pages.length,
      title,
      language,
      tagged,
      structuredElements: structure.elements,
      figures: structure.figures,
      formFields: form.total,
      linkAnnotations: links.total,
    },
    findings,
    summary: summariseAccessibilityFindings(findings),
  };
}
