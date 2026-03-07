import { Plus } from "lucide-react";
import type { NavItem, ViewType } from "../../lib/types";

interface BottomNavProps {
  navItems: NavItem[];
  activeView: ViewType;
  setActiveView: (v: ViewType) => void;
  onAddClick: () => void;
}

export function BottomNav({ navItems, activeView, setActiveView, onAddClick }: BottomNavProps) {
  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2, 4);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[50] md:hidden bg-[#0E0E12]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2">
      {leftItems.map((item) => (
        <button
          key={item.view}
          onClick={() => setActiveView(item.view)}
          className="flex flex-col items-center gap-1 py-3 px-4 flex-1"
        >
          <item.icon
            size={22}
            className={activeView === item.view ? "text-blue-500" : "text-zinc-500"}
            strokeWidth={activeView === item.view ? 2.5 : 2}
          />
          <span className={`text-[10px] font-semibold ${activeView === item.view ? "text-blue-400" : "text-zinc-500"}`}>
            {item.label}
          </span>
        </button>
      ))}

      {/* FAB */}
      <button
        onClick={onAddClick}
        className="-mt-5 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all active:scale-95 shrink-0"
      >
        <Plus size={26} className="text-white" />
      </button>

      {rightItems.map((item) => (
        <button
          key={item.view}
          onClick={() => setActiveView(item.view)}
          className="flex flex-col items-center gap-1 py-3 px-4 flex-1"
        >
          <item.icon
            size={22}
            className={activeView === item.view ? "text-blue-500" : "text-zinc-500"}
            strokeWidth={activeView === item.view ? 2.5 : 2}
          />
          <span className={`text-[10px] font-semibold ${activeView === item.view ? "text-blue-400" : "text-zinc-500"}`}>
            {item.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
