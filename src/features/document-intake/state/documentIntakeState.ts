import type { DocumentIntakePasteResult } from "../../../api";
export type DocumentIntakeState="idle"|"large_paste_detected"|"awaiting_confirmation"|"uploading"|"processing"|"ready"|"reused"|"disabled"|"forbidden"|"too_large"|"failed";
export type DocumentIntakeViewState={state:DocumentIntakeState;pending:{content:string;title?:string}|null;result:DocumentIntakePasteResult|null;errorCode:string|null};
export const initialDocumentIntakeState:DocumentIntakeViewState={state:"idle",pending:null,result:null,errorCode:null};
