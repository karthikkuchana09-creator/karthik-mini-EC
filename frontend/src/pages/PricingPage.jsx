import { useState, useEffect, useCallback } from 'react';
import * as orgApi from '../api/organization';
import * as paymentApi from '../api/payments';
import Modal from '../components/ui/Modal';
import { SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import { getErrorMessage } from '../utils/errorHandler';
import { formatTimestamp } from '../utils/format';
import toast from 'react-hot-toast';

// ─── Constants ───
const PLAN_GRADIENTS = {
  basic: { card: 'from-gray-50 to-white', badge: 'bg-gray-100 text-gray-800 border-gray-300', header: 'from-gray-500 to-gray-600' },
  silver: { card: 'from-blue-50 to-white', badge: 'bg-blue-100 text-blue-800 border-blue-300', header: 'from-blue-600 to-blue-700' },
  gold: { card: 'from-amber-50 to-white', badge: 'bg-amber-100 text-amber-800 border-amber-300', header: 'from-amber-600 to-amber-700' },
};

const PLAN_ORDER = ['basic', 'silver', 'gold'];

const FEATURE_META = [
  { key: 'users', label: 'Users', type: 'limit' },
  { key: 'tasks', label: 'Tasks', type: 'limit' },
  { key: 'ai_queries', label: 'AI Queries', type: 'limit' },
  { key: 'storage_mb', label: 'Storage', type: 'limit', suffix: ' MB' },
  { key: 'teams', label: 'Teams', type: 'limit' },
  { key: 'analytics', label: 'Analytics Dashboard', type: 'bool' },
  { key: 'approvals', label: 'Approval Workflows', type: 'bool' },
  { key: 'ai_intelligence', label: 'AI Intelligence', type: 'bool' },
  { key: 'realtime_collaboration', label: 'Real-time Collaboration', type: 'bool' },
  { key: 'advanced_analytics', label: 'Advanced Analytics', type: 'bool' },
  { key: 'api_access', label: 'API Access', type: 'bool' },
  { key: 'audit_trail', label: 'Audit Trail', type: 'bool' },
  { key: 'custom_branding', label: 'Custom Branding', type: 'bool' },
  { key: 'priority_support', label: 'Priority Support', type: 'bool' },
  { key: 'sla', label: 'SLA Guarantee', type: 'bool' },
];

const LIMIT_MAP = { users: 'max_users', tasks: 'max_tasks', ai_queries: 'max_ai_queries', storage_mb: 'max_storage_mb', teams: 'max_teams' };
const FEATURE_MAP = {
  analytics: 'has_analytics', approvals: 'has_approvals', ai_intelligence: 'has_ai_intelligence',
  realtime_collaboration: 'has_realtime_collaboration', advanced_analytics: 'has_advanced_analytics',
  api_access: 'has_api_access', audit_trail: 'has_audit_trail', custom_branding: 'has_custom_branding',
  priority_support: 'has_priority_support', sla: 'has_sla',
};

// ─── Helpers ───
function getFeatureValue(plan, key) {
  if (LIMIT_MAP[key]) return plan[LIMIT_MAP[key]];
  const field = FEATURE_MAP[key];
  return field ? plan[field] : null;
}

function formatFeatureValue(val, type, suffix) {
  if (type === 'bool') return val ? 'Yes' : '—';
  if (val === 0 || val === null || val === undefined) return '—';
  return val === 999999 ? 'Unlimited' : `${val.toLocaleString()}${suffix || ''}`;
}

// ─── Sub-components ───
function PlanCard({ plan, isCurrent, interval, onSelect, billingInfo }) {
  const style = PLAN_GRADIENTS[plan.tier] || PLAN_GRADIENTS.basic;
  const currentPrice = plan[`price_${interval}`] || 0;
  const monthlyPrice = interval === 'yearly' ? Math.round(currentPrice / 12) : currentPrice;
  const savings = interval === 'yearly' ? ((plan.price_monthly || 0) * 12 - currentPrice) : 0;

  return (
    <div className={`relative bg-gradient-to-b ${style.card} rounded-2xl border-2 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isCurrent ? 'border-indigo-500 shadow-indigo-100' : 'border-gray-200 hover:border-indigo-300'}`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${style.header} rounded-t-2xl px-6 py-4 text-white`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{plan.name}</h3>
          {isCurrent && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/20 text-white border border-white/30">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              Current
            </span>
          )}
        </div>
        {plan.description && <p className="text-xs text-white/70 mt-1">{plan.description}</p>}
      </div>

      {/* Price */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">₹{currentPrice.toLocaleString()}</span>
          <span className="text-sm text-gray-400">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
        </div>
        {interval === 'yearly' && (
          <p className="text-xs text-emerald-600 font-medium mt-1">
            ₹{monthlyPrice.toLocaleString()}/mo billed yearly
            {savings > 0 && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Save ₹{savings.toLocaleString()}</span>}
          </p>
        )}
      </div>

      {/* Features summary */}
      <div className="px-6 pb-5 space-y-2">
        {[{ label: 'Users', val: plan.max_users }, { label: 'Tasks', val: plan.max_tasks }, { label: 'AI Queries', val: plan.max_ai_queries }, { label: 'Storage', val: plan.max_storage_mb, suffix: ' MB' }].map((f) => (
          <div key={f.label} className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{f.label}</span>
            <span className="font-semibold text-gray-900">{f.val === 999999 ? 'Unlimited' : `${(f.val || 0).toLocaleString()}${f.suffix || ''}`}</span>
          </div>
        ))}
      </div>

      {/* Action */}
      <div className="px-6 pb-6">
        {isCurrent ? (
          <div className="w-full text-center px-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl">
            {billingInfo ? `${billingInfo.billing_interval === 'yearly' ? 'Yearly' : 'Monthly'} Plan` : 'Current Plan'}
          </div>
        ) : (
          <button onClick={() => onSelect(plan)} className="w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm shadow-indigo-200">
            {plan.sort_order > (billingInfo?.plan_sort_order || 0) ? 'Upgrade' : 'Downgrade'}
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10"><div className="h-8 w-64 bg-gray-200/70 rounded-lg animate-pulse mx-auto" /><div className="h-4 w-96 bg-gray-200/70 rounded-lg animate-pulse mx-auto mt-3" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        <SkeletonChart />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// PricingPage
// ════════════════════════════════════════════════
function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [billingInfo, setBillingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interval, setInterval] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, currentData] = await Promise.all([
        paymentApi.getPlansWithPricing().catch(() => orgApi.getPlans()),
        orgApi.getCurrentSubscription().catch(() => null),
      ]);
      const sorted = (Array.isArray(plansData) ? plansData : []).sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
      setPlans(sorted);

      if (currentData) {
        setCurrentSub(currentData);
        const sub = currentData.subscription || {};
        setBillingInfo({
          tier: (currentData.plan?.tier || currentData.subscription?.plan?.tier || '').toLowerCase(),
          billing_interval: sub.billing_interval || 'monthly',
          plan_sort_order: currentData.plan?.sort_order || 0,
          status: sub.status || 'active',
          days_remaining: sub.days_remaining,
          current_period_end: sub.current_period_end,
        });
      }
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load plans'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentTier = billingInfo?.tier || 'basic';
  const isOnYearly = billingInfo?.billing_interval === 'yearly';

  const handlePlanSelect = (plan) => {
    if (!currentSub) {
      toast.error('Unable to verify current subscription');
      return;
    }
    setSelectedPlan(plan);
  };

  const handleUpgradeConfirm = async () => {
    if (!selectedPlan) return;
    setProcessing(true);
    try {
      const targetTier = selectedPlan.tier;
      const targetInterval = interval;

      // Direct plan change via subscription/upgrade
      await orgApi.upgradeSubscription({ plan_tier: targetTier, billing_interval: targetInterval });
      toast.success(`Plan changed to ${selectedPlan.name} (${targetInterval})`);
      setSelectedPlan(null);
      fetchData();
    } catch (err) {
      // If direct upgrade fails, fall back to Razorpay payment flow
      try {
        await handleRazorpayCheckout(selectedPlan);
      } catch (payErr) {
        toast.error(getErrorMessage(payErr, 'Upgrade failed'));
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleRazorpayCheckout = async (plan) => {
    const targetInterval = interval;
    const amount = plan[`price_${targetInterval}`] || 0;

    // Create order
    const order = await paymentApi.createOrder({
      amount,
      payment_type: 'plan_purchase',
      plan_tier: plan.tier,
      billing_interval: targetInterval,
    });

    // Load Razorpay script
    await loadRazorpayScript();

    // Open checkout
    const options = {
      key: order.key_id,
      amount: order.amount_paise,
      currency: order.currency,
      name: 'Mini EC',
      description: `${plan.name} Plan - ${targetInterval}`,
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
            toast.success(`Payment successful! ${result.message || ''}`);
            fetchData();
          } else {
            toast.error(result.message || 'Payment verification failed');
          }
        } catch (verifyErr) {
          toast.error(getErrorMessage(verifyErr, 'Payment verification failed'));
        }
      },
      modal: {
        ondismiss: function () {
          toast('Checkout closed', { icon: 'ℹ️' });
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
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

  // ─── Render ───
  if (error && plans.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-10 px-4">
        <div className="max-w-6xl mx-auto"><ErrorState message={error} onRetry={fetchData} /></div>
      </div>
    );
  }

  if (loading && plans.length === 0) return <LoadingSkeleton />;

  const sortedPlans = [...plans].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
  const currentSortOrder = billingInfo?.plan_sort_order || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Choose Your Plan</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto">
            Scale your organization with the right plan. All plans include core features with increasing limits and advanced capabilities.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium transition-colors ${interval === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setInterval(interval === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-14 h-7 rounded-full transition-colors ${interval === 'yearly' ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${interval === 'yearly' ? 'translate-x-7' : ''}`} />
          </button>
          <span className={`text-sm font-medium transition-colors ${interval === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
            Yearly
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Save up to 17%</span>
          </span>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              isCurrent={currentTier === plan.tier}
              interval={interval}
              onSelect={handlePlanSelect}
              billingInfo={billingInfo && currentTier === plan.tier ? billingInfo : null}
            />
          ))}
        </div>

        {/* Current subscription info */}
        {currentSub && (
          <div className="mb-10 bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Current Plan: {currentSub.plan?.name || currentTier}</p>
                  <p className="text-xs text-gray-400">
                    {billingInfo?.billing_interval === 'yearly' ? 'Yearly' : 'Monthly'} billing
                    {billingInfo?.days_remaining !== undefined && billingInfo?.days_remaining !== null && ` · ${billingInfo.days_remaining} days remaining`}
                    {billingInfo?.current_period_end && ` · Renews ${formatTimestamp(billingInfo.current_period_end)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                  billingInfo?.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  billingInfo?.status === 'trialing' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  'bg-gray-100 text-gray-600 border-gray-300'
                }`}>
                  {billingInfo?.status || 'active'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Feature comparison table */}
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden mb-10">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Feature Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase w-1/3">Feature</th>
                  {sortedPlans.map((p) => (
                    <th key={p.tier} className={`px-4 py-3 text-xs font-semibold uppercase text-center ${currentTier === p.tier ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {p.name}
                      {currentTier === p.tier && <span className="block text-[10px] font-normal text-indigo-400 mt-0.5">(Current)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {FEATURE_META.map((feat) => {
                  const values = sortedPlans.map((p) => getFeatureValue(p, feat.key));
                  return (
                    <tr key={feat.key} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-700">{feat.label}</td>
                      {values.map((val, i) => {
                        const display = formatFeatureValue(val, feat.type, feat.suffix);
                        const isBool = feat.type === 'bool';
                        return (
                          <td key={i} className={`px-4 py-3 text-sm text-center ${isBool ? '' : 'font-semibold text-gray-900'} ${currentTier === sortedPlans[i]?.tier ? 'bg-indigo-50/30' : ''}`}>
                            {isBool ? (
                              val ? (
                                <svg className="w-5 h-5 mx-auto text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                              ) : (
                                <svg className="w-5 h-5 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              )
                            ) : display}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Billing history */}
        {currentSub?.billing_history?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Billing Activity</h3>
            <div className="space-y-2">
              {currentSub.billing_history.slice(0, 5).map((evt) => (
                <div key={evt.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{evt.event_type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-400">{evt.description || ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{evt.created_at ? formatTimestamp(evt.created_at) : ''}</p>
                    {evt.amount > 0 && <p className="text-sm font-semibold text-gray-900">₹{(evt.amount / 100).toFixed(2)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-6 pb-4">
          <p className="text-[10px] text-gray-400">All prices in INR. Plans can be changed or cancelled at any time.</p>
        </div>
      </div>

      {/* ─── Upgrade/Downgrade Confirmation Modal ─── */}
      <Modal isOpen={!!selectedPlan} onClose={() => setSelectedPlan(null)} title="Confirm Plan Change" size="lg">
        {selectedPlan && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${PLAN_GRADIENTS[selectedPlan.tier]?.header || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{selectedPlan.name[0]}</span>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">{selectedPlan.name} Plan</p>
                  <p className="text-sm text-gray-500">₹{(selectedPlan[`price_${interval}`] || 0).toLocaleString()}/{interval === 'monthly' ? 'mo' : 'yr'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Users</p>
                  <p className="text-sm font-bold text-gray-900">{selectedPlan.max_users === 999999 ? 'Unlimited' : selectedPlan.max_users}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Tasks</p>
                  <p className="text-sm font-bold text-gray-900">{selectedPlan.max_tasks === 999999 ? 'Unlimited' : selectedPlan.max_tasks.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">AI Queries</p>
                  <p className="text-sm font-bold text-gray-900">{selectedPlan.max_ai_queries === 999999 ? 'Unlimited' : selectedPlan.max_ai_queries.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Storage</p>
                  <p className="text-sm font-bold text-gray-900">{selectedPlan.max_storage_mb === 999999 ? 'Unlimited' : `${selectedPlan.max_storage_mb} MB`}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setInterval('monthly')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${interval === 'monthly' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setInterval('yearly')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${interval === 'yearly' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  Yearly
                  {selectedPlan.price_yearly > 0 && (
                    <span className="ml-1 text-[10px] opacity-80">
                      (Save ₹{((selectedPlan.price_monthly || 0) * 12 - (selectedPlan.price_yearly || 0)).toLocaleString()})
                    </span>
                  )}
                </button>
              </div>

              {currentSortOrder > 0 && selectedPlan.sort_order < currentSortOrder && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-800 font-medium">Downgrade Notice</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">You will lose access to features not included in the {selectedPlan.name} plan. Some data may be archived.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setSelectedPlan(null)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button
                onClick={handleUpgradeConfirm}
                disabled={processing}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Processing...
                  </>
                ) : (
                  `Confirm ${selectedPlan.sort_order > currentSortOrder ? 'Upgrade' : 'Downgrade'}`
                )}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default PricingPage;
