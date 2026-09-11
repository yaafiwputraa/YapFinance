import { Command, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { NavItem, ViewType } from "../../lib/types";

interface SidebarProps {
  navItems: NavItem[];
  activeView: ViewType;
  setActiveView: (v: ViewType) => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}

export function Sidebar({
  navItems, activeView, setActiveView, isCollapsed, setIsCollapsed,
}: SidebarProps) {
  return (
    <aside
      className={`hidden md:flex relative h-full bg-[#0E0E12] border border-white/10 rounded-2xl flex-col transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shadow-2xl z-20 ${
        isCollapsed ? "w-[80px]" : "w-[260px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-5 h-20 shrink-0">
        <div
          className={`flex items-center ${isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"}`}
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
            <Command size={16} />
          </div>
          <h1 className="ml-3 text-xl font-bold text-white tracking-tight">YapBalance</h1>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all ${
            isCollapsed ? "mx-auto" : ""
          }`}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setActiveView(item.view)}
            className={`w-full flex items-center p-3 rounded-2xl transition-all duration-200 ${
              activeView === item.view
                ? "bg-[#18181B] border border-white/5"
                : "border border-transparent hover:bg-white/[0.03]"
            }`}
          >
            <item.icon
              size={20}
              strokeWidth={activeView === item.view ? 2.5 : 2}
              className={`shrink-0 ${activeView === item.view ? "text-blue-500" : "text-zinc-500"} ${
                isCollapsed ? "mx-auto" : ""
              }`}
            />
            <span
              className={`ml-3 text-sm whitespace-nowrap overflow-hidden ${
                activeView === item.view ? "font-semibold text-white" : "font-medium text-zinc-400"
              } ${isCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"}`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 shrink-0 mb-2 border-t border-white/5 mt-2">
        <div
          className={`flex items-center p-2 rounded-2xl ${isCollapsed ? "" : "gap-3"}`}
        >
          <div
            className={`w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-white font-medium shrink-0 ${
              isCollapsed ? "mx-auto" : ""
            }`}
          >
            Y
          </div>
          <div
            className={`text-left overflow-hidden whitespace-nowrap ${
              isCollapsed ? "opacity-0 w-0" : "opacity-100"
            }`}
          >
            <p className="text-sm font-bold text-white">Yap Account</p>
            <p className="text-xs text-zinc-500">Free Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
