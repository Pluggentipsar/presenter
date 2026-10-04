/** Shared content contract for R and the player. */
export const assessmentSteps: Record<string, number> = {
  'assessment-effort': 2, 'assessment-evidence': 2, 'assessment-twins': 3, 'assessment-design': 3,
  'assessment-transfer': 4,
};
const documentFields = ['documentLabel', 'documentTitle', 'documentBody', 'documentClaim', 'documentCaption'];
export const assessmentFields: Record<string, string[]> = {
  'assessment-transfer': ['principle', 'firstLabel', 'secondLabel', 'firstIntro', 'secondIntro', 'introNote', 'goalLabel', 'designRule', ...Array.from({ length: 3 }, (_, i) => ['subject', 'learningGoal', 'originalTask', 'twinTask', 'change'].map(key => `${key}${i + 1}`)).flat()],
  'assessment-effort': ['effortWord', 'turnLead', 'turnWord', 'turnTail'],
  'assessment-evidence': [...documentFields, 'question', 'observation', 'uncertainty'],
  'assessment-twins': [...documentFields, 'goalLabel', 'goal', 'evidenceLabel', 'followupLabel', 'followupQuestion', 'followupHint', 'transferLabel', 'transferQuestion', 'transferHint', 'sourceLabel'],
  'assessment-design': ['assignmentLabel', 'assignmentTitle', 'designNote', ...Array.from({ length: 3 }, (_, i) => ['phase', 'decision', 'instruction', 'result'].map(key => `${key}${i + 1}`)).flat()],
};
export const assessmentLabels: Record<string, string> = {
  principle: 'Tvillingar · grundidé', firstLabel: 'Första uppgiften · etikett', secondLabel: 'Tvillingens etikett', firstIntro: 'Första uppgiften · introduktion', secondIntro: 'Tvillingen · introduktion', introNote: 'Introduktion · förtydligande', designRule: 'Återkommande designprincip',
  effortWord: 'Första läget · huvudord', turnLead: 'Vändning · inledning', turnWord: 'Vändning · huvudord', turnTail: 'Vändning · avslutning',
  documentLabel: 'Elevtext · överrad', documentTitle: 'Elevtext · rubrik', documentBody: 'Elevtext · resonemang', documentClaim: 'Elevtext · slutsats', documentCaption: 'Elevtext · illustrationsetikett',
  observation: 'Vad läraren ser', uncertainty: 'Vad läraren behöver undersöka', goalLabel: 'Gemensamt mål · etikett', goal: 'Gemensamt mål · text',
  evidenceLabel: 'Inlämning · etikett', followupLabel: 'Komplettering · etikett', followupQuestion: 'Lärarens uppföljningsfråga', followupHint: 'Vad uppföljningen kan synliggöra',
  transferLabel: 'Ny situation · etikett', transferQuestion: 'Uppgift med en ny källa', transferHint: 'Den nya situationens inramning', sourceLabel: 'Nya källans etikett', designNote: 'Designresans avslutning',
};
for (let n = 1; n <= 3; n++) Object.assign(assessmentLabels, {
  [`subject${n}`]: `Tvillingpar ${n} · ämne`, [`learningGoal${n}`]: `Tvillingpar ${n} · kunnandet`, [`originalTask${n}`]: `Tvillingpar ${n} · första uppgiften`, [`twinTask${n}`]: `Tvillingpar ${n} · tvillingen`, [`change${n}`]: `Tvillingpar ${n} · vad ändras?`,
  [`phase${n}`]: `Designresa ${n} · fas`, [`decision${n}`]: `Designresa ${n} · lärarens beslut`,
  [`instruction${n}`]: `Designresa ${n} · till eleven`, [`result${n}`]: `Designresa ${n} · poäng`,
});
