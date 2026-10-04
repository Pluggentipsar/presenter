import type { FieldSchema, TemplateSchema } from "@/lib/template-schemas";
import type { SchemaFamily } from "@/lib/schema-familj";
import { lectureLayouts, lectureCommonFields, lectureLayoutFields, lectureLabels, planningRoomFields, planningPrincipleFields, openingFields } from "./scene-model";
import { sequenceFields } from "./sequence-model";

/** Lecture-motorn: scener och sekvenser. Flyttat ur lib/template-schemas.ts 3 oktober 2026. */
const schemas: Record<string, TemplateSchema> = {
  LectureSequence: {
    name: "LectureSequence",
    description: "Sammanhängande formprov: tavlans resa, prestation och lärande, agens. Varje sekvens styrs helt med clickern.",
    fields: [{name:"sceneGroup",label:"Sammanhängande rum · samma id på intilliggande scener",type:"text"},{name:"sequence",label:"Sekvens",type:"select",options:Object.keys(sequenceFields),default:"material"},{name:"startStep",label:"Första läget (0-baserat)",type:"number"},{name:"endStep",label:"Sista läget (tomt = hela sekvensen)",type:"number"},{name:"sourceUrl",label:"Källänk",type:"text"},{name:"sceneMotion",label:"Scenövergång",type:"select",options:["default","lift","depth","dissolve"],default:"default"}],
    hasContent: false,
  },
  LectureScene: {
    name: "LectureScene",
    description: "Lärarens Solkraft · fotografi, glas, stora frågor och klickstyrda exempel. Samma scen i presentation och R-editor.",
    fields: [
      {name:"layout",label:"Scenform",type:"select",options:[...lectureLayouts],default:"poster"},
      {name:"tone",label:"Bakgrund",type:"select",options:["paper","night","sun"],default:"paper"},
      {name:"tempo",label:"Funktion i föreläsningen",type:"select",options:["nedslag","exempel","brygga","samtal"]},
      {name:"ambient",label:"Levande gradient",type:"select",options:["none","quiet","flow"],default:"none"},
      {name:"sceneMotion",label:"Scenövergång",type:"select",options:["default","lift","depth","dissolve"],default:"default"},
      {name:"spatialStory",label:"Sammanhängande rum",type:"select",options:["none","planning","principles"],default:"none"},
    ],
    hasContent: false,
  },
};

export const lectureSchemaFamily: SchemaFamily = {
  schemas,
  resolve(tag, props) {
    if (tag === "LectureSequence") {
      const fields:FieldSchema[]=(sequenceFields[String(props.sequence??'material')]??sequenceFields.material).filter(([name])=>props.startStep===undefined||name in props).map(([name,label,type])=>({name,label,type:type??'multiline'}));
      if(props.prompt!==undefined)fields.push({name:"prompt",label:"Hela originalprompten",type:"multiline"});
      if(props.startStep!==undefined)fields.push({name:"syfte",label:"Syfte",type:"multiline"},{name:"kalla",label:"Underlag",type:"multiline"});
      return {schema:{...schemas.LectureSequence,fields:[...schemas.LectureSequence.fields,...fields]},isFallback:false};
    }
    if (tag === "LectureScene") {
      const layout=String(props.layout ?? "poster");
      const names=[...new Set([...lectureCommonFields,...(lectureLayoutFields[layout]??[]),...(openingFields[String(props.composition)]??[]),...(props.spatialStory==="planning"?planningRoomFields:[]),...(props.spatialStory==="principles"?planningPrincipleFields:[]),"syfte","kalla"])];
      const fields:FieldSchema[]=names.map(name=>({name,label:lectureLabels[name]??name.replace(/^item(\d+)$/, "Punkt $1").replace(/^detail(\d+)$/, "Förklaring $1"),type:["image","image2","background","poster","contextImage","busImage"].includes(name)||/^stepImage\d+$/.test(name)?"image":"multiline"}));
      if(layout.startsWith("word-"))for(const field of fields){
        if(field.name==="title")field.label="Rubrik i navigatorn (scenens ord redigeras nedan)";
        if(layout==="word-turn"&&field.name==="word")field.label="Ordet som flyttas";
      }
      if(layout==="steps") fields.push({name:"groupSize",label:"Punkter per klick",type:"select",options:["1","3"],default:"1"});
      if(layout==="flow") fields.push({name:"reveal",label:"Visning",type:"select",options:["stegvis","allt"],default:"stegvis"});
      if(["chat","compare","film"].includes(layout)) fields.push({name:"typePrompt",label:"Skriv fram prompten",type:"select",options:["nej","ja"],default:"nej"});
      if(["chat","film"].includes(layout)) fields.push({name:"audio",label:"Endast ljud",type:"select",options:["nej","ja"],default:"nej"},{name:"sound",label:"Filmljud",type:"select",options:["på","av"],default:"på"});
      return {schema:{...schemas.LectureScene,fields:[...schemas.LectureScene.fields,...fields]},isFallback:false};
    }
    return null;
  },
};
