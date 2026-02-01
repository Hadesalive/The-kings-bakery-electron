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
  CircularProgress,
  Alert,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import {
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addInventoryTransaction,
  getInventoryTransactions,
  InventoryItem,
  InventoryTransaction,
} from '../utils/database';
import PageHeader from '../components/Layout/PageHeader';

function Inventory() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAdjustDialog, setOpenAdjustDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'unit',
    current_stock: '',
    min_stock: '',
    max_stock: '',
    cost_per_unit: '',
    supplier: '',
    category: '',
    location: '',
    barcode: '',
  });

  const [adjustmentData, setAdjustmentData] = useState({
    quantity: '',
    transaction_type: 'adjustment',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [inventoryItems, searchTerm, categoryFilter, stockFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const items = await getInventoryItems();
      setInventoryItems(items);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...inventoryItems];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.name?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          item.category?.toLowerCase().includes(term) ||
          item.supplier?.toLowerCase().includes(term) ||
          item.location?.toLowerCase().includes(term) ||
          item.barcode?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    // Stock filter
    if (stockFilter === 'low') {
      filtered = filtered.filter((item) => {
        const current = item.current_stock || 0;
        const min = item.min_stock || 0;
        return current <= min;
      });
    } else if (stockFilter === 'out') {
      filtered = filtered.filter((item) => (item.current_stock || 0) === 0);
    } else if (stockFilter === 'in_stock') {
      filtered = filtered.filter((item) => {
        const current = item.current_stock || 0;
        const min = item.min_stock || 0;
        return current > min;
      });
    }

    setFilteredItems(filtered);
  };

  const categories = Array.from(new Set(inventoryItems.map((item) => item.category).filter(Boolean)));

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        description: item.description || '',
        unit: item.unit || 'unit',
        current_stock: item.current_stock?.toString() || '0',
        min_stock: item.min_stock?.toString() || '0',
        max_stock: item.max_stock?.toString() || '0',
        cost_per_unit: item.cost_per_unit?.toString() || '0',
        supplier: item.supplier || '',
        category: item.category || '',
        location: item.location || '',
        barcode: item.barcode || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        unit: 'unit',
        current_stock: '',
        min_stock: '',
        max_stock: '',
        cost_per_unit: '',
        supplier: '',
        category: '',
        location: '',
        barcode: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        setError('Item name is required');
        return;
      }

      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        unit: formData.unit || 'unit',
        current_stock: parseFloat(formData.current_stock) || 0,
        min_stock: parseFloat(formData.min_stock) || 0,
        max_stock: parseFloat(formData.max_stock) || 0,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        supplier: formData.supplier.trim() || undefined,
        category: formData.category.trim() || undefined,
        location: formData.location.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
      };

      if (editingItem) {
        await updateInventoryItem(editingItem.id!, itemData);
      } else {
        await addInventoryItem(itemData);
      }

      await loadData();
      handleCloseDialog();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save inventory item');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this inventory item?')) {
      return;
    }

    try {
      await deleteInventoryItem(id);
      await loadData();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete inventory item');
      console.error(err);
    }
  };

  const handleOpenAdjustDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustmentData({
      quantity: '',
      transaction_type: 'adjustment',
      notes: '',
    });
    setOpenAdjustDialog(true);
  };

  const handleCloseAdjustDialog = () => {
    setOpenAdjustDialog(false);
    setSelectedItem(null);
  };

  const handleAdjustStock = async () => {
    try {
      if (!selectedItem) return;

      const quantity = parseFloat(adjustmentData.quantity);
      if (isNaN(quantity) || quantity === 0) {
        setError('Please enter a valid quantity');
        return;
      }

      // Use the selected transaction type, or determine from quantity if adjustment
      let transactionType = adjustmentData.transaction_type;
      let absQuantity = Math.abs(quantity);

      // If adjustment type and negative quantity, convert to 'out'
      if (transactionType === 'adjustment' && quantity < 0) {
        transactionType = 'out';
      } else if (transactionType === 'adjustment' && quantity > 0) {
        transactionType = 'in';
      }

      await addInventoryTransaction({
        inventory_item_id: selectedItem.id!,
        transaction_type: transactionType,
        quantity: absQuantity,
        notes: adjustmentData.notes || undefined,
      });

      await loadData();
      handleCloseAdjustDialog();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
      console.error(err);
    }
  };

  const handleOpenHistoryDialog = async (item: InventoryItem) => {
    try {
      setSelectedItem(item);
      const itemTransactions = await getInventoryTransactions(item.id!);
      setTransactions(itemTransactions);
      setOpenHistoryDialog(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction history');
      console.error(err);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const current = item.current_stock || 0;
    const min = item.min_stock || 0;
    const max = item.max_stock || 0;

    if (current === 0) {
      return { label: 'Out of Stock', color: 'error' as const };
    } else if (current <= min) {
      return { label: 'Low Stock', color: 'warning' as const };
    } else if (max > 0 && current >= max) {
      return { label: 'At Max', color: 'info' as const };
    } else {
      return { label: 'In Stock', color: 'success' as const };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SLE',
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader
        title="Inventory Management"
        subtitle="Track stock levels and manage inventory"
        breadcrumbs={[
          { label: 'Home', path: '/pos' },
          { label: 'Inventory' },
        ]}
        actions={
          <Button
            variant="contained"
            startIcon={<PlusIcon style={{ width: 20, height: 20 }} />}
            onClick={() => handleOpenDialog()}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Add Item
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{
            flexGrow: 1,
            minWidth: 250,
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

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            label="Category"
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Stock Status</InputLabel>
          <Select
            value={stockFilter}
            label="Stock Status"
            onChange={(e) => setStockFilter(e.target.value)}
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <MenuItem value="all">All Items</MenuItem>
            <MenuItem value="in_stock">In Stock</MenuItem>
            <MenuItem value="low">Low Stock</MenuItem>
            <MenuItem value="out">Out of Stock</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Inventory Items List */}
      <Box sx={{ flex: 1, overflow: 'auto', pr: 1 }}>
        {filteredItems.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              gap: 2,
            }}
          >
            <CubeIcon style={{ width: 64, height: 64, opacity: 0.3 }} />
            <Typography variant="h6" color="text.secondary">
              {inventoryItems.length === 0 ? 'No inventory items yet' : 'No items match your filters'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {inventoryItems.length === 0
                ? 'Add your first inventory item to get started'
                : 'Try adjusting your search or filter criteria'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filteredItems.map((item) => {
              const stockStatus = getStockStatus(item);
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease-in-out',
                      border: (theme) =>
                        `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: (theme) =>
                          theme.palette.mode === 'dark'
                            ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                            : '0 4px 12px rgba(0, 0, 0, 0.1)',
                      },
                    }}
                  >
                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
                      {/* Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                            {item.name}
                          </Typography>
                          {item.category && (
                            <Chip
                              label={item.category}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                mb: 0.5,
                              }}
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenAdjustDialog(item)}
                            sx={{
                              color: 'text.secondary',
                              '&:hover': {
                                color: 'primary.main',
                                backgroundColor: (theme) =>
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <ArrowUpIcon style={{ width: 16, height: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(item)}
                            sx={{
                              color: 'text.secondary',
                              '&:hover': {
                                color: 'primary.main',
                                backgroundColor: (theme) =>
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <PencilIcon style={{ width: 16, height: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(item.id!)}
                            sx={{
                              color: 'text.secondary',
                              '&:hover': {
                                color: 'error.main',
                                backgroundColor: (theme) =>
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <TrashIcon style={{ width: 16, height: 16 }} />
                          </IconButton>
                        </Box>
                      </Box>

                      {item.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {item.description}
                        </Typography>
                      )}

                      <Divider />

                      {/* Stock Info */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                            Current Stock
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                              {item.current_stock || 0} {item.unit || 'unit'}
                            </Typography>
                            <Chip
                              label={stockStatus.label}
                              size="small"
                              color={stockStatus.color}
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                        </Box>

                        {(item.min_stock || item.min_stock === 0) && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              Min: {item.min_stock} {item.unit || 'unit'}
                            </Typography>
                            {item.max_stock && item.max_stock > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Max: {item.max_stock} {item.unit || 'unit'}
                              </Typography>
                            )}
                          </Box>
                        )}

                        {item.cost_per_unit && item.cost_per_unit > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Cost: {formatCurrency(item.cost_per_unit)} per {item.unit || 'unit'}
                          </Typography>
                        )}
                      </Box>

                      <Divider />

                      {/* Additional Info */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {item.supplier && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Supplier: {item.supplier}
                          </Typography>
                        )}
                        {item.location && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Location: {item.location}
                          </Typography>
                        )}
                        {item.barcode && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Barcode: {item.barcode}
                          </Typography>
                        )}
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          fullWidth
                          onClick={() => handleOpenHistoryDialog(item)}
                          startIcon={<ClockIcon style={{ width: 14, height: 14 }} />}
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          History
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          fullWidth
                          onClick={() => handleOpenAdjustDialog(item)}
                          startIcon={<ArrowUpIcon style={{ width: 14, height: 14 }} />}
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Adjust
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* Add/Edit Item Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Item Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                fullWidth
                placeholder="e.g., kg, lb, piece"
              />
              <TextField
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                fullWidth
                placeholder="e.g., Ingredients, Supplies"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Current Stock"
                type="number"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
              />
              <TextField
                label="Min Stock"
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
              />
              <TextField
                label="Max Stock"
                type="number"
                value={formData.max_stock}
                onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Cost per Unit"
                type="number"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">Le</InputAdornment>,
                }}
              />
              <TextField
                label="Supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                fullWidth
                placeholder="e.g., Warehouse A, Shelf 3"
              />
              <TextField
                label="Barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingItem ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={openAdjustDialog} onClose={handleCloseAdjustDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Stock - {selectedItem?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Current Stock: {selectedItem?.current_stock || 0} {selectedItem?.unit || 'unit'}
            </Alert>

            <TextField
              label="Quantity Adjustment"
              type="number"
              value={adjustmentData.quantity}
              onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
              fullWidth
              required
              helperText="Enter positive number to add stock, negative to remove"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {parseFloat(adjustmentData.quantity) > 0 ? (
                      <ArrowUpIcon style={{ width: 20, height: 20, color: 'green' }} />
                    ) : parseFloat(adjustmentData.quantity) < 0 ? (
                      <ArrowDownIcon style={{ width: 20, height: 20, color: 'red' }} />
                    ) : null}
                  </InputAdornment>
                ),
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={adjustmentData.transaction_type}
                label="Transaction Type"
                onChange={(e) => setAdjustmentData({ ...adjustmentData, transaction_type: e.target.value })}
              >
                <MenuItem value="adjustment">Adjustment</MenuItem>
                <MenuItem value="in">Stock In</MenuItem>
                <MenuItem value="out">Stock Out</MenuItem>
                <MenuItem value="waste">Waste</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Notes (Optional)"
              value={adjustmentData.notes}
              onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdjustDialog}>Cancel</Button>
          <Button onClick={handleAdjustStock} variant="contained">
            Adjust Stock
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={openHistoryDialog} onClose={() => setOpenHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Transaction History - {selectedItem?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1, maxHeight: 500, overflow: 'auto' }}>
            {transactions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No transactions found
              </Typography>
            ) : (
              transactions.map((transaction) => (
                <Card key={transaction.id} sx={{ mb: 1 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {transaction.transaction_type.toUpperCase()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Quantity: {transaction.quantity} {selectedItem?.unit || 'unit'}
                        </Typography>
                        {transaction.unit_cost && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Cost: {formatCurrency(transaction.unit_cost)}
                          </Typography>
                        )}
                        {transaction.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {transaction.notes}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {transaction.created_at
                          ? new Date(transaction.created_at).toLocaleString()
                          : 'N/A'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Inventory;
