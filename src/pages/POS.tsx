import { useState, useEffect } from 'react';
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
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  InputAdornment,
} from '@mui/material';
import {
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import {
  getMenuItems,
  getMenuItemSizes,
  getMenuItemCustomOptions,
  createOrder,
  addCustomer,
  getCustomers,
  MenuItem as MenuItemType,
  MenuItemSize,
  MenuItemCustomOption,
} from '../utils/database';
import { useAuth } from '../contexts/AuthContext';

interface CartItem {
  menuItem: MenuItemType;
  quantity: number;
  selectedSize?: { id: number; name: string; price: number };
  selectedOptions: Array<{ id: number; name: string; price: number }>;
  notes?: string;
  price: number;
}

function POS() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemType | null>(null);
  const [itemSizes, setItemSizes] = useState<MenuItemSize[]>([]);
  const [itemOptions, setItemOptions] = useState<MenuItemCustomOption[]>([]);
  const [selectedSize, setSelectedSize] = useState<{ id: number; name: string; price: number } | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Array<{ id: number; name: string; price: number }>>([]);
  const [itemNotes, setItemNotes] = useState('');
  const [openCheckoutDialog, setOpenCheckoutDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [menuSearchTerm, setMenuSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const items = await getMenuItems();
      setMenuItems(items);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenItemDialog = async (item: MenuItemType) => {
    setSelectedMenuItem(item);
    setSelectedSize(null);
    setSelectedOptions([]);
    setItemNotes('');
    
    try {
      const [sizes, options] = await Promise.all([
        getMenuItemSizes(item.id!),
        getMenuItemCustomOptions(item.id!),
      ]);
      setItemSizes(sizes);
      setItemOptions(options.filter(o => (o.is_available ?? 0) === 1));
      
      const defaultSize = sizes.find(s => (s.is_default ?? 0) === 1);
      if (defaultSize) {
        setSelectedSize({ id: defaultSize.id!, name: defaultSize.name, price: defaultSize.price });
      } else if (sizes.length > 0) {
        setSelectedSize({ id: sizes[0].id!, name: sizes[0].name, price: sizes[0].price });
      }
    } catch (err) {
      console.error('Error loading item details:', err);
    }
    
    setOpenItemDialog(true);
  };

  const handleCloseItemDialog = () => {
    setOpenItemDialog(false);
    setSelectedMenuItem(null);
    setSelectedSize(null);
    setSelectedOptions([]);
    setItemNotes('');
    setItemSizes([]);
    setItemOptions([]);
  };

  const calculateItemPrice = (item: MenuItemType, size?: { id: number; name: string; price: number } | null, options: Array<{ id: number; name: string; price: number }> = []) => {
    let basePrice = item.price;
    if (size) {
      basePrice = size.price;
    }
    const optionsPrice = options.reduce((sum, opt) => sum + opt.price, 0);
    return basePrice + optionsPrice;
  };

  const handleAddToCart = () => {
    if (!selectedMenuItem) return;

    const finalPrice = calculateItemPrice(selectedMenuItem, selectedSize, selectedOptions);
    
    const cartItem: CartItem = {
      menuItem: selectedMenuItem,
      quantity: 1,
      selectedSize: selectedSize || undefined,
      selectedOptions: [...selectedOptions],
      notes: itemNotes.trim() || undefined,
      price: finalPrice,
    };

    setCart([...cart, cartItem]);
    handleCloseItemDialog();
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity = Math.max(1, newCart[index].quantity + delta);
    setCart(newCart);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return Math.max(0, subtotal - discountAmount);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SLE',
    }).format(amount);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }
    setOpenCheckoutDialog(true);
  };

  const handleSendToKitchen = async () => {
    try {
      if (cart.length === 0) {
        setError('Cart is empty');
        return;
      }

      const orderData = {
        order_number: `KIT-${Date.now()}`,
        customer_name: customerName || null,
        created_at: new Date().toISOString(),
        items: cart.map(item => ({
          name: item.menuItem.name,
          quantity: item.quantity,
          size: item.selectedSize?.name || null,
          options: item.selectedOptions.map(opt => ({ name: opt.name })),
          notes: item.notes || null,
        })),
      };

      await window.electronAPI.print.kitchenOrder(orderData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to print kitchen order');
      console.error(err);
    }
  };

  const handleProcessPayment = async () => {
    try {
      const subtotal = calculateSubtotal();
      const total = calculateTotal();

      const orderNumber = `ORD-${Date.now()}`;

      // Create or find customer if name is provided
      let customerId: number | undefined;
      if (customerName.trim()) {
        try {
          // Try to find existing customer by name
          const existingCustomers = await getCustomers();
          const existingCustomer = existingCustomers.find(
            c => c.name.toLowerCase().trim() === customerName.toLowerCase().trim()
          );
          
          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            // Create new customer
            const newCustomer = await addCustomer({ name: customerName.trim() });
            customerId = newCustomer.lastInsertRowid;
          }
        } catch (err: any) {
          console.error('Error creating/finding customer:', err);
          // Continue without customer if there's an error
        }
      }

      await createOrder({
        order_number: orderNumber,
        total_amount: total,
        subtotal: subtotal,
        discount_amount: discountAmount,
        payment_method: paymentMethod,
        customer_id: customerId,
        user_id: user?.id, // Record which user/cashier created this order
        items: cart.map(item => ({
          menu_item_id: item.menuItem.id!,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
          notes: item.notes,
        })),
      });

      // Print customer receipt
      try {
        const receiptData = {
          order_number: orderNumber,
          customer_name: customerName || null,
          subtotal: subtotal,
          discount_amount: discountAmount,
          total_amount: total,
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
          items: cart.map(item => ({
            name: item.menuItem.name,
            quantity: item.quantity,
            size: item.selectedSize?.name || null,
            options: item.selectedOptions.map(opt => ({ name: opt.name })),
            price: item.price,
            subtotal: item.price * item.quantity,
          })),
        };
        await window.electronAPI.print.customerReceipt(receiptData);
      } catch (printErr: any) {
        console.error('Error printing receipt:', printErr);
        // Don't fail the order if printing fails
      }

      setCart([]);
      setDiscountAmount(0);
      setCustomerName('');
      setOpenCheckoutDialog(false);
      await loadData();
      
      setError(null);
      alert(`Order ${orderNumber} created successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      console.error(err);
    }
  };

  const categories = Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)));
  const filteredItems = menuItems.filter(item => {
    // Category filter
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    // Search filter
    const matchesSearch = !menuSearchTerm || 
      item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(menuSearchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', mx: { xs: -2, sm: -3, md: -4 }, mb: { xs: -2, sm: -3 } }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            position: 'fixed', 
            top: 16, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 9999,
            minWidth: 400,
            boxShadow: 3
          }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Column - Menu Items */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Menu Header */}
          <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}` }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, fontSize: '1.1rem' }}>
              Menu
            </Typography>
            
            {/* Search Bar */}
            <TextField
              placeholder="Search menu items..."
              value={menuSearchTerm}
              onChange={(e) => setMenuSearchTerm(e.target.value)}
              size="small"
              fullWidth
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlassIcon style={{ width: 20, height: 20, opacity: 0.5 }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Category Chips */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label="All"
                onClick={() => setSelectedCategory('all')}
                color={selectedCategory === 'all' ? 'primary' : 'default'}
                sx={{ cursor: 'pointer', height: 28, fontSize: '0.8125rem', fontWeight: selectedCategory === 'all' ? 600 : 400 }}
              />
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  onClick={() => setSelectedCategory(cat!)}
                  color={selectedCategory === cat ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer', height: 28, fontSize: '0.8125rem', fontWeight: selectedCategory === cat ? 600 : 400 }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2.5, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#121212' : '#FAFAFA', position: 'relative' }}>
            {filteredItems.length === 0 ? (
              <Card sx={{ p: 8, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No items found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try selecting a different category
                </Typography>
              </Card>
            ) : (
              <Grid container spacing={2.5}>
                {filteredItems.map((item) => (
                  <Grid item xs={12} sm={6} md={6} lg={3} xl={3} key={item.id}>
                    <Card
                      onClick={() => handleOpenItemDialog(item)}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: (theme) => theme.palette.mode === 'dark' 
                            ? '0 8px 16px rgba(0, 0, 0, 0.3)' 
                            : '0 8px 16px rgba(0, 0, 0, 0.12)',
                          borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.25)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: 160,
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2A2A2A' : '#F5F5F5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {item.image_path ? (
                          <Box
                            component="img"
                            src={(() => {
                              const imgPath = item.image_path!;
                              if (imgPath.startsWith('media://')) return imgPath;
                              if (imgPath.startsWith('data:')) return imgPath;
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
                          <Typography variant="h2" sx={{ opacity: 0.2, fontWeight: 700, fontSize: '56px' }}>
                            {item.name.charAt(0)}
                          </Typography>
                        )}
                      </Box>
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2, justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, fontSize: '15px' }}>
                            {item.name}
                          </Typography>
                          {item.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ 
                                fontSize: '12px',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.4,
                              }}
                            >
                              {item.description}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '17px', mt: 1 }}>
                          {formatCurrency(item.price)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Box>

        {/* Right Column - Cart */}
        <Box 
          sx={{ 
            width: 320,
            minWidth: 320,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : '#FFFFFF',
            borderLeft: '1px solid',
            borderColor: 'divider',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Cart Header */}
          <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                Cart
              </Typography>
              <Badge 
                badgeContent={cart.reduce((sum, item) => sum + item.quantity, 0)} 
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: 16,
                    minWidth: 16,
                  }
                }}
              />
            </Box>
          </Box>

          {/* Cart Content */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {cart.length === 0 ? (
            <Box sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center',
              px: 3,
              py: 8
            }}>
              <ShoppingCartIcon style={{ width: 48, height: 48, color: '#FFD700', opacity: 0.4, margin: '0 auto 16px' }} />
              <Typography variant="body2" color="text.secondary">
                Cart is empty
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, minHeight: 0 }}>
                {cart.map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      mb: 1.5,
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      '&:hover': {
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flexGrow: 1, minWidth: 0, pr: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px', mb: 0.25 }}>
                          {item.menuItem.name}
                        </Typography>
                        {(item.selectedSize || item.selectedOptions.length > 0) && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', display: 'block' }}>
                            {item.selectedSize && `${item.selectedSize.name} `}
                            {item.selectedOptions.length > 0 && item.selectedOptions.map(o => o.name).join(', ')}
                          </Typography>
                        )}
                        {item.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', fontStyle: 'italic', display: 'block', mt: 0.25 }}>
                            {item.notes}
                          </Typography>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveFromCart(index)}
                        sx={{ 
                          color: 'error.main',
                          p: 0.5,
                          '&:hover': {
                            backgroundColor: 'error.light',
                          }
                        }}
                      >
                        <TrashIcon style={{ width: 16, height: 16 }} />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateQuantity(index, -1)}
                          disabled={item.quantity <= 1}
                          sx={{ 
                            width: 28,
                            height: 28,
                            p: 0,
                            '&:hover:not(:disabled)': {
                              backgroundColor: 'primary.light',
                            },
                            '&:disabled': {
                              opacity: 0.3,
                            }
                          }}
                        >
                          <MinusIcon style={{ width: 14, height: 14 }} />
                        </IconButton>
                        <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 600, fontSize: '14px' }}>
                          {item.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateQuantity(index, 1)}
                          sx={{ 
                            width: 28,
                            height: 28,
                            p: 0,
                            '&:hover': {
                              backgroundColor: 'primary.light',
                            }
                          }}
                        >
                          <PlusIcon style={{ width: 14, height: 14 }} />
                        </IconButton>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '15px' }}>
                        {formatCurrency(item.price * item.quantity)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                {cart.length > 0 && (
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<PrinterIcon style={{ width: 18, height: 18 }} />}
                    onClick={handleSendToKitchen}
                    sx={{ mb: 2, py: 1 }}
                  >
                    Send to Kitchen
                  </Button>
                )}
                <TextField
                  label="Discount"
                  type="number"
                  size="small"
                  value={discountAmount || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const maxDiscount = calculateSubtotal();
                    setDiscountAmount(Math.max(0, Math.min(value, maxDiscount)));
                  }}
                  inputProps={{ min: 0, max: calculateSubtotal(), step: 0.01 }}
                  fullWidth
                  sx={{ mb: 2 }}
                  placeholder="0.00"
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Subtotal
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(calculateSubtotal())}
                    </Typography>
                  </Box>
                  {discountAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Discount
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        -{formatCurrency(discountAmount)}
                      </Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 0.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Total
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {formatCurrency(calculateTotal())}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  size="medium"
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  sx={{
                    py: 1.25,
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '14px',
                  }}
                >
                  Checkout
                </Button>
              </Box>
            </Box>
          )}
          </Box>
        </Box>
      </Box>

      {/* Item Selection Dialog */}
      <Dialog open={openItemDialog} onClose={handleCloseItemDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedMenuItem?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {itemSizes.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Size</InputLabel>
                <Select
                  value={selectedSize?.id || ''}
                  label="Size"
                  onChange={(e) => {
                    const sizeId = e.target.value as number;
                    const size = itemSizes.find(s => s.id === sizeId);
                    if (size && size.id) {
                      setSelectedSize({ id: size.id, name: size.name, price: size.price });
                    }
                  }}
                >
                  {itemSizes.map((size) => (
                    <MenuItem key={size.id} value={size.id ?? 0}>
                      {size.name} - {formatCurrency(size.price)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {itemOptions.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Options</InputLabel>
                <Select
                  multiple
                  value={selectedOptions.map(o => o.id)}
                  label="Options"
                  onChange={(e) => {
                    const selectedIds = e.target.value as number[];
                    const selected = itemOptions
                      .filter(o => selectedIds.includes(o.id!))
                      .map(o => ({ id: o.id!, name: o.name, price: o.price }));
                    setSelectedOptions(selected);
                  }}
                  renderValue={(selected) => {
                    const selectedNames = itemOptions
                      .filter(o => selected.includes(o.id!))
                      .map(o => o.name);
                    return selectedNames.join(', ');
                  }}
                >
                  {itemOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id ?? 0}>
                      {option.name} {option.price > 0 && `(+${formatCurrency(option.price)})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Special Instructions (Optional)"
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />

            <Box sx={{ mt: 2, p: 2, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : '#FAFAFA', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Price:
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {selectedMenuItem ? formatCurrency(calculateItemPrice(selectedMenuItem, selectedSize, selectedOptions)) : formatCurrency(0)}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseItemDialog}>Cancel</Button>
          <Button onClick={handleAddToCart} variant="contained">
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog 
        open={openCheckoutDialog} 
        onClose={() => {
          setOpenCheckoutDialog(false);
          // Don't reset customerName when dialog closes - only reset after successful payment
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Checkout</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Order Summary
              </Typography>
              <List dense>
                {cart.map((item, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText
                      primary={`${item.quantity}x ${item.menuItem.name}`}
                      secondary={
                        <>
                          {item.selectedSize && `Size: ${item.selectedSize.name} `}
                          {item.selectedOptions.length > 0 && `Options: ${item.selectedOptions.map(o => o.name).join(', ')}`}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(item.price * item.quantity)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Subtotal:</Typography>
                <Typography variant="body2">{formatCurrency(calculateSubtotal())}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Discount:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: discountAmount > 0 ? 'success.main' : 'text.secondary' }}>
                  -{formatCurrency(discountAmount)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Total:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {formatCurrency(calculateTotal())}
                </Typography>
              </Box>
            </Box>

            <TextField
              label="Customer Name (Optional)"
              value={customerName || ''}
              onChange={(e) => {
                e.stopPropagation();
                setCustomerName(e.target.value);
              }}
              onKeyDown={(e) => e.stopPropagation()}
              fullWidth
              placeholder="Enter customer name"
              autoFocus={false}
              sx={{ mb: 2 }}
            />

            <TextField
              label="Discount Amount"
              type="number"
              value={discountAmount}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                const maxDiscount = calculateSubtotal();
                setDiscountAmount(Math.max(0, Math.min(value, maxDiscount)));
              }}
              inputProps={{ min: 0, max: calculateSubtotal(), step: 0.01 }}
              fullWidth
              helperText={`Maximum discount: ${formatCurrency(calculateSubtotal())}`}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                label="Payment Method"
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value="cash">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BanknotesIcon style={{ width: 20, height: 20 }} />
                    Cash
                  </Box>
                </MenuItem>
                <MenuItem value="card">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreditCardIcon style={{ width: 20, height: 20 }} />
                    Card
                  </Box>
                </MenuItem>
                <MenuItem value="mobile">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreditCardIcon style={{ width: 20, height: 20 }} />
                    Mobile Payment
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCheckoutDialog(false)}>Cancel</Button>
          <Button onClick={handleProcessPayment} variant="contained" size="large">
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default POS;
