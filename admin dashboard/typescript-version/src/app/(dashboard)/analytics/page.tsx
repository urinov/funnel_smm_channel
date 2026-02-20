'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import { styled, keyframes } from '@mui/material/styles'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  ShoppingCart,
  ArrowRight,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react'

import { Card } from '@/components/ui'

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const PageHeader = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 40,
  flexWrap: 'wrap',
  gap: 20,
  opacity: 0,
  animation: `${fadeInUp} 0.5s ease-out forwards`,
}))

const PageTitle = styled(Typography)(() => ({
  fontSize: '2rem',
  fontWeight: 800,
  color: '#1A1A2E',
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  letterSpacing: '-0.02em',
}))

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(() => ({
  backgroundColor: '#F5F3EF',
  borderRadius: 14,
  padding: 5,

  '& .MuiToggleButton-root': {
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.9375rem',
    color: '#6B7280',
    fontFamily: '"Plus Jakarta Sans", sans-serif',

    '&.Mui-selected': {
      background: 'linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)',
      color: '#FFFFFF',
      boxShadow: '0 2px 8px rgba(224, 122, 95, 0.3)',
    },
  },
}))

const MetricCard = styled(Box)<{ index?: number }>(({ index = 0 }) => ({
  background: '#FFFFFF',
  borderRadius: 20,
  padding: 28,
  border: '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',
  opacity: 0,
  animation: `${fadeInUp} 0.5s ease-out ${index * 80}ms forwards`,
  transition: 'all 300ms ease',

  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
  },
}))

const ChartCard = styled(Box)<{ delay?: number }>(({ delay = 0 }) => ({
  background: '#FFFFFF',
  borderRadius: 24,
  padding: 32,
  border: '1px solid rgba(0, 0, 0, 0.06)',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',
  opacity: 0,
  animation: `${fadeInUp} 0.5s ease-out ${delay}ms forwards`,
}))

const ChartTitle = styled(Typography)(() => ({
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#1A1A2E',
  marginBottom: 24,
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}))

const IconBox = styled(Box)<{ color: string }>(({ color }) => ({
  width: 44,
  height: 44,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: color,
  color: '#FFFFFF',
  boxShadow: `0 4px 12px ${color}50`,
}))

const StyledTableCell = styled(TableCell)(() => ({
  fontSize: '0.9375rem',
  fontWeight: 500,
  padding: '18px 16px',
  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
  fontFamily: '"Plus Jakarta Sans", sans-serif',
}))

const StyledTableHeadCell = styled(TableCell)(() => ({
  fontSize: '0.8125rem',
  fontWeight: 700,
  padding: '14px 16px',
  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontFamily: '"Plus Jakarta Sans", sans-serif',
}))

const ProgressBar = styled(LinearProgress)<{ customcolor: string }>(({ customcolor }) => ({
  height: 10,
  borderRadius: 5,
  backgroundColor: 'rgba(0, 0, 0, 0.06)',
  '& .MuiLinearProgress-bar': {
    borderRadius: 5,
    background: `linear-gradient(90deg, ${customcolor} 0%, ${customcolor}99 100%)`,
  },
}))

// Visual Funnel Step Component
const FunnelStep = styled(Box, {
  shouldForwardProp: (prop) => !['width', 'color', 'index', 'stepColor'].includes(prop as string),
})<{ width: number; stepColor: string; index: number }>(({ stepColor, index }) => ({
  position: 'relative',
  height: 56,
  marginBottom: 8,
  borderRadius: 14,
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 300ms ease',
  backgroundColor: 'rgba(0, 0, 0, 0.02)',
  opacity: 0,
  animation: `${fadeInUp} 0.4s ease-out ${index * 60}ms forwards`,

  '&:hover': {
    transform: 'translateX(8px)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    '& .funnel-bar': {
      opacity: 1,
    },
  },
}))

const FunnelBar = styled(Box, {
  shouldForwardProp: (prop) => !['width', 'barColor'].includes(prop as string),
})<{ width: number; barColor: string }>(({ width, barColor }) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: `${width}%`,
  background: `linear-gradient(90deg, ${barColor}35 0%, ${barColor}15 100%)`,
  borderRight: `4px solid ${barColor}`,
  transition: 'all 400ms ease',
  opacity: 0.9,
}))

const FunnelContent = styled(Box)(() => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '100%',
  padding: '0 20px',
  zIndex: 1,
}))

const CategoryBadge = styled(Chip)<{ categoryColor: string }>(({ categoryColor }) => ({
  backgroundColor: `${categoryColor}15`,
  color: categoryColor,
  fontWeight: 700,
  fontSize: '0.75rem',
  height: 26,
  borderRadius: 8,
}))

const DropOffArrow = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 0',
  color: '#EF4444',
  fontSize: '0.8125rem',
  fontWeight: 700,
  fontFamily: '"JetBrains Mono", monospace',
  gap: 6,
}))

// Detailed funnel data with all lessons
const detailedFunnelData = [
  { stage: "Ro'yxatdan o'tgan", users: 644, fromPrev: 100, fromStart: 100, color: '#E07A5F', note: 'Start nuqta', category: 'start' },
  { stage: 'Darsni boshlagan', users: 495, fromPrev: 76.9, fromStart: 76.9, color: '#E8B931', note: 'Onboarding', category: 'onboard' },
  { stage: '0-dars', users: 485, fromPrev: 98.0, fromStart: 75.3, color: '#3B82F6', note: 'Kirish darsi', category: 'lesson' },
  { stage: '1-dars', users: 481, fromPrev: 99.2, fromStart: 74.7, color: '#3B82F6', note: 'Asosiy dars', category: 'lesson' },
  { stage: '2-dars', users: 320, fromPrev: 66.5, fromStart: 49.7, color: '#3B82F6', note: 'Davom etish', category: 'lesson' },
  { stage: '3-dars', users: 185, fromPrev: 57.8, fromStart: 28.7, color: '#3B82F6', note: 'Chuqurlashish', category: 'lesson' },
  { stage: '4-dars', users: 95, fromPrev: 51.4, fromStart: 14.8, color: '#3B82F6', note: 'Yakunlash', category: 'lesson' },
  { stage: "Pitch ko'rgan", users: 45, fromPrev: 47.4, fromStart: 7.0, color: '#8B5CF6', note: 'Sotuvga qiziqish', category: 'sales' },
  { stage: 'Checkout ochgan', users: 21, fromPrev: 46.7, fromStart: 3.3, color: '#22C55E', note: "To'lov niyati", category: 'sales' },
  { stage: "To'lov qilgan", users: 2, fromPrev: 9.5, fromStart: 0.3, color: '#22C55E', note: 'Yakuniy konversiya', category: 'complete' },
]

// Simple funnel for overview
const funnelData = [
  { stage: "Ro'yxatdan o'tgan", users: 644, percentage: 100, prevPercentage: 100, note: 'Start nuqta' },
  { stage: 'Darsni boshlagan', users: 495, percentage: 76.9, prevPercentage: 76.9, note: 'Onboarding bosqichi' },
  { stage: '1-darsga yetgan', users: 481, percentage: 97.2, prevPercentage: 74.7, note: 'Kontentga kirish' },
  { stage: "Pitch ko'rgan", users: 45, percentage: 9.4, prevPercentage: 7, note: 'Sotuvga qiziqish' },
  { stage: 'Checkout ochgan', users: 21, percentage: 46.7, prevPercentage: 3.3, note: "To'lov niyati" },
  { stage: "To'lov qilgan", users: 2, percentage: 9.5, prevPercentage: 0.3, note: 'Yakuniy konversiya' },
]

const sourceData = [
  { name: 'chatplace', users: 0, total: 242, percentage: 0 },
  { name: 'direct', users: 2, total: 240, percentage: 0.8 },
  { name: 'instagram', users: 0, total: 95, percentage: 0 },
  { name: 'bio', users: 0, total: 65, percentage: 0 },
]

const lessonData = [
  { name: '0-dars', users: 1, total: 163, percentage: 0.6 },
  { name: '1-2 dars', users: 0, total: 386, percentage: 0 },
  { name: '3-4 dars', users: 1, total: 95, percentage: 1.1 },
]

const activityData = [
  { name: 'Oxirgi 24 soat', users: 0, total: 71, percentage: 0 },
  { name: 'Oxirgi 7 kun', users: 1, total: 399, percentage: 0.3 },
  { name: '7 kundan eski', users: 1, total: 174, percentage: 0.6 },
]

const highIntentUsers = [
  { name: 'Sevara Jumabayeva', lessons: 4, signal: 'Pitch, 3+ dars, Yuqori', lastActivity: 'M02 19 20:49', id: '7739810537' },
  { name: 'Mening patpiskami kopeldip ber', lessons: 4, signal: 'Pitch, 3+ dars, Yuqori', lastActivity: 'M02 19 20:14', id: '8238090844' },
  { name: 'Diyorbek Aktamov', lessons: 4, signal: 'Pitch, 3+ dars, Yuqori', lastActivity: 'M02 18 22:02', id: '5734718551' },
  { name: 'Javlonbek Maqsudov', lessons: 4, signal: 'Pitch, 3+ dars, Yuqori', lastActivity: 'M02 18 16:15', id: '8286275178' },
  { name: 'Samandar Ergashev', lessons: 4, signal: 'Pitch, 3+ dars', lastActivity: 'M02 16 23:41', id: '---' },
]

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d')

  // Chart options with warm colors
  const funnelChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: '"Plus Jakarta Sans", sans-serif',
    },
    colors: ['#E07A5F', '#E8B931', '#3B82F6', '#22C55E', '#8B5CF6', '#EC4899'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 8,
        borderRadiusApplication: 'end',
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val}`,
      style: {
        fontSize: '14px',
        fontWeight: 700,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      },
      offsetY: -20,
    },
    xaxis: {
      categories: funnelData.map(d => d.stage),
      labels: {
        style: {
          fontSize: '13px',
          fontWeight: 500,
          colors: '#6B7280',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        },
        rotate: -45,
        rotateAlways: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '13px',
          colors: '#6B7280',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        },
      },
    },
    grid: {
      borderColor: 'rgba(0, 0, 0, 0.06)',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: 'light',
      style: { fontFamily: '"Plus Jakarta Sans", sans-serif' },
      y: {
        formatter: (val) => `${val} users`,
      },
    },
  }

  const donutChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: '"Plus Jakarta Sans", sans-serif',
    },
    labels: ['Faol (7 kun)', 'Eskirgan (7+ kun)', 'Yangi (24 soat)'],
    colors: ['#E07A5F', '#E8B931', '#3B82F6'],
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      },
    },
    legend: {
      position: 'bottom',
      fontSize: '14px',
      fontWeight: 500,
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      labels: { colors: '#1A1A2E' },
      markers: { radius: 4 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Jami',
              fontSize: '16px',
              fontWeight: 700,
              color: '#1A1A2E',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            },
          },
        },
      },
    },
    stroke: { width: 2, colors: ['#FFFFFF'] },
  }

  return (
    <Box>
      {/* Page Header */}
      <PageHeader>
        <Box>
          <PageTitle>Analitika</PageTitle>
          <Typography sx={{ fontSize: '1rem', color: '#6B7280', fontWeight: 500, mt: 1 }}>
            Bot ishlashi va foydalanuvchi xatti-harakatlari haqida batafsil ma'lumotlar
          </Typography>
        </Box>
        <StyledToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, v) => v && setPeriod(v)}
        >
          <ToggleButton value="7d">7 kun</ToggleButton>
          <ToggleButton value="30d">30 kun</ToggleButton>
          <ToggleButton value="90d">90 kun</ToggleButton>
          <ToggleButton value="1y">1 yil</ToggleButton>
        </StyledToggleButtonGroup>
      </PageHeader>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <IconBox color="linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)">
                <Target size={22} />
              </IconBox>
              <Chip
                label="+2.3%"
                size="small"
                sx={{
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  color: '#22C55E',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              />
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 500, mb: 1 }}>
              Umumiy CR
            </Typography>
            <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>
              0.3%
            </Typography>
          </MetricCard>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <IconBox color="linear-gradient(135deg, #EF4444 0%, #F87171 100%)">
                <TrendingDown size={22} />
              </IconBox>
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 500, mb: 1 }}>
              Eng katta yo'qotish
            </Typography>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>
              1-darsga yetgan → Pitch ko'rgan
            </Typography>
            <Typography sx={{ fontSize: '1.125rem', color: '#EF4444', fontWeight: 600 }}>
              -436 user
            </Typography>
          </MetricCard>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <IconBox color="linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)">
                <ShoppingCart size={22} />
              </IconBox>
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 500, mb: 1 }}>
              Pitch → Checkout
            </Typography>
            <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>
              46.7%
            </Typography>
          </MetricCard>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard index={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <IconBox color="linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)">
                <ArrowRight size={22} />
              </IconBox>
            </Box>
            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 500, mb: 1 }}>
              Checkout → Prepare
            </Typography>
            <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>
              14.3%
            </Typography>
          </MetricCard>
        </Grid>
      </Grid>

      {/* Second Row Metrics */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard index={4}>
            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 500, mb: 1 }}>
              Prepare → Complete
            </Typography>
            <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>
              66.7%
            </Typography>
          </MetricCard>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard index={5}>
            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 500, mb: 1 }}>
              Pitchdan checkoutsiz
            </Typography>
            <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>
              28
            </Typography>
          </MetricCard>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard index={6}>
            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 500, mb: 1 }}>
              Stuck to'lovlar
            </Typography>
            <Typography sx={{ fontSize: '2.5rem', fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>
              19
            </Typography>
          </MetricCard>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard index={7}>
            <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 500, mb: 1 }}>
              Asosiy action
            </Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#1A1A2E' }}>
              Pitch ko'rgan, checkout ochmagan userlarga avtomatik follow-up yoqing.
            </Typography>
          </MetricCard>
        </Grid>
      </Grid>

      {/* Funnel Chart */}
      <ChartCard delay={400} sx={{ mb: 5 }}>
        <ChartTitle>
          <IconBox color="linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)">
            <BarChart3 size={22} />
          </IconBox>
          Bosqichlar Oqimi
        </ChartTitle>
        <Box sx={{ height: 420 }}>
          <ApexChart
            options={funnelChartOptions}
            series={[{ name: 'Users', data: funnelData.map(d => d.users) }]}
            type="bar"
            height="100%"
          />
        </Box>
      </ChartCard>

      {/* Segments Comparison */}
      <Grid container spacing={4} sx={{ mb: 5 }}>
        <Grid item xs={12} lg={4}>
          <ChartCard delay={500}>
            <ChartTitle>
              <IconBox color="linear-gradient(135deg, #E07A5F 0%, #E8B931 100%)">
                <PieChart size={20} />
              </IconBox>
              Segmentlar Taqqoslash
            </ChartTitle>
            <Box sx={{ height: 240 }}>
              <ApexChart
                options={donutChartOptions}
                series={[399, 174, 71]}
                type="donut"
                height="100%"
              />
            </Box>

            {/* Segment Details */}
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              {[
                { name: 'Faol (7 kun ichida)', users: 399, percentage: 62, color: '#E07A5F', cr: 0.3 },
                { name: 'Eskirgan (7+ kun)', users: 174, percentage: 27, color: '#E8B931', cr: 0.6 },
                { name: 'Yangi (24 soat)', users: 71, percentage: 11, color: '#3B82F6', cr: 0 },
              ].map((segment, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: segment.color }} />
                    <Box>
                      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1A1A2E' }}>
                        {segment.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                        CR: {segment.cr}%
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#1A1A2E', fontFamily: '"JetBrains Mono", monospace' }}>
                      {segment.users}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: segment.color, fontWeight: 600 }}>
                      {segment.percentage}%
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={8}>
          <ChartCard delay={500}>
            <ChartTitle>
              <IconBox color="linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)">
                <Users size={20} />
              </IconBox>
              High-Intent Userlar
              <Chip label="95 ta" size="small" sx={{ ml: 'auto', fontWeight: 700, backgroundColor: '#F5F3EF' }} />
            </ChartTitle>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <StyledTableHeadCell>User</StyledTableHeadCell>
                    <StyledTableHeadCell>Dars</StyledTableHeadCell>
                    <StyledTableHeadCell>Signal</StyledTableHeadCell>
                    <StyledTableHeadCell>Oxirgi aktivlik</StyledTableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {highIntentUsers.map((user, index) => (
                    <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#F8F6F3' } }}>
                      <StyledTableCell>
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: '#1A1A2E', fontSize: '0.9375rem' }}>
                            {user.name}
                          </Typography>
                          <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>
                            ID: {user.id}
                          </Typography>
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Chip
                          label={user.lessons}
                          size="small"
                          sx={{
                            backgroundColor: '#E07A5F20',
                            color: '#E07A5F',
                            fontWeight: 700,
                          }}
                        />
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                          {user.signal}
                        </Typography>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography sx={{ fontSize: '0.875rem', color: '#9CA3AF', fontFamily: '"JetBrains Mono", monospace' }}>
                          {user.lastActivity}
                        </Typography>
                      </StyledTableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* CR Breakdowns */}
      <Grid container spacing={4} sx={{ mb: 5 }}>
        <Grid item xs={12} md={4}>
          <ChartCard delay={600}>
            <ChartTitle sx={{ fontSize: '1.125rem' }}>Manba bo'yicha CR</ChartTitle>
            {sourceData.map((item, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, color: '#1A1A2E', fontSize: '0.9375rem' }}>
                    {item.name}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.875rem' }}>
                    {item.users}/{item.total} ({item.percentage}%)
                  </Typography>
                </Box>
                <ProgressBar variant="determinate" value={item.percentage} customcolor="#E07A5F" />
              </Box>
            ))}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <ChartCard delay={650}>
            <ChartTitle sx={{ fontSize: '1.125rem' }}>Dars bo'yicha CR</ChartTitle>
            {lessonData.map((item, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, color: '#1A1A2E', fontSize: '0.9375rem' }}>
                    {item.name}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.875rem' }}>
                    {item.users}/{item.total} ({item.percentage}%)
                  </Typography>
                </Box>
                <ProgressBar variant="determinate" value={item.percentage * 10} customcolor="#E8B931" />
              </Box>
            ))}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <ChartCard delay={700}>
            <ChartTitle sx={{ fontSize: '1.125rem' }}>Aktivlik bo'yicha CR</ChartTitle>
            {activityData.map((item, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, color: '#1A1A2E', fontSize: '0.9375rem' }}>
                    {item.name}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: '#6B7280', fontSize: '0.875rem' }}>
                    {item.users}/{item.total} ({item.percentage}%)
                  </Typography>
                </Box>
                <ProgressBar variant="determinate" value={item.percentage * 10} customcolor="#3B82F6" />
              </Box>
            ))}
          </ChartCard>
        </Grid>
      </Grid>

      {/* Detailed Funnel with Visual */}
      <ChartCard delay={750} sx={{ mb: 5 }}>
        <ChartTitle>
          <IconBox color="linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)">
            <Activity size={22} />
          </IconBox>
          Batafsil Voronka Analizi
          <Chip
            label={`${detailedFunnelData.length} bosqich`}
            size="small"
            sx={{ ml: 'auto', fontWeight: 700, backgroundColor: '#F5F3EF', fontSize: '0.875rem' }}
          />
        </ChartTitle>

        <Grid container spacing={4}>
          {/* Visual Funnel */}
          <Grid item xs={12} lg={5}>
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A2E', mb: 3 }}>
                Vizual Voronka
              </Typography>
              {detailedFunnelData.map((step, index) => (
                <Box key={step.stage}>
                  <FunnelStep width={step.fromStart} stepColor={step.color} index={index}>
                    <FunnelBar className="funnel-bar" width={step.fromStart} barColor={step.color} />
                    <FunnelContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: `${step.color}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: step.color,
                            fontWeight: 800,
                            fontSize: '0.875rem',
                            fontFamily: '"JetBrains Mono", monospace',
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1A1A2E' }}>
                            {step.stage}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 500 }}>
                            {step.note}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: '#1A1A2E', fontFamily: '"JetBrains Mono", monospace' }}>
                          {step.users.toLocaleString()}
                        </Typography>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: step.color }}>
                          {step.fromStart}%
                        </Typography>
                      </Box>
                    </FunnelContent>
                  </FunnelStep>

                  {index < detailedFunnelData.length - 1 && step.fromPrev < 80 && (
                    <DropOffArrow>
                      <TrendingDown size={14} />
                      -{(100 - detailedFunnelData[index + 1].fromPrev).toFixed(1)}% drop
                    </DropOffArrow>
                  )}
                </Box>
              ))}
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 3, pt: 3, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <CategoryBadge label="Start" categoryColor="#E07A5F" size="small" />
              <CategoryBadge label="Onboarding" categoryColor="#E8B931" size="small" />
              <CategoryBadge label="Darslar" categoryColor="#3B82F6" size="small" />
              <CategoryBadge label="Sotuvlar" categoryColor="#8B5CF6" size="small" />
              <CategoryBadge label="Yakuniy" categoryColor="#22C55E" size="small" />
            </Box>
          </Grid>

          {/* Detailed Table */}
          <Grid item xs={12} lg={7}>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#1A1A2E', mb: 3 }}>
              Batafsil Ma'lumotlar
            </Typography>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <StyledTableHeadCell sx={{ backgroundColor: '#FAFAFA' }}>Bosqich</StyledTableHeadCell>
                    <StyledTableHeadCell sx={{ backgroundColor: '#FAFAFA' }}>User</StyledTableHeadCell>
                    <StyledTableHeadCell sx={{ backgroundColor: '#FAFAFA' }}>Oldingi dan</StyledTableHeadCell>
                    <StyledTableHeadCell sx={{ backgroundColor: '#FAFAFA' }}>Start dan</StyledTableHeadCell>
                    <StyledTableHeadCell sx={{ backgroundColor: '#FAFAFA' }}>Yo'qotish</StyledTableHeadCell>
                    <StyledTableHeadCell sx={{ backgroundColor: '#FAFAFA' }}>Izoh</StyledTableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailedFunnelData.map((row, index) => {
                    const prevUsers = index > 0 ? detailedFunnelData[index - 1].users : row.users
                    const dropOff = prevUsers - row.users

                    return (
                      <TableRow
                        key={index}
                        sx={{
                          '&:hover': { backgroundColor: '#F8F6F3' },
                          backgroundColor: row.category === 'lesson' ? 'rgba(59, 130, 246, 0.02)' : 'transparent',
                        }}
                      >
                        <StyledTableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: row.color,
                              }}
                            />
                            <Typography sx={{ fontWeight: 700, color: '#1A1A2E', fontSize: '1rem' }}>
                              {row.stage}
                            </Typography>
                          </Box>
                        </StyledTableCell>
                        <StyledTableCell>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.125rem', color: '#1A1A2E', fontFamily: '"JetBrains Mono", monospace' }}>
                            {row.users.toLocaleString()}
                          </Typography>
                        </StyledTableCell>
                        <StyledTableCell>
                          <Typography sx={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: row.fromPrev >= 80 ? '#22C55E' : row.fromPrev >= 50 ? '#F59E0B' : '#EF4444',
                          }}>
                            {row.fromPrev}%
                          </Typography>
                        </StyledTableCell>
                        <StyledTableCell>
                          <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: '#6B7280' }}>
                            {row.fromStart}%
                          </Typography>
                        </StyledTableCell>
                        <StyledTableCell>
                          {dropOff > 0 ? (
                            <Typography sx={{
                              fontWeight: 700,
                              fontSize: '0.9375rem',
                              color: '#EF4444',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}>
                              <TrendingDown size={16} />
                              -{dropOff}
                            </Typography>
                          ) : (
                            <Typography sx={{ fontWeight: 600, color: '#9CA3AF', fontSize: '0.875rem' }}>
                              —
                            </Typography>
                          )}
                        </StyledTableCell>
                        <StyledTableCell>
                          <Typography sx={{ fontSize: '0.9375rem', color: '#6B7280', fontWeight: 500 }}>
                            {row.note}
                          </Typography>
                        </StyledTableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary Stats */}
            <Box sx={{
              mt: 3,
              pt: 3,
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 3,
            }}>
              <Box>
                <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF', fontWeight: 600, mb: 0.5 }}>
                  Umumiy konversiya
                </Typography>
                <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, color: '#22C55E', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  0.3%
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF', fontWeight: 600, mb: 0.5 }}>
                  Eng katta yo'qotish
                </Typography>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#EF4444' }}>
                  2-dars → 3-dars (-135)
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.8125rem', color: '#9CA3AF', fontWeight: 600, mb: 0.5 }}>
                  Eng yaxshi bosqich
                </Typography>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#22C55E' }}>
                  0-dars → 1-dars (99.2%)
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </ChartCard>

      {/* Payment Method and Recommendations */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <ChartCard delay={800}>
            <ChartTitle>
              <IconBox color="linear-gradient(135deg, #22C55E 0%, #4ADE80 100%)">
                <ShoppingCart size={20} />
              </IconBox>
              To'lov usuli bo'yicha konversiya
            </ChartTitle>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[
                { method: 'Payme', users: 1, total: 15, percentage: 6.7, color: '#22C55E' },
                { method: 'Click', users: 1, total: 4, percentage: 25.0, color: '#3B82F6' },
                { method: 'Uzum', users: 0, total: 2, percentage: 0, color: '#E07A5F' },
              ].map((item, index) => (
                <Box key={index}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, color: '#1A1A2E', fontSize: '1.0625rem' }}>
                      {item.method}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontWeight: 600, color: '#6B7280', fontSize: '1rem' }}>
                        {item.users}/{item.total}
                      </Typography>
                      <Chip
                        label={`${item.percentage}%`}
                        size="small"
                        sx={{
                          backgroundColor: item.percentage > 0 ? `${item.color}15` : 'rgba(0,0,0,0.06)',
                          color: item.percentage > 0 ? item.color : '#9CA3AF',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                        }}
                      />
                    </Box>
                  </Box>
                  <ProgressBar
                    variant="determinate"
                    value={item.percentage}
                    customcolor={item.color}
                    sx={{ height: 12, borderRadius: 6 }}
                  />
                </Box>
              ))}
            </Box>
          </ChartCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <ChartCard delay={850}>
            <ChartTitle>
              <IconBox color="linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)">
                <Target size={20} />
              </IconBox>
              Asosiy tavsiyalar
            </ChartTitle>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[
                { priority: 'Yuqori', action: "2-dars → 3-dars o'tishni yaxshilang", impact: '135 user yo\'qotilmoqda', color: '#EF4444' },
                { priority: "O'rta", action: 'Pitch ko\'rgan, checkout ochmagan userlarga follow-up yuboring', impact: '24 user kutmoqda', color: '#F59E0B' },
                { priority: "O'rta", action: '4-dars tugallaganlarni pitchga yo\'naltiring', impact: '50 user potensial', color: '#F59E0B' },
                { priority: 'Past', action: 'Checkout ochgan, to\'lov qilmaganlarni eslatma bilan qaytaring', impact: '19 user stuck', color: '#3B82F6' },
              ].map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    borderRadius: 12,
                    backgroundColor: `${item.color}08`,
                    border: `1px solid ${item.color}20`,
                    transition: 'all 200ms ease',
                    '&:hover': {
                      backgroundColor: `${item.color}12`,
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Chip
                      label={item.priority}
                      size="small"
                      sx={{
                        backgroundColor: `${item.color}20`,
                        color: item.color,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        height: 24,
                      }}
                    />
                    <Typography sx={{ fontSize: '0.8125rem', color: item.color, fontWeight: 600 }}>
                      {item.impact}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#1A1A2E' }}>
                    {item.action}
                  </Typography>
                </Box>
              ))}
            </Box>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}
