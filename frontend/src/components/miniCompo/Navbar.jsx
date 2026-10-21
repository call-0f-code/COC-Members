import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMembers } from "@/hooks/useMember";
import { useTheme } from "@/context/ThemeContext";
import { Code2, LogOut, User, Menu, X, Sun, Moon, Cake } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();
  const { logout } = useMembers();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Helper to check if the current path matches the link
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // ORIGINAL STYLE (Inactive): Orange, 3D shadow, pop effect on hover
  const inactiveStyle = "px-6 py-2 font-black border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] text-[#F5E6D3] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(245,230,211,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(245,230,211,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[1px_1px_0px_0px_rgba(245,230,211,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all duration-150";

  // NEW ACTIVE STYLE: Dark Brown/Beige inverted, no shadow ("pressed" look)
  const activeStyle = "px-6 py-2 font-black border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] text-[#F5E6D3] dark:bg-[#C1502E] dark:text-[#F5E6D3] translate-x-[4px] translate-y-[4px] shadow-none transition-all duration-150";

  // Mobile menu link style - optimized for mobile
  const mobileLinkStyle = "w-full px-4 py-2.5 font-black text-base border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] text-[#F5E6D3] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(245,230,211,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(245,230,211,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[1px_1px_0px_0px_rgba(245,230,211,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all duration-150";

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="border-b-4 border-black dark:border-[#F5E6D3] bg-[#F5E6D3] dark:bg-[#2C1810]">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
        {/* Logo */}
        <Link to={"/"} className="flex items-center gap-2 sm:gap-3">
          <div className="bg-[#C1502E] p-1.5 sm:p-2 border-4 border-black dark:border-[#F5E6D3] rotate-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(245,230,211,1)]">
            <Code2 className="h-6 w-6 sm:h-8 sm:w-8 text-[#F5E6D3]" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#2C1810] dark:text-[#F5E6D3] tracking-tight">
            CALL OF CODE
          </h1>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          <Link
            to={"/dsa"}
            className={isActive("/dsa") ? activeStyle : inactiveStyle}
          >
            DSA
          </Link>

          <Link
            to={"/interviewExp"}
            className={isActive("/interviewExp") ? activeStyle : inactiveStyle}
          >
            Interviews
          </Link>

          <Link
            to={"/birthdays"}
            className={isActive("/birthdays") ? activeStyle : inactiveStyle}
          >
            <span className="flex items-center gap-1.5"><Cake className="w-4 h-4" />Birthdays</span>
          </Link>

          <div>
            {accessToken ? (
              <div className="flex gap-4 lg:gap-6 justify-end">
                <button
                  onClick={() => navigate("/profile")}
                  className={isActive("/profile") ? activeStyle : inactiveStyle}
                >
                  <User />
                </button>

                <button
                  onClick={() => {
                    logout.mutate();
                  }}
                  disabled={logout.isPending}
                  className={inactiveStyle}
                >
                  <LogOut />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate("/signup")}
                  className={isActive("/signup") ? activeStyle : inactiveStyle}
                >
                  JOIN NOW
                </button>
              </>
            )}
          </div>

          {/* Theme Toggle - Desktop */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-12 h-12 border-4 border-black dark:border-[#F5E6D3] bg-[#F5E6D3] dark:bg-[#2C1810] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(245,230,211,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(245,230,211,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-150"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="w-6 h-6 text-[#2C1810]" />
            ) : (
              <Sun className="w-6 h-6 text-[#F5E6D3]" />
            )}
          </button>
        </div>

        {/* Mobile: Theme Toggle + Hamburger */}
        <div className="md:hidden flex items-center gap-3">
          {/* Theme Toggle - Mobile */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 border-4 border-black dark:border-[#F5E6D3] bg-[#F5E6D3] dark:bg-[#2C1810] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(245,230,211,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(245,230,211,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-150"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5 text-[#2C1810]" />
            ) : (
              <Sun className="w-5 h-5 text-[#F5E6D3]" />
            )}
          </button>

          {/* Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center w-10 h-10 border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] text-[#F5E6D3] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(245,230,211,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(245,230,211,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[1px_1px_0px_0px_rgba(245,230,211,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all duration-150"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={closeMobileMenu}
          />

          {/* Mobile Menu */}
          <div className="md:hidden fixed top-0 right-0 bottom-0 w-[60%] max-w-[280px] bg-[#F5E6D3] dark:bg-[#2C1810] border-l-4 border-black dark:border-[#F5E6D3] z-50 p-4 overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Close Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={closeMobileMenu}
                className="p-2 border-4 border-black dark:border-[#F5E6D3] bg-[#C1502E] text-[#F5E6D3] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(245,230,211,1)]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Navigation Links */}
            <div className="flex flex-col gap-3">
              <Link
                to={"/dsa"}
                onClick={closeMobileMenu}
                className={mobileLinkStyle}
              >
                DSA
              </Link>

              <Link
                to={"/interviewExp"}
                onClick={closeMobileMenu}
                className={mobileLinkStyle}
              >
                Interviews
              </Link>

              <Link
                to={"/birthdays"}
                onClick={closeMobileMenu}
                className={mobileLinkStyle}
              >
                <span className="flex items-center gap-2"><Cake className="w-4 h-4" />Birthdays</span>
              </Link>

              {/* Divider */}
              <div className="my-2 border-t-4 border-black dark:border-[#F5E6D3]" />

              {/* Auth Buttons */}
              {accessToken ? (
                <>
                  <button
                    onClick={() => {
                      navigate("/profile");
                      closeMobileMenu();
                    }}
                    className={mobileLinkStyle}
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5" />
                      <span>Profile</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      logout.mutate();
                      closeMobileMenu();
                    }}
                    disabled={logout.isPending}
                    className={mobileLinkStyle}
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                    </div>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    navigate("/signup");
                    closeMobileMenu();
                  }}
                  className={mobileLinkStyle}
                >
                  JOIN NOW
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}