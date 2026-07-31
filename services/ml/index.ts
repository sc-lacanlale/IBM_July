export {
  loadFaceModels,
  enrollFromStream,
  identifyFromStream,
  listPeople,
  removePerson,
} from "./faceService";
export type { Person, EnrollResult } from "./faceService";
export { startMonitoring, triggerPanic } from "./hazardService";
export type {
  HazardEvent,
  HazardMonitor,
  StartMonitorOptions,
} from "./hazardService";
