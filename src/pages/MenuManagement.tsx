import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import {
  getAllMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  saveMedia,
  getMenuItemSizes,
  saveMenuItemSizes,
  getMenuItemCustomOptions,
  saveMenuItemCustomOptions,
  MenuItem as MenuItemType,
  Category,
  CreateMenuItemData,
} from '../utils/database';
import PageHeader from '../components/Layout/PageHeader';

function MenuManagement() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    is_available: true,
  });

  // Per-menu-item sizes and options
  const [hasSizes, setHasSizes] = useState(false);
  const [hasOptions, setHasOptions] = useState(false);
  const [sizes, setSizes] = useState<Array<{ id?: number; name: string; price: string; is_default: boolean }>>([]);
  const [customOptions, setCustomOptions] = useState<Array<{ id?: number; name: string; price: string; is_available: boolean }>>([]);

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
  });



  useEffect(() => {
    loadData();
  }, []);


  const loadData = async () => {
    try {
      setLoading(true);
      const [items, cats] = await Promise.all([
        getAllMenuItems(),
        getCategories(),
      ]);
      setMenuItems(items);
      setCategories(cats);
      setError(null);
    } catch (err) {
      setError('Failed to load menu items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SLE',
    }).format(amount);
  };

  const handleOpenDialog = async (item?: MenuItemType) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price.toString(),
        category: item.category || '',
        is_available: item.is_available !== 0,
      });
      // Convert image path to media:// protocol URL for display
      if (item.image_path) {
        // If it's already just a filename, use it directly; otherwise extract filename
        const filename = item.image_path.includes('/') || item.image_path.includes('\\') 
          ? item.image_path.split(/[/\\]/).pop() || item.image_path
          : item.image_path;
        setImagePreview(`media://${filename}`);
      } else {
        setImagePreview(null);
      }
      setImageFile(null);
      
      // Load existing sizes and custom options for this item
      try {
        const [itemSizes, itemOptions] = await Promise.all([
          getMenuItemSizes(item.id!),
          getMenuItemCustomOptions(item.id!),
        ]);
        
        if (itemSizes.length > 0) {
          setHasSizes(true);
          setSizes(itemSizes.map(s => ({
            id: s.id,
            name: s.name,
            price: s.price.toString(),
            is_default: s.is_default === 1,
          })));
        } else {
          setHasSizes(false);
          setSizes([]);
        }
        
        if (itemOptions.length > 0) {
          setHasOptions(true);
          setCustomOptions(itemOptions.map(o => ({
            id: o.id,
            name: o.name,
            price: o.price.toString(),
            is_available: o.is_available !== 0,
          })));
        } else {
          setHasOptions(false);
          setCustomOptions([]);
        }
      } catch (err) {
        console.error('Failed to load item sizes and options:', err);
        setHasSizes(false);
        setHasOptions(false);
        setSizes([]);
        setCustomOptions([]);
      }
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        is_available: true,
      });
      setImagePreview(null);
      setImageFile(null);
      setHasSizes(false);
      setHasOptions(false);
      setSizes([]);
      setCustomOptions([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      is_available: true,
    });
    setImagePreview(null);
    setImageFile(null);
    setHasSizes(false);
    setHasOptions(false);
    setSizes([]);
    setCustomOptions([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        description: category.description || '',
        display_order: category.display_order || 0,
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        description: '',
        display_order: 0,
      });
    }
    setOpenCategoryDialog(true);
  };

  const handleCloseCategoryDialog = () => {
    setOpenCategoryDialog(false);
    setEditingCategory(null);
    setCategoryFormData({
      name: '',
      description: '',
      display_order: 0,
    });
  };

  const handleSaveCategory = async () => {
    try {
      if (!categoryFormData.name.trim()) {
        setError('Category name is required');
        return;
      }

      console.log('Creating/updating category with data:', categoryFormData);

      if (editingCategory) {
        const result = await updateCategory(editingCategory.id!, {
          name: categoryFormData.name,
          description: categoryFormData.description || undefined,
          display_order: categoryFormData.display_order,
        });
        console.log('Update result:', result);
      } else {
        const result = await addCategory({
          name: categoryFormData.name,
          description: categoryFormData.description || undefined,
          display_order: categoryFormData.display_order,
        });
        console.log('Create result:', result);
      }

      await loadData();
      handleCloseCategoryDialog();
      setError(null);
    } catch (err: any) {
      console.error('Category save error:', err);
      const errorMessage = err?.message || 'Failed to save category';
      setError(errorMessage);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category? Menu items in this category will not be deleted.')) {
      return;
    }

    try {
      await deleteCategory(id);
      await loadData();
      setError(null);
    } catch (err) {
      setError('Failed to delete category');
      console.error(err);
    }
  };



  // Helper functions for sizes and options
  const addSize = () => {
    setSizes([...sizes, { name: '', price: '', is_default: false }]);
  };

  const removeSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index));
  };

  const updateSize = (index: number, field: 'name' | 'price' | 'is_default', value: string | boolean) => {
    const newSizes = [...sizes];
    if (field === 'is_default') {
      // Only one size can be default
      newSizes.forEach((s, i) => {
        s.is_default = i === index ? (value as boolean) : false;
      });
      // If setting this size as default, update the menu item price
      if (value === true) {
        const currentSize = sizes[index];
        if (currentSize && currentSize.price) {
          setFormData({ ...formData, price: currentSize.price });
        }
      }
    } else {
      const wasDefault = newSizes[index].is_default;
      newSizes[index] = { ...newSizes[index], [field]: value };
      // If this is the default size and price is being updated, update menu item price
      if (field === 'price' && wasDefault) {
        setFormData({ ...formData, price: value as string });
      }
    }
    setSizes(newSizes);
  };

  const addCustomOption = () => {
    setCustomOptions([...customOptions, { name: '', price: '', is_available: true }]);
  };

  const removeCustomOption = (index: number) => {
    setCustomOptions(customOptions.filter((_, i) => i !== index));
  };

  const updateCustomOption = (index: number, field: 'name' | 'price' | 'is_available', value: string | boolean) => {
    const newOptions = [...customOptions];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setCustomOptions(newOptions);
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        setError('Name is required');
        return;
      }

      if (!formData.price) {
        setError('Price is required');
        return;
      }

      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        setError('Price must be a valid positive number');
        return;
      }

      setUploadingImage(true);
      let imagePath = editingItem?.image_path || undefined;

      // Upload image if a new one was selected
      if (imageFile) {
        try {
          const arrayBuffer = await imageFile.arrayBuffer();
          const timestamp = Date.now();
          const extension = imageFile.name.split('.').pop() || 'jpg';
          const filename = `menu-item-${timestamp}.${extension}`;
          await saveMedia(filename, arrayBuffer);
          // Store only the filename, not the full path
          imagePath = filename;
        } catch (imgErr) {
          console.error('Image upload error:', imgErr);
          setError('Failed to upload image. Please try again.');
          setUploadingImage(false);
          return;
        }
      }

      if (editingItem) {
        await updateMenuItem(editingItem.id!, {
          name: formData.name,
          description: formData.description || undefined,
          price,
          category: formData.category || undefined,
          image_path: imagePath,
          is_available: formData.is_available ? 1 : 0,
        });
        
        // Save sizes if enabled
        if (hasSizes) {
          const sizesToSave = sizes
            .filter(s => s.name.trim() && s.price.trim())
            .map((s, index) => ({
              name: s.name.trim(),
              price: parseFloat(s.price),
              display_order: index,
              is_default: s.is_default ? 1 : 0,
            }));
          await saveMenuItemSizes(editingItem.id!, sizesToSave);
        } else {
          // Delete all sizes if disabled
          await saveMenuItemSizes(editingItem.id!, []);
        }
        
        // Save custom options if enabled
        if (hasOptions) {
          const optionsToSave = customOptions
            .filter(o => o.name.trim() && o.price.trim())
            .map((o, index) => ({
              name: o.name.trim(),
              price: parseFloat(o.price),
              display_order: index,
              is_available: o.is_available ? 1 : 0,
            }));
          await saveMenuItemCustomOptions(editingItem.id!, optionsToSave);
        } else {
          // Delete all options if disabled
          await saveMenuItemCustomOptions(editingItem.id!, []);
        }
      } else {
        const menuItemData: CreateMenuItemData = {
          name: formData.name,
          description: formData.description || undefined,
          price,
          category: formData.category || undefined,
          image_path: imagePath,
          is_available: formData.is_available ? 1 : 0,
        };
        const result = await addMenuItem(menuItemData);
        const newMenuItemId = result.id || result.lastInsertRowid;
        
        // Save sizes if enabled
        if (hasSizes && newMenuItemId) {
          const sizesToSave = sizes
            .filter(s => s.name.trim() && s.price.trim())
            .map((s, index) => ({
              name: s.name.trim(),
              price: parseFloat(s.price),
              display_order: index,
              is_default: s.is_default ? 1 : 0,
            }));
          await saveMenuItemSizes(newMenuItemId, sizesToSave);
        }
        
        // Save custom options if enabled
        if (hasOptions && newMenuItemId) {
          const optionsToSave = customOptions
            .filter(o => o.name.trim() && o.price.trim())
            .map((o, index) => ({
              name: o.name.trim(),
              price: parseFloat(o.price),
              display_order: index,
              is_available: o.is_available ? 1 : 0,
            }));
          await saveMenuItemCustomOptions(newMenuItemId, optionsToSave);
        }
      }

      setUploadingImage(false);
      await loadData();
      handleCloseDialog();
      setError(null);
    } catch (err) {
      setUploadingImage(false);
      setError('Failed to save menu item');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) {
      return;
    }

    try {
      await deleteMenuItem(id);
      await loadData();
      setError(null);
    } catch (err) {
      setError('Failed to delete menu item');
      console.error(err);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Menu Management"
        subtitle="Manage your menu items, categories, and pricing"
        breadcrumbs={[
          { label: 'Home', path: '/pos' },
          { label: 'Menu Management' },
        ]}
        actions={
          activeTab === 0 ? (
            <Button
              variant="contained"
              startIcon={<PlusIcon style={{ width: 20, height: 20 }} />}
              onClick={() => handleOpenDialog()}
              sx={{
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
            >
              Add Item
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<PlusIcon style={{ width: 20, height: 20 }} />}
              onClick={() => handleOpenCategoryDialog()}
              sx={{
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
            >
              Add Category
            </Button>
          )
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTabs-indicator': {
              height: 2,
              borderRadius: '2px 2px 0 0',
              backgroundColor: 'primary.main',
              opacity: 0.7,
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '15px',
              fontWeight: 600,
              minHeight: 56,
              px: 3,
              color: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 700,
              },
              '&:hover': {
                color: 'primary.main',
                opacity: 0.8,
              },
            },
          }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'inherit' }}>
                  Menu Items
                </Typography>
                <Chip
                  label={filteredItems.length}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: (theme) => 
                      activeTab === 0 
                        ? (theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.15)')
                        : theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.08)',
                    color: activeTab === 0 ? 'primary.main' : 'inherit',
                  }}
                />
              </Box>
            }
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'inherit' }}>
                  Categories
                </Typography>
                <Chip
                  label={categories.length}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: (theme) => 
                      activeTab === 1 
                        ? (theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.15)')
                        : theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.08)',
                    color: activeTab === 1 ? 'primary.main' : 'inherit',
                  }}
                />
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Menu Items Tab */}
      {activeTab === 0 && (
        <>
          {/* Filters */}
          <Card
            variant="outlined"
            sx={{
              mb: 4,
              p: 2.5,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : '#FAFAFA',
              borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{
                  flexGrow: 1,
                  maxWidth: 400,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#121212' : '#FFFFFF',
                  },
                }}
              />
              <FormControl 
                size="small" 
                sx={{ 
                  minWidth: 200,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#121212' : '#FFFFFF',
                  },
                }}
              >
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Card>

          {/* Menu Items Grid */}
          {filteredItems.length === 0 ? (
        <Card
          sx={{
            p: 8,
            textAlign: 'center',
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1E1E1E' : '#FFFFFF',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PhotoIcon style={{ width: 64, height: 64, opacity: 0.5 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {searchTerm || selectedCategory !== 'all'
                  ? 'No items found'
                  : 'No menu items yet'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                {searchTerm || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filter to find what you\'re looking for.'
                  : 'Start building your menu by adding your first item. You can add descriptions, prices, categories, and images.'}
              </Typography>
              {!searchTerm && selectedCategory === 'all' && (
                <Button
                  variant="contained"
                  startIcon={<PlusIcon style={{ width: 20, height: 20 }} />}
                  onClick={() => handleOpenDialog()}
                  size="large"
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    px: 4,
                    py: 1.5,
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  }}
                >
                  Add Your First Item
                </Button>
              )}
            </Box>
          </Box>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={4} xl={3} key={item.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: (theme) => theme.palette.mode === 'dark' 
                      ? '0 12px 24px rgba(0, 0, 0, 0.4)' 
                      : '0 12px 24px rgba(0, 0, 0, 0.15)',
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.25)',
                  },
                }}
              >
                <Box
                  sx={{
                    height: 140,
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2A2A2A' : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                    background: (theme) => theme.palette.mode === 'dark' 
                      ? '#2A2A2A' 
                      : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: (theme) => theme.palette.mode === 'dark' 
                        ? 'linear-gradient(180deg, rgba(255, 215, 0, 0.02) 0%, transparent 100%)'
                        : 'linear-gradient(180deg, rgba(255, 215, 0, 0.03) 0%, transparent 100%)',
                      pointerEvents: 'none',
                    },
                  }}
                >
                  {item.image_path ? (
                    <Box
                      component="img"
                      src={(() => {
                        const imgPath = item.image_path;
                        if (imgPath.startsWith('media://')) return imgPath;
                        if (imgPath.startsWith('data:')) return imgPath;
                        // If it's already just a filename, use it directly; otherwise extract filename
                        const filename = imgPath.includes('/') || imgPath.includes('\\')
                          ? imgPath.split(/[/\\]/).pop() || imgPath
                          : imgPath;
                        return `media://${filename}`;
                      })()}
                      alt={item.name}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <PhotoIcon style={{ width: 64, height: 64, opacity: 0.3 }} />
                  )}
                  <Chip
                    label={item.is_available ? 'Available' : 'Unavailable'}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      fontWeight: 600,
                      fontSize: '11px',
                      height: 24,
                      backgroundColor: item.is_available 
                        ? 'rgba(76, 175, 80, 0.9)' 
                        : 'rgba(158, 158, 158, 0.9)',
                      color: '#FFFFFF',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    }}
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      mb: 1, 
                      fontSize: '16px',
                      lineHeight: 1.3,
                    }}
                  >
                    {item.name}
                  </Typography>
                  {item.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ 
                        mb: 1.5, 
                        flexGrow: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                        fontSize: '12px',
                      }}
                    >
                      {item.description}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 'auto', pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      {item.category && (
                        <Chip
                          label={item.category}
                          size="small"
                          sx={{ 
                            mb: 1, 
                            fontSize: '10px', 
                            height: 22,
                            fontWeight: 500,
                            backgroundColor: (theme) => theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.08)' 
                              : 'rgba(0, 0, 0, 0.06)',
                            color: 'text.secondary',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      )}
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700,
                          color: 'primary.main',
                          fontSize: '16px',
                        }}
                      >
                        {formatCurrency(parseFloat(item.price.toString()))}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(item)}
                          sx={{
                            '&:hover': {
                              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                              transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s',
                          }}
                        >
                          <PencilIcon style={{ width: 18, height: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(item.id!)}
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              backgroundColor: 'error.light',
                              transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s',
                          }}
                        >
                          <TrashIcon style={{ width: 18, height: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
          )}
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 1 && (
        <>
          {categories.length === 0 ? (
            <Card
              sx={{
                p: 8,
                textAlign: 'center',
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1E1E1E' : '#FFFFFF',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FolderIcon style={{ width: 64, height: 64, opacity: 0.5 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    No categories yet
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                    Create categories to organize your menu items. Categories help customers find items more easily.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<PlusIcon style={{ width: 20, height: 20 }} />}
                    onClick={() => handleOpenCategoryDialog()}
                    size="large"
                    sx={{
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    }}
                  >
                    Create Your First Category
                  </Button>
                </Box>
              </Box>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {categories.map((category) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={category.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      p: 3,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid',
                      borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                      backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : '#FFFFFF',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: (theme) => theme.palette.mode === 'dark' 
                          ? '0 12px 24px rgba(0, 0, 0, 0.4)' 
                          : '0 12px 24px rgba(0, 0, 0, 0.12)',
                        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.25)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              backgroundColor: (theme) => theme.palette.mode === 'dark' 
                                ? 'rgba(255, 255, 255, 0.08)' 
                                : 'rgba(0, 0, 0, 0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <FolderIcon style={{ width: 20, height: 20, opacity: 0.7 }} />
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '17px' }}>
                            {category.name}
                          </Typography>
                        </Box>
                        {category.description && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              mb: 2,
                              lineHeight: 1.6,
                              fontSize: '13px',
                            }}
                          >
                            {category.description}
                          </Typography>
                        )}
                        <Chip
                          label={`Order: ${category.display_order || 0}`}
                          size="small"
                          sx={{ 
                            fontSize: '11px',
                            height: 22,
                            fontWeight: 500,
                            backgroundColor: (theme) => theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.08)' 
                              : 'rgba(0, 0, 0, 0.06)',
                          }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 'auto', pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PencilIcon style={{ width: 16, height: 16 }} />}
                        onClick={() => handleOpenCategoryDialog(category)}
                        fullWidth
                        sx={{
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 215, 0, 0.3)',
                            backgroundColor: (theme) => theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.08)' 
                              : 'rgba(0, 0, 0, 0.04)',
                          },
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TrashIcon style={{ width: 16, height: 16 }} />}
                        onClick={() => handleDeleteCategory(category.id!)}
                        fullWidth
                        sx={{
                          fontWeight: 600,
                          color: 'error.main',
                          borderColor: 'error.main',
                          '&:hover': {
                            borderColor: 'error.dark',
                            backgroundColor: 'error.light',
                            color: 'error.dark',
                          },
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}


      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Image Upload */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Image
              </Typography>
              {imagePreview ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Box
                    component="img"
                    src={imagePreview.startsWith('data:') ? imagePreview : (imagePreview.startsWith('media://') ? imagePreview : (() => {
                      // If it's a file path, extract filename and use media:// protocol
                      const filename = imagePreview.split(/[/\\]/).pop() || imagePreview;
                      return `media://${filename}`;
                    })())}
                    alt="Preview"
                    sx={{
                      width: '100%',
                      maxHeight: 200,
                      objectFit: 'cover',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleRemoveImage}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      },
                    }}
                  >
                    <XMarkIcon style={{ width: 18, height: 18 }} />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<PhotoIcon style={{ width: 18, height: 18 }} />}
                  fullWidth
                  sx={{ py: 2 }}
                >
                  Upload Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </Button>
              )}
            </Box>

            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              error={!formData.name.trim() && formData.name !== ''}
              helperText={!formData.name.trim() && formData.name !== '' ? 'Name is required' : ''}
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
              error={formData.price !== '' && (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0)}
              helperText={formData.price !== '' && (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) ? 'Price must be a valid positive number' : ''}
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                />
              }
              label="Available"
            />

            {/* Sizes Toggle */}
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={hasSizes}
                    onChange={(e) => {
                      setHasSizes(e.target.checked);
                      if (!e.target.checked) {
                        setSizes([]);
                      } else if (sizes.length === 0) {
                        addSize();
                      }
                    }}
                  />
                }
                label={
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Enable Sizes
                  </Typography>
                }
              />
              {hasSizes && (
                <Box sx={{ mt: 2, ml: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Define sizes for this menu item (e.g., Small, Medium, Large)
                    </Typography>
                    <Button size="small" startIcon={<PlusIcon style={{ width: 16, height: 16 }} />} onClick={addSize}>
                      Add Size
                    </Button>
                  </Box>
                  {sizes.map((size, index) => (
                    <Card key={index} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <TextField
                          label="Size Name"
                          value={size.name}
                          onChange={(e) => updateSize(index, 'name', e.target.value)}
                          placeholder="e.g., Small"
                          size="small"
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Price"
                          type="number"
                          value={size.price}
                          onChange={(e) => updateSize(index, 'price', e.target.value)}
                          placeholder="0.00"
                          size="small"
                          sx={{ width: 120 }}
                          inputProps={{ step: 0.01, min: 0 }}
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={size.is_default}
                              onChange={(e) => updateSize(index, 'is_default', e.target.checked)}
                              size="small"
                            />
                          }
                          label="Default"
                          sx={{ mr: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeSize(index)}
                          color="error"
                        >
                          <TrashIcon style={{ width: 18, height: 18 }} />
                        </IconButton>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>

            {/* Custom Options Toggle */}
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={hasOptions}
                    onChange={(e) => {
                      setHasOptions(e.target.checked);
                      if (!e.target.checked) {
                        setCustomOptions([]);
                      } else if (customOptions.length === 0) {
                        addCustomOption();
                      }
                    }}
                  />
                }
                label={
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Enable Options
                  </Typography>
                }
              />
              {hasOptions && (
                <Box sx={{ mt: 2, ml: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Define custom options for this menu item (e.g., Grilled Chicken, Fish, Fried Chicken)
                    </Typography>
                    <Button size="small" startIcon={<PlusIcon style={{ width: 16, height: 16 }} />} onClick={addCustomOption}>
                      Add Option
                    </Button>
                  </Box>
                  {customOptions.map((option, index) => (
                    <Card key={index} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <TextField
                          label="Option Name"
                          value={option.name}
                          onChange={(e) => updateCustomOption(index, 'name', e.target.value)}
                          placeholder="e.g., Grilled Chicken"
                          size="small"
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Price Modifier"
                          type="number"
                          value={option.price}
                          onChange={(e) => updateCustomOption(index, 'price', e.target.value)}
                          placeholder="0.00"
                          size="small"
                          sx={{ width: 150 }}
                          inputProps={{ step: 0.01 }}
                          helperText="Added to base price"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={option.is_available}
                              onChange={(e) => updateCustomOption(index, 'is_available', e.target.checked)}
                              size="small"
                            />
                          }
                          label="Available"
                          sx={{ mr: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeCustomOption(index)}
                          color="error"
                        >
                          <TrashIcon style={{ width: 18, height: 18 }} />
                        </IconButton>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={uploadingImage}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={uploadingImage}>
            {uploadingImage ? 'Uploading...' : editingItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={openCategoryDialog} onClose={handleCloseCategoryDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Category Name"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              required
              fullWidth
              error={!categoryFormData.name.trim() && categoryFormData.name !== ''}
              helperText={!categoryFormData.name.trim() && categoryFormData.name !== '' ? 'Category name is required' : ''}
            />
            <TextField
              label="Description"
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Display Order"
              type="number"
              value={categoryFormData.display_order}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, display_order: parseInt(e.target.value) || 0 })}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDialog}>Cancel</Button>
          <Button onClick={handleSaveCategory} variant="contained">
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
}

export default MenuManagement;
