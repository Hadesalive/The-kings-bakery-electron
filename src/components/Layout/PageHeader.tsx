import { ReactNode } from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: ReactNode;
}

function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  const defaultBreadcrumbs = [
    { label: 'Home', path: '/pos' },
  ];

  const displayBreadcrumbs = breadcrumbs || defaultBreadcrumbs;

  return (
    <Box sx={{ mb: 4, pt: 4 }}>
      {/* Breadcrumbs */}
      {displayBreadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 2.5 }} separator="›">
          {displayBreadcrumbs.map((crumb, index) => {
            const isLast = index === displayBreadcrumbs.length - 1;
            if (isLast || !crumb.path) {
              return (
                <Typography key={index} color="text.secondary" sx={{ fontWeight: 500 }}>
                  {crumb.label}
                </Typography>
              );
            }
            return (
              <Link
                key={index}
                component="button"
                variant="body2"
                onClick={() => crumb.path && navigate(crumb.path)}
                sx={{
                  color: 'text.secondary',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                  },
                }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Title and Actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          minHeight: 48,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: subtitle ? 0.5 : 0,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #FFD700 0%, #FFE44D 100%)'
                  : 'linear-gradient(135deg, #000000 0%, #333333 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default PageHeader;

