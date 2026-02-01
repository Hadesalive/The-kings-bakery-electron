import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
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
  Tooltip,
} from '@mui/material';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import {
  getTables,
  addTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  Table,
} from '../utils/database';
import PageHeader from '../components/Layout/PageHeader';

function TableManagement() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    number: '',
    name: '',
    capacity: 4,
    status: 'available' as 'available' | 'occupied' | 'reserved' | 'cleaning',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getTables();
      setTables(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load tables');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (table?: Table) => {
    if (table) {
      setEditingTable(table);
      setFormData({
        number: table.number,
        name: table.name || '',
        capacity: table.capacity || 4,
        status: table.status || 'available',
        notes: table.notes || '',
      });
    } else {
      setEditingTable(null);
      setFormData({
        number: '',
        name: '',
        capacity: 4,
        status: 'available',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTable(null);
    setFormData({
      number: '',
      name: '',
      capacity: 4,
      status: 'available',
      notes: '',
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.number.trim()) {
        setError('Table number is required');
        return;
      }

      if (editingTable) {
        await updateTable(editingTable.id!, {
          number: formData.number.trim(),
          name: formData.name.trim() || undefined,
          capacity: formData.capacity,
          status: formData.status,
          notes: formData.notes.trim() || undefined,
        });
      } else {
        await addTable({
          number: formData.number.trim(),
          name: formData.name.trim() || undefined,
          capacity: formData.capacity,
          status: formData.status,
          notes: formData.notes.trim() || undefined,
        });
      }
      await loadData();
      handleCloseDialog();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save table');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this table?')) {
      return;
    }

    try {
      await deleteTable(id);
      await loadData();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete table');
      console.error(err);
    }
  };

  const handleStatusChange = async (id: number, newStatus: 'available' | 'occupied' | 'reserved' | 'cleaning') => {
    try {
      await updateTableStatus(id, newStatus);
      await loadData();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update table status');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'occupied':
        return 'error';
      case 'reserved':
        return 'warning';
      case 'cleaning':
        return 'info';
      default:
        return 'default';
    }
  };

  const filteredTables = selectedStatus === 'all' 
    ? tables 
    : tables.filter(t => t.status === selectedStatus);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Table Management"
        subtitle="Manage restaurant tables and seating"
        breadcrumbs={[
          { label: 'Home', path: '/pos' },
          { label: 'Table Management' },
        ]}
        actions={
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
            Add Table
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

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
        <FormControl 
          size="small" 
          sx={{ 
            minWidth: 200,
            '& .MuiOutlinedInput-root': {
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#121212' : '#FFFFFF',
            },
          }}
        >
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedStatus}
            label="Status"
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="occupied">Occupied</MenuItem>
            <MenuItem value="reserved">Reserved</MenuItem>
            <MenuItem value="cleaning">Cleaning</MenuItem>
          </Select>
        </FormControl>
      </Card>

      {/* Tables Grid */}
      {filteredTables.length === 0 ? (
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
              <TableCellsIcon style={{ width: 64, height: 64, opacity: 0.5 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {selectedStatus !== 'all'
                  ? 'No tables with this status'
                  : 'No tables yet'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                {selectedStatus !== 'all'
                  ? 'Try selecting a different status filter.'
                  : 'Create your first table to start managing seating in your restaurant.'}
              </Typography>
              {selectedStatus === 'all' && (
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
                  Create Your First Table
                </Button>
              )}
            </Box>
          </Box>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredTables.map((table) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={table.id}>
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
                <Box sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '24px', mb: 0.5 }}>
                        {table.number}
                      </Typography>
                      {table.name && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {table.name}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={table.status ? table.status.charAt(0).toUpperCase() + table.status.slice(1) : 'Available'}
                      color={getStatusColor(table.status || 'available') as any}
                      size="small"
                      sx={{ fontWeight: 600, fontSize: '11px' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Chip
                      label={`${table.capacity || 4} seats`}
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

                  {table.notes && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        fontSize: '12px',
                        fontStyle: 'italic',
                      }}
                    >
                      {table.notes}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(table)}
                        sx={{
                          color: 'primary.main',
                        }}
                      >
                        <PencilIcon style={{ width: 18, height: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(table.id!)}
                        sx={{
                          color: 'error.main',
                        }}
                      >
                        <TrashIcon style={{ width: 18, height: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Box sx={{ flexGrow: 1 }} />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={table.status || 'available'}
                        onChange={(e) => handleStatusChange(table.id!, e.target.value as any)}
                        sx={{
                          fontSize: '11px',
                          height: 28,
                          '& .MuiSelect-select': {
                            py: 0.5,
                          },
                        }}
                      >
                        <MenuItem value="available">Available</MenuItem>
                        <MenuItem value="occupied">Occupied</MenuItem>
                        <MenuItem value="reserved">Reserved</MenuItem>
                        <MenuItem value="cleaning">Cleaning</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTable ? 'Edit Table' : 'Add Table'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Table Number"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              required
              fullWidth
              placeholder="e.g., 1, 2, 3"
            />
            <TextField
              label="Table Name (Optional)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              placeholder="e.g., Window Table, Corner Booth"
            />
            <TextField
              label="Capacity"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
              fullWidth
              inputProps={{ min: 1, max: 20 }}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="occupied">Occupied</MenuItem>
                <MenuItem value="reserved">Reserved</MenuItem>
                <MenuItem value="cleaning">Cleaning</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
              placeholder="Any special notes about this table..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingTable ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TableManagement;

