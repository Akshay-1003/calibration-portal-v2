import { Button } from "../../components/ui/button";
import { useState, useMemo, useEffect } from "react";
import {
  Chart as ChartJS,
  BarController,
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
  Decimation
} from 'chart.js';
import type { ChartData, ChartOptions, TooltipItem, ScriptableContext } from 'chart.js';
import {
  Chart,
  Line,
  Doughnut,
} from 'react-chartjs-2';
import { useInwardGaugesQuery } from "../../hooks/queries/gauges";
import { useDashboardStore } from "../../store/dashboardStore";
import { useOrganizations, useInwardEntries } from "../../store/appStore";
import { useAuth } from "../../features/auth";
import { Card, ListBox, Select } from "@heroui/react";

const STATUS_COLORS: Record<string, string> = {
  completed: '#10B981',
  in_progress: '#F59E0B',
  pending: '#EF4444',
  on_hold: '#6B7280',
};

// Register Chart.js components
ChartJS.register(
  BarController,
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
  Decimation
);

export default function Home() {
  const { user } = useAuth();
  const hasLaboratoryContext = Boolean(user?.organization_id);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'on_hold';
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");

  const [shouldFetchGauges, setShouldFetchGauges] = useState(false);

  // Store-backed data for orgs/inwards to avoid duplicate fetches on login
  const {
    organizations,
    loading: orgLoading,
    fetchOrganizations,
  } = useOrganizations();
  const {
    inwardEntries,
    loading: inwardLoading,
    fetchInwardEntries,
  } = useInwardEntries();

  // Gauges are heavy: fetch only after user interaction (refresh / filter change)
  const gaugesQuery = useInwardGaugesQuery({ enabled: shouldFetchGauges && hasLaboratoryContext });
  const linkedGauges = gaugesQuery.data ?? [];
  
  // Dashboard store for real-time reporting
  const { 
    getPeriodReport, 
    getCompanyReport, 
    refreshDashboard
  } = useDashboardStore();

  const gaugeLoading = gaugesQuery.isPending || gaugesQuery.isFetching;

  useEffect(() => {
    if (!organizations.length && !orgLoading) {
      void fetchOrganizations();
    }
  }, [organizations.length, orgLoading, fetchOrganizations]);

  useEffect(() => {
    if (hasLaboratoryContext && !inwardEntries.length && !inwardLoading) {
      void fetchInwardEntries();
    }
  }, [hasLaboratoryContext, inwardEntries.length, inwardLoading, fetchInwardEntries]);

  const getPeriodStart = (period: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (period) {
      case 'day':
        return today;
      case 'week':
        return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(0);
    }
  };

  const periodStart = useMemo(() => getPeriodStart(selectedPeriod), [selectedPeriod]);

  const selectedOrgId = useMemo(() => {
    if (selectedCompany === 'all') return null;
    const org = organizations.find(o => o.id === selectedCompany || o.name === selectedCompany);
    return org ? org.id : null;
  }, [selectedCompany, organizations]);

  const filteredInwardEntries = useMemo(() => {
    return inwardEntries.filter(entry => {
      const entryDate = new Date(entry.created_at);
      const matchesPeriod = entryDate >= periodStart;
      const matchesOrg = !selectedOrgId || entry.client_org_id === selectedOrgId;
      return matchesPeriod && matchesOrg;
    });
  }, [inwardEntries, periodStart, selectedOrgId]);

  const filteredLinkedGauges = useMemo(() => {
    return linkedGauges.filter(g => {
      const gaugeDate = new Date(g.created_at ?? g.inward_info?.inward_date ?? 0);
      const matchesPeriod = gaugeDate >= periodStart;
      const matchesOrg = !selectedOrgId || g.client_org_id === selectedOrgId;
      // Handle process_status field - normalize status values
      const gaugeStatus = g.process_status || 'pending';
      // Normalize status values (check for calibration_completed in process_status)
      const normalizedStatus = 
        gaugeStatus === 'completed' ? 'completed' :
        gaugeStatus === 'in_progress' ? 'in_progress' :
        gaugeStatus === 'on_hold' ? 'on_hold' :
        'pending'; // Default to pending
      const matchesStatus = selectedStatus === 'all' || normalizedStatus === selectedStatus;
      return matchesPeriod && matchesOrg && matchesStatus;
    });
  }, [linkedGauges, periodStart, selectedOrgId, selectedStatus]);

  // Removed filteredCalibrationCertificates - using gauge status instead
  // Completed gauges are calculated from gauge status (calibration_completed)

  // Real-time analytics calculations - using dashboard store report
  const dashboardStats = useMemo(() => {
    const report = getPeriodReport(selectedPeriod as 'day' | 'week' | 'month' | 'year', organizations, inwardEntries, linkedGauges);
    
    // Get reports for different periods (memoized to avoid multiple calls)
    const todayReport = getPeriodReport('day', organizations, inwardEntries, linkedGauges);
    const weekReport = getPeriodReport('week', organizations, inwardEntries, linkedGauges);
    const monthReport = getPeriodReport('month', organizations, inwardEntries, linkedGauges);
    const yearReport = getPeriodReport('year', organizations, inwardEntries, linkedGauges);

    return {
      totalInwards: report.totalInwards,
      totalOutwards: report.totalCertificates,
      totalGauges: report.totalGauges,
      totalOrganizations: organizations.length,
      pendingCalibrations: report.statusBreakdown.pending + report.statusBreakdown.in_progress,
      completedToday: todayReport.totalInwards,
      completedThisWeek: weekReport.totalInwards,
      completedThisMonth: monthReport.totalInwards,
      completedThisYear: yearReport.totalInwards,
      completionRate: report.totalGauges > 0 
        ? Math.round((report.totalCertificates / report.totalGauges) * 100) 
        : 0
    };
  }, [selectedPeriod, organizations, inwardEntries, linkedGauges, getPeriodReport]);

  // Process status analytics - using dashboard store report for accurate data
  const processStatusData = useMemo(() => {
    // Get current period report for accurate status breakdown
    const report = getPeriodReport(selectedPeriod as 'day' | 'week' | 'month' | 'year', organizations, inwardEntries, linkedGauges);
    const statusBreakdown = report.statusBreakdown;
    const total = report.totalGauges;
    
    if (total === 0) return [];

    return [
      {
        status: 'Completed',
        count: statusBreakdown.completed || 0,
        percentage: Math.round(((statusBreakdown.completed || 0) / total) * 100),
        color: STATUS_COLORS.completed
      },
      {
        status: 'In Progress',
        count: statusBreakdown.in_progress || 0,
        percentage: Math.round(((statusBreakdown.in_progress || 0) / total) * 100),
        color: STATUS_COLORS.in_progress
      },
      {
        status: 'Pending',
        count: statusBreakdown.pending || 0,
        percentage: Math.round(((statusBreakdown.pending || 0) / total) * 100),
        color: STATUS_COLORS.pending
      },
      {
        status: 'On Hold',
        count: statusBreakdown.on_hold || 0,
        percentage: Math.round(((statusBreakdown.on_hold || 0) / total) * 100),
        color: STATUS_COLORS.on_hold
      }
    ].filter(item => item.count > 0);
  }, [selectedPeriod, organizations, inwardEntries, linkedGauges, getPeriodReport, STATUS_COLORS]);

  // Company-wise analytics - using dashboard store for accurate company data
  const companyAnalytics = useMemo(() => {
    const report = getPeriodReport(selectedPeriod as 'day' | 'week' | 'month' | 'year', organizations, inwardEntries, linkedGauges);
    
    // If a specific company is selected, show only that company's detailed data
    if (selectedCompany !== 'all') {
      const companyReport = getCompanyReport(selectedCompany, selectedPeriod as 'day' | 'week' | 'month' | 'year', organizations, inwardEntries, linkedGauges);
      if (companyReport) {
        // Calculate completed calibrations from gauge status
        const completedCount = companyReport.gaugesByStatus.completed;
        return [{
          company: companyReport.companyName,
          gauges: companyReport.totalGauges,
          calibrations: completedCount, // Use completed gauges count
          inwards: companyReport.totalInwards,
          efficiency: companyReport.totalGauges > 0 
            ? Math.round((completedCount / companyReport.totalGauges) * 100) 
            : 0,
          statusBreakdown: companyReport.gaugesByStatus
        }];
      }
    }
    
    // Show all companies with their stats
    const companyStats = report.companies.map(company => {
      // Calculate completed calibrations from gauge status
      const completedCount = company.gaugesByStatus.completed;
      
      return {
        company: company.companyName,
        gauges: company.totalGauges,
        calibrations: completedCount, // Use completed gauges count
        inwards: company.totalInwards,
        efficiency: company.totalGauges > 0 
          ? Math.round((completedCount / company.totalGauges) * 100) 
          : 0,
        statusBreakdown: company.gaugesByStatus
      };
    }).sort((a, b) => b.gauges - a.gauges);

    return companyStats.slice(0, 10); // Top 10 companies
  }, [selectedPeriod, selectedCompany, organizations, inwardEntries, linkedGauges, getPeriodReport, getCompanyReport]);
  void companyAnalytics;

  // Company report data for detailed view - memoized to avoid calling during render
  const companyReportData = useMemo(() => {
    const report = getPeriodReport(selectedPeriod as 'day' | 'week' | 'month' | 'year', organizations, inwardEntries, linkedGauges);
    const companiesToShow = selectedCompany === 'all' 
      ? report.companies 
      : report.companies.filter(c => c.companyId === selectedCompany);
    
    return {
      companies: companiesToShow,
      isEmpty: companiesToShow.length === 0
    };
  }, [selectedPeriod, selectedCompany, organizations, inwardEntries, linkedGauges, getPeriodReport]);
  void companyReportData;

  // Inward-wise breakdown - group gauges by inward_id
  const inwardWiseData = useMemo(() => {
    const periodStart = getPeriodStart(selectedPeriod);
    
    // Filter inwards by period and company
    const filteredInwards = inwardEntries.filter(entry => {
      const entryDate = new Date(entry.created_at);
      const matchesPeriod = entryDate >= periodStart;
      const matchesCompany = selectedCompany === 'all' || entry.client_org_id === selectedCompany;
      return matchesPeriod && matchesCompany;
    });

    // Group gauges by inward_id
    const gaugesByInward = new Map<string, typeof linkedGauges>();
    linkedGauges.forEach(gauge => {
      const gaugeDate = new Date(gauge.created_at || gauge.inward_info?.inward_date || 0);
      const matchesPeriod = gaugeDate >= periodStart;
      const matchesCompany = selectedCompany === 'all' || gauge.client_org_id === selectedCompany;
      
      if (matchesPeriod && matchesCompany && gauge.inward_id) {
        if (!gaugesByInward.has(gauge.inward_id)) {
          gaugesByInward.set(gauge.inward_id, []);
        }
        gaugesByInward.get(gauge.inward_id)!.push(gauge);
      }
    });

    // Create inward report with gauge status breakdown
    return filteredInwards.map(inward => {
      const inwardGauges = gaugesByInward.get(inward.id) || [];
      
      // Calculate status breakdown for this inward's gauges
      const statusBreakdown = inwardGauges.reduce((acc, gauge) => {
        const status = gauge.process_status || 'pending';
        const normalizedStatus = 
          status === 'completed' ? 'completed' :
          status === 'in_progress' ? 'in_progress' :
          status === 'on_hold' ? 'on_hold' :
          'pending';
        acc[normalizedStatus as keyof typeof acc] = (acc[normalizedStatus as keyof typeof acc] || 0) + 1;
        return acc;
      }, {
        pending: 0,
        in_progress: 0,
        completed: 0,
        on_hold: 0,
      });

      // Get company name
      const company = organizations.find(org => org.id === inward.client_org_id);
      
      return {
        inwardId: inward.id,
        inwardNumber: inward.client_dc_no || inward.id,
        clientOrgId: inward.client_org_id,
        clientOrgName: company?.name || inward.client_org_name || 'Unknown',
        inwardDate: inward.inward_date || inward.created_at,
        createdAt: inward.created_at,
        totalGauges: inwardGauges.length,
        statusBreakdown,
        gauges: inwardGauges.map(gauge => {
          // Get gauge name - API response may include master_gauge_name even if not in type
          const gaugeName = (gauge as any).master_gauge_name || 
            `${gauge.gauge_class || 'Gauge'} - ${gauge.identification_number || gauge.manf_serial_number || gauge.id?.slice(0, 8) || ''}`;
          
          return {
            id: gauge.id,
            gaugeId: gauge.id,
            name: gaugeName,
            identificationNumber: gauge.identification_number || gauge.manf_serial_number || '',
            status: gauge.process_status || 'pending',
            createdAt: gauge.created_at,
          };
        }),
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [inwardEntries, linkedGauges, organizations, selectedPeriod, selectedCompany]);
  void inwardWiseData;

  // Monthly trend analysis
  const monthlyTrend = useMemo(() => {
    const monthlyData: Record<string, { inwards: number; certificates: number }> = {};
    
    // Initialize last 12 months
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyData[monthKey] = { inwards: 0, certificates: 0 };
    }

    // Count inwards by month
    filteredInwardEntries.forEach(entry => {
      const date = new Date(entry.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].inwards++;
      }
    });

    // Count completed calibrations by month (from gauge status)
    filteredLinkedGauges.forEach(gauge => {
      const status = gauge.process_status || '';
      if (status === 'completed') {
        const date = new Date(gauge.created_at || gauge.inward_info?.inward_date || 0);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].certificates++;
        }
      }
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      inwards: data.inwards,
      certificates: data.certificates,
      target: Math.max(data.inwards, data.certificates) + 5 // Dynamic target
    }));
  }, [filteredInwardEntries, filteredLinkedGauges]);

  // Daily performance (last 7 days)
  const dailyPerformance = useMemo(() => {
    const dailyData: Record<string, { inwards: number; certificates: number }> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
      dailyData[dayKey] = { inwards: 0, certificates: 0 };
    }

    // Count by day
    filteredInwardEntries.forEach(entry => {
      const date = new Date(entry.created_at);
      const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
      if (dailyData[dayKey]) {
        dailyData[dayKey].inwards++;
      }
    });

    // Count completed calibrations by day (from gauge status)
    filteredLinkedGauges.forEach(gauge => {
      const status = gauge.process_status || '';
      if (status === 'completed') {
        const date = new Date(gauge.created_at || gauge.inward_info?.inward_date || 0);
        const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
        if (dailyData[dayKey]) {
          dailyData[dayKey].certificates++;
        }
      }
    });

    return Object.entries(dailyData).map(([day, data]) => ({
      day,
      inwards: data.inwards,
      certificates: data.certificates,
      total: data.inwards + data.certificates
    }));
  }, [filteredInwardEntries, filteredLinkedGauges]);

  // Real Chart Data Configurations
  const progressChartData: ChartData<'doughnut'> = {
    labels: processStatusData.map(item => item.status),
    datasets: [{
      data: processStatusData.map(item => item.percentage),
      backgroundColor: processStatusData.map(item => item.color + '80'),
      borderColor: processStatusData.map(item => item.color),
      borderWidth: 2,
      hoverOffset: 15,
    }]
  };

  const dailyTrendData: ChartData<'line'> = {
    labels: dailyPerformance.map(item => item.day),
    datasets: [
      {
        label: 'Inwards',
        data: dailyPerformance.map(item => item.inwards),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      },
      {
        label: 'Certificates',
        data: dailyPerformance.map(item => item.certificates),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }
    ]
  };

  const monthlyTrendData: ChartData<'bar' | 'line'> = {
    labels: monthlyTrend.map(item => item.month),
    datasets: [
      {
        label: 'Inwards',
        data: monthlyTrend.map(item => item.inwards),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Certificates',
        data: monthlyTrend.map(item => item.certificates),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Target',
        data: monthlyTrend.map(item => item.target),
        type: 'line' as const,
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: false,
        tension: 0.4
      }
    ]
  };


  // Advanced Chart Options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 500
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        padding: 16,
        titleFont: {
          size: 14,
          weight: 600
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          title: function(context: TooltipItem<'line'>[]) {
            return context[0].label || '';
          },
          label: function(context: TooltipItem<'line'>) {
            const label = context.dataset.label || '';
            const parsed = context.parsed;
            const value = typeof parsed === 'number'
              ? parsed
              : (parsed && 'y' in parsed ? (parsed as { y: number }).y : 0);
            return `${label}: ${Number(value).toLocaleString()}`;
          }
        }
      }
      ,
      decimation: {
        enabled: true,
        algorithm: 'lttb',
        samples: 100
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart' as const,
      delay: (context: ScriptableContext<'line'>) => {
        let delay = 0;
        if (context.type === 'data' && context.mode === 'default') {
          delay = (context.dataIndex || 0) * 100 + (context.datasetIndex || 0) * 100;
        }
        return delay;
      }
    },
    elements: {
      point: {
        hoverBackgroundColor: '#fff',
        hoverRadius: 8
      }
    }
  };

  const pieChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 500
          }
        }
      }
    }
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          }
        }
      }
    }
  };

  // Get selected company name for title
  const selectedCompanyName = useMemo(() => {
    if (selectedCompany === 'all') return null;
    const org = organizations.find(o => o.id === selectedCompany);
    return org?.name || null;
  }, [selectedCompany, organizations]);

  return (
    <div className="section-spacing">
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-none shadow-sm rounded-sm">
        <Card.Content className="p-3 md:p-4">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 text-white">
              {selectedCompanyName ? `${selectedCompanyName} - Analytics Dashboard` : 'Analytics Dashboard'}
            </h1>
            <p className="text-sm text-blue-100">
              {selectedCompanyName 
                ? `Monitoring & Performance Analytics for ${selectedCompanyName}`
                : 'Monitoring & Performance Analytics'}
            </p>
          </div>
        </Card.Content>
      </Card>

      {/* Filters Section - Minimalist Design */}
      <Card className="shadow-sm rounded-sm border border-gray-200">
        <Card.Content className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              onClick={() => {
                setShouldFetchGauges(true);
                void fetchOrganizations(true);
                void fetchInwardEntries(true);
                if (shouldFetchGauges) {
                  void gaugesQuery.refetch();
                }
                refreshDashboard();
              }}
              variant="outline"
              size="sm"
              className="text-gray-700"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <Select
              aria-label="Select time period"
              selectedKey={selectedPeriod}
              onSelectionChange={(key) => {
                const selected = String(key);
                setSelectedPeriod(selected);
                setShouldFetchGauges(true);
              }}
              className="max-w-[140px]"
            >
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox>
                <ListBox.Item id="day" textValue="Today">Today</ListBox.Item>
                <ListBox.Item id="week" textValue="This Week">This Week</ListBox.Item>
                <ListBox.Item id="month" textValue="This Month">This Month</ListBox.Item>
                <ListBox.Item id="year" textValue="This Year">This Year</ListBox.Item>
              </ListBox></Select.Popover>
            </Select>
            <Select
              aria-label="Filter by company"
              selectedKey={selectedCompany}
              onSelectionChange={(key) => {
                const selected = String(key);
                setSelectedCompany(selected);
                setShouldFetchGauges(true);
              }}
              className="max-w-[180px]"
            >
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox>
                <ListBox.Item id="all" textValue="All Companies">All Companies</ListBox.Item>
                {organizations.map((org) => (
                  <ListBox.Item key={org.id} id={org.id} textValue={org.name}>{org.name}</ListBox.Item>
                ))}
              </ListBox></Select.Popover>
            </Select>
            <Select
              aria-label="Filter by status"
              selectedKey={selectedStatus}
              onSelectionChange={(key) => {
                const selected = String(key) as StatusFilter;
                setSelectedStatus(selected);
                setShouldFetchGauges(true);
              }}
              className="max-w-[140px]"
            >
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox>
                <ListBox.Item id="all" textValue="All Statuses">All Statuses</ListBox.Item>
                <ListBox.Item id="pending" textValue="Pending">Pending</ListBox.Item>
                <ListBox.Item id="in_progress" textValue="In Progress">In Progress</ListBox.Item>
                <ListBox.Item id="completed" textValue="Completed">Completed</ListBox.Item>
                <ListBox.Item id="on_hold" textValue="On Hold">On Hold</ListBox.Item>
              </ListBox></Select.Popover>
            </Select>
          </div>
        </Card.Content>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm rounded-sm border border-gray-200">
          <Card.Content className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Inwards</p>
                <p className="text-3xl font-bold text-blue-600">
                  {inwardLoading ? '...' : dashboardStats.totalInwards.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">This month: {dashboardStats.completedThisMonth}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card className="shadow-sm rounded-sm border border-gray-200">
          <Card.Content className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Certificates</p>
                <p className="text-3xl font-bold text-green-600">
                  {gaugeLoading ? '...' : dashboardStats.totalOutwards.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Completion Rate: {dashboardStats.completionRate}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card.Content>
        </Card>

     

        <Card className="shadow-sm rounded-sm border border-gray-200">
          <Card.Content className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Calibrations</p>
                <p className="text-3xl font-bold text-orange-600">
                  {gaugeLoading ? '...' : dashboardStats.pendingCalibrations}
                </p>
                <p className="text-xs text-gray-500 mt-1">Awaiting certificates</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Process Status Monitoring */}
        <Card className="shadow-sm rounded-sm border border-gray-200">
          <Card.Content className="p-3 md:p-4">
            <h3 className="text-base md:text-lg font-semibold mb-4">Process Status Overview</h3>
            {processStatusData.length > 0 ? (
              <div className="h-80 flex items-center justify-center">
                <Doughnut data={progressChartData} options={pieChartOptions} />
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>No process data available</p>
                </div>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Daily Performance Trend */}
        <Card className="shadow-sm rounded-sm border border-gray-200">
          <Card.Content className="p-3 md:p-4">
            <h3 className="text-base md:text-lg font-semibold mb-4">Daily Performance (Last 7 Days)</h3>
            <div className="h-80">
              <Line data={dailyTrendData} options={chartOptions} />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Monthly Trends & Targets */}
      <Card className="shadow-sm rounded-sm border border-gray-200">
        <Card.Content className="p-3 md:p-4">
          <h3 className="text-base md:text-lg font-semibold mb-4">Monthly Trends & Performance</h3>
          <div className="h-96">
            <Chart type="bar" data={monthlyTrendData as ChartData<'bar'>} options={barChartOptions} />
          </div>
        </Card.Content>
      </Card>

    </div>
  );
}
