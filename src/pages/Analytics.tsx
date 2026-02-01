import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ChartPieIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  getDailyAnalytics,
  getTopSellingItems,
  getOrders,
  getTotalItemsSold,
  type Analytics,
} from '../utils/database';
import PageHeader from '../components/Layout/PageHeader';

function Analytics() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('30');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<Analytics[]>([]);
  const [topSellingItems, setTopSellingItems] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalItemsSold: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, startDate, endDate]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Determine date range
      let start: string;
      let end: string = new Date().toISOString().split('T')[0];
      
      if (dateRange === 'custom' && startDate && endDate) {
        start = startDate;
        end = endDate;
      } else {
        const days = parseInt(dateRange);
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - days);
        start = startDateObj.toISOString().split('T')[0];
      }

      // Load analytics data
      const [analytics, topItems, allOrders, totalItemsSold] = await Promise.all([
        getDailyAnalytics(start, end),
        getTopSellingItems(10, start, end),
        getOrders(10000), // Get more orders to ensure we have all data
        getTotalItemsSold(start, end),
      ]);

      // Calculate summary statistics - count paid or completed orders
      const startDateObj = new Date(start);
      startDateObj.setHours(0, 0, 0, 0);
      const endDateObj = new Date(end);
      endDateObj.setHours(23, 59, 59, 999);

      const filteredOrders = allOrders.filter((order: any) => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        const isInRange = orderDate >= startDateObj && orderDate <= endDateObj;
        const isPaidOrCompleted = order.payment_status === 'paid' || order.status === 'completed';
        return isInRange && isPaidOrCompleted;
      });

      // Calculate daily revenue from actual orders to ensure accurate chart data
      const dailyRevenueMap = new Map<string, { revenue: number; orders: number }>();
      
      filteredOrders.forEach((order: any) => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        const existing = dailyRevenueMap.get(orderDate) || { revenue: 0, orders: 0 };
        dailyRevenueMap.set(orderDate, {
          revenue: existing.revenue + (order.total_amount || 0),
          orders: existing.orders + 1,
        });
      });

      // Fill in missing days with zero values to ensure proper chart rendering
      const filledAnalytics: Analytics[] = [];
      
      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dailyData = dailyRevenueMap.get(dateStr);
        const existingAnalytics = analytics.find(a => a.date === dateStr);
        
        if (dailyData) {
          filledAnalytics.push({
            date: dateStr,
            total_revenue: dailyData.revenue,
            total_orders: dailyData.orders,
            average_order_value: dailyData.orders > 0 ? dailyData.revenue / dailyData.orders : 0,
          });
        } else if (existingAnalytics) {
          filledAnalytics.push(existingAnalytics);
        } else {
          filledAnalytics.push({
            date: dateStr,
            total_revenue: 0,
            total_orders: 0,
            average_order_value: 0,
          });
        }
      }

      setAnalyticsData(filledAnalytics);
      setTopSellingItems(topItems);

      const totalRevenue = filteredOrders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
      const totalOrders = filteredOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setSummaryStats({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalItemsSold,
      });

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SLE',
      maximumFractionDigits: 0,
      notation: amount >= 1000000 ? 'compact' : 'standard',
    }).format(amount);
  };

  const formatCompactNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  // Calculate revenue trend
  const calculateTrend = () => {
    if (analyticsData.length < 2) return { percentage: 0, isPositive: true };
    
    const sorted = [...analyticsData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.total_revenue, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.total_revenue, 0) / secondHalf.length;
    
    if (firstAvg === 0) return { percentage: 0, isPositive: true };
    
    const percentage = ((secondAvg - firstAvg) / firstAvg) * 100;
    return { percentage: Math.abs(percentage), isPositive: percentage >= 0 };
  };

  const trend = calculateTrend();

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
        title="Analytics Dashboard"
        subtitle="Track sales, revenue, and business insights"
        breadcrumbs={[
          { label: 'Home', path: '/pos' },
          { label: 'Analytics' },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Date Range Filters */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Date Range</InputLabel>
          <Select
            value={dateRange}
            label="Date Range"
            onChange={(e) => {
              setDateRange(e.target.value);
              if (e.target.value !== 'custom') {
                setStartDate('');
                setEndDate('');
              }
            }}
            sx={{
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <MenuItem value="7">Last 7 Days</MenuItem>
            <MenuItem value="30">Last 30 Days</MenuItem>
            <MenuItem value="90">Last 90 Days</MenuItem>
            <MenuItem value="365">Last Year</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </Select>
        </FormControl>

        {dateRange === 'custom' && (
          <>
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
            />
          </>
        )}
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4} lg={2.4} xl={2.4}>
          <Card
            sx={{
              height: '100%',
              minHeight: 140,
              border: (theme) =>
                `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : '#FFFFFF',
            }}
          >
            <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, minHeight: 20 }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  Total Revenue
                </Typography>
                <Box sx={{ ml: 0.5, flexShrink: 0 }}>
                  <CurrencyDollarIcon style={{ width: 18, height: 18, opacity: 0.4 }} />
                </Box>
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  mt: 'auto',
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word',
                  hyphens: 'auto',
                }}
              >
                {formatCurrency(summaryStats.totalRevenue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4} xl={2.4}>
          <Card
            sx={{
              height: '100%',
              minHeight: 140,
              border: (theme) =>
                `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : '#FFFFFF',
            }}
          >
            <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, minHeight: 20 }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  Total Orders
                </Typography>
                <Box sx={{ ml: 0.5, flexShrink: 0 }}>
                  <ShoppingBagIcon style={{ width: 18, height: 18, opacity: 0.4 }} />
                </Box>
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  mt: 'auto',
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {formatCompactNumber(summaryStats.totalOrders)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4} xl={2.4}>
          <Card
            sx={{
              height: '100%',
              minHeight: 140,
              border: (theme) =>
                `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : '#FFFFFF',
            }}
          >
            <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, minHeight: 20 }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  Avg Order Value
                </Typography>
                <Box sx={{ ml: 0.5, flexShrink: 0 }}>
                  <ChartPieIcon style={{ width: 18, height: 18, opacity: 0.4 }} />
                </Box>
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  mt: 'auto',
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word',
                  hyphens: 'auto',
                }}
              >
                {formatCurrency(summaryStats.averageOrderValue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4} xl={2.4}>
          <Card
            sx={{
              height: '100%',
              minHeight: 140,
              border: (theme) =>
                `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : '#FFFFFF',
            }}
          >
            <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, minHeight: 20 }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  Total Items Sold
                </Typography>
                <Box sx={{ ml: 0.5, flexShrink: 0 }}>
                  <ShoppingBagIcon style={{ width: 18, height: 18, opacity: 0.4 }} />
                </Box>
              </Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  mt: 'auto',
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {formatCompactNumber(summaryStats.totalItemsSold)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2.4} xl={2.4}>
          <Card
            sx={{
              height: '100%',
              minHeight: 140,
              border: (theme) =>
                `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1A1A1A' : '#FFFFFF',
            }}
          >
            <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, minHeight: 20 }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }, 
                    fontWeight: 600, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  Revenue Trend
                </Typography>
                <Box sx={{ ml: 0.5, flexShrink: 0 }}>
                  <ArrowTrendingUpIcon style={{ width: 18, height: 18, opacity: 0.4 }} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 'auto', flexWrap: 'nowrap' }}>
                <ArrowTrendingUpIcon
                  style={{
                    width: 18,
                    height: 18,
                    color: trend.isPositive ? '#4caf50' : '#f44336',
                    transform: trend.isPositive ? 'none' : 'rotate(180deg)',
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: trend.isPositive ? '#4caf50' : '#f44336',
                    fontSize: 'clamp(1.1rem, 2.5vw, 1.75rem)',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {trend.percentage.toFixed(1)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts and Tables */}
      <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Daily Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0 }}>
            <Box sx={{ 
              p: 3, 
              pb: 2.5, 
              borderBottom: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Daily Revenue
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                Showing total revenue for the selected period
              </Typography>
            </Box>
            {analyticsData.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 400,
                  p: 3,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No data available for the selected period
                </Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, width: '100%', height: '100%', minHeight: 400, p: 3, pt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analyticsData
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((data) => ({
                        date: data.date,
                        revenue: Number(data.total_revenue) || 0,
                        orders: Number(data.total_orders) || 0,
                      }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#FFD700"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#FFD700"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      vertical={false}
                      stroke={theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        });
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'currentColor', fontSize: 12 }}
                      width={60}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                        return value.toString();
                      }}
                    />
                    <Tooltip
                      cursor={{ stroke: '#FFD700', strokeWidth: 1, strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#FFFFFF',
                        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        padding: '8px 12px',
                      }}
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                      }}
                      formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                    />
                    <Area
                      dataKey="revenue"
                      type="monotone"
                      fill="url(#fillRevenue)"
                      fillOpacity={1}
                      stroke="#FFD700"
                      strokeWidth={2.5}
                      dot={analyticsData.length <= 10}
                      activeDot={{ r: 6, stroke: '#FFD700', strokeWidth: 2, fill: '#FFFFFF' }}
                      connectNulls={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Card>
        </Grid>

        {/* Top Selling Items */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Top Selling Items
              </Typography>
              {topSellingItems.length === 0 ? (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 200,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No data available
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {topSellingItems.map((item, index) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        py: 1.5,
                        borderBottom: (theme) =>
                          `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
                      }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: '#FFD700',
                          fontSize: '0.875rem',
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {item.total_quantity} sold
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#FFD700', minWidth: 80, textAlign: 'right' }}>
                        {formatCurrency(item.total_revenue || 0)}
      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Analytics;
