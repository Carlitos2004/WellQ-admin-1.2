import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Building2, DollarSign, Cpu, BarChart3, Settings,
  Bell, Search, ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  Users, Activity, AlertTriangle, CheckCircle, XCircle, Clock,
  MoreHorizontal, Filter, Download, Mail, Eye, ArrowUpRight, ArrowDownRight,
  Globe, Zap, Server, Smartphone, X, Calendar, RefreshCw
} from 'lucide-react';

// Mini sparkline component
const Sparkline = ({ data, color = '#10b981', height = 24 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const points = data.map((val, i) => 
    `${(i / (data.length - 1)) * width},${height - ((val - min) / range) * (height - 4) - 2}`
  ).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Skeleton loader
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] rounded ${className}`} 
       style={{ animation: 'shimmer 1.5s infinite' }} />
);

// KPI Hero Card
const KPICard = ({ title, value, trend, trendValue, sparkData, subtitle, loading }) => {
  const isPositive = trend === 'up';
  
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-10 w-32 mb-3" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-slate-500 tracking-wide">{title}</span>
        <Sparkline data={sparkData} color={isPositive ? '#10b981' : '#ef4444'} />
      </div>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
        <span className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {trendValue}
        </span>
      </div>
      <span className="text-xs text-slate-400">{subtitle}</span>
    </div>
  );
};

// Health Score Badge
const HealthBadge = ({ score }) => {
  const getColor = (s) => {
    if (s >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getColor(score)}`}>
      {score}
    </span>
  );
};

// Status Badge
const StatusBadge = ({ status }) => {
  const styles = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Delinquent: 'bg-red-50 text-red-700 border-red-200',
    Onboarding: 'bg-blue-50 text-blue-700 border-blue-200',
    Trial: 'bg-purple-50 text-purple-700 border-purple-200'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.Active}`}>
      {status}
    </span>
  );
};

// Progress Bar (for license utilization)
const UtilizationBar = ({ used, total }) => {
  const pct = (used / total) * 100;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{used.toLocaleString()}/{total.toLocaleString()}</span>
    </div>
  );
};

// Segmented Control
const SegmentedControl = ({ options, selected, onChange }) => (
  <div className="inline-flex p-1 bg-slate-100 rounded-lg">
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
          selected === opt 
            ? 'bg-white text-slate-900 shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

// Alert Item
const AlertItem = ({ icon: Icon, message, severity }) => {
  const colors = {
    critical: 'border-l-red-500 bg-red-50/50',
    warning: 'border-l-amber-500 bg-amber-50/50',
    info: 'border-l-blue-500 bg-blue-50/50'
  };
  const iconColors = {
    critical: 'text-red-500',
    warning: 'text-amber-500',
    info: 'text-blue-500'
  };
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${colors[severity]} hover:brightness-95 transition-all cursor-pointer`}>
      <Icon size={18} className={iconColors[severity]} />
      <span className="text-sm text-slate-700 flex-1">{message}</span>
      <ChevronRight size={16} className="text-slate-400" />
    </div>
  );
};

// Clinic Row
const ClinicRow = ({ clinic, onSelect, selected }) => (
  <tr 
    className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer ${selected ? 'bg-indigo-50/50' : ''}`}
    onClick={() => onSelect(clinic)}
  >
    <td className="py-4 px-4">
      <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" onClick={e => e.stopPropagation()} />
    </td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
          {clinic.name.charAt(0)}
        </div>
        <div>
          <div className="font-semibold text-slate-900">{clinic.name}</div>
          <div className="text-xs text-slate-400">{clinic.id}</div>
        </div>
      </div>
    </td>
    <td className="py-4 px-4">
      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
        clinic.tier === 'Enterprise' ? 'bg-purple-100 text-purple-700' :
        clinic.tier === 'SMB' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
      }`}>
        {clinic.tier}
      </span>
    </td>
    <td className="py-4 px-4"><StatusBadge status={clinic.status} /></td>
    <td className="py-4 px-4 min-w-[180px]"><UtilizationBar used={clinic.patientsUsed} total={clinic.patientsLimit} /></td>
    <td className="py-4 px-4"><HealthBadge score={clinic.healthScore} /></td>
    <td className="py-4 px-4 text-sm text-slate-500">{clinic.lastLogin}</td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-1">
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Manage">
          <Settings size={16} className="text-slate-400" />
        </button>
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="View Invoices">
          <DollarSign size={16} className="text-slate-400" />
        </button>
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Impersonate">
          <Eye size={16} className="text-slate-400" />
        </button>
      </div>
    </td>
  </tr>
);

// Clinic Detail Drawer
const ClinicDrawer = ({ clinic, onClose }) => {
  if (!clinic) return null;
  
  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 border-l border-slate-200">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
              {clinic.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">{clinic.name}</h2>
              <span className="text-sm text-slate-400">{clinic.id}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact Information</h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Decision Maker</span>
                <span className="text-sm font-medium text-slate-900">Dr. Sarah Mitchell</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Email</span>
                <span className="text-sm font-medium text-indigo-600">s.mitchell@{clinic.name.toLowerCase().replace(/\s/g, '')}.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Phone</span>
                <span className="text-sm font-medium text-slate-900">+1 (555) 234-5678</span>
              </div>
            </div>
          </section>
          
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Subscription Details</h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Plan</span>
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  clinic.tier === 'Enterprise' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>{clinic.tier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Contract Value</span>
                <span className="text-sm font-bold text-slate-900">$48,000/yr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Renewal Date</span>
                <span className="text-sm font-medium text-slate-900">Mar 15, 2026</span>
              </div>
            </div>
          </section>
          
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Usage Statistics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <div className="text-2xl font-bold text-indigo-600">847</div>
                <div className="text-xs text-slate-500 mt-1">Tablet App Sessions</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                <div className="text-2xl font-bold text-emerald-600">1,234</div>
                <div className="text-xs text-slate-500 mt-1">Web Dashboard Views</div>
              </div>
            </div>
          </section>
          
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">AI Churn Prediction</h3>
            <div className={`rounded-xl p-4 border ${
              clinic.healthScore >= 80 ? 'bg-emerald-50 border-emerald-200' :
              clinic.healthScore >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {clinic.healthScore >= 80 ? <CheckCircle size={18} className="text-emerald-600" /> :
                 clinic.healthScore >= 50 ? <AlertTriangle size={18} className="text-amber-600" /> :
                 <XCircle size={18} className="text-red-600" />}
                <span className={`font-semibold ${
                  clinic.healthScore >= 80 ? 'text-emerald-700' :
                  clinic.healthScore >= 50 ? 'text-amber-700' : 'text-red-700'
                }`}>
                  {clinic.healthScore >= 80 ? 'Low Risk' : clinic.healthScore >= 50 ? 'Medium Risk' : 'High Risk'}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {clinic.healthScore >= 80 
                  ? 'This clinic shows strong engagement patterns and consistent usage.' 
                  : clinic.healthScore >= 50 
                  ? 'Login frequency has decreased 23% this month. Consider proactive outreach.'
                  : 'Critical: Low login frequency and declining patient engagement. Immediate intervention recommended.'}
              </p>
            </div>
          </section>
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
              <Mail size={16} /> Contact Clinic
            </button>
            <button className="px-4 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              View Full Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// MRR Chart (simplified visual)
const MRRChart = () => {
  const data = [
    { month: 'Jul', new: 45, expansion: 12, churn: -8 },
    { month: 'Aug', new: 52, expansion: 18, churn: -5 },
    { month: 'Sep', new: 38, expansion: 22, churn: -12 },
    { month: 'Oct', new: 61, expansion: 15, churn: -7 },
    { month: 'Nov', new: 48, expansion: 28, churn: -4 },
    { month: 'Dec', new: 55, expansion: 32, churn: -6 },
  ];
  
  const maxVal = 100;
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-slate-900">MRR Growth vs. Churn</h3>
          <p className="text-sm text-slate-400">Monthly breakdown of revenue changes</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500"></span> New</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500"></span> Expansion</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400"></span> Churn</span>
        </div>
      </div>
      
      <div className="flex items-end gap-4 h-48">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '160px' }}>
              <div className="w-full bg-emerald-500 rounded-t transition-all duration-500 hover:brightness-110" 
                   style={{ height: `${(d.new / maxVal) * 100}%` }} />
              <div className="w-full bg-indigo-500 rounded transition-all duration-500 hover:brightness-110" 
                   style={{ height: `${(d.expansion / maxVal) * 100}%` }} />
            </div>
            <div className="w-full bg-red-400 rounded-b transition-all duration-500 hover:brightness-110" 
                 style={{ height: `${(Math.abs(d.churn) / maxVal) * 40}px` }} />
            <span className="text-xs text-slate-400 mt-2">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Churn Risk Heatmap
const ChurnHeatmap = () => {
  const regions = [
    { name: 'Northeast', clinics: 145, risk: 'low' },
    { name: 'Southeast', clinics: 98, risk: 'medium' },
    { name: 'Midwest', clinics: 167, risk: 'low' },
    { name: 'Southwest', clinics: 89, risk: 'high' },
    { name: 'West Coast', clinics: 206, risk: 'low' },
  ];
  
  const riskColors = {
    low: 'from-emerald-400 to-emerald-500 border-emerald-300',
    medium: 'from-amber-400 to-amber-500 border-amber-300',
    high: 'from-red-400 to-red-500 border-red-300'
  };
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-slate-900">Regional Churn Risk</h3>
          <p className="text-sm text-slate-400">AI-driven risk assessment by region</p>
        </div>
        <Globe size={20} className="text-slate-300" />
      </div>
      
      <div className="space-y-3">
        {regions.map((r, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className={`w-4 h-4 rounded-full bg-gradient-to-br border ${riskColors[r.risk]}`} />
            <div className="flex-1">
              <div className="font-medium text-slate-800">{r.name}</div>
              <div className="text-xs text-slate-400">{r.clinics} clinics</div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
              r.risk === 'low' ? 'bg-emerald-100 text-emerald-700' :
              r.risk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              {r.risk} risk
            </span>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Platform Ops Metrics
const PlatformOpsView = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">Cost Per Session</span>
          <DollarSign size={18} className="text-slate-300" />
        </div>
        <div className="text-3xl font-bold text-slate-900">$0.042</div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
            <ArrowDownRight size={14} /> 8.3%
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">AI Latency (p99)</span>
          <Zap size={18} className="text-slate-300" />
        </div>
        <div className="text-3xl font-bold text-slate-900">127ms</div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-emerald-600 text-sm font-medium">Within SLA</span>
          <span className="text-xs text-slate-400">target: &lt;200ms</span>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-500">Pose Analysis Success</span>
          <Activity size={18} className="text-slate-300" />
        </div>
        <div className="text-3xl font-bold text-slate-900">96.8%</div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
            <ArrowUpRight size={14} /> 1.2%
          </span>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">Infrastructure Status</h3>
        <div className="space-y-3">
          {[
            { name: 'Web Application', status: 'operational' },
            { name: 'Mobile API', status: 'operational' },
            { name: 'Primary Database', status: 'operational' },
            { name: 'Redis Cache', status: 'degraded' },
            { name: 'ML Pipeline', status: 'operational' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                <Server size={16} className="text-slate-400" />
                <span className="text-sm text-slate-700">{s.name}</span>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${
                s.status === 'operational' ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  s.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`} />
                {s.status === 'operational' ? 'Operational' : 'Degraded'}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 mb-4">App Version Distribution</h3>
        <div className="space-y-3">
          {[
            { version: 'v2.4.1 (Latest)', pct: 58, color: 'bg-emerald-500' },
            { version: 'v2.4.0', pct: 22, color: 'bg-blue-500' },
            { version: 'v2.3.x', pct: 15, color: 'bg-amber-500' },
            { version: 'v2.2.x and below', pct: 5, color: 'bg-red-500' },
          ].map((v, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">{v.version}</span>
                <span className="text-slate-500 font-medium">{v.pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${v.color} rounded-full`} style={{ width: `${v.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <button className="mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
          View force update options <ChevronRight size={14} />
        </button>
      </div>
    </div>
  </div>
);

// Operational Status Component
const OperationalStatusView = () => {
  const servers = [
    { name: 'Primary Web Server (US-East)', status: 'operational', uptime: '99.98%', cpu: 42, memory: 68, region: 'us-east-1' },
    { name: 'Primary Web Server (EU-West)', status: 'operational', uptime: '99.95%', cpu: 38, memory: 55, region: 'eu-west-1' },
    { name: 'API Gateway', status: 'operational', uptime: '99.99%', cpu: 28, memory: 45, region: 'global' },
    { name: 'Mobile API Server', status: 'degraded', uptime: '98.72%', cpu: 87, memory: 82, region: 'us-east-1' },
    { name: 'ML Inference Cluster', status: 'operational', uptime: '99.91%', cpu: 65, memory: 71, region: 'us-west-2' },
    { name: 'Database Primary', status: 'operational', uptime: '99.99%', cpu: 35, memory: 62, region: 'us-east-1' },
    { name: 'Database Replica', status: 'operational', uptime: '99.99%', cpu: 22, memory: 58, region: 'eu-west-1' },
    { name: 'Redis Cache Cluster', status: 'warning', uptime: '99.45%', cpu: 78, memory: 89, region: 'us-east-1' },
  ];

  const processes = [
    { name: 'Video Processing Queue', status: 'running', jobs: 234, avgTime: '2.3s', pending: 12 },
    { name: 'AI Pose Analysis Worker', status: 'running', jobs: 1847, avgTime: '0.8s', pending: 45 },
    { name: 'SOAP Note Generator', status: 'running', jobs: 892, avgTime: '1.2s', pending: 8 },
    { name: 'Email Notification Service', status: 'running', jobs: 3421, avgTime: '0.1s', pending: 0 },
    { name: 'Report Generation Worker', status: 'idle', jobs: 156, avgTime: '4.5s', pending: 0 },
    { name: 'Data Sync Service', status: 'running', jobs: 567, avgTime: '0.5s', pending: 23 },
    { name: 'Backup Service', status: 'scheduled', jobs: 24, avgTime: '12m', pending: 1 },
    { name: 'Churn Prediction Model', status: 'running', jobs: 705, avgTime: '3.2s', pending: 0 },
  ];

  const appUsage = {
    patientApp: { 
      totalDownloads: 892450, 
      activeToday: 45230, 
      activeWeek: 312400, 
      activeMonth: 578900,
      inactive: 313550,
      version: { ios: 456200, android: 436250 }
    },
    clinicianTablet: { 
      totalDownloads: 4850, 
      activeToday: 2340, 
      activeWeek: 3890, 
      activeMonth: 4210,
      inactive: 640,
      version: { ios: 3200, android: 1650 }
    },
    webDashboard: { 
      totalUsers: 8920, 
      activeToday: 1245, 
      activeWeek: 5670, 
      activeMonth: 7890,
      inactive: 1030
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'operational': case 'running': return 'text-emerald-600 bg-emerald-100';
      case 'degraded': case 'warning': return 'text-amber-600 bg-amber-100';
      case 'down': case 'error': return 'text-red-600 bg-red-100';
      case 'idle': return 'text-slate-500 bg-slate-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      default: return 'text-slate-500 bg-slate-100';
    }
  };

  const getStatusDot = (status) => {
    switch(status) {
      case 'operational': case 'running': return 'bg-emerald-500';
      case 'degraded': case 'warning': return 'bg-amber-500 animate-pulse';
      case 'down': case 'error': return 'bg-red-500 animate-pulse';
      case 'idle': return 'bg-slate-400';
      case 'scheduled': return 'bg-blue-500';
      default: return 'bg-slate-400';
    }
  };

  const getLoadColor = (pct) => {
    if (pct >= 85) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">System Health</span>
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">98.7%</div>
          <div className="text-xs text-slate-400 mt-1">All systems operational</div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Active Users Now</span>
            <Users size={18} className="text-slate-300" />
          </div>
          <div className="text-3xl font-bold text-indigo-600">48,815</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
              <ArrowUpRight size={12} /> 12.3%
            </span>
            <span className="text-xs text-slate-400">vs same time yesterday</span>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Total Downloads</span>
            <Smartphone size={18} className="text-slate-300" />
          </div>
          <div className="text-3xl font-bold text-slate-900">897.3K</div>
          <div className="text-xs text-slate-400 mt-1">Across all platforms</div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Dormant Users</span>
            <Clock size={18} className="text-slate-300" />
          </div>
          <div className="text-3xl font-bold text-amber-600">315.2K</div>
          <div className="text-xs text-slate-400 mt-1">Downloaded but inactive 30d+</div>
        </div>
      </div>

      {/* Server Status */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-slate-900">Server Infrastructure</h3>
            <p className="text-sm text-slate-400">Real-time server and database status</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Operational</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Degraded</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Down</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {servers.map((server, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer group">
              <div className={`w-3 h-3 rounded-full ${getStatusDot(server.status)}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{server.name}</div>
                <div className="text-xs text-slate-400">{server.region} · {server.uptime} uptime</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400">CPU</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${getLoadColor(server.cpu)} rounded-full`} style={{ width: `${server.cpu}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-600">{server.cpu}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">MEM</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${getLoadColor(server.memory)} rounded-full`} style={{ width: `${server.memory}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-600">{server.memory}%</span>
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* Processes & App Usage Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Background Processes */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Background Processes</h3>
              <p className="text-sm text-slate-400">Workers and job queues</p>
            </div>
            <button className="text-xs text-indigo-600 font-medium hover:text-indigo-700">View Logs</button>
          </div>
          
          <div className="space-y-2">
            {processes.map((proc, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full ${getStatusDot(proc.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{proc.name}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusColor(proc.status)}`}>
                  {proc.status}
                </span>
                <div className="text-right text-xs text-slate-500 w-20">
                  <div>{proc.jobs.toLocaleString()} jobs</div>
                  <div className="text-slate-400">{proc.pending > 0 ? `${proc.pending} pending` : 'No queue'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App Usage Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">App Usage Breakdown</h3>
              <p className="text-sm text-slate-400">Downloads vs active users</p>
            </div>
          </div>
          
          <div className="space-y-5">
            {/* Patient App */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Smartphone size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-slate-800">Patient App</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-indigo-600">{(appUsage.patientApp.totalDownloads / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-slate-500">total downloads</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-600">{(appUsage.patientApp.activeToday / 1000).toFixed(1)}K</div>
                  <div className="text-xs text-slate-500">Active Today</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600">{(appUsage.patientApp.activeMonth / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-slate-500">Active (30d)</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-amber-600">{(appUsage.patientApp.inactive / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-slate-500">Inactive</div>
                </div>
              </div>
              <div className="h-2 bg-white/80 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${(appUsage.patientApp.activeMonth / appUsage.patientApp.totalDownloads) * 100}%` }} />
                <div className="bg-amber-400 h-full" style={{ width: `${(appUsage.patientApp.inactive / appUsage.patientApp.totalDownloads) * 100}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>iOS: {(appUsage.patientApp.version.ios / 1000).toFixed(0)}K</span>
                <span>Android: {(appUsage.patientApp.version.android / 1000).toFixed(0)}K</span>
              </div>
            </div>

            {/* Clinician Tablet */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <Activity size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-slate-800">Clinician Tablet</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-600">{appUsage.clinicianTablet.totalDownloads.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">total downloads</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-600">{appUsage.clinicianTablet.activeToday.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Active Today</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600">{appUsage.clinicianTablet.activeMonth.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Active (30d)</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-amber-600">{appUsage.clinicianTablet.inactive}</div>
                  <div className="text-xs text-slate-500">Inactive</div>
                </div>
              </div>
              <div className="h-2 bg-white/80 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${(appUsage.clinicianTablet.activeMonth / appUsage.clinicianTablet.totalDownloads) * 100}%` }} />
                <div className="bg-amber-400 h-full" style={{ width: `${(appUsage.clinicianTablet.inactive / appUsage.clinicianTablet.totalDownloads) * 100}%` }} />
              </div>
            </div>

            {/* Web Dashboard */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                    <LayoutDashboard size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-slate-800">Web Dashboard</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-700">{appUsage.webDashboard.totalUsers.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">registered users</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-600">{appUsage.webDashboard.activeToday.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Active Today</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-600">{appUsage.webDashboard.activeMonth.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Active (30d)</div>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-amber-600">{appUsage.webDashboard.inactive.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">Inactive</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function WellQAdminConsole() {
  const [activeView, setActiveView] = useState('overview');
  const [overviewTab, setOverviewTab] = useState('business');
  const [clinicFilter, setClinicFilter] = useState('All');
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30D');
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);
  
  const clinics = [
    { id: 'CLN-001', name: 'Downtown Orthopedics', tier: 'Enterprise', status: 'Active', patientsUsed: 850, patientsLimit: 1000, healthScore: 92, lastLogin: '2 hours ago' },
    { id: 'CLN-002', name: 'Sunrise Physical Therapy', tier: 'SMB', status: 'Active', patientsUsed: 234, patientsLimit: 300, healthScore: 78, lastLogin: '1 day ago' },
    { id: 'CLN-003', name: 'Metro Sports Medicine', tier: 'Enterprise', status: 'Delinquent', patientsUsed: 1890, patientsLimit: 2000, healthScore: 45, lastLogin: '5 days ago' },
    { id: 'CLN-004', name: 'Valley Rehab Center', tier: 'SMB', status: 'Onboarding', patientsUsed: 45, patientsLimit: 500, healthScore: 88, lastLogin: '3 hours ago' },
    { id: 'CLN-005', name: 'Coastal Wellness Clinic', tier: 'Enterprise', status: 'Active', patientsUsed: 1567, patientsLimit: 2000, healthScore: 95, lastLogin: '30 min ago' },
    { id: 'CLN-006', name: 'Peak Performance PT', tier: 'Trial', status: 'Trial', patientsUsed: 23, patientsLimit: 50, healthScore: 62, lastLogin: '2 days ago' },
  ];
  
  const filteredClinics = clinicFilter === 'All' ? clinics : 
    clinicFilter === 'Active' ? clinics.filter(c => c.status === 'Active') :
    clinicFilter === 'At Risk' ? clinics.filter(c => c.healthScore < 70) : clinics;
  
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'clinics', label: 'Clinic Management', icon: Building2 },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'platform', label: 'Platform Ops', icon: Cpu },
    { id: 'analytics', label: 'Product Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Add Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Activity size={22} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">WellQ</span>
              <span className="text-xs text-slate-400 block">Admin Console</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 ${
                activeView === item.id 
                  ? 'bg-white/10 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">John Doe</div>
              <div className="text-xs text-slate-500 truncate">Super Admin</div>
            </div>
            <ChevronDown size={16} className="text-slate-500" />
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-900">
                {navItems.find(n => n.id === activeView)?.label}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Date Range Picker */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                {['24H', '7D', '30D', 'QTD', 'YTD'].map(range => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      dateRange === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search clinics, invoices..."
                  className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
              
              {/* Notifications */}
              <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell size={20} className="text-slate-600" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              </button>
              
              {/* Refresh */}
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <RefreshCw size={20} className="text-slate-600" />
              </button>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-8">
          {activeView === 'overview' && (
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                  onClick={() => setOverviewTab('business')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    overviewTab === 'business'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <TrendingUp size={16} />
                  Business Health
                </button>
                <button
                  onClick={() => setOverviewTab('operational')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    overviewTab === 'operational'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Server size={16} />
                  Operational Status
                </button>
              </div>

              {overviewTab === 'business' && (
                <>
              {/* KPI Hero Cards */}
              <div className="grid grid-cols-4 gap-6">
                <KPICard 
                  title="ARR" 
                  value="$2.4M" 
                  trend="up" 
                  trendValue="+12.3%" 
                  sparkData={[180, 195, 210, 205, 225, 240]} 
                  subtitle="vs $2.14M last month"
                  loading={loading}
                />
                <KPICard 
                  title="Active Clinics" 
                  value="705" 
                  trend="up" 
                  trendValue="+23" 
                  sparkData={[650, 665, 678, 690, 695, 705]} 
                  subtitle="18 onboarded · 5 churned"
                  loading={loading}
                />
                <KPICard 
                  title="Total Patients" 
                  value="712K" 
                  trend="up" 
                  trendValue="+8.7%" 
                  sparkData={[620, 645, 665, 680, 698, 712]} 
                  subtitle="Avg 1,010 per clinic"
                  loading={loading}
                />
                <KPICard 
                  title="Net Revenue Retention" 
                  value="105%" 
                  trend="up" 
                  trendValue="+2.1%" 
                  sparkData={[98, 100, 101, 103, 104, 105]} 
                  subtitle="Expansion outpacing churn"
                  loading={loading}
                />
              </div>
              
              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-6">
                <MRRChart />
                <ChurnHeatmap />
              </div>
              
              {/* Needs Attention */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Needs Attention</h3>
                  <span className="text-xs text-slate-400">Updated 5 min ago</span>
                </div>
                <div className="space-y-2">
                  <AlertItem icon={AlertTriangle} message="3 clinics have exceeded their license limits" severity="critical" />
                  <AlertItem icon={Zap} message="AI Model Latency spiked >200ms in EU Server Region" severity="warning" />
                  <AlertItem icon={Users} message="5 clinics marked 'High Risk' for churn today" severity="critical" />
                  <AlertItem icon={Smartphone} message="20% of patients on outdated app version (v1.0)" severity="warning" />
                </div>
              </div>
                </>
              )}

              {overviewTab === 'operational' && <OperationalStatusView />}
            </div>
          )}
          
          {activeView === 'clinics' && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <SegmentedControl 
                  options={['All', 'Active', 'At Risk', 'Churned']} 
                  selected={clinicFilter} 
                  onChange={setClinicFilter} 
                />
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <Filter size={16} /> Filters
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <Download size={16} /> Export
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                    <Mail size={16} /> Bulk Email
                  </button>
                </div>
              </div>
              
              {/* Data Grid */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      <th className="py-4 px-4 text-left w-12">
                        <input type="checkbox" className="rounded border-slate-300 text-indigo-600" />
                      </th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinic</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">License Usage</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Health</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Login</th>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClinics.map(clinic => (
                      <ClinicRow 
                        key={clinic.id} 
                        clinic={clinic} 
                        onSelect={setSelectedClinic}
                        selected={selectedClinic?.id === clinic.id}
                      />
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <span className="text-sm text-slate-500">Showing 1-{filteredClinics.length} of {filteredClinics.length} clinics</span>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 hover:bg-white transition-colors disabled:opacity-50" disabled>
                      Previous
                    </button>
                    <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium">1</button>
                    <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-white transition-colors">2</button>
                    <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-white transition-colors">3</button>
                    <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-white transition-colors">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeView === 'platform' && <PlatformOpsView />}
          
          {(activeView === 'financials' || activeView === 'analytics' || activeView === 'settings') && (
            <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  {activeView === 'financials' && <DollarSign size={28} className="text-slate-400" />}
                  {activeView === 'analytics' && <BarChart3 size={28} className="text-slate-400" />}
                  {activeView === 'settings' && <Settings size={28} className="text-slate-400" />}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{navItems.find(n => n.id === activeView)?.label}</h3>
                <p className="text-sm text-slate-500">This view is ready for implementation</p>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Clinic Detail Drawer */}
      {selectedClinic && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedClinic(null)} />
          <ClinicDrawer clinic={selectedClinic} onClose={() => setSelectedClinic(null)} />
        </>
      )}
    </div>
  );
}
