import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

// No StrictMode: its double-invoked effects would construct, free and
// reconstruct the wasm emulator and its AudioContext on every mount.
createRoot(document.getElementById("root")!).render(<App />);
