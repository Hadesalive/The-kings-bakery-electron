import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShoppingCartIcon,
  ChartPieIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  CubeIcon,
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import {
  ShoppingCartIcon as ShoppingCartIconSolid,
  ChartPieIcon as ChartPieIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CubeIcon as CubeIconSolid,
} from '@heroicons/react/24/solid';

const drawerWidth = 220;
const collapsedDrawerWidth = 72;

interface MenuItem {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  path: string;
  roles?: ('admin' | 'cashier')[];
}

const menuItems: MenuItem[] = [
  { text: 'POS', icon: ShoppingCartIcon, iconSolid: ShoppingCartIconSolid, path: '/pos', roles: ['admin', 'cashier'] },
  { text: 'Orders', icon: DocumentTextIcon, iconSolid: DocumentTextIconSolid, path: '/orders', roles: ['admin', 'cashier'] },
  { text: 'Inventory', icon: CubeIcon, iconSolid: CubeIconSolid, path: '/inventory', roles: ['admin', 'cashier'] },
  { text: 'Analytics', icon: ChartPieIcon, iconSolid: ChartPieIconSolid, path: '/analytics', roles: ['admin'] },
  { text: 'Menu', icon: ClipboardDocumentListIcon, iconSolid: ClipboardDocumentListIconSolid, path: '/menu', roles: ['admin', 'cashier'] },
  { text: 'Settings', icon: Cog6ToothIcon, iconSolid: Cog6ToothIconSolid, path: '/settings', roles: ['admin'] },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(true);

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles || item.roles.length === 0) return true;
    return user && item.roles.includes(user.role);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? collapsedDrawerWidth : drawerWidth,
        flexShrink: 0,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '& .MuiDrawer-paper': {
          width: collapsed ? collapsedDrawerWidth : drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1E1E1E' : '#ffffff',
          borderRight: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'visible', // Allow expand button to be visible
          overflowY: 'auto',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: collapsed ? 1 : 2,
          py: collapsed ? 2 : 2.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: collapsed ? 1 : 1.5,
          borderBottom: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
          position: 'relative',
          minHeight: collapsed ? 80 : 100,
          pb: collapsed ? 3 : 2.5, // Extra padding at bottom when collapsed for the button
        }}
      >
        <Box
          sx={{
            width: collapsed ? 40 : 56,
            height: collapsed ? 40 : 56,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid #FFD700',
            boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            p: 0.5,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Box
            component="img"
            src="/logo kings bakery.jpg"
            alt="The King's Bakery Logo"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </Box>
        <Box 
          sx={{ 
            textAlign: 'center',
            opacity: collapsed ? 0 : 1,
            maxHeight: collapsed ? 0 : 'none',
            overflow: 'hidden',
            transition: 'opacity 0.2s ease-in-out, max-height 0.3s ease-in-out',
            width: '100%',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: collapsed ? 0 : '16px',
              color: '#000000',
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              mb: 0.25,
            }}
          >
            THE KING'S BAKERY
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            POS System
          </Typography>
        </Box>
        {!collapsed && (
          <IconButton
            onClick={toggleCollapse}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'text.secondary',
              zIndex: 10,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                color: (theme) => theme.palette.mode === 'dark' ? '#FFD700' : '#000000',
                transform: 'scale(1.1)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <ChevronLeftIcon style={{ width: 16, height: 16 }} />
          </IconButton>
        )}
      </Box>

      {/* Minimal expand button when collapsed */}
      {collapsed && (
        <IconButton
          onClick={toggleCollapse}
          size="small"
          sx={{
            position: 'absolute',
            top: '50%',
            right: 8,
            transform: 'translateY(-50%)',
            zIndex: 100,
            color: 'text.secondary',
            minWidth: 32,
            width: 32,
            height: 32,
            '&:hover': {
              color: (theme) => theme.palette.mode === 'dark' ? '#FFD700' : '#000000',
              backgroundColor: 'transparent',
            },
          }}
        >
          <ChevronRightIcon style={{ width: 18, height: 18 }} />
        </IconButton>
      )}

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ px: collapsed ? 0 : 1.5, pt: 2, pb: 10 }}>
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const IconSolid = item.iconSolid;
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip title={collapsed ? item.text : ''} placement="right">
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: collapsed ? 0 : 1.5,
                    minHeight: 44,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    backgroundColor: 'transparent',
                    color: isActive 
                      ? (theme) => theme.palette.mode === 'dark' ? '#FFD700' : '#000000'
                      : 'text.primary',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::before': {
                      content: collapsed ? 'none' : '""',
                      position: 'absolute',
                      left: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: isActive ? 4 : 0,
                      height: isActive ? 24 : 0,
                      backgroundColor: '#FFD700',
                      borderRadius: '2px',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: isActive ? 1 : 0,
                      boxShadow: isActive ? '0 0 8px rgba(255, 215, 0, 0.4)' : 'none',
                    },
                    '&:hover': {
                      transform: collapsed ? 'none' : 'translateX(3px)',
                      backgroundColor: 'transparent',
                      '&::before': {
                        display: collapsed ? 'none' : 'block',
                        width: isActive ? 4 : (collapsed ? 0 : 3),
                        height: isActive ? 24 : (collapsed ? 0 : 20),
                        opacity: isActive ? 1 : 0.6,
                        boxShadow: isActive ? '0 0 12px rgba(255, 215, 0, 0.5)' : '0 0 6px rgba(255, 215, 0, 0.3)',
                      },
                    },
                    '&:active': {
                      transform: collapsed ? 'scale(0.95)' : 'translateX(3px) scale(0.98)',
                    },
                    '& .MuiListItemIcon-root': {
                      minWidth: collapsed ? 0 : 40,
                      color: isActive 
                        ? (theme) => theme.palette.mode === 'dark' ? '#FFD700' : '#000000'
                        : (theme) => theme.palette.mode === 'dark' ? '#FFD700' : 'text.secondary',
                      transition: 'color 0.2s ease-in-out',
                      position: 'relative',
                      zIndex: 1,
                      margin: 0,
                    },
                    '& .MuiListItemText-primary': {
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13px',
                      transition: 'font-weight 0.2s ease-in-out, opacity 0.2s ease-in-out',
                      color: isActive 
                        ? (theme) => theme.palette.mode === 'dark' ? '#FFD700' : '#000000'
                        : 'inherit',
                      position: 'relative',
                      zIndex: 1,
                      opacity: collapsed ? 0 : 1,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 40,
                      justifyContent: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      margin: 0,
                      width: collapsed ? '100%' : 'auto',
                    }}
                  >
                    <Box
                      component={isActive ? IconSolid : Icon}
                      sx={{
                        width: 18,
                        height: 18,
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
        </List>
      </Box>

      {/* Footer - positioned at bottom */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: collapsed ? 1.5 : 2,
          borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1E1E1E' : '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', width: '100%' }}>
          {user && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '10px',
                display: collapsed ? 'none' : 'block',
                textAlign: 'center',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: collapsed ? 0 : 1,
                transition: 'opacity 0.2s ease-in-out',
              }}
            >
              {user.full_name || user.username}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%', justifyContent: 'center' }}>
            <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <IconButton
                onClick={toggleTheme}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                  },
                }}
              >
                {isDarkMode ? (
                  <SunIcon style={{ width: 20, height: 20 }} />
                ) : (
                  <MoonIcon style={{ width: 20, height: 20 }} />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Logout" placement="right">
              <IconButton
                onClick={handleLogout}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'error.main',
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.08)',
                  },
                }}
              >
                <ArrowRightOnRectangleIcon style={{ width: 20, height: 20 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '11px',
              display: collapsed ? 'none' : 'block',
              textAlign: 'center',
              fontWeight: 500,
              letterSpacing: '0.5px',
              opacity: collapsed ? 0 : 1,
              transition: 'opacity 0.2s ease-in-out',
            }}
          >
            Version 1.0.0
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
}

export default Sidebar;

