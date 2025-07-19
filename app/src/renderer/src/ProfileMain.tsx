import "./assets/main.css";

import ReactDOM from "react-dom/client";
import Profile from "./components/Profile";
import { Header } from "./components/Header";
import Infobar from "./components/Infobar";
import { Sidebar } from "lucide-react";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <>
    <Header />
    <Infobar />
    <Profile />
  </>
);
