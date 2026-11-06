// src/components/growth/GrowthKPICards.jsx
import { useTranslation } from 'react-i18next';
import { DollarSign, ShoppingBag, TrendingUp, Award } from 'lucide-react';

function GrowthBadge({ growth }) {
  const { t } = useTranslation();
  if (!growth) return null;

  if (growth.state === 'no_activity') {
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        {t('growth.noActivity', 'No activity')}
      </span>
    );
  }

  if (growth.state === 'new') {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        ✨ {t('growth.newGrowth', 'New')}
      </span>
    );
  }

  const val = growth.value;
  const isPositive = val > 0;
  const isZero = val === 0;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
        isPositive
          ? 'bg-emerald-50 text-emerald-700'
          : isZero
          ? 'bg-gray-100 text-gray-700'
          : 'bg-rose-50 text-rose-700'
      }`}
    >
      {isPositive ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`}
    </span>
  );
}

export function GrowthKPICards({ totals = {} }) {
  const { t, i18n } = useTranslation();

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '—';
    return `${Number(val).toLocaleString(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ', {
      maximumFractionDigits: 0,
    })} DZD`;
  };

  const formatNumber = (val) => {
    if (val === null || val === undefined) return '—';
    return Number(val).toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Total Sales Card */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t('growth.totalSales', 'Total Sales')}
          </span>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <DollarSign size={18} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            {formatCurrency(totals.sales)}
          </span>
          <GrowthBadge growth={totals.salesGrowth} />
        </div>
        <p className="mt-1 text-[11px] text-gray-400">
          {t('growth.vsPreviousPeriod', 'vs. previous period')}
        </p>
      </div>

      {/* Total Orders Card */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t('growth.totalOrders', 'Total Orders')}
          </span>
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
            <ShoppingBag size={18} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            {formatNumber(totals.orders)}
          </span>
          <GrowthBadge growth={totals.ordersGrowth} />
        </div>
        <p className="mt-1 text-[11px] text-gray-400">
          {t('growth.vsPreviousPeriod', 'vs. previous period')}
        </p>
      </div>

      {/* Average Order Value (AOV) Card */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t('growth.aov', 'Average Order Value (AOV)')}
          </span>
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
            <Award size={18} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight text-gray-900">
            {formatCurrency(totals.aov)}
          </span>
          <GrowthBadge growth={totals.aovGrowth} />
        </div>
        <p className="mt-1 text-[11px] text-gray-400">
          {totals.aov ? 'total sales / order count' : t('common.insufficientData', 'Insufficient data')}
        </p>
      </div>
    </div>
  );
}

