import { useState, useEffect, useCallback, useRef } from 'react';
import * as creditsApi from '../api/credits';
import * as paymentApi from '../api/payments';
import Modal from '../components/ui/Modal';
import { SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { getErrorMessage } from '../utils/errorHandler';
import { formatDate, formatTimestamp } from '../utils/format';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
const POLL_INTERVAL = 30000;

const CREDIT_PACKS = [
  { credits: 100, price: 199, label: 'Starter Pack' },
  { credits: 500, price: 899, label: 'Growth Pack' },
  { credits: 1000, price: 1599, label: 'Pro Pack' },
  { credits: 5000, price: 6999, label: 'Enterprise Pack' },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="h-8 w-64 bg-gray-200/70 rounded-lg animate-pulse" />
      <div className="h-4 w-96 bg-gray-200/70 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonChart /><SkeletonChart /></div>
      <SkeletonChart />
    </div>
  );
}

function CreditDashboard() {
  const [creditData, setCreditData] = useState(null);
  const [lowCheck, setLowCheck] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txnTotal, setTxnTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [txnPage, setTxnPage] = useState(1);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const pollingRef = useRef(null);
  const [pollToggle, setPollToggle] = useState(false);

  const txnSize = 10;

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [usageData, txnData, checkData, aiUsageData] = await Promise.all([
        creditsApi.getUsageCredits(),
        creditsApi.getCreditTransactions({ page: txnPage, size: txnSize }),
        creditsApi.getLowCreditCheck(),
        creditsApi.getUsageAi(),
      ]);
      setCreditData(usageData);
      setTransactions(txnData.items || []);
      setTxnTotal(txnData.total || 0);
      setLowCheck(checkData);
      setAiData(aiUsageData);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load credit data'));
    } finally {
      setLoading(false);
    }
  }, [txnPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Polling
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      setPollToggle((p) => !p);
    }, POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    if (!loading && pollToggle) {
      fetchData(false);
    }
  }, [pollToggle, fetchData, loading]);

  const handlePurchasePack = async (pack) => {
    setSelectedPack(pack);
  };

  const confirmPurchase = async () => {
    if (!selectedPack) return;
    setPurchasing(true);
    try {
      // Try direct credit purchase
      const result = await creditsApi.purchaseCredits(selectedPack.credits);
      toast.success(result.message || `Purchased ${selectedPack.credits} credits`);
      setShowPurchase(false);
      setSelectedPack(null);
      fetchData();
    } catch (err) {
      // Fallback to Razorpay payment
      try {
        await handleRazorpayPurchase(selectedPack);
      } catch (payErr) {
        toast.error(getErrorMessage(payErr, 'Purchase failed'));
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRazorpayPurchase = async (pack) => {
    const amount = pack.price;
    const order = await paymentApi.createOrder({
      amount,
      payment_type: 'credit_topup',
      credit_amount: pack.credits,
    });

    await loadRazorpayScript();

    const options = {
      key: order.key_id,
      amount: order.amount_paise,
      currency: order.currency,
      name: 'Mini EC',
      description: `${pack.label} - ${pack.credits} Credits`,
      order_id: order.razorpay_order_id,
      prefill: order.prefill || { contact: '', email: '' },
      handler: async function (response) {
        try {
          const result = await paymentApi.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (result.success) {
            toast.success(`${pack.credits} credits purchased!`);
            setShowPurchase(false);
            setSelectedPack(null);
            fetchData();
          } else {
            toast.error(result.message || 'Payment verification failed');
          }
        } catch (verifyErr) {
          toast.error(getErrorMessage(verifyErr, 'Payment verification failed'));
        }
      },
      modal: { ondismiss: () => toast('Checkout closed', { icon: 'ℹ️' }) },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      toast.error(`Payment failed: ${response.error?.description || 'Unknown error'}`);
    });
    rzp.open();
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.body.appendChild(script);
    });
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const result = await creditsApi.resetCredits();
      toast.success(result.message || 'Credits reset');
      setShowReset(false);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Reset failed'));
    } finally {
      setResetting(false);
    }
  };

  // ─── Data transforms ───
  const account = creditData?.account || {};
  const trends = creditData?.trends || {};
  const featureBreakdown = creditData?.feature_breakdown || [];
  const dailyTrend = trends.daily_trend || [];

  const usagePct = account.usage_pct ?? (account.total_credits > 0 ? Math.round(((account.used_credits || 0) / account.total_credits) * 100) : 0);

  const featureChartData = featureBreakdown.map((f) => ({
    name: f.feature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    credits: f.credits_used,
    calls: f.call_count,
  }));

  const dailyChartData = dailyTrend.map((d) => ({
    date: d.date?.slice(5, 10) || d.date,
    credits: d.credits_used,
    calls: d.call_count,
  }));

  const aiDailyData = (aiData?.daily_queries || []).map((d) => ({
    date: d.date?.slice(5, 10) || d.date,
    queries: d.query_count,
  }));

  const aiModelData = (aiData?.queries_by_type || []).map((d) => ({
    name: d.model_name,
    value: d.query_count,
  }));

  const txnTotalPages = Math.ceil(txnTotal / txnSize);

  // ─── Render ───
  if (error && !creditData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <ErrorState message={error} onRetry={() => fetchData()} />
      </div>
    );
  }

  if (loading && !creditData) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Credit Usage Dashboard</h1>
              {(lowCheck?.is_low || lowCheck?.is_exhausted) && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border animate-pulse ${
                  lowCheck.is_exhausted ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${lowCheck.is_exhausted ? 'bg-red-500' : 'bg-amber-500'}`} />
                  {lowCheck.is_exhausted ? 'Exhausted' : 'Low Credits'}
                </span>
              )}
              {!lowCheck?.is_low && !lowCheck?.is_exhausted && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Healthy
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Real-time credit monitoring · Auto-refreshes every 30s</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowReset(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
              Reset
            </button>
            <button onClick={() => setShowPurchase(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Buy Credits
            </button>
          </div>
        </div>

        {/* ─── Alert Banner ─── */}
        {(lowCheck?.is_low || lowCheck?.is_exhausted) && (
          <div className={`rounded-2xl border p-4 ${lowCheck.is_exhausted ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${lowCheck.is_exhausted ? 'bg-red-100' : 'bg-amber-100'}`}>
                <svg className={`w-4 h-4 ${lowCheck.is_exhausted ? 'text-red-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${lowCheck.is_exhausted ? 'text-red-800' : 'text-amber-800'}`}>
                  {lowCheck.is_exhausted ? 'Credits Exhausted' : 'Low Credit Warning'}
                </p>
                <p className={`text-xs mt-0.5 ${lowCheck.is_exhausted ? 'text-red-600' : 'text-amber-600'}`}>
                  {lowCheck.is_exhausted
                    ? 'You have run out of credits. Some features may be unavailable until you purchase more credits.'
                    : `You have ${lowCheck.remaining_credits} credits remaining (${lowCheck.usage_pct}% used). Purchase more credits to avoid service interruption.`}
                </p>
              </div>
              <button onClick={() => setShowPurchase(true)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${lowCheck.is_exhausted ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>Buy Credits</button>
            </div>
          </div>
        )}

        {/* ─── Credit Gauge ─── */}
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Credit Overview</h2>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-[10px] font-medium text-indigo-600">Total Credits</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{(account.total_credits || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-[10px] font-medium text-amber-600">Used</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{(account.used_credits || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-[10px] font-medium text-emerald-600">Remaining</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{(account.remaining_credits || 0).toLocaleString()}</p>
            </div>
            <div className={`p-4 rounded-xl border ${usagePct >= 90 ? 'bg-red-50 border-red-200' : usagePct >= 70 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-[10px] font-medium text-gray-500">Usage</p>
              <p className={`text-2xl font-bold mt-1 ${usagePct >= 90 ? 'text-red-700' : usagePct >= 70 ? 'text-amber-700' : 'text-gray-700'}`}>{usagePct}%</p>
            </div>
          </div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
            <span>0%</span>
            <span>Threshold: {account.low_credit_threshold || 20}</span>
            <span>100%</span>
          </div>
        </div>

        {/* ─── Stat Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500">Used This Week</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{(trends.last_7_days_used || 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{(trends.last_7_days_calls || 0).toLocaleString()} calls</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500">Used This Month</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{(trends.last_30_days_used || 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{(trends.last_30_days_calls || 0).toLocaleString()} calls</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500">Avg Daily Usage</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{(trends.avg_daily_usage || 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">credits per day</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500">Projected Exhaustion</p>
            <p className={`text-xl font-bold mt-1 ${trends.projected_exhaustion_days !== null && trends.projected_exhaustion_days <= 7 ? 'text-red-600' : 'text-gray-900'}`}>
              {trends.projected_exhaustion_days !== null ? `${trends.projected_exhaustion_days} days` : 'N/A'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">at current rate</p>
          </div>
        </div>

        {/* ─── Feature Breakdown + Daily Trend ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feature Breakdown Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />
            <div className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Feature-wise Credit Usage</h3>
              {featureChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureChartData} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="credits" name="Credits Used" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No feature usage yet" message="Usage data will appear as you use features" />
              )}
            </div>
          </div>

          {/* Daily Trend Area Chart */}
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
            <div className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily Credit Consumption (30 days)</h3>
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyChartData}>
                    <defs>
                      <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="credits" name="Credits" stroke="#10b981" strokeWidth={2} fill="url(#creditGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No daily data yet" />
              )}
            </div>
          </div>
        </div>

        {/* ─── AI Usage Section ─── */}
        {aiData && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">AI Usage Analytics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                  <p className="text-[10px] font-medium text-violet-600">Total AI Queries</p>
                  <p className="text-2xl font-bold text-violet-700 mt-1">{(aiData.total_queries || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100">
                  <p className="text-[10px] font-medium text-cyan-600">Last 30 Days</p>
                  <p className="text-2xl font-bold text-cyan-700 mt-1">{(aiData.recent_30_days || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-pink-50 rounded-xl border border-pink-100">
                  <p className="text-[10px] font-medium text-pink-600">Credit Cost / Query</p>
                  <p className="text-2xl font-bold text-pink-700 mt-1">{(aiData.credit_cost_per_query || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Daily Trend */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-3">Daily AI Queries (30 days)</h4>
                  {aiDailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={aiDailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="queries" name="Queries" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="text-xs text-gray-400">No AI data yet</p>}
                </div>

                {/* AI by Model */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-3">Queries by Model</h4>
                  {aiModelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={aiModelData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                          {aiModelData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-xs text-gray-400">No model data yet</p>}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── Credit Costs Reference ─── */}
        {creditData?.feature_breakdown?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Credit Costs per Feature</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {featureBreakdown.map((f) => (
                <div key={f.feature} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-600 capitalize truncate mr-2">{f.feature.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-bold text-indigo-600">{f.cost_per_call ?? '?'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Recent Transactions ─── */}
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
            <span className="text-xs text-gray-400">{txnTotal} total</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Feature</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Credits</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Balance</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 capitalize">{txn.feature?.replace(/_/g, ' ') || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      txn.transaction_type === 'deduction' ? 'bg-red-100 text-red-800 border-red-300' :
                      txn.transaction_type === 'purchase' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      txn.transaction_type === 'reset' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                      'bg-gray-100 text-gray-700 border-gray-300'
                    }`}>{txn.transaction_type}</span>
                  </td>
                  <td className={`px-4 py-3 text-sm font-semibold text-right ${txn.credits_used > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {txn.credits_used > 0 ? `-${txn.credits_used}` : `+${Math.abs(txn.credits_used || 0)}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{txn.balance_after}</td>
                  <td className="px-4 py-3 text-sm text-gray-400 text-right">{txn.created_at ? formatDate(txn.created_at) : '-'}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12"><EmptyState title="No transactions yet" message="Transactions will appear as you use credits" /></td></tr>
              )}
            </tbody>
          </table>
          {txnTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
              <button disabled={txnPage <= 1} onClick={() => setTxnPage((p) => p - 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all">Previous</button>
              <span className="text-xs text-gray-500">Page {txnPage} of {txnTotalPages}</span>
              <button disabled={txnPage >= txnTotalPages} onClick={() => setTxnPage((p) => p + 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all">Next</button>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="text-center py-2">
          <p className="text-[10px] text-gray-400">Auto-refreshes every 30s &middot; Credits reset based on your plan cycle</p>
        </div>
      </div>

      {/* ─── Purchase Credits Modal ─── */}
      <Modal isOpen={showPurchase} onClose={() => { setShowPurchase(false); setSelectedPack(null); }} title="Purchase Credits" size="lg">
        <p className="text-xs text-gray-400 mb-4">Select a credit pack to purchase. Payment will be processed via Razorpay.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {CREDIT_PACKS.map((pack) => {
            const isActive = selectedPack?.credits === pack.credits;
            return (
              <button
                key={pack.credits}
                onClick={() => handlePurchasePack(pack)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                  isActive ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-bold text-gray-900">{pack.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{pack.credits.toLocaleString()} <span className="text-sm font-medium text-gray-400">credits</span></p>
                <p className="text-sm font-semibold text-indigo-600 mt-1">₹{pack.price.toLocaleString()}</p>
                {isActive && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {selectedPack && (
          <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
            <span className="text-sm text-gray-600">{selectedPack.label} - {selectedPack.credits.toLocaleString()} credits</span>
            <span className="text-sm font-bold text-gray-900">₹{selectedPack.price.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => { setShowPurchase(false); setSelectedPack(null); }} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={confirmPurchase} disabled={!selectedPack || purchasing} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm">
            {purchasing ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Processing...</>
            ) : 'Purchase Now'}
          </button>
        </div>
      </Modal>

      {/* ─── Reset Credits Modal ─── */}
      <Modal isOpen={showReset} onClose={() => setShowReset(false)} title="Reset Monthly Credits" size="sm">
        <p className="text-sm text-gray-600">This will reset your credit usage to the default allocation for your current plan. This action cannot be undone.</p>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setShowReset(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={handleReset} disabled={resetting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
            {resetting ? 'Resetting...' : 'Confirm Reset'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default CreditDashboard;
