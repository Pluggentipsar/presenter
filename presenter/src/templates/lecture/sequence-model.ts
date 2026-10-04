export type SequenceProps = { [key: string]: unknown };
export type SequenceField = [name: string, label: string, type?: 'image'];
export const sequenceSteps: Record<string, number> = { material: 7, learning: 8, agency: 5 };
export function sequenceWindow(props: SequenceProps) {
  const total=sequenceSteps[String(props.sequence)]||1;
  const start=Math.min(total-1,Math.max(0,Math.floor(Number(props.startStep)||0)));
  const requestedEnd=Number(props.endStep);
  const end=Math.max(start,Math.min(total-1,Number.isFinite(requestedEnd)?Math.floor(requestedEnd):total-1));
  return {start,end,count:end-start+1};
}
const common: SequenceField[] = [['title','Ingångens rubrik'],['credit','Illustrationsetikett'],['image','Huvudbild','image'],['imageAlt','Bildbeskrivning']];
export const sequenceFields: Record<string, SequenceField[]> = {
  material: [...common,
    ['promptLabel','Promptens avsändare'],['prompt1','Avskriftsbeställning'],['prompt2','Bildbeställning'],['prompt3','Poddmanusbeställning'],
    ['title2','Rubrik · visuell förklaring'],['title3','Rubrik · poddmanus'],['transcriptTitle','Avskriftens rubrik'],['transcript','Avskrift · en rad per punkt'],['transcriptNote','Avskriftens avgränsning'],
    ['context1','Första situationen'],['context2','Andra situationen'],['greeting1','Första hälsningen'],['greeting2','Andra hälsningen'],['question','Gemensam mening'],['concept','Begreppet'],['conceptNote','Begreppets förklaring'],
    ['voice1','Första rösten'],['voice2','Andra rösten'],['line1','Första repliken'],['line2','Andra repliken'],['pause','Tänkestopp'],['audioNote','Manusets etikett'],['headphones','Hörlurar','image'],['headphonesAlt','Hörlurarnas bildbeskrivning'],['phase1','Fas · underlag'],['phase2','Fas · bild'],['phase3','Fas · ljud'],
  ],
  learning: [...common,
    ['promptLabel','Elevpromptens avsändare'],['prompt1','Första originalprompten'],['prompt2','Andra originalprompten'],['task','Elevens uppgift'],['paperTitle','Arbetsytans rubrik'],['answerLabel','AI-svarets etikett'],['answer','Illustrerat AI-svar'],['outcome','Frågan efter färdig text'],['helpLabel','Hjälpens etikett'],['soloLabel','Självständigt arbete · etikett'],
    ['aiQuestion','AI:s fråga'],['studentLabel','Elevförsökets etikett'],['studentAnswer','Illustrerat elevförsök'],['transferTitle','Uppföljningens rubrik'],['transferQuestion','Nytt problem'],['transferNote','Uppföljningens instruktion'],['writingImage','Skrivande hand','image'],['writingImageAlt','Skrivbildens beskrivning'],
  ],
  agency: [...common,
    ['capacity1','Möjlighet 1'],['capacity2','Möjlighet 2'],['capacity3','Möjlighet 3'],['capacity4','Möjlighet 4'],['thesis','Talarens tes'],['generation','Återkoppling till generationen'],['generationQuestion','Fråga om generationen'],['closing','Slutcitat'],['busImage','Bussmiljö','image'],['busImageAlt','Bussbildens beskrivning'],
  ],
};
