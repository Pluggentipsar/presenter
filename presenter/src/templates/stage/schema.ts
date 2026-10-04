import type { FieldSchema, TemplateSchema } from "@/lib/template-schemas";
import type { SchemaFamily } from "@/lib/schema-familj";
import { resolveStageForm, stageFormFieldLabel, stageFormFieldType, stageFormIds, stageForms } from "./stage-forms";

/** Stage-motorns former. Flyttat ur lib/template-schemas.ts 3 oktober 2026. */
const schemas: Record<string, TemplateSchema> = {
  Stage: {
    name: "Stage",
    description: "Stage-motorn: ett sjuttiotal former för föreläsningar, med världen bakom, clickersteg och temaroller som följer T. Formen väljs med fältet form; varje text är ett eget fält.",
    fields: [
      { name: "form", label: "Form", type: "select", required: true, options: stageFormIds },
    ],
    hasContent: false,
  },
};

export const stageFormsSchemaFamily: SchemaFamily = {
  schemas,
  resolve(tag, props) {
    if (tag === "Stage") {
      const form = resolveStageForm(props.form);
      if (form) {
        const fields: FieldSchema[] = stageForms[form].fields.map(name => ({ name, label: stageFormFieldLabel(name, form), type: stageFormFieldType(name) }));
        return { schema: { ...schemas.Stage, fields: [{ name: "form", label: "Form", type: "select", required: true, options: stageFormIds }, ...fields] }, isFallback: false };
      }
    }
    return null;
  },
};
