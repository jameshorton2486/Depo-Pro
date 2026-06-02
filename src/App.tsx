// App.tsx — standalone dev preview only.
// Production entry: main.tsx → mountEditor().
import { DepoEditor } from "./components/DepoEditor";
import type { DepoEditorConfig } from "./types";

const DEV_CONFIG: DepoEditorConfig = {
  jobId:         "DEV-001",
  apiBaseUrl:    "/api",
  mountSelector: "#root",
};

export default function App() {
  return (
    <div className="h-screen">
      <DepoEditor config={DEV_CONFIG} />
    </div>
  );
}
