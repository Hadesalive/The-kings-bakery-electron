import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '../components/Layout/PageHeader';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllSettings,
  updateSettings,
  updateSetting,
  syncPush,
  syncPull,
  syncFull,
  syncTestConnection,
  getLastSyncTime,
  getImageSyncDiagnostics,
  User,
  Setting,
} from '../utils/database';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function Settings() {
  const { user: currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'cashier' as 'admin' | 'cashier',
    full_name: '',
    email: '',
  });
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncConfig, setSyncConfig] = useState({ supabase_url: '', supabase_service_key: '' });
  const [syncAutoInterval, setSyncAutoInterval] = useState<string>('off');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, settingsData] = await Promise.all([
        getAllUsers(),
        getAllSettings(),
      ]);
      setUsers(usersData);
      setSettings(settingsData);

      // Extract sync config for Cloud Sync tab
      const urlSetting = settingsData.find((s) => s.key === 'supabase_url');
      const keySetting = settingsData.find((s) => s.key === 'supabase_service_key');
      const autoIntervalSetting = settingsData.find((s) => s.key === 'sync_auto_interval');
      setSyncConfig({
        supabase_url: urlSetting?.value || '',
        supabase_service_key: keySetting?.value || '',
      });
      setSyncAutoInterval(autoIntervalSetting?.value || 'off');

      const lastSyncTime = await getLastSyncTime();
      setLastSync(lastSyncTime);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSyncConfig = async () => {
    try {
      await updateSettings([
        { key: 'supabase_url', value: syncConfig.supabase_url },
        { key: 'supabase_service_key', value: syncConfig.supabase_service_key },
      ]);
      setError(null);
      alert('Sync configuration saved!');
    } catch (err: any) {
      setError(err.message || 'Failed to save sync config');
    }
  };

  const handleTestConnection = async () => {
    try {
      await handleSaveSyncConfig();
      setSyncLoading(true);
      setError(null);
      await syncTestConnection();
      alert('Connection successful! Supabase is configured correctly.');
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncPush = async () => {
    try {
      await handleSaveSyncConfig();
      setSyncLoading(true);
      setError(null);
      const result = await syncPush();
      setLastSync(new Date().toISOString());
      let imgMsg = '';
      if (result.imagesUploaded) {
        imgMsg = ` ${result.imagesUploaded} images uploaded.`;
      } else if (result.imagesUploaded === 0 && (result.imagesSkipped ?? 0) > 0) {
        imgMsg = ` 0 images uploaded (${result.imagesSkipped} not found locally - run "Check image sync" to diagnose).`;
      } else if (result.imagesUploaded === 0 && (result.imagesTotalInDb ?? 0) > 0) {
        imgMsg = ` 0 images uploaded (${result.imagesTotalInDb} in DB but none found locally - run "Check image sync" to diagnose).`;
      }
      const deletedImg = (result as { imagesDeletedFromStorage?: number }).imagesDeletedFromStorage;
      if (deletedImg) imgMsg += ` ${deletedImg} orphaned images removed from cloud.`;
      alert(`Sync complete! ${result.pushed} records pushed to cloud.${imgMsg}`);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Push failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCheckImageSync = async () => {
    try {
      const d = await getImageSyncDiagnostics();
      const msg = [
        `Media folder: ${d.mediaPath || 'N/A'}`,
        `Folder exists: ${d.mediaPathExists}`,
        `Menu items with images: ${d.menuItemsWithImages}`,
        `Files in media folder: ${d.filesInMediaFolder.length}`,
        d.filesInMediaFolder.length > 0 ? `  → ${d.filesInMediaFolder.slice(0, 10).join(', ')}${d.filesInMediaFolder.length > 10 ? '...' : ''}` : '',
        `DB image_paths: ${d.imagePathsFromDb.length ? d.imagePathsFromDb.slice(0, 5).join(', ') + (d.imagePathsFromDb.length > 5 ? '...' : '') : 'none'}`,
        `Files that match (would upload): ${d.matchingFiles.length}`,
      ]
        .filter(Boolean)
        .join('\n');
      alert(msg);
    } catch (err: any) {
      setError(err.message || 'Failed to get diagnostics');
    }
  };

  const handleSyncPull = async () => {
    if (!window.confirm('This will replace local data with cloud data. Continue?')) return;
    try {
      await handleSaveSyncConfig();
      setSyncLoading(true);
      setError(null);
      const result = await syncPull();
      setLastSync(new Date().toISOString());
      const imgMsg = result.imagesDownloaded ? ` ${result.imagesDownloaded} images downloaded.` : '';
      alert(`Sync complete! ${result.pulled} records pulled from cloud.${imgMsg}`);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Pull failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncFull = async () => {
    try {
      await handleSaveSyncConfig();
      setSyncLoading(true);
      setError(null);
      await syncFull();
      setLastSync(new Date().toISOString());
      alert('Full sync complete! Local data pushed to cloud and cloud data pulled to local.');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        password: '',
        role: user.role,
        full_name: user.full_name || '',
        email: user.email || '',
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        password: '',
        role: 'cashier',
        full_name: '',
        email: '',
      });
    }
    setOpenUserDialog(true);
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
    setEditingUser(null);
    setUserForm({
      username: '',
      password: '',
      role: 'cashier',
      full_name: '',
      email: '',
    });
  };

  const handleSaveUser = async () => {
    try {
      if (!userForm.username.trim()) {
        setError('Username is required');
        return;
      }

      if (!editingUser && !userForm.password.trim()) {
        setError('Password is required for new users');
        return;
      }

      if (editingUser) {
        const updateData: any = {
          role: userForm.role,
          full_name: userForm.full_name || null,
          email: userForm.email || null,
        };
        if (userForm.password.trim()) {
          updateData.password_hash = userForm.password;
        }
        await updateUser(editingUser.id!, updateData);
      } else {
        await createUser({
          username: userForm.username,
          password_hash: userForm.password,
          role: userForm.role,
          full_name: userForm.full_name || undefined,
          email: userForm.email || undefined,
          is_active: 1,
        });
      }

      await loadData();
      handleCloseUserDialog();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteUser(userId);
      await loadData();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const settingsToUpdate = settings.map(s => ({
        key: s.key,
        value: s.value || '',
      }));
      await updateSettings(settingsToUpdate);
      await loadData();
      setError(null);
      alert('Settings saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
      console.error(err);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const groupedSettings = settings
    .filter((s) => (s.category || 'general') !== 'sync')
    .reduce((acc, setting) => {
      const category = setting.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {} as Record<string, Setting[]>);

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
        title="Settings"
        subtitle="Manage users and system settings"
        breadcrumbs={[
          { label: 'Home', path: '/pos' },
          { label: 'Settings' },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tab label="Users" />
          <Tab label="System Settings" />
          <Tab label="Cloud Sync" />
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <TabPanel value={tabValue} index={0}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    User Management
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<PlusIcon style={{ width: 18, height: 18 }} />}
                    onClick={() => handleOpenUserDialog()}
                  >
                    Add User
                  </Button>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Full Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{user.username}</TableCell>
                          <TableCell>{user.full_name || '-'}</TableCell>
                          <TableCell>{user.email || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.role}
                              size="small"
                              color={user.role === 'admin' ? 'primary' : 'default'}
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.is_active ? 'Active' : 'Inactive'}
                              size="small"
                              color={user.is_active ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {user.last_login
                              ? new Date(user.last_login).toLocaleString()
                              : 'Never'}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenUserDialog(user)}
                              disabled={user.id === currentUser?.id}
                            >
                              <PencilIcon style={{ width: 18, height: 18 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => user.id && handleDeleteUser(user.id)}
                              disabled={user.id === currentUser?.id}
                              color="error"
                            >
                              <TrashIcon style={{ width: 18, height: 18 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    System Settings
                  </Typography>
                  <Button variant="contained" onClick={handleSaveSettings}>
                    Save Settings
                  </Button>
                </Box>

                <Grid container spacing={3}>
                  {Object.entries(groupedSettings).map(([category, categorySettings]) => (
                    <Grid item xs={12} key={category}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, textTransform: 'capitalize' }}>
                        {category}
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        {categorySettings.map((setting) => (
                          <Grid item xs={12} sm={6} md={4} key={setting.key}>
                            <TextField
                              label={setting.description || setting.key}
                              value={setting.value || ''}
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                              fullWidth
                              size="small"
                              type={setting.key.includes('email') ? 'email' : setting.key.includes('phone') ? 'tel' : 'text'}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                  Supabase Cloud Sync
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Sync your POS data with Supabase for backup or multi-device access. Configure your Supabase project
                  credentials below.
                </Typography>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12}>
                    <TextField
                      label="Supabase Project URL"
                      placeholder="https://xxxxx.supabase.co"
                      value={syncConfig.supabase_url}
                      onChange={(e) => setSyncConfig((c) => ({ ...c, supabase_url: e.target.value }))}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Supabase Service Role Key"
                      placeholder="eyJhbGciOiJIUzI1NiIs..."
                      type="password"
                      value={syncConfig.supabase_service_key}
                      onChange={(e) => setSyncConfig((c) => ({ ...c, supabase_service_key: e.target.value }))}
                      fullWidth
                      size="small"
                      helperText="Find in Supabase Dashboard → Project Settings → API → service_role (secret)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Auto-sync (Push to cloud)</InputLabel>
                      <Select
                        value={syncAutoInterval}
                        label="Auto-sync (Push to cloud)"
                        onChange={async (e) => {
                          const v = e.target.value;
                          setSyncAutoInterval(v);
                          await updateSetting('sync_auto_interval', v);
                        }}
                      >
                        <MenuItem value="off">Off</MenuItem>
                        <MenuItem value="1">Every 1 minute</MenuItem>
                        <MenuItem value="5">Every 5 minutes</MenuItem>
                        <MenuItem value="15">Every 15 minutes</MenuItem>
                        <MenuItem value="30">Every 30 minutes</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={handleTestConnection}
                    disabled={syncLoading || !syncConfig.supabase_url || !syncConfig.supabase_service_key}
                    startIcon={
                      syncLoading ? (
                        <CircularProgress size={18} />
                      ) : (
                        <CheckCircleIcon style={{ width: 18, height: 18 }} />
                      )
                    }
                  >
                    Test Connection
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSyncPush}
                    disabled={syncLoading || !syncConfig.supabase_url || !syncConfig.supabase_service_key}
                    startIcon={<CloudArrowUpIcon style={{ width: 18, height: 18 }} />}
                  >
                    Push to Cloud
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleSyncPull}
                    disabled={syncLoading || !syncConfig.supabase_url || !syncConfig.supabase_service_key}
                    startIcon={<CloudArrowDownIcon style={{ width: 18, height: 18 }} />}
                  >
                    Pull from Cloud
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSyncFull}
                    disabled={syncLoading || !syncConfig.supabase_url || !syncConfig.supabase_service_key}
                    startIcon={<ArrowsRightLeftIcon style={{ width: 18, height: 18 }} />}
                  >
                    Full Sync
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleCheckImageSync}
                    disabled={syncLoading}
                  >
                    Check image sync
                  </Button>
                </Box>

                {lastSync && (
                  <Typography variant="body2" color="text.secondary">
                    Last synced: {new Date(lastSync).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </TabPanel>
        </Box>
      </Box>

      {/* User Dialog */}
      <Dialog open={openUserDialog} onClose={handleCloseUserDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Username"
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              fullWidth
              required
              disabled={!!editingUser}
            />
            <TextField
              label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              fullWidth
              required={!editingUser}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={userForm.role}
                label="Role"
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'admin' | 'cashier' })}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="cashier">Cashier</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Full Name"
              value={userForm.full_name}
              onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserDialog}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Settings;
