import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
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
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  CreditCardIcon,
  BanknotesIcon,
  TableCellsIcon,
  CalendarIcon,
  DocumentTextIcon,
  PrinterIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  getOrders,
  getOrderItems,
  getOrderItemOptions,
  getOrderItemAddons,
  getTables,
  updateOrder,
  updateTable,
  getCustomer,
  getAllUsers,
  deleteOrder,
  Order,
  OrderItem,
  Table,
  Customer,
  User,
} from '../utils/database';
import PageHeader from '../components/Layout/PageHeader';
import { useAuth } from '../contexts/AuthContext';

interface OrderItemWithDetails extends OrderItem {
  options?: any[];
  addons?: any[];
}

interface OrderWithDetails extends Order {
  table?: Table;
  customer?: Customer;
  user?: User; // User/cashier who created the order
  items?: OrderItemWithDetails[];
}

function Orders() {
  const { user, hasRole } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const isCashier = hasRole('cashier');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, startDate, endDate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await getOrders(500);
      const allTables = await getTables();
      const allUsers = await getAllUsers(); // Fetch all users for user lookup
      
      // Enrich orders with table, customer, and user information
      const ordersWithDetails: OrderWithDetails[] = await Promise.all(
        allOrders.map(async (order) => {
          const table = order.table_id 
            ? allTables.find(t => t.id === order.table_id)
            : undefined;
          
          let customer: Customer | undefined;
          if (order.customer_id) {
            const customerData = await getCustomer(order.customer_id);
            customer = customerData || undefined;
          }
          
          // Get user who created the order
          const user = order.user_id
            ? allUsers.find(u => u.id === order.user_id)
            : undefined;
          
          return {
            ...order,
            table,
            customer,
            user,
          };
        })
      );
      
      setOrders(ordersWithDetails);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (order) => {
          // Search in order number
          if (order.order_number?.toLowerCase().includes(term)) return true;
          
          // Search in table number and name
          if (order.table?.number?.toLowerCase().includes(term)) return true;
          if (order.table?.name?.toLowerCase().includes(term)) return true;
          
          // Search in customer name
          if (order.customer?.name?.toLowerCase().includes(term)) return true;
          
          // Search in notes
          if (order.notes?.toLowerCase().includes(term)) return true;
          
          return false;
        }
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Payment status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter((order) => order.payment_status === paymentStatusFilter);
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((order) => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        orderDate.setHours(0, 0, 0, 0); // Reset time to start of day
        
        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // End of day
          return orderDate >= start && orderDate <= end;
        } else if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          return orderDate >= start;
        } else if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return orderDate <= end;
        }
        return true;
      });
    }

    setFilteredOrders(filtered);
  };

  const handleViewDetails = async (order: OrderWithDetails) => {
    try {
      const items = await getOrderItems(order.id!);
      
      // Load options and addons for each item
      const itemsWithDetails: OrderItemWithDetails[] = await Promise.all(
        items.map(async (item) => {
          const [options, addons] = await Promise.all([
            getOrderItemOptions(item.id!),
            getOrderItemAddons(item.id!),
          ]);
          return {
            ...item,
            options,
            addons,
          };
        })
      );

      setSelectedOrder({
        ...order,
        items: itemsWithDetails,
      });
      setOpenDetailsDialog(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
      console.error(err);
    }
  };

  const handleUpdateStatus = async (orderId: number, field: 'status' | 'payment_status', value: string) => {
    try {
      await updateOrder(orderId, { [field]: value });
      
      // If status is being set to 'completed', free up the table
      if (field === 'status' && value === 'completed') {
        const order = orders.find(o => o.id === orderId);
        if (order && order.table_id) {
          await updateTable(order.table_id, { status: 'available', current_order_id: undefined });
        }
      }
      
      // Silently update the order in the list without reloading
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, [field]: value } : order
        )
      );
      setFilteredOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, [field]: value } : order
        )
      );
      // Update selected order if it's open in dialog
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, [field]: value });
      }
    } catch (err: any) {
      // Only show error if it's a real error, not just silently fail
      setError(err.message || 'Failed to update order');
      console.error(err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SLE',
    }).format(amount);
  };

  const handleDeleteOrder = async (orderId: number, orderNumber: string) => {
    // Check if user is a cashier
    if (isCashier) {
      setError('Cashiers are not allowed to delete orders. Please contact an administrator.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete order ${orderNumber}? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteOrder(orderId, user?.id);
      // Check if deletion was successful
      if (result && result.success === false) {
        setError(result.message || 'Failed to delete order');
        return;
      }
      // Remove the order from the lists
      setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
      setFilteredOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
      // Close dialog if the deleted order was open
      if (selectedOrder && selectedOrder.id === orderId) {
        setOpenDetailsDialog(false);
        setSelectedOrder(null);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete order');
      console.error(err);
    }
  };

  const handlePrintReceipt = async (order: OrderWithDetails) => {
    try {
      if (!order.items || order.items.length === 0) {
        setError('Order has no items to print');
        return;
      }

      const receiptData = {
        order_number: order.order_number,
        table: order.table ? {
          name: order.table.name,
          number: order.table.number,
        } : null,
        customer_name: order.customer?.name || null,
        subtotal: order.subtotal || 0,
        discount_amount: order.discount_amount || 0,
        total_amount: order.total_amount || 0,
        payment_method: order.payment_method || null,
        created_at: order.created_at || new Date().toISOString(),
        items: order.items.map(item => ({
          name: item.name || 'Unknown Item',
          quantity: item.quantity,
          size: null, // Could be enhanced to get size info
          options: [], // Could be enhanced to get options info
          price: item.price,
          subtotal: item.subtotal || (item.price * item.quantity),
        })),
      };

      await window.electronAPI.print.customerReceipt(receiptData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to print receipt');
      console.error(err);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'card':
        return <CreditCardIcon style={{ width: 16, height: 16 }} />;
      case 'cash':
        return <BanknotesIcon style={{ width: 16, height: 16 }} />;
      default:
        return null;
    }
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
        title="Orders"
        subtitle="View and manage all orders"
        breadcrumbs={[
          { label: 'Home', path: '/pos' },
          { label: 'Orders' },
        ]}
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
          placeholder="Search by order number, customer name, table, or notes..."
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
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="preparing">Preparing</MenuItem>
            <MenuItem value="ready">Ready</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Payment</InputLabel>
          <Select
            value={paymentStatusFilter}
            label="Payment"
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <MenuItem value="all">All Payments</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="refunded">Refunded</MenuItem>
          </Select>
        </FormControl>

        {/* Date Range Filters */}
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          size="small"
          InputLabelProps={{
            shrink: true,
          }}
          sx={{
            minWidth: 150,
            '& .MuiOutlinedInput-root': {
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CalendarIcon style={{ width: 18, height: 18, opacity: 0.6 }} />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          size="small"
          InputLabelProps={{
            shrink: true,
          }}
          sx={{
            minWidth: 150,
            '& .MuiOutlinedInput-root': {
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CalendarIcon style={{ width: 18, height: 18, opacity: 0.6 }} />
              </InputAdornment>
            ),
          }}
        />

        {(startDate || endDate) && (
          <Button
            size="small"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            sx={{
              minWidth: 100,
              textTransform: 'none',
            }}
          >
            Clear Dates
          </Button>
        )}
      </Box>

      {/* Orders List */}
      <Box sx={{ flex: 1, overflow: 'auto', pr: 1 }}>
        {filteredOrders.length === 0 ? (
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
            <DocumentTextIcon style={{ width: 64, height: 64, opacity: 0.3 }} />
            <Typography variant="h6" color="text.secondary">
              {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {orders.length === 0
                ? 'Orders will appear here once they are created'
                : 'Try adjusting your search or filter criteria'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredOrders.map((order) => (
              <Card
                key={order.id}
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  border: (theme) =>
                    `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark'
                        ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                        : '0 2px 8px rgba(0, 0, 0, 0.08)',
                  },
                }}
                onClick={() => handleViewDetails(order)}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {/* Order Number */}
                    <Box sx={{ minWidth: 120 }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {order.order_number}
                      </Typography>
                      {order.customer && (
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#FFD700', fontWeight: 600, mt: 0.25 }}>
                          {order.customer.name}
                        </Typography>
                      )}
                      {order.user && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.25, fontStyle: 'italic' }}>
                          Cashier: {order.user.full_name || order.user.username}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <CalendarIcon style={{ width: 12, height: 12, opacity: 0.6 }} />
                        {new Date(order.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>

                    {/* Table */}
                    {order.table && (
                      <Box sx={{ minWidth: 80, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TableCellsIcon style={{ width: 16, height: 16, opacity: 0.6 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                          Table {order.table.number}
                        </Typography>
                      </Box>
                    )}

                    {/* Status */}
                    <Box sx={{ minWidth: 130 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel sx={{ fontSize: '0.75rem' }}>Status</InputLabel>
                        <Select
                          value={order.status || 'pending'}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(order.id!, 'status', e.target.value);
                          }}
                          label="Status"
                          size="small"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          <MenuItem value="pending" sx={{ fontSize: '0.8rem' }}>Pending</MenuItem>
                          <MenuItem value="preparing" sx={{ fontSize: '0.8rem' }}>Preparing</MenuItem>
                          <MenuItem value="ready" sx={{ fontSize: '0.8rem' }}>Ready</MenuItem>
                          <MenuItem value="completed" sx={{ fontSize: '0.8rem' }}>Completed</MenuItem>
                          <MenuItem value="cancelled" sx={{ fontSize: '0.8rem' }}>Cancelled</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Payment Status */}
                    <Box sx={{ minWidth: 130 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel sx={{ fontSize: '0.75rem' }}>Payment</InputLabel>
                        <Select
                          value={order.payment_status || 'pending'}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(order.id!, 'payment_status', e.target.value);
                          }}
                          label="Payment"
                          size="small"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          <MenuItem value="paid" sx={{ fontSize: '0.8rem' }}>Paid</MenuItem>
                          <MenuItem value="pending" sx={{ fontSize: '0.8rem' }}>Pending</MenuItem>
                          <MenuItem value="refunded" sx={{ fontSize: '0.8rem' }}>Refunded</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Payment Method */}
                    {order.payment_method && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 80 }}>
                        {getPaymentMethodIcon(order.payment_method)}
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                          {order.payment_method}
                        </Typography>
                      </Box>
                    )}

                    {/* Total - Right aligned */}
                    {order.total_amount && order.total_amount > 0 && (
                      <Box sx={{ ml: 'auto', textAlign: 'right', minWidth: 100 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#FFD700', fontSize: '1rem' }}>
                          {formatCurrency(order.total_amount)}
                        </Typography>
                        {(order.discount_amount && Number(order.discount_amount) > 0) ? (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            Discount: {formatCurrency(order.discount_amount)}
                          </Typography>
                        ) : null}
                      </Box>
                    )}

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(order);
                        }}
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
                        <EyeIcon style={{ width: 20, height: 20 }} />
                      </IconButton>
                      {!isCashier && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (order.id && order.order_number) {
                              handleDeleteOrder(order.id, order.order_number);
                            }
                          }}
                          sx={{
                            color: 'text.secondary',
                            '&:hover': {
                              color: 'error.main',
                              backgroundColor: (theme) =>
                                theme.palette.mode === 'dark'
                                  ? 'rgba(244, 67, 54, 0.1)'
                                  : 'rgba(244, 67, 54, 0.08)',
                            },
                          }}
                        >
                          <TrashIcon style={{ width: 20, height: 20 }} />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Order Details Dialog */}
      <Dialog
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? '#1E1E1E' : '#FFFFFF',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            pb: 1.5,
            pt: 2,
            px: 2,
            borderBottom: (theme) =>
              `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontSize: '1rem' }}>
              {selectedOrder?.order_number}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ fontSize: '0.75rem' }}>Status</InputLabel>
                <Select
                  value={selectedOrder?.status || 'pending'}
                  onChange={(e) => selectedOrder && handleUpdateStatus(selectedOrder.id!, 'status', e.target.value)}
                  label="Status"
                  size="small"
                  sx={{ fontSize: '0.75rem' }}
                >
                  <MenuItem value="pending" sx={{ fontSize: '0.75rem' }}>Pending</MenuItem>
                  <MenuItem value="preparing" sx={{ fontSize: '0.75rem' }}>Preparing</MenuItem>
                  <MenuItem value="ready" sx={{ fontSize: '0.75rem' }}>Ready</MenuItem>
                  <MenuItem value="completed" sx={{ fontSize: '0.75rem' }}>Completed</MenuItem>
                  <MenuItem value="cancelled" sx={{ fontSize: '0.75rem' }}>Cancelled</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ fontSize: '0.75rem' }}>Payment</InputLabel>
                <Select
                  value={selectedOrder?.payment_status || 'pending'}
                  onChange={(e) => selectedOrder && handleUpdateStatus(selectedOrder.id!, 'payment_status', e.target.value)}
                  label="Payment"
                  size="small"
                  sx={{ fontSize: '0.75rem' }}
                >
                  <MenuItem value="paid" sx={{ fontSize: '0.75rem' }}>Paid</MenuItem>
                  <MenuItem value="pending" sx={{ fontSize: '0.75rem' }}>Pending</MenuItem>
                  <MenuItem value="refunded" sx={{ fontSize: '0.75rem' }}>Refunded</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2, px: 2, pb: 1 }}>
          {selectedOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Order Information */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {selectedOrder.table && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <TableCellsIcon style={{ width: 14, height: 14, opacity: 0.6 }} />
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        Table {selectedOrder.table.number}
                        {selectedOrder.table.name && ` - ${selectedOrder.table.name}`}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <CalendarIcon style={{ width: 14, height: 14, opacity: 0.6 }} />
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {formatDate(selectedOrder.created_at)}
                    </Typography>
                  </Box>
                  {selectedOrder.payment_method && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {getPaymentMethodIcon(selectedOrder.payment_method)}
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                        {selectedOrder.payment_method}
                      </Typography>
                    </Box>
                  )}
                  {selectedOrder.user && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        Cashier: {selectedOrder.user.full_name || selectedOrder.user.username}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 0.5 }} />

              {/* Order Items */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  Items ({selectedOrder.items?.length || 0})
                </Typography>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 300, overflow: 'auto' }}>
                    {selectedOrder.items.map((item, index) => (
                      <Box key={item.id} sx={{ pb: index < selectedOrder.items!.length - 1 ? 1 : 0, borderBottom: index < selectedOrder.items!.length - 1 ? (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}` : 'none' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 0.25 }}>
                              {item.name || 'Unknown Item'}
                            </Typography>
                            {item.notes && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.7rem' }}>
                                {item.notes}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ textAlign: 'right', ml: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              {item.quantity}x
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                              {formatCurrency(item.subtotal)}
                            </Typography>
                          </Box>
                        </Box>
                        {(item.options && item.options.length > 0) || (item.addons && item.addons.length > 0) ? (
                          <Box sx={{ pl: 1.5, pt: 0.5 }}>
                            {item.options && item.options.map((option: any) => (
                              <Typography key={option.id} variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                • {option.option_name}
                              </Typography>
                            ))}
                            {item.addons && item.addons.map((addon: any) => (
                              <Typography key={addon.id} variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                • {addon.addon_name} x{addon.quantity}
                              </Typography>
                            ))}
                          </Box>
                        ) : null}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    No items found
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 0.5 }} />

              {/* Order Summary */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  Summary
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {selectedOrder.discount_amount && selectedOrder.discount_amount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Discount
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', fontSize: '0.8rem' }}>
                        -{formatCurrency(selectedOrder.discount_amount)}
                      </Typography>
                    </Box>
                  )}
                  {selectedOrder.discount_amount && selectedOrder.discount_amount > 0 && (
                    <Divider sx={{ my: 0.5 }} />
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      Total
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#FFD700', fontSize: '0.9rem' }}>
                      {formatCurrency(selectedOrder.total_amount)}
      </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 2,
            py: 1.5,
            borderTop: (theme) =>
              `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
            gap: 1,
          }}
        >
          {selectedOrder && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PrinterIcon style={{ width: 18, height: 18 }} />}
                onClick={() => handlePrintReceipt(selectedOrder)}
              >
                Print Receipt
              </Button>
              {!isCashier && (
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<TrashIcon style={{ width: 18, height: 18 }} />}
                  onClick={() => {
                    if (selectedOrder.id && selectedOrder.order_number) {
                      handleDeleteOrder(selectedOrder.id, selectedOrder.order_number);
                    }
                  }}
                  sx={{ ml: 'auto' }}
                >
                  Delete Order
                </Button>
              )}
            </>
          )}
          <Button onClick={() => setOpenDetailsDialog(false)} variant="outlined" size="small">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Orders;
