// src/DashboardLayout.jsx
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ dark, setDark }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar dark={dark} />
      <div style={{ marginLeft: 230, flex: 1, minWidth: 0 }}>
        <TopBar dark={dark} setDark={setDark} addSpacer />
        {/* WICHTIG: hier dark + setDark im Outlet-Context bereitstellen */}
        <Outlet context={{ dark, setDark }} />
      </div>
    </div>
  );
}
