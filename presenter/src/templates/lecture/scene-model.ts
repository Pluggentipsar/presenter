import { assessmentFields, assessmentLabels, assessmentSteps } from './assessment-model.ts';
export const lectureLayouts = ['poster','portrait','quote','bus','chat','compare','corners','film','document','steps','flow','research','puzzle','circuit','gallery','study','story','lever','horizon','time-value','evidence','handoff','focus','voice-poster','word-turn','word-return'] as const;
export type LectureLayout = typeof lectureLayouts[number];
export type LectureProps = { layout?: string; [key: string]: unknown };
export const fieldText = (props: LectureProps, key: string) => String(props[key] ?? '');
export const itemKeys = (props: LectureProps) => Array.from({length:9},(_,i)=>`item${i+1}`).filter(key=>fieldText(props,key));
export function lectureStepCount(props: LectureProps): number {
  if (assessmentSteps[String(props.composition)]) return assessmentSteps[String(props.composition)];
  if(props.composition==='teaching-design') return Number(props.designPhase)===1?2:1;
  if(props.composition==='two-voices') return 2;
  if(props.composition==='source-design') return 6;
  if(props.composition==='epa-insertion') return 2;
  if(props.composition==='knowledge-filter') return 2;
  if(props.composition==='who-when-how') return 3;
  if(props.composition==='ai-doping') return 3;
  if(props.composition==='research-overview') return 3;
  if(props.composition==='automation-shortcut') return 2;
  if(props.composition==='privacy-journey') return 8;
  if(props.composition==='learning-reframe') return 2;
  if(props.composition==='dictation-value') return 3;
  if(props.composition==='game-pitch') return props.demoKind==='circuit'?4:3;
  if(props.composition==='practice-field') return 1;
  if(props.composition==='material-journey') return 12;
  if(props.composition==='badminton-bridge'||props.composition==='class-perspectives') return 2;
  if(props.composition==='epa-listening') return 4;
  if(props.composition==='speaker-video') return 2;
  if(props.composition==='toolbox') return 2;
  if(props.spatialStory==='principles') return 2;
  const layout = props.layout ?? 'poster';
  if(layout==='word-turn') return 2;
  if(layout==='word-return') return 3;
  if(layout==='time-value') return props.after?2:1;
  if(layout==='evidence') return 3;
  if(layout==='focus') return Math.max(1,Math.ceil(itemKeys(props).length/Math.max(1,Number(props.groupSize)||1)));
  if(layout==='handoff') return Math.max(1,itemKeys(props).length);
  if(layout==='bus') return 3;
  if(layout==='chat') return 1 + Number(props.fullPromptStep==='ja') + Number(Boolean(props.response || props.videoSrc || props.image2)) + Number(Boolean(props.outcome));
  if(layout==='compare') return 2 + Number(Boolean(props.outcome));
  if(layout==='poster') return props.after ? 2 : 1;
  if(layout==='film') return props.prompt ? 2 : 1;
  if(layout==='research') return 3;
  if(layout==='circuit' || layout==='puzzle' || layout==='lever' || layout==='horizon') return 2;
  if(layout==='document') return props.word ? 3 : 1;
  if(layout==='gallery') return props.prompt ? 2 : 1;
  if(layout==='study') return 3;
  if(layout==='steps') return Math.max(1,Math.ceil(itemKeys(props).length / Math.max(1,Number(props.groupSize)||1)));
  if(layout==='flow') return props.reveal==='allt' ? 1 : Math.max(1,itemKeys(props).length);
  if(layout==='story') return Math.max(1,itemKeys(props).length+1);
  return 1;
}
export const lectureLabels:Record<string,string> = {
  ...assessmentLabels,
  processLabels:'Förlopp över slides · etiketter separerade med |',processStep:'Aktiv del i förloppet (0 = första)',composition:'Komposition (chapter / wide / closing)',role:'Färgroll (human / ai / review)',visual:'Underlagets form (paper / photo / person / voice / game / circuit)',contextTitle:'Underlagets rubrik',contextBody:'Underlagets text',contextImage:'Underlagets bild',contextImageAlt:'Underlagets bildbeskrivning',promptExcerpt:'Synligt ordagrant promptutdrag',fullPromptStep:'Hela prompten på nästa klick (ja / nej)',phoneTitle:'Mobilens rubrik',phoneLabel:'Chattens illustrationsetikett',busImage:'Frilagd buss',busImageAlt:'Bussens bildbeskrivning',
  title:'Rubrik',subtitle:'Underrubrik',after:'Nästa klick · landning',label:'Överrad',credit:'Källa / bildtext',sourceUrl:'Källänk',image:'Bild',imageAlt:'Bildbeskrivning',image2:'Bild efter klick',image2Alt:'Andra bildens beskrivning',background:'Bakgrundsbild',backgroundVideo:'Bakgrundsfilm',videoSrc:'Film eller ljud',poster:'Filmens väntbild',prompt:'Hela prompten',prompt2:'Andra prompten',promptLabel:'Promptens avsändare',response:'Svar · separat klick',responseLabel:'Svarets avsändare',outcome:'Sista klick · slutsats',body:'Brödtext',question:'Fråga',word:'Ord som öppnas',definition:'Ordförklaring',translation:'Översättningsförslag',choice1:'Quizalternativ 1',choice2:'Quizalternativ 2',questionLabel:'Frågans etikett',value1:'Första värdet',value2:'Andra värdet',caption1:'Första värdets etikett',caption2:'Andra värdets etikett',detail1:'Första förklaringen',detail2:'Andra förklaringen',detail3:'Tredje förklaringen',phase1:'Första fasen',phase2:'Andra fasen',phase3:'Tredje fasen',voltage:'Spänning före (V)',voltageAfter:'Spänning efter (V)',resistance:'Resistans (Ω)',modelNote:'Modellens avgränsning',mediaNote:'Medieetikett',number:'Röstnummer',support:'Stödfråga',documentTitle:'Dokumentets rubrik',leftLabel:'Vänster etikett',rightLabel:'Höger etikett',finalLabel:'Sista etiketten',
};
export const lectureCommonFields=['title','subtitle','label','credit','sourceUrl','image','imageAlt','background','backgroundVideo','composition','role','processLabels','processStep','sceneGroup','emphasisWords','emphasisRole'];
export const openingFields:Record<string,string[]>={
  ...assessmentFields,
  'speaker-video':['videoSrc','poster','bookSrc','bookAlt','contact_website','contact_social','contact_instagram','contact_podcast','contact_email','videoLabel','readyLabel','playingLabel'],
  'agent-network':['networkCenter','networkCaption','networkLabel','modelNote'],
  'word-field':['backgroundWords'],
  'media-bridge':['videoSrc','poster','mediaNote'],
  'toolbox':['tool1','tool2','tool3','tool4','toolAI','toolboxLabel','toolboxCaption'],
  'puzzle-fit':['puzzleLabel'],
  'instruction-journey':['originalTitle','originalLabel','originalBody','resultLabel'],
  'knowledge-lever':['knowledge1','knowledge2','knowledge3','fulcrumLabel','leverCaption'],
  'reading-journey':['originalTitle','originalLabel','originalBody','wordLabel','translationNote','questionLabel','quizNote','readingFeature1','readingFeature2','readingFeature3'],
  'pupil-worlds':['contextImage','contextImageAlt','pupil1','pupil2','pupil3'],
  'epa-listening':['audioSrc','audioTitle','audioLabel','interestWords','vocabulary','listeningTitle','listeningLabel','listeningTask','listeningQuestion','followupTitle','followupLabel','followupTask','followupQuestion','followupAction'],
  'badminton-bridge':['leftLabel','rightLabel','bridgeCaption'],
  'spotlight':['spot1','spot2','spot3','spot4'],
  'class-perspectives':['assignmentTitle','perspectiveNote',...Array.from({length:4},(_,i)=>[`perspective${i+1}`,`reaction${i+1}`,`adjustment${i+1}`]).flat()],
  'material-journey':['exerciseLabel','promptLabel',...['sourceImage','sourceCaption','introCaption','finalTitle','finalCaption','summaryPrompt','summaryHeading','summaryFocus','summaryOvning','summaryIntro','infographicPrompt','infographicImage','infographicAlt','podcastPrompt','podcastSrc','podcastTitle','podcastHosts','songPrompt','songSrc','songTitle','gamePrompt','gameSrc','gameTitle','mediaNote',...Array.from({length:5},(_,i)=>[`format${i+1}`,`action${i+1}`,`formatTitle${i+1}`]).flat()]],
  'game-pitch':['chapterTitle','prompt','promptLabel','videoSrc','demoKind','demoTitle','voltage','voltageAfter','resistance','question','modelNote','voltageLabel','resistanceLabel','token1','token2'],
  'privacy-journey':['prompt','safePrompt','fictionLabel','destinationLabel','stopLabel','alternativeLabel','rule',...Array.from({length:6},(_,i)=>[`risk${i+1}`,`category${i+1}`,`explanation${i+1}`]).flat()],
  'learning-reframe':['after'],
  'table-discussion':['discussionLabel','item1','item2','item3'],
  'student-chapter':['chapterFocus'],
  'two-voices':['item1','item2','image2','image2Alt'],
  'product-process':['productWord','versusWord','processWord'],
  'epa-insertion':['beforeTitle','after',...Array.from({length:4},(_,i)=>[`item${i+1}`,`detail${i+1}`,`letter${i+1}`]).flat()],
  'source-design':['assignmentLabel','sourceLabel1','sourceLabel2','question1','question2','question3','breakdownLabel','breakdownTitle','breakdownBody','ownershipLabel','ownershipTitle','ownershipBody','behaviorLabel','supportTitle','challengeTitle','supportPrompt','challengePrompt','promptLabel','promptNote','checkpointLabel','checkpointTitle','checkpointTask','checkpointBody',...Array.from({length:5},(_,i)=>[`work${i+1}`,`detail${i+1}`,`owner${i+1}`,`ownerLabel${i+1}`]).flat()],
  'pedagogical-responsibility':['lead','focusWord','focusTail','tail'],
  'teaching-design':['designPhase','teacherLabel','stage1','stage2','stage3','designQuestion1','designQuestion2','designQuestion3','assignmentLabel','assignmentTitle','studentBefore','preparationLabel','preparationText','prompt','promptLabel','response','responseLabel','responseNote','followupLabel','followupTask','followupCheck'],
  'ai-doping':['phase1','phase2','phase3','detail1','detail2','detail3','productLabel','abilityLabel','abilityQuestion','vialLabel'],
  'knowledge-filter':['leftLabel','rightLabel','middleLabel','leftContext','rightContext','leftOutput','answerLabel','filter1','filter2','filter3','after'],
  'who-when-how':['item1','item2','item3','detail1','detail2','detail3','assignmentLabel','assignmentTitle','knowledge1','knowledge2','knowledge3','moment1','moment2','moment3','supportLabel','studentLabel'],
  'research-overview':['question',...Array.from({length:3},(_,i)=>['Label','Title','Setting','Result','Caveat','Source','Url'].map(k=>`study${k}${i+1}`)).flat()],
  'automation-shortcut':['taskLabel','taskText','answerLabel','answerText','shortcutLabel','workCaption','question',...Array.from({length:3},(_,i)=>[`work${i+1}`,`workDetail${i+1}`]).flat()],
  'dictation-value':['timeLabel','valueLabel','prompt','promptLabel','response','responseLabel','contextImage','contextImageAlt'],
  'practice-field':Array.from({length:9},(_,i)=>`item${i+1}`),
  'possibility-fan':Array.from({length:5},(_,i)=>`format${i+1}`),
};
Object.assign(lectureLabels,{bridgeCaption:'Bryggans landning',assignmentTitle:'Uppgiftens rubrik',perspectiveNote:'Perspektivens avgränsning'});
Object.assign(lectureLabels,{productWord:'Produkt · ord',versusWord:'Mellanord',processWord:'Process · ord',beforeTitle:'Rubrik före klick',assignmentLabel:'Elevuppgift · överrad',sourceLabel1:'Första källans etikett',sourceLabel2:'Andra källans etikett',breakdownLabel:'Deluppgifter · överrad',breakdownTitle:'Deluppgifter · rubrik',breakdownBody:'Deluppgifter · fråga',ownershipLabel:'Ansvar · överrad',ownershipTitle:'Ansvar · rubrik',ownershipBody:'Ansvar · förklaring',behaviorLabel:'AI-beteende · överrad',supportTitle:'Avlastning · rubrik',challengeTitle:'Utmaning · rubrik',supportPrompt:'Avlastning · hela instruktionen',challengePrompt:'Utmaning · hela instruktionen',promptNote:'Instruktionernas bildtext',checkpointLabel:'Uppföljning · överrad',checkpointTitle:'Uppföljning · rubrik',checkpointTask:'Uppföljning · elevfråga',checkpointBody:'Uppföljning · förklaring'});
for(let n=1;n<=5;n++)Object.assign(lectureLabels,{[`work${n}`]:`Deluppgift ${n}`, [`owner${n}`]:`Deluppgift ${n} · färgroll (support / challenge / student)`,[`ownerLabel${n}`]:`Deluppgift ${n} · ansvarsetikett`});
for(let n=1;n<=4;n++)lectureLabels[`letter${n}`]=`Arbetsform · bokstav ${n}`;
for(let n=1;n<=3;n++)lectureLabels[`question${n}`]=`Designfråga ${n}`;
Object.assign(lectureLabels,{chapterFocus:'Kapitel · huvudord',chapterTitle:'Kapitel · återkommande rubrik',timeLabel:'Tidsbesparing · etikett',valueLabel:'Värdeskapande · etikett',taskLabel:'Uppgift · etikett',taskText:'Uppgift · text',answerText:'Resultat · text',shortcutLabel:'AI-genvägens etikett',workCaption:'Lärandearbetets bildtext'});
for(let n=1;n<=3;n++)Object.assign(lectureLabels,{[`studyTitle${n}`]:`Studie ${n} · rubrik`,[`studyLabel${n}`]:`Studie ${n} · sammanhang`,[`studySetting${n}`]:`Studie ${n} · upplägg`,[`studyResult${n}`]:`Studie ${n} · resultat`,[`studyCaveat${n}`]:`Studie ${n} · avgränsning`,[`studySource${n}`]:`Studie ${n} · källa`,[`studyUrl${n}`]:`Studie ${n} · länk`,[`work${n}`]:`Elevens arbete ${n}`, [`workDetail${n}`]:`Elevens fråga ${n}`});
for(let n=1;n<=4;n++)Object.assign(lectureLabels,{[`spot${n}`]:`Ljusets fråga ${n}`,[`perspective${n}`]:`Elevperspektiv ${n}`,[`reaction${n}`]:`Möjlig reaktion ${n}`,[`adjustment${n}`]:`Möjlig anpassning ${n}`});
Object.assign(lectureLabels,{contact_website:'Kontakt · webbplats',contact_social:'Kontakt · profilnamn',contact_instagram:'Kontakt · Instagram',contact_podcast:'Kontakt · poddar',contact_email:'Kontakt · e-post',knowledge1:'Lärarkunskap 1',knowledge2:'Lärarkunskap 2',knowledge3:'Lärarkunskap 3',fulcrumLabel:'Hävstångens verktyg',leverCaption:'Hävstångens landning',wordLabel:'Ordförklaringens etikett',translationNote:'Översättningens förbehåll',quizNote:'Quizets bildtext',readingFeature1:'Lässtödets funktion 1',readingFeature2:'Lässtödets funktion 2',readingFeature3:'Lässtödets funktion 3',pupil1:'Elevkunskap 1',pupil2:'Elevkunskap 2',pupil3:'Elevkunskap 3',audioSrc:'Hörförståelsens ljudfil',audioTitle:'Ljudspelarens rubrik',audioLabel:'Ljudets ursprung',interestWords:'Intressen · separera med |',vocabulary:'Lyssningsord · separera med |',listeningTitle:'Lyssnarstegets rubrik',listeningLabel:'Lyssnarstegets överrad',listeningTask:'Lyssnaruppdrag',listeningQuestion:'Fråga före ljudet',followupTitle:'Efter lyssningen · rubrik',followupLabel:'Efter lyssningen · överrad',followupTask:'Efter lyssningen · uppgift',followupQuestion:'Efter lyssningen · frågor',followupAction:'Efter lyssningen · sista uppmaning'});
Object.assign(lectureLabels,{tool1:'Kunskap 1',tool2:'Kunskap 2',tool3:'Kunskap 3',tool4:'Kunskap 4',toolAI:'Verktygets etikett',toolboxLabel:'Verktygslådans etikett',toolboxCaption:'Sista klickets bildtext',puzzleLabel:'Pusslets bildbeskrivning',originalTitle:'Ursprungsdokumentets rubrik',originalLabel:'Ursprungsdokumentets etikett',originalBody:'Ursprungsdokumentets hela text',resultLabel:'Resultatets ursprung'});
Object.assign(lectureLabels,{emphasisWords:'Accentord · separera med |',emphasisRole:'Accentroll (human / ai / review)',backgroundWords:'Bakgrundens ord · separera med |',networkCenter:'Nätverkets mitt',networkCaption:'Samarbetets beskrivning',networkLabel:'Nätverkets överrad',bookSrc:'Bokens bild',bookAlt:'Bokens bildbeskrivning',contacts:'Kontaktuppgifter',videoLabel:'Videons rubrik',readyLabel:'Före filmstart',playingLabel:'Under filmen',discussionLabel:'Diskussionens markör'});
export const planningRoomFields=['journeyPlanTitle','journeyLabel','journeyPlan','journeyExampleLabel','journeyExample1','journeyExample2','planTimes'];
lectureLabels.planTimes='Tidsboxar · en per aktivitet, separerade med |';
export const planningPrincipleFields=['goalLabel','planningDuration',...Array.from({length:12},(_,i)=>`principle${i+1}`)];
lectureLabels.goalLabel='Lärandemålets etikett';
lectureLabels.planningDuration='Årskurs / lektionslängd';
for(let i=1;i<=12;i++)lectureLabels[`principle${i}`]=`Undervisningsprincip ${i}`;
Object.assign(lectureLabels,{sceneGroup:'Sammanhängande rum · samma id på intilliggande scener',journeyPlanTitle:'Planens dokumentrubrik',journeyLabel:'Planens avsändare',journeyPlan:'Tidigare plan · bevaras i rummet',journeyExampleLabel:'Tidigare elevexempel · etikett',journeyExample1:'Tidigare elevexempel · åsikt',journeyExample2:'Tidigare elevexempel · skäl'});
export const lectureLayoutFields:Record<string,string[]> = {
  poster:['after'],portrait:[],quote:['number'],chat:['prompt','promptLabel','response','responseLabel','outcome','image2','image2Alt','videoSrc','poster','mediaNote'],compare:['prompt','prompt2','promptLabel','outcome'],corners:['item1','item2','item3','item4'],film:['prompt','promptLabel','videoSrc','poster','mediaNote'],document:['body','documentTitle','word','definition','translation','question','choice1','choice2'],steps:[...Array.from({length:9},(_,i)=>`item${i+1}`),...Array.from({length:9},(_,i)=>`detail${i+1}`)],flow:[...Array.from({length:9},(_,i)=>`item${i+1}`),...Array.from({length:9},(_,i)=>`detail${i+1}`)],research:['value1','value2','caption1','caption2','detail1','detail2'],puzzle:['after'],circuit:['question','voltage','voltageAfter','resistance','modelNote'],gallery:['prompt','promptLabel','image2','image2Alt'],study:['phase1','phase2','phase3','detail1','detail2','detail3','value1','value2'],story:['item1','item2','item3','item4','question'],lever:['leftLabel','rightLabel'],horizon:['image2','image2Alt','detail1','detail2','sourceUrl'],
};
const materialFields=['visual','contextTitle','contextBody','contextImage','contextImageAlt','promptExcerpt','materialsUrl'];
lectureLabels.materialsUrl='Länk till efterhandsmaterial';
lectureLabels.materialsTitle='Rubrik på promptsidan';
lectureLabels.visual='Underlagets form (paper / photo / person / voice / game / circuit / browser / concept / image)';
for(const layout of ['chat','compare','film','gallery']) lectureLayoutFields[layout].push('materialsTitle');
for(const layout of ['chat','film','gallery']) lectureLayoutFields[layout].push(...materialFields);
lectureLayoutFields.chat.push('fullPromptStep');
lectureLayoutFields.compare.push('image2','image2Alt');
lectureLayoutFields.corners.push('discussionLabel');
lectureLayoutFields.bus=['number','prompt','promptLabel','response','responseLabel','phoneTitle','phoneLabel','busImage','busImageAlt'];
for(let i=1;i<=9;i++) {
  lectureLayoutFields.flow.push(`role${i}`,`motif${i}`,`stepImage${i}`,`stepImage${i}Alt`);
  lectureLabels[`role${i}`]=`Steg ${i} · färgroll (human / ai / review)`;
  lectureLabels[`motif${i}`]=`Steg ${i} · symbol (paper / chat / check / people / question)`;
  lectureLabels[`stepImage${i}`]=`Steg ${i} · bild`;
  lectureLabels[`stepImage${i}Alt`]=`Steg ${i} · bildbeskrivning`;
}
lectureLabels.processStyle='Materialets rörelse (desk / return)';
lectureLabels.evidenceKind='Uppläggsbild (support / risk / participants / classes)';
for(let n=1;n<=3;n++)lectureLabels[`visualLabel${n}`]=`Bildens förklaring · steg ${n}`;
lectureLayoutFields['time-value']=['after'];
lectureLayoutFields['voice-poster']=[];
lectureLayoutFields.focus=[...lectureLayoutFields.steps,'groupSize','waveSteps'];
Object.assign(lectureLabels,{waveSteps:'Röstlinje per steg · ai|human (temat Rösten)'});
lectureLayoutFields.handoff=[...lectureLayoutFields.flow,'processStyle'];
lectureLayoutFields.evidence=[...lectureLayoutFields.study,'evidenceKind','visualLabel1','visualLabel2','visualLabel3'];
lectureLayoutFields['word-turn']=['lead','word','tail'];
lectureLayoutFields['word-return']=['item1','item2','item3','detail1','detail2','detail3','stepImage1','stepImage1Alt','stepImage2','stepImage2Alt','stepImage3','stepImage3Alt'];
lectureLabels.lead='Inledande ord';
lectureLabels.tail='Fortsättning · nästa klick';
