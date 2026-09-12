import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import App from "../app/page";
import {applyPalette, readStoredPalette} from "../app/lib/theme";
import "../app/globals.css";
applyPalette(readStoredPalette());
createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>);
