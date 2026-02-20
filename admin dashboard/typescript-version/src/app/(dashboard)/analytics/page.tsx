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

// Mock data
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
    labels: ['Aktivlik', 'Dars', 'Manba'],
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
            <Box sx={{ height: 320 }}>
              <ApexChart
                options={donutChartOptions}
                series={[40, 35, 25]}
                type="donut"
                height="100%"
              />
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

      {/* Funnel Table */}
      <ChartCard delay={750}>
        <ChartTitle>
          <IconBox color="linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)">
            <Activity size={20} />
          </IconBox>
          Batafsil Funnel Ma'lumotlari
        </ChartTitle>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <StyledTableHeadCell>Bosqich</StyledTableHeadCell>
                <StyledTableHeadCell>User</StyledTableHeadCell>
                <StyledTableHeadCell>Prev dan</StyledTableHeadCell>
                <StyledTableHeadCell>Start dan</StyledTableHeadCell>
                <StyledTableHeadCell>Izoh</StyledTableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {funnelData.map((row, index) => (
                <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#F8F6F3' } }}>
                  <StyledTableCell sx={{ fontWeight: 600, color: '#1A1A2E' }}>
                    {row.stage}
                  </StyledTableCell>
                  <StyledTableCell>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.0625rem', color: '#1A1A2E' }}>
                      {row.users}
                    </Typography>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Typography sx={{ fontWeight: 600, color: row.percentage < 50 ? '#EF4444' : '#22C55E' }}>
                      {row.percentage}%
                    </Typography>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Typography sx={{ fontWeight: 600, color: '#6B7280' }}>
                      {row.prevPercentage}%
                    </Typography>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Typography sx={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                      {row.note}
                    </Typography>
                  </StyledTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ChartCard>
    </Box>
  )
}
