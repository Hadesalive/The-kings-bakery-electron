import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface MenuItemImageProps {
  imagePath?: string | null;
  name: string;
  /** Placeholder when no image or load fails. 'letter' = first letter, 'icon' = photo icon */
  fallbackVariant?: 'letter' | 'icon';
  sx?: object;
}

/** Builds media:// URL from image_path */
function getImageSrc(imagePath: string): string {
  if (imagePath.startsWith('media://')) return imagePath;
  if (imagePath.startsWith('data:')) return imagePath;
  const filename = imagePath.includes('/') || imagePath.includes('\\')
    ? imagePath.split(/[/\\]/).pop() || imagePath
    : imagePath;
  return `media://${filename}`;
}

/**
 * Displays a menu item image with fallback when:
 * - No image_path
 * - Local file is missing (e.g. after pull, download failed)
 * - Image fails to load for any reason
 */
export default function MenuItemImage({ imagePath, name, fallbackVariant = 'letter', sx = {} }: MenuItemImageProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const showPlaceholder = !imagePath || loadFailed;

  if (showPlaceholder) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...sx,
        }}
      >
        {fallbackVariant === 'icon' ? (
          <PhotoIcon style={{ width: 64, height: 64, opacity: 0.3 }} />
        ) : (
          <Typography variant="h2" sx={{ opacity: 0.2, fontWeight: 700, fontSize: '56px' }}>
            {name.charAt(0)}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={getImageSrc(imagePath)}
      alt={name}
      onError={() => setLoadFailed(true)}
      sx={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        ...sx,
      }}
    />
  );
}
