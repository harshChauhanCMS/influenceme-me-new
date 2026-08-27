import React, { useState } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Container,
  alpha,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  AdminPanelSettings as AdminIcon,
  Campaign as CampaignIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Chat as ChatIcon,
  Payment as PaymentIcon,
  VideoLibrary as VideoLibraryIcon,
  AccountBalanceWallet as WalletIcon,
  RequestQuote as RequestIcon,
  PendingActions as PendingActionsIcon,
  ContactSupport as ContactIcon,
  Description as DescriptionIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardOverview from "../components/DashboardOverview";
import UserManagement from "../components/UserManagement";
import AdminManagement from "../components/AdminManagement";
import LiveCommunication from "../components/LiveCommunication";
import CampaignsManagement from "../components/CampaignsManagement";
import Transactions from "../components/Transactions";
import WithdrawalRequests from "../components/WithdrawalRequests";
import PayoutMilestones from "../components/PayoutMilestones";
import ShowcaseVideos from "../components/ShowcaseVideos";
import VideoPurposes from "../components/VideoPurposes";
import Analytics from "../components/Analytics";
import Settings from "../components/Settings";
import WaitingList from "../components/WaitingList";
import ContactQueries from "../components/ContactQueries";
import CMSPages from "../components/CMSPages";
import BlogManagement from "../components/BlogManagement";
import SocialMediaAnalyticsPage from "../components/SocialMediaAnalyticsPage";
import AdminInfluencerCalendar from "../components/AdminInfluencerCalendar";

const drawerWidth = 280;

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  {
    text: "Waiting List",
    icon: <PendingActionsIcon />,
    path: "/dashboard/waiting-list",
  },
  { text: "User Management", icon: <PeopleIcon />, path: "/dashboard/users" },
  { text: "Admin Management", icon: <AdminIcon />, path: "/dashboard/admins" },
  {
    text: "Live Communication",
    icon: <ChatIcon />,
    path: "/dashboard/communication",
  },
  { text: "Campaigns", icon: <CampaignIcon />, path: "/dashboard/campaigns" },
  {
    text: "Payments",
    icon: <PaymentIcon />,
    path: "/dashboard/payments",
    children: [
      {
        text: "Transactions",
        icon: <WalletIcon />,
        path: "/dashboard/payments/transactions",
      },
      {
        text: "Withdrawal Requests",
        icon: <RequestIcon />,
        path: "/dashboard/payments/withdrawals",
      },
      {
        text: "Payout Milestones",
        icon: <RequestIcon />,
        path: "/dashboard/payments/milestones",
      },
    ],
  },
  {
    text: "Videos",
    icon: <VideoLibraryIcon />,
    path: "/dashboard/videos",
    children: [
      {
        text: "Multipurpose Videos",
        icon: <VideoLibraryIcon />,
        path: "/dashboard/showcase-videos",
      },
      {
        text: "Video Purposes",
        icon: <VideoLibraryIcon />,
        path: "/dashboard/video-purposes",
      },
    ],
  },
  {
    text: "Contact Queries",
    icon: <ContactIcon />,
    path: "/dashboard/contact-queries",
  },
  {
    text: "CMS Pages",
    icon: <DescriptionIcon />,
    path: "/dashboard/cms-pages",
  },
  { text: "Blog Management", icon: <ArticleIcon />, path: "/dashboard/blogs" },
  {
    text: "Social Media Analytics",
    icon: <TrendingUpIcon />,
    path: "/dashboard/social-media-analytics",
  },
  { text: "Influencer Calendar", icon: <TrendingUpIcon />, path: "/dashboard/influencer-calendar" },
  { text: "Analytics", icon: <AnalyticsIcon />, path: "/dashboard/analytics" },
  { text: "Settings", icon: <SettingsIcon />, path: "/dashboard/settings" },
];

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const [expandedMenus, setExpandedMenus] = useState<{
    [key: string]: boolean;
  }>({
    payments: location.pathname.includes("/payments"),
    videos:
      location.pathname.includes("/showcase-videos") ||
      location.pathname.includes("/video-purposes"),
  });

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleMenuToggle = (menuPath: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuPath]: !prev[menuPath],
    }));
  };

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes("/waiting-list")) return "Waiting List";
    if (path === "/dashboard/users" || path.startsWith("/dashboard/users/"))
      return "User Management";
    if (path === "/dashboard/admins" || path.startsWith("/dashboard/admins/"))
      return "Admin Management";
    if (path.includes("/campaigns")) return "Campaigns";
    if (path.includes("/showcase-videos")) return "Multipurpose Videos";
    if (path.includes("/video-purposes")) return "Video Purposes";
    if (path.includes("/blogs")) return "Blog Management";
    if (path.includes("/social-media-analytics"))
      return "Social Media Analytics";
    if (path.includes("/analytics")) return "Analytics";
    if (path.includes("/cms-pages")) return "CMS Pages";
    if (path.includes("/settings")) return "Settings";
    return "Dashboard";
  };

  const renderContent = () => {
    const path = location.pathname;

    if (path === "/dashboard" || path === "/dashboard/") {
      return <DashboardOverview />;
    }

    if (path.includes("/waiting-list")) {
      return <WaitingList />;
    }

    if (path === "/dashboard/users" || path.startsWith("/dashboard/users")) {
      return <UserManagement />;
    }

    if (path === "/dashboard/admins" || path.startsWith("/dashboard/admins")) {
      return <AdminManagement />;
    }

    if (path.includes("/communication")) {
      return <LiveCommunication />;
    }

    if (path.includes("/campaigns")) {
      return <CampaignsManagement />;
    }

    if (path.includes("/payments/transactions")) {
      return <Transactions />;
    }

    if (path.includes("/payments/withdrawals")) {
      return <WithdrawalRequests />;
    }

    if (path.includes("/payments/milestones")) {
      return <PayoutMilestones />;
    }

    if (path.includes("/showcase-videos")) {
      return <ShowcaseVideos />;
    }

    if (path.includes("/video-purposes")) {
      return <VideoPurposes />;
    }

    if (path.includes("/contact-queries")) {
      return <ContactQueries />;
    }

    if (path.includes("/cms-pages")) {
      return <CMSPages />;
    }

    if (path.includes("/blogs")) {
      return <BlogManagement />;
    }

    if (path.includes("/social-media-analytics")) {
      return <SocialMediaAnalyticsPage />;
    }
    
    if (path.includes("/influencer-calendar")) {
      return <AdminInfluencerCalendar />;
    }

    if (path.includes("/analytics")) {
      return <Analytics />;
    }

    if (path.includes("/settings")) {
      return <Settings />;
    }

    // Default fallback
    return <DashboardOverview />;
  };

  const drawer = (
    <Box>
      <Toolbar
        sx={{
          background: "linear-gradient(135deg, #636B2F 0%, #BAC095 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          py: 1,
        }}
      >
        <Box
          sx={{
            bgcolor: "white",
            borderRadius: 1.5,
            px: 1,
            py: 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <img
            src="/logonew.png"
            alt="InfluenceMe Logo"
            style={{ height: 32, width: "auto", objectFit: "contain" }}
          />
        </Box>
        <Typography variant="h6" noWrap component="div" fontWeight="bold">
          Admin Panel
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedMenus[item.path] || false;
          const isSelected =
            location.pathname === item.path ||
            (hasChildren &&
              item.children!.some(
                (child) =>
                  location.pathname === child.path ||
                  location.pathname.startsWith(child.path + "/"),
              ));

          return (
            <React.Fragment key={item.path}>
              <ListItem disablePadding>
                <ListItemButton
                  selected={isSelected && !hasChildren}
                  onClick={() => {
                    if (hasChildren) {
                      handleMenuToggle(item.path);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  sx={{
                    mx: 1.5,
                    my: 0.5,
                    borderRadius: 2,
                    "&.Mui-selected": {
                      backgroundColor: alpha("#636B2F", 0.12),
                      color: "#636B2F",
                      fontWeight: 700,
                      "&:hover": {
                        backgroundColor: alpha("#636B2F", 0.18),
                      },
                    },
                    "&:hover": {
                      backgroundColor: alpha("#000", 0.04),
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color:
                        isSelected && !hasChildren
                          ? "#636B2F"
                          : "text.secondary",
                      transition: "all 0.2s",
                    }}
                  >
                    {React.cloneElement(item.icon as React.ReactElement<any>, {
                      sx: { fontSize: 22 },
                    })}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: "0.9rem",
                      fontWeight: isSelected && !hasChildren ? 700 : 500,
                    }}
                  />
                  {hasChildren && (
                    <Typography
                      variant="body2"
                      sx={{ ml: 1, color: "#636B2F" }}
                    >
                      {isExpanded ? "−" : "+"}
                    </Typography>
                  )}
                </ListItemButton>
              </ListItem>
              {hasChildren && isExpanded && (
                <List component="div" disablePadding>
                  {item.children!.map((child) => {
                    const isChildSelected =
                      location.pathname === child.path ||
                      location.pathname.startsWith(child.path + "/");
                    return (
                      <ListItem key={child.path} disablePadding>
                        <ListItemButton
                          selected={isChildSelected}
                          onClick={() => handleNavigation(child.path)}
                          sx={{
                            pl: 4,
                            mx: 1.5,
                            my: 0.2,
                            borderRadius: 2,
                            "&.Mui-selected": {
                              backgroundColor: alpha("#636B2F", 0.08),
                              color: "#636B2F",
                              "&:hover": {
                                backgroundColor: alpha("#636B2F", 0.12),
                              },
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 35,
                              color: isChildSelected
                                ? "#636B2F"
                                : "text.secondary",
                            }}
                          >
                            {React.cloneElement(
                              child.icon as React.ReactElement<any>,
                              {
                                sx: { fontSize: 18 },
                              },
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={child.text}
                            primaryTypographyProps={{
                              fontSize: "0.85rem",
                              fontWeight: isChildSelected ? 600 : 400,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          boxShadow: "none",
          borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
          color: "#1A1A1A",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: "none" }, color: "#636B2F" }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                color: "#1A1A1A",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 2,
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
              }}
            >
              {getCurrentPage()}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                display: { xs: "none", sm: "block" },
              }}
            >
              {user?.name}
            </Typography>
            <IconButton onClick={handleMenuClick} size="small">
              <Avatar sx={{ bgcolor: "#636B2F", width: 40, height: 40 }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          backgroundColor: "#F8F9FA",
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          {renderContent()}
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard;
