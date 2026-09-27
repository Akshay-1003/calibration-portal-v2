import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Settings, HelpCircle, ChevronLeft, ChevronDown } from "lucide-react";
import {
    Avatar,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from "@heroui/react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarMenuBadge,
    useSidebar,
} from "../components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "../components/ui/collapsible";
import { sidebarConfig } from "../config/sidebar-config";
import { useAuth } from "../features/auth";
import { hasPermissionRequirement } from "../config/access-control";
import { ENV } from "../core/config/env";
import { cn } from "../lib/utils";
import { prefetchRoute } from "../services/routePrefetch";
import { useNavigation as useAppNavigation } from "../context/NavigationContext";
import { BrandLogo } from "../components/common/BrandLogo";
import { performLogoutTransition } from "../features/auth/utils/logoutTransition";
import { useBreakpoint } from "../hooks/use-breakpoint";
import { LaboratoryContextSwitcher } from "../components/auth/LaboratoryContextSwitcher";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const location = useLocation();
    const navigate = useNavigate();
    const { startLoading } = useAppNavigation();
    const { user, isAuthenticated, logout } = useAuth();
    const { state, toggleSidebar, setOpen } = useSidebar();
    const isDesktopLayout = useBreakpoint("lg");
    // State to manage which menu is open (only one at a time)
    const [openMenus, setOpenMenus] = React.useState<Set<string>>(new Set());

    const preloadRoute = React.useCallback((url: string) => {
        void prefetchRoute(url);
    }, []);

    // Prefetch route chunk on hover
    const handleMenuHover = React.useCallback((url: string) => {
        preloadRoute(url);
    }, [preloadRoute]);

    const isActive = React.useCallback(
        (url: string, matchPattern?: string) => {
            const currentPath = location.pathname;
            if (matchPattern) {
                try {
                    return new RegExp(matchPattern).test(currentPath);
                } catch {
                    return currentPath.startsWith(url);
                }
            }
            return currentPath === url || currentPath.startsWith(url + "/");
        },
        [location.pathname]
    );

    // Initialize open menus based on active routes
    React.useEffect(() => {
        const activeMenus = new Set<string>();
        sidebarConfig.forEach((group) => {
            group.items.forEach((item) => {
                if (item.items) {
                    const hasActiveSubItem = item.items.some((subItem) =>
                        isActive(subItem.url, subItem.matchPattern)
                    );
                    if (hasActiveSubItem) {
                        activeMenus.add(item.title);
                    }
                }
            });
        });
        setOpenMenus(activeMenus);
    }, [location.pathname, isActive]);

    const handleMenuToggle = (menuTitle: string) => {
        setOpenMenus((prev) => {
            const newSet = new Set<string>();
            // If clicking the same menu, close it; otherwise open only the clicked one
            if (!prev.has(menuTitle)) {
                newSet.add(menuTitle);
            }
            return newSet;
        });
    };

    const handleLogout = async () => {
        await performLogoutTransition({
            logout,
            navigate,
            startLoading,
            targetPath: '/login',
        });
    };

    const handleRouteClick = React.useCallback((url: string) => {
        if (location.pathname === url) {
            if (!isDesktopLayout) {
                setOpen(false);
            }
            return;
        }
        // Prefetch route - if it's already cached, navigation will be instant
        void prefetchRoute(url);
        // Only start loading indicator - NavigationContext will handle smart timing
        startLoading(url);
        if (!isDesktopLayout) {
            setOpen(false);
        }
    }, [isDesktopLayout, location.pathname, setOpen, startLoading]);

    const expandSidebarFromCollapsed = React.useCallback(
        (
            event: React.MouseEvent<HTMLElement>,
            menuTitle?: string
        ) => {
            if (state !== "collapsed") {
                return false;
            }

            event.preventDefault();
            event.stopPropagation();
            setOpen(true);

            if (menuTitle) {
                setOpenMenus(new Set([menuTitle]));
            }

            return true;
        },
        [setOpen, state]
    );

    const userInitials = user?.first_name && user?.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
        : user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

    const username = user?.email ? `@${user.email.split("@")[0]}` : "@user";

    const visibleSidebarConfig = React.useMemo(() => {
        const normalizedRole = user?.role === "superadmin" ? "super_admin" : user?.role;

        return sidebarConfig
            .map((group) => {
                const visibleItems = group.items
                    .map((item) => {
                        const itemRoleAllowed = !item.roles || (
                            normalizedRole !== undefined && item.roles.includes(normalizedRole)
                        );

                        if (!itemRoleAllowed) {
                            return null;
                        }

                        if (item.items?.length) {
                            const visibleSubItems = item.items.filter((subItem) =>
                                (!subItem.roles || (normalizedRole && subItem.roles.includes(normalizedRole))) &&
                                hasPermissionRequirement(user?.permissions, subItem.permission)
                            );

                            if (visibleSubItems.length === 0) {
                                return null;
                            }

                            return {
                                ...item,
                                items: visibleSubItems,
                            };
                        }

                        return hasPermissionRequirement(user?.permissions, item.permission)
                            ? item
                            : null;
                    })
                    .filter(Boolean);

                if (visibleItems.length === 0) {
                    return null;
                }

                return {
                    ...group,
                    items: visibleItems,
                };
            })
            .filter(Boolean);
    }, [user?.permissions, user?.role]);

    return (
        <Sidebar collapsible="icon" className="border-r border-sidebar-border" {...props}>
            {/* Custom Toggle Button on Border */}
            <button
                onClick={toggleSidebar}
                className={cn(
                    "absolute -right-3 top-6 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-sidebar-border bg-sidebar shadow-md transition-all hover:bg-sidebar-accent"
                )}
                aria-label="Toggle Sidebar"
            >
                {state === "expanded" ? (
                    <ChevronLeft className="h-4 w-4 text-sidebar-foreground" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-sidebar-foreground" />
                )}
            </button>

            <SidebarHeader className="border-b border-sidebar-border group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:border-b-0 group-data-[collapsible=icon]:p-0">
                <Link
                    to={ENV.API_WEBSITE_URL}
                    className="flex w-full items-center gap-3 px-3 pt-2 group-data-[collapsible=icon]:hidden"
                >
                    <BrandLogo width={280} height={50} />
                </Link>
            </SidebarHeader>

            <SidebarContent className="px-2 py-4">
                <LaboratoryContextSwitcher />
                {visibleSidebarConfig.map((group) => (
                    <SidebarGroup key={group.title} className="mb-2">
                        <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1">
                                {group.items.map((item) => {
                                    const hasSubItems = item.items && item.items.length > 0;
                                    const itemIsActive = isActive(item.url);
                                    const hasActiveSubItem = item.items?.some((subItem) =>
                                        isActive(subItem.url, subItem.matchPattern)
                                    );
                                    const isMenuOpen = openMenus.has(item.title);

                                    if (!hasSubItems) {
                                        return (
                                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={itemIsActive}
                                                    tooltip={item.title}
                                                    className={cn(
                                                        "text-[15px] font-medium transition-all duration-200",
                                                        itemIsActive
                                                            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                                                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                                    )}
                                                >
                                                    <Link 
                                                        to={item.url} 
                                                        onMouseEnter={() => handleMenuHover(item.url)}
                                                        onMouseDown={() => handleMenuHover(item.url)}
                                                        onClick={(event) => {
                                                            if (expandSidebarFromCollapsed(event)) {
                                                                return;
                                                            }
                                                            handleRouteClick(item.url);
                                                        }}
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                                                    >
                                                        <span className="flex h-5 w-5 items-center justify-center">
                                                            {item.icon}
                                                        </span>
                                                        <span className="flex-1">{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                                {item.badge && (
                                                    <SidebarMenuBadge className="bg-primary/10 text-primary text-xs px-2">
                                                        {item.badge}
                                                    </SidebarMenuBadge>
                                                )}
                                            </SidebarMenuItem>
                                        );
                                    }

                                    return (
                                        <Collapsible
                                            key={item.title}
                                            open={isMenuOpen}
                                            onOpenChange={() => handleMenuToggle(item.title)}
                                            className="group/collapsible"
                                        >
                                            <SidebarMenuItem>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        tooltip={item.title}
                                                        onClick={(event) => {
                                                            expandSidebarFromCollapsed(event, item.title);
                                                        }}
                                                        className={cn(
                                                            "text-[15px] font-medium transition-all duration-200",
                                                            hasActiveSubItem
                                                                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                                                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                                        )}
                                                    >
                                                        <span className="flex h-5 w-5 items-center justify-center">
                                                            {item.icon}
                                                        </span>
                                                        <span className="flex-1">{item.title}</span>
                                                        <ChevronDown
                                                            className={cn(
                                                                "ml-auto h-4 w-4 shrink-0 transition-transform duration-300",
                                                                isMenuOpen && "rotate-180"
                                                            )}
                                                        />
                                                    </SidebarMenuButton>
                                                </CollapsibleTrigger>
                                                {item.badge && (
                                                    <SidebarMenuBadge className="bg-primary/10 text-primary text-xs px-2">
                                                        {item.badge}
                                                    </SidebarMenuBadge>
                                                )}
                                                <CollapsibleContent className="overflow-hidden transition-all duration-300 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                                                    <SidebarMenuSub className="ml-4 border-none border-primary/20 mx-0 pr-0 mt-1 space-y-0.5">
                                                        {item.items?.map((subItem) => {
                                                            const subItemIsActive = isActive(
                                                                subItem.url,
                                                                subItem.matchPattern
                                                            );
                                                            return (
                                                                <SidebarMenuSubItem key={subItem.title}>
                                                                    <SidebarMenuSubButton
                                                                        asChild
                                                                        isActive={subItemIsActive}
                                                                        className={cn(
                                                                            "text-[14px] py-2 transition-all duration-200 whitespace-normal",
                                                                            subItemIsActive
                                                                                ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary -ml-0.5 pl-3 shadow-sm"
                                                                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                                                        )}
                                                                    >
                                                                        <Link 
                                                                            to={subItem.url} 
                                                                            onMouseEnter={() => handleMenuHover(subItem.url)}
                                                                            onMouseDown={() => handleMenuHover(subItem.url)}
                                                                            onClick={(event) => {
                                                                                if (expandSidebarFromCollapsed(event, item.title)) {
                                                                                    return;
                                                                                }
                                                                                handleRouteClick(subItem.url);
                                                                            }}
                                                                            className="flex items-center gap-2.5 w-full"
                                                                        >
                                                                            {subItem.icon && (
                                                                                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                                                                    {subItem.icon}
                                                                                </span>
                                                                            )}
                                                                            <span className="flex-1 overflow-visible text-left leading-snug break-words">
                                                                                {subItem.title}
                                                                            </span>
                                                                        </Link>
                                                                    </SidebarMenuSubButton>
                                                                </SidebarMenuSubItem>
                                                            );
                                                        })}
                                                    </SidebarMenuSub>
                                                </CollapsibleContent>
                                            </SidebarMenuItem>
                                        </Collapsible>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border mt-auto">
                <SidebarMenu>
                    <SidebarMenuItem>
                        {isAuthenticated ? (
                            <Dropdown placement="top-start">
                                <DropdownTrigger>
                                    <SidebarMenuButton
                                        size="lg"
                                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-all"
                                    >
                                        <Avatar
                                            name={`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User"}
                                            size="sm"
                                            className="h-9 w-9 rounded-lg ring-2 ring-sidebar-border"
                                        />
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            {/* <span className="truncate font-semibold text-sidebar-foreground">
                                                {`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User"}
                                            </span> */}
                                            <span className="truncate text-sidebar-foreground">
                                                {username}
                                            </span>
                                        </div>
                                        <ChevronRight className="ml-auto h-4 w-4 text-sidebar-foreground/60" />
                                    </SidebarMenuButton>
                                </DropdownTrigger>
                                <DropdownMenu
                                    aria-label="Profile Actions"
                                    className="min-w-[240px]"
                                    itemClasses={{
                                        base: "px-3 py-2.5",
                                    }}
                                >
                                    <DropdownItem
                                        key="profile"
                                        textValue="Profile"
                                        className="pb-3 border-b border-border mb-1"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                src={user?.avatar}
                                                name={`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User"}
                                                size="sm"
                                                getInitials={() => userInitials}
                                            />
                                            <div className="flex flex-col">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {username}
                                                </p>
                                            </div>
                                        </div>
                                    </DropdownItem>
                              
                                    <DropdownItem
                                        key="settings"
                                        textValue="Settings"
                                        startContent={<Settings className="w-5 h-5" />}
                                        onPress={() => navigate('/settings')}
                                    >
                                        Settings
                                    </DropdownItem>
                                    <DropdownItem
                                        key="help"
                                        textValue="Help"
                                        startContent={<HelpCircle className="w-5 h-5" />}
                                        endContent={<span className="text-muted-foreground">›</span>}
                                        onPress={() => navigate('/help')}
                                    >
                                        Help
                                    </DropdownItem>
                                    <DropdownItem
                                        key="logout"
                                        textValue="Log out"
                                        color="danger"
                                        startContent={<LogOut className="w-5 h-5" />}
                                        onPress={handleLogout}
                                        className="text-danger"
                                    >
                                        Log out
                                    </DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                        ) : (
                            <SidebarMenuButton asChild className="hover:bg-sidebar-accent">
                                <Link to="/signin">
                                    <Avatar size="sm" className="h-8 w-8 rounded-lg" />
                                    <span>Sign In</span>
                                </Link>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                </SidebarMenu>

                <div className="px-3 py-3 border-t border-sidebar-border">
                    <div className="flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
                        <span className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                            Powered by
                        </span>
                        <a
                            href={ENV.API_POWERED_BY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 transition-opacity hover:opacity-70"
                            title="Visit ezyTechsolution"
                        >
                            <img
                                src="/images/logo/ezyTechSolutionsLogo.png"
                                alt="ezyTechsolution"
                                className="h-5 object-contain"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const parent = target.parentElement;
                                    if (parent) {
                                        parent.innerHTML =
                                            '<span class="text-xs font-semibold text-primary">ezyTechsolution</span>';
                                    }
                                }}
                            />
                        </a>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
